import fileDialog from "file-dialog";
import { useMemo, useState } from "preact/hooks";
import { GAMES, GameConfig } from "../config/games";

export interface LauncherProps {
  onSelectGame: (game: GameConfig) => void;
}

export function Launcher({ onSelectGame }: LauncherProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customEntry, setCustomEntry] = useState("KOEI.COM");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Filtered games
  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.originalTitle &&
          game.originalTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (game.description &&
          game.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "original") {
        return game.id === "water2" || game.id === "water2_correction";
      }
      if (selectedCategory === "mods") {
        return game.id.includes("mod") || game.id.includes("junghwa") || game.id.includes("ernst") || game.id.includes("miranda") || game.id.includes("salvador");
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const handlePickCustomZip = async () => {
    const files = await fileDialog({ accept: ".zip" });
    if (files && files[0]) {
      const file = files[0];
      setCustomFile(file);
      setCustomTitle(file.name.replace(/\.zip$/i, ""));
      setShowCustomModal(true);
    }
  };

  const handleLaunchCustom = () => {
    if (!customFile) return;
    const objectUrl = URL.createObjectURL(customFile);
    const customConfig: GameConfig = {
      id: `custom_${Date.now()}`,
      title: customTitle || customFile.name.replace(/\.zip$/i, ""),
      genre: "사용자 커스텀 게임",
      gameFile: objectUrl,
      entry: customEntry.trim() || "KOEI.COM",
      saveFile: "SAVE.DAT",
      description: `업로드 파일: ${customFile.name}`,
      badge: "커스텀",
    };
    onSelectGame(customConfig);
  };

  return (
    <div class="launcher-container">
      {/* Top Header */}
      <header class="launcher-header">
        <div class="flex items-center gap-3.5">
          <div class="launcher-logo-icon">
            <span>DOS</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-black tracking-wider text-amber-400 font-mono">
                WEB DOSBOX
              </h1>
              <span class="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Player v1.0
              </span>
            </div>
            <p class="text-xs text-gray-400">
              브라우저에서 설치 없이 바로 즐기는 고전 명작 DOS 게임
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="launcher-btn-secondary"
            onClick={() => setShowGuideModal(true)}
            title="새 게임을 직접 추가하는 방법 안내"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4 text-sky-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            </svg>
            <span>게임 추가 방법</span>
          </button>

          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-medium transition-all shadow-sm shadow-emerald-950"
            onClick={handlePickCustomZip}
            title="소장 중인 .zip 게임 파일을 직접 올려서 실행"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span>내 .zip 게임 실행</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main class="launcher-main">
        {/* Controls Bar: Search & Category Tabs */}
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-lg">
            <button
              type="button"
              class={`px-3 py-1 text-xs rounded font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-amber-500 text-gray-950 font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              전체 ({GAMES.length})
            </button>
            <button
              type="button"
              class={`px-3 py-1 text-xs rounded font-medium transition-all ${
                selectedCategory === "original"
                  ? "bg-amber-500 text-gray-950 font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setSelectedCategory("original")}
            >
              원본 & 교정판
            </button>
            <button
              type="button"
              class={`px-3 py-1 text-xs rounded font-medium transition-all ${
                selectedCategory === "mods"
                  ? "bg-amber-500 text-gray-950 font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setSelectedCategory("mods")}
            >
              외전 & 확장 모드
            </button>
          </div>

          <div class="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              placeholder="게임 검색 (제목, 제작사 등)..."
              class="w-full px-3 py-1.5 pl-8 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/60"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Game Cards Grid */}
        <div class="game-grid">
          {filteredGames.map((game) => (
            <div key={game.id} class="game-card group">
              {/* Game Thumbnail / Cover */}
              <div class="game-card__media">
                {game.coverImage ? (
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    class="game-card__img"
                  />
                ) : (
                  <div class="game-card__placeholder">
                    <span class="font-mono text-4xl text-gray-600 font-bold">
                      {game.title.slice(0, 2)}
                    </span>
                  </div>
                )}

                {/* Badge Overlay */}
                {game.badge && (
                  <div class="absolute top-2.5 left-2.5 z-10">
                    <span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/90 text-gray-950 shadow-md">
                      {game.badge}
                    </span>
                  </div>
                )}

                {game.version && (
                  <div class="absolute top-2.5 right-2.5 z-10">
                    <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-gray-900/80 text-gray-300 border border-gray-700/50 backdrop-blur-sm">
                      {game.version}
                    </span>
                  </div>
                )}

                {/* Hover Play Button */}
                <div class="game-card__overlay">
                  <button
                    type="button"
                    class="game-card__play-btn"
                    onClick={() => onSelectGame(game)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="size-7"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>게임 시작</span>
                  </button>
                </div>
              </div>

              {/* Game Info */}
              <div class="game-card__body">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h2 class="game-card__title">{game.title}</h2>
                    {game.originalTitle && (
                      <p class="game-card__subtitle">{game.originalTitle}</p>
                    )}
                  </div>
                  {game.releaseYear && (
                    <span class="game-card__year">{game.releaseYear}</span>
                  )}
                </div>

                <div class="flex flex-wrap gap-1.5 my-2">
                  {game.developer && (
                    <span class="game-tag bg-blue-950/60 text-blue-300 border border-blue-800/40">
                      {game.developer}
                    </span>
                  )}
                  {game.genre && (
                    <span class="game-tag bg-amber-950/60 text-amber-300 border border-amber-800/40">
                      {game.genre}
                    </span>
                  )}
                  <span class="game-tag bg-gray-800 text-gray-400 font-mono">
                    {game.entry}
                  </span>
                </div>

                {game.description && (
                  <p class="game-card__desc">{game.description}</p>
                )}

                <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                  <div class="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>저장: {game.saveFile || "SAVE.DAT"}</span>
                  </div>

                  <button
                    type="button"
                    class="game-card__quick-play"
                    onClick={() => onSelectGame(game)}
                  >
                    플레이 ▶
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div class="text-center py-16 border border-dashed border-gray-800 rounded-xl">
            <p class="text-gray-400 text-sm">
              &quot;{searchQuery}&quot;에 일치하는 게임을 찾을 수 없습니다.
            </p>
            <button
              type="button"
              class="mt-3 text-xs text-amber-400 underline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              전체 목록 보기
            </button>
          </div>
        )}

        {/* Info & Tips Box */}
        <div class="mt-12 p-5 rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur">
          <h3 class="text-xs font-bold text-gray-300 mb-3 flex items-center gap-2 uppercase tracking-wider font-mono">
            <span class="text-amber-400">💡</span> 기본 조작 가이드 & 브라우저 팁
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
            <div class="space-y-1">
              <div class="font-medium text-gray-300">키보드 조작</div>
              <div>방향키: 이동 및 메뉴 선택</div>
              <div>Enter / Space: 확인 및 대화 진행</div>
              <div>Esc: 취소 및 이전 메뉴</div>
              <div>숫자패드 또는 UIO/JKL/M,.: 대각선 이동</div>
            </div>
            <div class="space-y-1">
              <div class="font-medium text-gray-300">모바일 / 터치 지원</div>
              <div>화면 터치 가상 조이스틱 내장</div>
              <div>화면 하단 대항해시대2 전용 키패드 토글 가능</div>
              <div>가로 모드(Landscape) 플레이 권장</div>
            </div>
            <div class="space-y-1">
              <div class="font-medium text-gray-300">세이브 파일 보존</div>
              <div>브라우저 IndexedDB 로컬에 자동 보관</div>
              <div>게임 화면 상단 메뉴에서 다운로드 백업 가능</div>
              <div>PC ↔ 모바일 간 세이브 파일 이동 지원</div>
            </div>
          </div>
        </div>
      </main>

      {/* Guide Modal: How to add games */}
      {showGuideModal && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div class="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span class="text-amber-400">🎮</span> 새 고전 게임 영구 추가 방법
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                class="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4 text-xs text-gray-300 leading-relaxed">
              <p>
                새로운 DOS 게임을 런처 목록에 영구적으로 등록하려면 아래 2단계만 진행하시면 됩니다:
              </p>

              <div class="p-3 bg-gray-950 rounded border border-gray-800 space-y-2">
                <div class="font-semibold text-amber-300">
                  1단계: 게임 압축 파일 넣기
                </div>
                <div>
                  게임 실행 파일과 에셋들을 zip으로 압축한 뒤, 프로젝트 폴더 아래{" "}
                  <code class="text-amber-400 bg-gray-900 px-1 py-0.5 rounded">
                    game/
                  </code>{" "}
                  디렉터리에 복사합니다.
                  <br />
                  <span class="text-gray-500 font-mono">예: game/sam3.zip</span>
                </div>
              </div>

              <div class="p-3 bg-gray-950 rounded border border-gray-800 space-y-2">
                <div class="font-semibold text-amber-300">
                  2단계: games.ts 에 설정 추가
                </div>
                <div>
                  <code class="text-amber-400 bg-gray-900 px-1 py-0.5 rounded">
                    src/config/games.ts
                  </code>{" "}
                  파일의 <code class="text-gray-400">GAMES</code> 배열에 추가:
                </div>
                <pre class="p-2 bg-gray-900 text-gray-300 rounded font-mono text-[11px] overflow-x-auto">
{`{
  id: "sam3",
  title: "삼국지 3",
  gameFile: "sam3.zip",
  entry: "MAIN.EXE",
  saveFile: "SAVEDATA.DAT"
}`}
                </pre>
              </div>

              <p class="text-gray-400">
                파일을 저장하면 런처 화면에 게임 카드가 즉시 생성되며 클릭 한 번으로 플레이할 수 있습니다.
              </p>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                class="px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded text-xs text-gray-950 font-bold transition-colors"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Game Zip Modal */}
      {showCustomModal && customFile && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div class="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-800">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span class="text-emerald-400">📦</span> 커스텀 게임 실행
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                class="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p class="text-xs text-gray-400 leading-relaxed">
              선택한 ZIP 파일 안에서 실행할 메인 실행 파일(.COM, .EXE, .BAT) 이름을 지정하세요.
            </p>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-mono text-gray-400 mb-1">
                  게임 제목
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onInput={(e) => setCustomTitle((e.target as HTMLInputElement).value)}
                  class="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-mono text-gray-400 mb-1">
                  실행 파일명
                </label>
                <input
                  type="text"
                  value={customEntry}
                  onInput={(e) => setCustomEntry((e.target as HTMLInputElement).value)}
                  class="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-white focus:border-amber-400 focus:outline-none font-mono"
                  placeholder="KOEI.COM 또는 PLAY.BAT"
                />
                <div class="flex gap-1.5 mt-1.5">
                  {["KOEI.COM", "PLAY.BAT", "START.BAT", "GAME.EXE", "MAIN.EXE"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomEntry(preset)}
                      class="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-300 font-mono"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div class="p-3 bg-gray-950 rounded text-xs text-gray-400 space-y-1 font-mono border border-gray-800">
                <div>파일명: {customFile.name}</div>
                <div>크기: {(customFile.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLaunchCustom}
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white font-bold transition-colors"
              >
                게임 구동 시작 ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
