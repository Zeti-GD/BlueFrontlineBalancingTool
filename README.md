# Blue Frontline Balancing Tool (블루 프론트라인 밸런싱 툴)

> **블루 아카이브 팬게임 *MolluFPS*를 위한 정밀 교전 밸런스 분석 & 1v1 TTK 시뮬레이터**

![Figma Dark Theme](https://img.shields.io/badge/UI-Figma%20Dark%20Theme-18181b?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-35.0.0-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css)

---

## 🌟 핵심 기능 (Key Features)

1. **언리얼 엔진 5 에셋 직접 연동 (`MolluFPS/Content`)**
   - 언리얼 엔진의 캐릭터 블루프린트(`BP_*Health`, `BP_*SelectorLever`) 및 데이터 에셋(`DA_*Damage`)을 직접 스캔하여 캐릭터명(한글), 체력, 실드, RPM, 총기 대미지, 사거리, 감쇄율을 원클릭으로 추출·동기화합니다.

2. **다양한 기획 데이터 소스 지원**
   - **구글 스프레드시트**: 공유 링크 입력만으로 온라인 시트 데이터 실시간 반영
   - **로컬 파일 드래그 & 드롭**: 엑셀(`.xlsx`, `.xls`), CSV, 마크다운 기획서(`.md`) 전폭 지원

3. **정밀 1v1 맞대결 & 4단계 TTK 시뮬레이션**
   - 두 캐릭터 간의 실시간 맞대결 승패 확률 및 잔여 체력 예측
   - **4단계 TTK**: 순수 평타 TTK / 스킬1 콤보 TTK / 스킬2 콤보 TTK / 풀 콤보 TTK
   - 헤드샷 적중률(0~100%) 및 교전 거리(0~100m) 슬라이더 반영

4. **샷건 팰릿(Pellet) 계산 & 듀얼 무기 완벽 지원**
   - 산탄총(호시노 SG 등)의 팰릿 발사체 개수(1~32발) 및 집탄율 거리 감쇄 수식 반영
   - 호시노처럼 무기가 2개(샷건 + 권총)인 캐릭터의 무기 전환 및 스탯 개별 편집 지원

5. **총기군별 사실적 사거리 대미지 감쇄 (Range Falloff Engine)**
   - SMG(이즈나), AR(시로코), SG(호시노), SR 등 총기군별 고유 감쇄 곡선 적용
   - 중원거리 교전 시 총기군 간 상성 및 밸런스 역전 방지 완비

6. **피그마 다크 테마 (Figma Dark UI)**
   - 눈의 피로를 최소화한 딥 차콜(`#18181b`, `#23232a`) 및 피그마 블루(`#0d99ff`), 소프트 앰버 골드(`#e5a93c`) 팔레트 적용

7. **데이터 내보내기**
   - 밸런싱 작업 결과를 버튼 하나로 엑셀(`.xlsx`) 또는 `.json` 파일로 즉시 출력

---

## 🚀 빠른 시작 (Getting Started)

### 1. 포터블 실행 파일 실행 (무설치)
- 프로젝트 루트의 **`BlueFrontlineBalancingTool.exe`**를 더블클릭하면 즉시 실행됩니다.

### 2. 개발 환경에서 실행
```bash
# 의존성 패키지 설치
npm install

# 데스크톱 앱 개발 모드 실행
npm run electron:dev
```

### 3. 빌드 및 패키징
```bash
# 프론트엔드 빌드 및 Windows 단독 실행 파일 패키징
npm run electron:build
```

---

## 🛠️ 기술 스택 (Tech Stack)
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Desktop Runtime**: Electron 35
- **Data Visualization**: Chart.js, React-ChartJS-2, Lucide Icons
- **Data Parsing**: XLSX, PapaParse
