# Web DOSBox Player

웹 브라우저에서 실행되는 로컬 연동형 클래식 DOS 게임 플레이어 및 런처입니다.  
`js-dos (v6.22)` WebAssembly 에뮬레이터를 기반으로 동작하며, 로컬 `~/games/dos-box` 디렉터리의 DOS 게임들을 코드 수정이나 별도 압축 없이 자동으로 스캔하여 실행하고 세이브 파일을 원본 폴더와 직접 동기화합니다.

## ✨ 주요 기능
- **로컬 디렉터리 자동 마운트 (`~/games/dos-box`)**: `${HOME}/games/dos-box` 아래에 있는 DOS 게임 폴더(및 `.zip` 아카이브)를 자동으로 감지해 런처 카드로 표시
- **실행 파일 자동 탐색 및 선택**: 폴더 내 `.BAT`, `.COM`, `.EXE` 실행 파일을 자동 감지하며, 카드에서 실행할 파일을 바로 전환 가능
- **로컬 세이브 파일 직접 동기화**: 게임 내에서 저장하면 브라우저 캐시가 아닌 실제 `~/games/dos-box/<게임폴더>/` 안의 파일에 즉시 반영 (네이티브 DOSBox와 세이브 호환, 최초 덮어쓰기 전 `.backup/` 자동 보존 및 초기화 지원)
- **내 .zip 게임 직접 실행**: 임의 위치의 `.zip` 압축파일을 브라우저에서 선택하여 즉시 구동 가능
- **터치 & 조작 지원**:
  - 모바일 가상 조이스틱
  - 온스크린 가상 숫자/단축 키패드 토글
  - 전체 화면 모드 지원

## 🚀 실행 방법

```bash
# 개발 서버 시작 (기본 경로: ~/games/dos-box)
npm run dev

# 다른 로컬 경로를 지정하여 실행하고 싶을 때
GAMES_DIR=/path/to/dos-games npm run dev

# 프로덕션 빌드 및 미리보기 서버 실행
npm run build
npm run preview
```

## 🎮 새 게임 추가하는 방법

1. **게임 폴더 복사**:
   - 소장 중인 DOS 게임 폴더(또는 `.zip` 파일)를 `~/games/dos-box` 아래에 복사합니다.
   - 예: `~/games/dos-box/sam3/` (`MAIN.EXE` 등 포함)
2. **런처에서 `목록 새로고침` 클릭**:
   - 서버 재시작 없이 즉시 새 게임 카드가 나타납니다.
3. **(선택) 메타데이터 및 썸네일 커스터마이징**:
   - 게임 폴더 안에 `cover.png` (또는 `cover.jpg`, `cover.webp`)를 넣으면 카드 커버 이미지로 표시됩니다.
   - 게임 폴더 안에 `game.json`을 추가하면 제목/설명/기본 실행 파일 등을 지정할 수 있습니다:
   ```json
   {
     "title": "삼국지 3",
     "originalTitle": "Romance of the Three Kingdoms III",
     "releaseYear": 1992,
     "developer": "KOEI",
     "genre": "전략 시뮬레이션",
     "description": "중국 후한 말을 배경으로 군웅들이 천하 통일을 겨루는 역사 시뮬레이션 명작.",
     "entry": "MAIN.EXE",
     "saveFile": "SAVEDATA.DAT",
     "badge": "전략 명작"
   }
   ```
