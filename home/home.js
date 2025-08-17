// OpenSign_Final/home/home.js

// 현재 폴더 구조 기준 라우팅(상대경로)
const ROUTES = {
  signLearn: '../OpenSign_learn/frontend/sign_learn.html',
  signQuiz: '../OpenSign_quiz/frontend/sign_quiz.html',
  alphabetQuiz: '../OpenSign_quiz_Con_Vowel/OpenSign_quiz_Con_Vowel/frontend/jiha_quiz.html',
};

function goLearn(type) {
  if (type === 'sign') {
    location.href = ROUTES.signLearn;
  }
}

function goQuiz(type) {
  if (type === 'sign') {
    location.href = ROUTES.signQuiz;
  } else if (type === 'alphabet') {
    location.href = ROUTES.alphabetQuiz;
  }
}
