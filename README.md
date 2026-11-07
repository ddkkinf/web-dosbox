# Web DOSBox Player

웹 브라우저에서 실행되는 범용 클래식 DOS 게임 플레이어 및 런처입니다.  
`js-dos (v6.22)` WebAssembly 에뮬레이터를 기반으로 동작하며, 반응형 웹과 모바일 터치 조작(가상 조이스틱 및 가상 키패드)을 지원합니다.

## ✨ 주요 기능
- **게임 선택 런처 (Launcher UI)**: 등록된 게임 목록을 카드 형태로 둘러보고 바로 플레이
- **게임 추가 확장성**: `src/config/games.ts`에 메타데이터를 추가하고 `game/` 폴더에 `.zip` 파일만 넣으면 새 게임 즉시 등록
- **내 .zip 게임 직접 실행**: 브라우저에서 소장 중인 DOS 게임 압축파일(`.zip`)을 선택하여 즉시 구동
- **세이브 파일 브라우저 로컬 저장 (IndexedDB)**: 게임 진행 상황이 브라우저 로컬에 안전하게 자동 저장
- **세이브 백업/복원**: 세이브 파일 다운로드 및 사용자 세이브 파일 가져오기 기능 지원
- **터치 & 조작 지원**:
  - 모바일 가상 조이스틱
  - 온스크린 가상 숫자/단축 키패드 토글
  - 전체 화면 모드 지원

## 🚀 실행 방법

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

## 🎮 새 게임 추가하는 방법

1. **게임 압축 파일 준비**:
   - 게임 실행 파일과 에셋들을 zip으로 압축합니다 (예: `game.zip`).
   - `game/` 폴더 아래에 넣습니다 (`game/game.zip`).
2. **`src/config/games.ts` 에 설정 추가**:
   ```ts
   {
     id: "sam3",
     title: "삼국지 3",
     originalTitle: "Romance of the Three Kingdoms III",
     releaseYear: 1992,
     developer: "KOEI",
     genre: "전략 시뮬레이션",
     description: "중국 후한 말을 배경으로 군웅들이 천하 통일을 겨루는 역사 시뮬레이션 명작.",
     gameFile: "sam3.zip",
     entry: "MAIN.EXE",
     saveFile: "SAVEDATA.DAT",
     coverImage: "/static/sam3_thumb.png",
   }
   ```
3. 저장 후 `npm run dev` 또는 `npm run build`를 실행하면 자동으로 런처 목록에 표시되고 바로 실행할 수 있습니다.
