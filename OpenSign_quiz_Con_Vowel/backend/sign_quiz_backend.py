"""
OpenSign 퀴즈(자모) 백엔드(FastAPI) 메인 모듈

목적 :
- 프론트엔드에서 전달한 단일 프레임 랜드마크(길이 42)를 입력받아, Keras 모델로 자모를 예측한다.
- 퀴즈 시나리오에 맞게 정오 여부와 신뢰도를 함께 반환한다.

입력 형식 :
- /predict, /predict_jiha : JSON { landmarks: 길이 42의 부동소수 리스트, label: 선택(정답 라벨) }

출력 형식 :
- { prediction: 문자열, confidence: 0~100 실수(%) [, target_label, is_correct] }

주의 :
- 입력 landmarks는 21개 포인트의 (x, y)를 순서대로 평탄화한 길이 42 벡터여야 한다.
- 전처리는 utils.preprocess로 학습 파이프라인과 동일하게 적용한다.
"""
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
from tensorflow.keras.models import load_model
from utils import preprocess

app = FastAPI()

# 1) CORS 설정 : 프론트엔드와의 통신 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2) 모델 및 라벨 로딩 : 파일명/경로는 기존 규칙 유지
model = load_model("sign_model_combined.h5")
with open("label_encoder_combined.pkl", "rb") as f:
    label_encoder = pickle.load(f)

# 3) 입력 스키마 : landmarks는 길이 42(21×2) 가정
class LandmarkData(BaseModel):
    # 프론트에서 label을 같이 보내고 있으므로 optional 로 받음
    landmarks: list[float]  # length = 42 (x,y * 21)
    label: str | None = None

# 4) 공통 예측 함수 : 전처리 → 예측 → 라벨/신뢰도 반환
def _predict_core(landmarks: list[float]):
    """길이 42 벡터를 입력받아 (예측라벨, 신뢰도%)를 반환한다."""
    if len(landmarks) != 42:
        return {"error": "Expected 42 values for 21 (x,y) landmarks"}

    # 전처리 → (1, 42)
    preprocessed = preprocess(landmarks)
    x = np.expand_dims(preprocessed, axis=0)

    # 예측
    prob = model.predict(x, verbose=0)[0]        # shape: (num_classes,)
    class_idx = int(np.argmax(prob))
    confidence = float(prob[class_idx]) * 100.0
    predicted_label = label_encoder.inverse_transform([class_idx])[0]

    return predicted_label, confidence

# 5) 예측 API : 기존 경로 유지(/predict)
@app.post("/predict")
async def predict(data: LandmarkData):
    """자모 예측 및 선택적으로 정오 판정 반환"""
    result = _predict_core(data.landmarks)
    if isinstance(result, dict):  # 에러
        return result

    predicted_label, confidence = result
    resp = {
        "prediction": predicted_label,
        "confidence": confidence
    }
    # label 이 함께 왔다면 정오표시도 같이 돌려줌(프론트 편의용)
    if data.label is not None:
        resp["target_label"] = data.label
        resp["is_correct"] = (predicted_label == data.label and confidence >= 90.0)
    return resp

# 6) 별칭 엔드포인트 : 프론트에서 쓰는 경로 추가(/predict_jiha)
@app.post("/predict_jiha")
async def predict_jiha(data: LandmarkData):
    # 완전히 동일 로직
    return await predict(data)

# 7) 상태 체크
@app.get("/health")
async def health():
    return {"status": "ok"}
