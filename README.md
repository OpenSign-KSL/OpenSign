# OpenSign Web 사용방법

## 1. 라이브러리 설치

1. requirements.txt가 있는 폴더로 이동
2. 다음 명령으로 설치

```text
pip install -r requirements.txt
```
---

## 2. 페이지별 서버 실행 (테스트할 서버만 실행)
### 2-1. 수화 학습하기 서버

1. 폴더 이동
```text
cd OpenSign_learn\backend
```

2. 서버 실행
```text
uvicorn main:app --reload
```

3. 프런트 열기
- OpenSign_learn\frontend\sign_learn.html 파일을 브라우저로 열기
- 웹캠 권한 허용

4. 사용
- 카테고리 선택 → 단어 영상 시청 → [시작] 버튼으로 따라 하기
- 결과 팝업 확인

- HTML을 파일로 직접 열 때 카메라 권한이 막히면 간단 서버로 띄우세요:
```text
cd OpenSign_learn\frontend
python -m http.server 8080
# 브라우저: http://127.0.0.1:8080/sign_learn.html
```

---

### 2-2. 수화 퀴즈 서버

1. 폴더 이동
```text
cd OpenSign_quiz\backend
```

2. 서버 실행 (프로젝트 구조에 따라 둘 중 하나)
```text
uvicorn main:app --reload
```

3. 프런트 열기
```text
OpenSign_quiz\frontend\sign_quiz.html
```

4. 사용

- 웹캠 허용 → 카테고리 선택 → [시작] 클릭
- 제시된 단어에 맞춰 수화 → 결과 팝업 확인

---

### 2-3. 지화 퀴즈(자음/모음) 서버

1. 폴더 이동
```text
cd OpenSign_quiz_Con_Vowel\OpenSign_quiz_Con_Vowel\backend
```

2. 서버 실행
```text
uvicorn sign_quiz_backend:app --reload
```

3. 프런트 열기
```text
OpenSign_quiz_Con_Vowel\OpenSign_quiz_Con_Vowel\frontend\jiha_quiz.html
```

4. 사용
- [시작] 버튼으로 퀴즈 진행

---

## 3. 참고/문제 해결

- 포트 충돌: --port 8001 처럼 다른 포트 지정
- 카메라가 안 잡힘: https 또는 localhost에서만 허용되는 브라우저가 있어요. 위의 python -m http.server로 로컬 서버에서 열어보세요.
- 서버 종료: 터미널에서 Ctrl + C
