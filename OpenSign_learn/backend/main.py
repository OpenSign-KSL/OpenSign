"""
OpenSign 학습-추론 백엔드(FastAPI) 메인 모듈

목적 :
- 프론트엔드에서 전달한 90프레임(base64 PNG) 시퀀스를 입력받아, GRU(v2) 모델로 수어 단어를 예측한다.
- 카테고리별 라벨 목록 조회 및 전문가 영상(static) 서빙을 제공한다.

입력 형식 :
- /predict: JSON { category: 문자열, frames: 길이 90의 base64 PNG 리스트 }
- /labels: 쿼리스트링 category=카테고리명

출력 형식 :
- /predict: { label: 문자열, prob: 0~1 실수(소수 4자리) }
- /labels: [라벨 문자열...]

주의 :
- 모델 파라미터는 입력 차원 152, 어텐션 차원 146에 맞춰 초기화해야 한다.
- MediaPipe Holistic은 정적 이미지 모드로 동작하며, 입력 프레임당 한 번씩 처리한다.
"""

import uvicorn
import os
import base64
import io
import numpy as np
import torch
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from PIL import Image
import pickle
import mediapipe as mp
from fastapi.staticfiles import StaticFiles  # ← 추가

from model_v2 import KeypointGRUModelV2

# 1) 설정 : 디바이스/경로/프레임 길이 및 Mediapipe 초기화
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # backend 폴더 경로
MODEL_DIR = os.path.join(BASE_DIR, "models")
STATIC_DIR = os.path.join(BASE_DIR, "static")           # /static/experts/{카테고리}/{단어}.mp4
FRAME_TARGET = 90

# Mediapipe Holistic 설정 : 정적 이미지 모드에서 프레임 단위 처리
mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(static_image_mode=True, model_complexity=1, min_detection_confidence=0.5)

# 2) FastAPI 앱 초기화 : CORS 허용(필요 시 도메인 제한)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요시 프론트 주소로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3) 정적 파일 서빙 : 전문가 예시 영상 제공(/static)
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 4) 데이터 모델 : 예측 요청 스키마 정의
class PredictRequest(BaseModel):
    category: str
    frames: List[str]  # base64 PNG 90개

# 5) 라벨 반환 API : 카테고리별 학습 라벨 목록 반환
@app.get("/labels")
def get_labels(category: str = Query(..., description="카테고리 이름")):
    label_map_path = os.path.join(MODEL_DIR, f"{category}_label_map.pkl")
    with open(label_map_path, "rb") as f:
        label_map = pickle.load(f)
    labels = [k for k, _ in sorted(label_map.items(), key=lambda x: x[1])]
    return labels

# 6) 특징 추출 함수 : 상대 좌표/손가락 각도/손-얼굴 관계
def calculate_relative_hand_coords(hand_kpts):
    """손목 기준 상대 좌표로 변환(위치 불변성)"""
    if np.all(hand_kpts == 0): return hand_kpts
    wrist = hand_kpts[0]
    return hand_kpts - wrist

def calculate_finger_angles(hand_kpts):
    """한 손의 관절 각도(라디안) 계산 : 엄지~새끼까지 연속 세 점으로 각도 산출"""
    if np.all(hand_kpts == 0): return np.zeros(10)
    angles = []
    finger_joints = {
        'thumb': [1,2,3,4], 'index':[5,6,7,8], 'middle':[9,10,11,12],
        'ring':[13,14,15,16], 'pinky':[17,18,19,20]
    }
    for joints in finger_joints.values():
        for i in range(len(joints)-2):
            p1, p2, p3 = hand_kpts[joints[i]], hand_kpts[joints[i+1]], hand_kpts[joints[i+2]]
            v1 = p1 - p2
            v2 = p3 - p2
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
            angles.append(np.arccos(np.clip(cos_angle, -1.0, 1.0)))
    return np.array(angles)

def calculate_hand_face_relation(lh_kpts, rh_kpts, face_kpts):
    """양 손목과 코(대리점) 간 상대 위치를 연결 특징으로 사용"""
    nose = face_kpts[1] if np.any(face_kpts) else np.zeros(3)
    lw = lh_kpts[0] if np.any(lh_kpts) else np.zeros(3)
    rw = rh_kpts[0] if np.any(rh_kpts) else np.zeros(3)
    return np.concatenate([lw - nose, rw - nose])

def extract_feature(image_np):
    """RGB 이미지에서 Holistic 결과를 기반으로 (152,) 특징 벡터 추출"""
    results = holistic.process(image_np)
    pose = np.array([[l.x, l.y, l.z, l.visibility] for l in results.pose_landmarks.landmark]) if results.pose_landmarks else np.zeros((33, 4))
    face = np.array([[l.x, l.y, l.z] for l in results.face_landmarks.landmark]) if results.face_landmarks else np.zeros((468, 3))
    lh = np.array([[l.x, l.y, l.z] for l in results.left_hand_landmarks.landmark]) if results.left_hand_landmarks else np.zeros((21, 3))
    rh = np.array([[l.x, l.y, l.z] for l in results.right_hand_landmarks.landmark]) if results.right_hand_landmarks else np.zeros((21, 3))

    relative_lh = calculate_relative_hand_coords(lh).flatten()
    relative_rh = calculate_relative_hand_coords(rh).flatten()
    angles_lh = calculate_finger_angles(lh)
    angles_rh = calculate_finger_angles(rh)
    rel_feat = calculate_hand_face_relation(lh, rh, face)

    return np.concatenate([relative_lh, relative_rh, angles_lh, angles_rh, rel_feat])

# 7) 예측 API : 90프레임 시퀀스 → 특징 추출 → GRU(v2) 예측 → 라벨/확률 반환
@app.post("/predict")
def predict(req: PredictRequest):
    if len(req.frames) != FRAME_TARGET:
        return {"error": "프레임 수가 90이 아닙니다."}

    # 모델 & 라벨 로드
    model_path = os.path.join(MODEL_DIR, f"{req.category}_model.pth")
    label_map_path = os.path.join(MODEL_DIR, f"{req.category}_label_map.pkl")
    if not os.path.exists(model_path) or not os.path.exists(label_map_path):
        return {"error": "모델/라벨맵 파일 없음"}

    with open(label_map_path, "rb") as f:
        label_map = pickle.load(f)
    idx_to_label = {v: k for k, v in label_map.items()}

    model = KeypointGRUModelV2(input_dim=152, attn_dim=146, num_classes=len(label_map)).to(DEVICE)
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.eval()

    # 프레임 처리 → feature 추출
    sequence = []
    for frame_base64 in req.frames:
        image_bytes = base64.b64decode(frame_base64.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)
        feature = extract_feature(image_np)
        sequence.append(feature)

    input_tensor = torch.tensor(np.array(sequence), dtype=torch.float32).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = model(input_tensor)
        prob = torch.softmax(logits, dim=-1)
        pred = torch.argmax(prob, dim=-1).item()
        confidence = prob[0, pred].item()

    return {"label": idx_to_label[pred], "prob": round(confidence, 4)}

# 8) 앱 실행 : 개발/로컬 테스트용 엔트리포인트
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
