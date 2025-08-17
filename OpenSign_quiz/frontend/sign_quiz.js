// OpenSign_quiz/frontend/sign_quiz.js
function goHome() {
  // 퀴즈(frontend) → 홈으로
  location.href = '../../home/index.html';
}

let currentWord = null;  // 현재 문제 단어

// ───── 카테고리 선택 시 단어 로드 & 문제 생성 ─────
async function generateQuestion() {
  const category = document.getElementById('signCategoryQuiz').value;

  try {
    // 백엔드에서 pkl 기반 라벨 리스트 가져오기
    const res = await fetch(`http://localhost:8000/labels?category=${encodeURIComponent(category)}`);
    const words = await res.json();

    if (!Array.isArray(words) || words.length === 0) {
      document.getElementById('quizWord').textContent = "단어 없음";
      currentWord = null;
      return;
    }

    // 랜덤 단어 선택
    const randomWord = words[Math.floor(Math.random() * words.length)];
    currentWord = randomWord;
    document.getElementById('quizWord').textContent = randomWord;
  } catch (err) {
    console.error("단어 로드 실패:", err);
    document.getElementById('quizWord').textContent = "단어 불러오기 실패";
  }
}

// ───── 90프레임 수집 시작 ─────
function startQuizCollection() {
  const videoEl = document.getElementById("quizVideo");
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  const ctx = canvas.getContext("2d");

  let collected = 0;
  const interval = 33; // 약 30fps → 90프레임 ≈ 3초
  const frames = [];

  function capture() {
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL("image/png"));

    collected++;
    const progress = (collected / 90) * 100;
    document.getElementById("progress-bar").style.width = `${progress}%`;
    document.getElementById("progress-text").textContent = `${collected} / 90 프레임 수집 중 (${progress.toFixed(0)}%)`;

    if (collected < 90) {
      setTimeout(capture, interval);
    } else {
      document.getElementById("progress-text").textContent = `90프레임 수집 완료! 분석 중...`;
      sendFramesToBackend(frames);
    }
  }

  capture();
}

// ───── 백엔드 전송 & 예측 결과 처리 ─────
async function sendFramesToBackend(frames) {
  const category = document.getElementById('signCategoryQuiz').value;

  try {
    const res = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: category, frames: frames })
    });

    const result = await res.json();
    console.log("예측 결과:", result);

    const popup = document.getElementById('popupResult');

    if (result.label === currentWord && result.prob >= 0.9) {
      popup.style.backgroundColor = "green";
      popup.textContent = "✅ 정답입니다!";
    } else {
      popup.style.backgroundColor = "orange";
      popup.textContent = "⚠ 다시 시도하세요!\n상체를 화면에 잘 맞추고,\n손 모양에 집중!";
    }
    popup.style.display = "block";

    // 팝업 종료 후 초기화
    setTimeout(() => {
      popup.style.display = "none";
      // 진행 텍스트 초기화
      document.getElementById("progress-bar").style.width = `0%`;
      document.getElementById("progress-text").textContent = `0 / 90 프레임 수집 대기중...`;
    }, 2000);

  } catch (err) {
    console.error("예측 요청 실패:", err);
  }
}

// ───── 페이지 로드 시 웹캠 연결 & 첫 문제 생성 ─────
window.onload = () => {
  generateQuestion();
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    document.getElementById('quizVideo').srcObject = stream;
  });
};
