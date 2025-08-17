// OpenSign_Final/OpenSign_quiz_Con_Vowel/frontend/jiha_quiz.js

function goHome() {
  // 지화 퀴즈 → 홈으로
  location.href = '../../../home/index.html';
}

let currentWord = null;

const consonantsVowels = [
  "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ",
  "ㅋ", "ㅌ", "ㅍ", "ㅎ", "ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ",
  "ㅜ", "ㅠ", "ㅡ", "ㅣ", "ㅐ", "ㅔ", "ㅚ", "ㅟ", "ㅒ", "ㅖ", "ㅢ"
];

// 문제 생성
function generateQuestion() {
  const randomIndex = Math.floor(Math.random() * consonantsVowels.length);
  currentWord = consonantsVowels[randomIndex];
  document.getElementById("quizWord").textContent = currentWord;
  document.getElementById("progress-text").textContent = "🕐 준비되면 시작 버튼을 눌러주세요";
}

// 시작 버튼 클릭 시 실행
function startQuiz() {
  const statusText = document.getElementById("progress-text");
  statusText.textContent = "🖐 손 모양을 2초간 유지하세요...";

  setTimeout(async () => {
    statusText.textContent = "📡 서버로 전송 중...";

    const video = document.getElementById("quizVideo");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const hands = new Hands({locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1 });
    hands.onResults(async (results) => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        showPopup("⚠ 손이 인식되지 않았습니다!", "orange");
        statusText.textContent = "다시 시도해주세요.";
        return;
      }

      const hand = results.multiHandLandmarks[0];
      const landmarks = hand.flatMap(p => [p.x, p.y]);

      try {
        // ⚠️ 백엔드가 landmarks 방식의 별도 엔드포인트를 제공해야 합니다.
        // 예: POST http://localhost:8000/predict_jiha  (추천)
        const res = await fetch("http://localhost:8000/predict_jiha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: currentWord, landmarks })
        });

        const data = await res.json();
        const predicted = data.prediction;
        const confidence = data.confidence;

        if (predicted === currentWord && confidence >= 90.0) {
          showPopup("✅ 정답입니다!", "green");
        } else {
          showPopup(`❌ 오답입니다\n(${predicted}, ${confidence.toFixed(1)}%)`, "orange");
        }

        statusText.textContent = "완료되었습니다.";
      } catch (err) {
        console.error("서버 통신 오류:", err);
        statusText.textContent = "서버 응답 실패";
      }
    });

    // Mediapipe 입력 전달
    const mpImage = new ImageCapture(video.srcObject.getVideoTracks()[0]);
    mpImage.grabFrame().then(frame => {
      hands.send({ image: frame });
    });

  }, 2000);  // 2초 대기 후 실행
}

// 팝업 표시 및 다음 문제
function showPopup(text, color) {
  const popup = document.getElementById("popupResult");
  popup.style.backgroundColor = color;
  popup.textContent = text;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
    generateQuestion();
    document.getElementById("progress-text").textContent = "🕐 준비되면 시작 버튼을 눌러주세요";
  }, 2000);
}

// 웹캠 연결 및 문제 생성
window.onload = () => {
  generateQuestion();
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    document.getElementById('quizVideo').srcObject = stream;
  });
};
