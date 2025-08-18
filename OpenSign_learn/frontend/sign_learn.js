// OpenSign_learn/frontend/sign_learn.js
function goHome() {
  // 학습(frontend) → 홈으로
  location.href = '../../home/index.html';
}

let currentWord = null;      // 현재 선택된 단어
let currentCategory = null;  // 현재 카테고리
let wordList = [];           // 해당 카테고리의 라벨 목록

// 백엔드의 정적 파일/API 호스트 (필요 시 수정)
const BACKEND_ORIGIN = 'http://localhost:8000';

// UI 엘리먼트 참조
const els = {
  category: () => document.getElementById('signCategoryLearn'),
  currentWord: () => document.getElementById('currentWord'),
  expertVideo: () => document.getElementById('expertVideo'),
  expertFallback: () => document.getElementById('expertFallback'),
  expertOpenLink: () => document.getElementById('expertOpenLink'),
  learnVideo: () => document.getElementById('learnVideo'),
  wordNav: () => document.getElementById('wordNav'),
  progressText: () => document.getElementById('progress-text'),
  popup: () => document.getElementById('popupResult'),
};

// ─────────────────────────────────────────────
// 카테고리 변경 → 라벨 불러오고 첫 단어 선택
// ─────────────────────────────────────────────
async function onCategoryChange() {
  currentCategory = els.category().value;
  await loadLabels(currentCategory);
  if (wordList.length > 0) {
    selectWord(wordList[0]); // 첫 단어 기본 선택
  } else {
    currentWord = null;
    els.currentWord().textContent = '단어 없음';
    const v = els.expertVideo();
    v.removeAttribute('src');
    v.load();
    hideFallback();
  }
}

// 라벨 로드 후 우측 내비 채우기
async function loadLabels(category) {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/labels?category=${encodeURIComponent(category)}`);
    const words = await res.json();
    wordList = Array.isArray(words) ? words : [];
    renderWordNav();
  } catch (e) {
    console.error('라벨 로드 실패:', e);
    wordList = [];
    renderWordNav();
  }
}

// 우측 세로 내비 렌더링
function renderWordNav() {
  const nav = els.wordNav();
  nav.innerHTML = '';
  if (wordList.length === 0) {
    const empty = document.createElement('div');
    empty.style.fontSize = '0.95rem';
    empty.style.color = '#666';
    empty.textContent = '단어가 없습니다.';
    nav.appendChild(empty);
    return;
  }

  wordList.forEach((w) => {
    const btn = document.createElement('button');
    btn.className = 'word-item' + (w === currentWord ? ' active' : '');
    btn.textContent = w;
    btn.onclick = () => selectWord(w);
    nav.appendChild(btn);
  });
}

// 단어 선택 → 현재 단어 표시 + 전문가 영상 변경 (mp4 → avi 폴백)
function selectWord(word) {
  currentWord = word;
  els.currentWord().textContent = word;

  const video = els.expertVideo();
  const basePath = `${BACKEND_ORIGIN}/static/experts/${encodeURIComponent(currentCategory)}/${encodeURIComponent(word)}`;

  const canMp4 = video.canPlayType('video/mp4');
  const candidates = [];
  if (canMp4) candidates.push({ src: `${basePath}.mp4`, type: 'video/mp4' });
  candidates.push({ src: `${basePath}.mp4`, type: 'video/mp4' }); // mp4 404 대비
  candidates.push({ src: `${basePath}.avi`, type: 'video/x-msvideo' }); // 최종 폴백

  tryLoadSequential(video, candidates, 0);
}

function tryLoadSequential(video, list, idx) {
  hideFallback();
  if (idx >= list.length) {
    console.error('[전문가 영상 로드 실패] 모든 포맷 시도 종료', list);
    toast('전문가 영상을 재생할 수 없어요. 새 탭으로 열어 확인하세요.');
    const last = list[list.length - 1];
    if (last) showFallback(last.src);
    return;
  }

  const { src } = list[idx];
  video.onerror = () => {
    console.warn(`[영상 로드 실패: ${src}] 다음 후보 시도`);
    tryLoadSequential(video, list, idx + 1);
  };
  video.onloadeddata = () => {
    console.log('[전문가 영상 로드 성공]', src);
    hideFallback();
  };

  video.src = src;
  video.load();

  if (src.endsWith('.avi')) {
    showFallback(src); // avi는 브라우저 미지원 가능성 높아 링크도 함께 제공
  }
}

function showFallback(src) {
  const wrap = els.expertFallback();
  const link = els.expertOpenLink();
  link.href = src;
  wrap.classList.remove('hidden');
}
function hideFallback() {
  els.expertFallback().classList.add('hidden');
}

// 간단 토스트
function toast(msg) {
  const p = els.popup();
  p.style.backgroundColor = 'orange';
  p.textContent = msg;
  p.style.display = 'block';
  setTimeout(() => { p.style.display = 'none'; }, 1600);
}

// ─────────────────────────────────────────────
// 90프레임 수집 (진행 바 없이 텍스트만)
// ─────────────────────────────────────────────
function startLearnCollection() {
  const videoEl = els.learnVideo();
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  const ctx = canvas.getContext('2d');

  if (!currentCategory || !currentWord) {
    alert('카테고리를 선택하고 단어를 선택해주세요.');
    return;
  }

  let collected = 0;
  const frames = [];
  const interval = 33; // ≈30fps → 90프레임 ≈ 3초

  els.progressText().textContent = `0 / 90 프레임 수집 중...`;

  function capture() {
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL('image/png'));
    collected++;

    els.progressText().textContent = `${collected} / 90 프레임 수집 중...`;

    if (collected < 90) {
      setTimeout(capture, interval);
    } else {
      els.progressText().textContent = `90프레임 수집 완료! 분석 중...`;
      sendFramesToBackend(frames);
    }
  }

  capture();
}

// ─────────────────────────────────────────────
// 백엔드로 전송 → 피드백 팝업
// ─────────────────────────────────────────────
async function sendFramesToBackend(frames) {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: currentCategory, frames }),
    });
    const result = await res.json();
    console.log('예측 결과:', result);

    const popup = els.popup();
    if (result && result.label === currentWord && result.prob >= 0.9) {
      popup.style.backgroundColor = 'green';
      popup.textContent = '✅ 잘했어요! 정답입니다.';
    } else {
      popup.style.backgroundColor = 'orange';
      popup.textContent = '⚠ 조금만 더! 손 모양과 위치를 확인해보세요.';
    }
    popup.style.display = 'block';

    // 2초 후 팝업 숨기고 진행 텍스트 초기화
    setTimeout(() => {
      popup.style.display = 'none';
      els.progressText().textContent = `0 / 90 프레임 수집 대기중...`;
    }, 2000);
  } catch (e) {
    console.error('예측 요청 실패:', e);
    els.progressText().textContent = `예측 요청 실패`;
    toast('예측 요청 실패');
  }
}

// ─────────────────────────────────────────────
// 페이지 로드: 웹캠 연결 + 초기 카테고리 로드
// ─────────────────────────────────────────────
window.onload = async () => {
  // 웹캠 연결
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    els.learnVideo().srcObject = stream;
  } catch (e) {
    console.error('웹캠 접근 실패:', e);
    toast('웹캠 접근 실패: 권한을 확인하세요.');
  }

  // 초기 카테고리 로드
  currentCategory = els.category().value;
  await onCategoryChange();
};
