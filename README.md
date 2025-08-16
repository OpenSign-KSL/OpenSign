# OpenSign: Real-time KSL EDU Tool

---

## 프로젝트 소개

**OpenSign** 프로젝트는 수어를 배우길 원하는 모든 사람들이 쉽게 사용할 수 있는 모션인식 기반 수어 교육 프로그램 입니다.
본 프로젝트는 사용자가 실시간으로 수어 동작을 하면, 해당 동작이 무엇인지 구분 및 예측 하는 것이 핵심입니다.

**OpenSign** 프로젝트 사용자에게서 웹캠으로 영상데이터(mp4 형식)를 입력 받으면 이를 좌표 데이터(npy 형식)로 전환하고, 
이를 학습된 모델에 거쳐 사용자에게 서비스를 제공합니다. 

**OpenSign** 프로젝트는 사용자가 반복적인 수어 동작을 함으로써 특정 단어에 대한 사용자의 수어 기억력 향상이라는 기대효과, 웹으로 제공되어 누구든지 쉽게 접근 가능하다는 기대효과가 있습니다. 수화 통역사의 영상을 보고 수어를 학습할 수 있는 것은 물론, 퀴즈 형식의 인터페이스 또한 제공되어 사용하기 편하게 제작됐습니다.
또한, 사용자의 동의를 얻은 후 수집되는 사용자의 데이터를 내부 학습 모델에서 재학습을 하게 됩니다. 이를 통해 부족한 한국 수어 데이터를 보완할 수 있습니다. 
마지막으로 오픈소스로 제공되어 수어 모델 학습 파이프라인을 사용하여 수어뿐만 아니라 다양한 동작을 프레임별 npy 배열로 저장해 다른 분야에 확장하여 적용할 수 있는 효과도 있습니다.

---
#### **하단의 번호를 누르면 자동으로 해당 WIKI 페이지로 넘어갑니다**

#### **목차**
1. [프로젝트 구성](https://github.com/jhparktime/OpenSign/wiki/1.-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B5%AC%EC%84%B1)
2. [실시간 지화 예측 모델](https://github.com/jhparktime/OpenSign/wiki/2.-%EC%8B%A4%EC%8B%9C%EA%B0%84-%EC%A7%80%ED%99%94-%EC%98%88%EC%B8%A1-%EB%AA%A8%EB%8D%B8)
3. [실시간 수화 예측 모델](https://github.com/jhparktime/OpenSign/wiki/3.-%EC%8B%A4%EC%8B%9C%EA%B0%84-%EC%88%98%ED%99%94-%EC%98%88%EC%B8%A1-%EB%AA%A8%EB%8D%B8)
4. [OpenSign Web 사용방법](https://github.com/jhparktime/OpenSign/wiki/4.-OpenSign-Web-%EC%82%AC%EC%9A%A9%EB%B0%A9%EB%B2%95)
5. [시연 영상](https://github.com/jhparktime/OpenSign/wiki/5.-%EC%8B%9C%EC%97%B0%EC%98%81%EC%83%81)
6. [라이선스](https://github.com/jhparktime/OpenSign/wiki/6.-%EB%9D%BC%EC%9D%B4%EC%84%A0%EC%8A%A4)

---
