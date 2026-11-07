import fileDialog from "file-dialog";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { GameConfig, fetchLocalGames } from "../config/games";

export interface LauncherProps {
  onSelectGame: (game: GameConfig) => void;
}

export function Launcher({ onSelectGame }: LauncherProps) {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [displayDir, setDisplayDir] = useState<string>("~/games/dos-box");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entryOverrides, setEntryOverrides] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customEntry, setCustomEntry] = useState("KOEI.COM");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchLocalGames();
      setGames(data.games);
      setDisplayDir(data.displayDir || "~/games/dos-box");
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "로컬 게임 디렉터리를 읽는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const hasOtherGames = useMemo(
    () =>
      games.some(
        (g) => g.category !== "original" && g.category !== "mods",
      ),
    [games],
  );

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        game.title.toLowerCase().includes(q) ||
        game.id.toLowerCase().includes(q) ||
        (game.originalTitle && game.originalTitle.toLowerCase().includes(q)) ||
        (game.description && game.description.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "original") {
        return game.category === "original";
      }
      if (selectedCategory === "mods") {
        return game.category === "mods";
      }
      if (selectedCategory === "other") {
        return game.category !== "original" && game.category !== "mods";
      }
      return true;
    });
  }, [games, searchQuery, selectedCategory]);

  const handleLaunchGame = (game: GameConfig) => {
    const chosenEntry = entryOverrides[game.id] || game.entry;
    onSelectGame({
      ...game,
      entry: chosenEntry,
    });
  };

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
      badge: "커스텀 ZIP",
      sourceType: "custom-zip",
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
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-xl font-black tracking-wider text-amber-400 font-mono">
                WEB DOSBOX
              </h1>
              <span class="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Player v1.0
              </span>
              <span
                class="px-2 py-0.5 text-[11px] font-mono rounded bg-gray-900 text-emerald-300 border border-emerald-500/30"
                title="연동된 로컬 DOS 게임 디렉터리"
              >
                📂 {displayDir} ({games.length})
              </span>
            </div>
            <p class="text-xs text-gray-400">
              로컬 <code class="text-amber-300/90 font-mono">{displayDir}</code> 폴더의 DOS 게임을 브라우저에서 바로 실행하고 세이브를 직접 동기화합니다
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            class="launcher-btn-secondary"
            onClick={loadGames}
            disabled={isLoading}
            title={`${displayDir} 폴더 다시 스캔`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`size-4 text-amber-400 ${isLoading ? "animate-spin" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>목록 새로고침</span>
          </button>

          <button
            type="button"
            class="launcher-btn-secondary"
            onClick={() => setShowGuideModal(true)}
            title="새 게임을 로컬 폴더에 추가하는 방법 안내"
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
          <div class="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-lg flex-wrap">
            <button
              type="button"
              class={`px-3 py-1 text-xs rounded font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-amber-500 text-gray-950 font-bold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              전체 ({games.length})
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
            {hasOtherGames && (
              <button
                type="button"
                class={`px-3 py-1 text-xs rounded font-medium transition-all ${
                  selectedCategory === "other"
                    ? "bg-amber-500 text-gray-950 font-bold shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                onClick={() => setSelectedCategory("other")}
              >
                기타 로컬 게임
              </button>
            )}
          </div>

          <div class="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              placeholder="게임 검색 (제목, 폴더명 등)..."
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

        {/* Loading / Error State */}
        {loadError && (
          <div class="mb-6 p-4 rounded-xl border border-red-800/60 bg-red-950/30 text-xs text-red-300 flex items-center justify-between gap-4">
            <div>
              <div class="font-bold mb-0.5">로컬 게임 폴더 연결 오류</div>
              <div class="text-red-400">{loadError}</div>
            </div>
            <button
              type="button"
              onClick={loadGames}
              class="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 rounded text-white font-medium shrink-0"
            >
              다시 시도
            </button>
          </div>
        )}

        {isLoading && games.length === 0 ? (
          <div class="text-center py-20 border border-dashed border-gray-800 rounded-xl text-gray-400 text-sm font-mono">
            {displayDir} 디렉터리를 스캔하는 중...
          </div>
        ) : (
          <>
            {/* Game Cards Grid */}
            <div class="game-grid">
              {filteredGames.map((game) => {
                const activeEntry = entryOverrides[game.id] || game.entry;
                const execList = game.executables && game.executables.length > 0
                  ? game.executables
                  : [game.entry];

                return (
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
                            {game.title.slice(0, 2).toUpperCase()}
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
                          onClick={() => handleLaunchGame(game)}
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

                      <div class="flex flex-wrap items-center gap-1.5 my-2">
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

                        {execList.length > 1 ? (
                          <select
                            value={activeEntry}
                            onChange={(e) =>
                              setEntryOverrides((prev) => ({
                                ...prev,
                                [game.id]: (e.target as HTMLSelectElement).value,
                              }))
                            }
                            title="실행할 DOS 프로그램(.COM/.EXE/.BAT) 선택"
                            class="game-tag bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono border border-gray-700 cursor-pointer focus:outline-none focus:border-amber-400"
                          >
                            {execList.map((exe) => (
                              <option key={exe} value={exe}>
                                {exe}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span class="game-tag bg-gray-800 text-gray-400 font-mono">
                            {activeEntry}
                          </span>
                        )}
                      </div>

                      {game.description && (
                        <p class="game-card__desc">{game.description}</p>
                      )}

                      <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                        <div
                          class="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 truncate"
                          title={game.localPath || ""}
                        >
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span class="truncate">
                            {game.localPath || `저장: ${game.saveFile || "자동"}`}
                          </span>
                        </div>

                        <button
                          type="button"
                          class="game-card__quick-play shrink-0"
                          onClick={() => handleLaunchGame(game)}
                        >
                          플레이 ▶
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGames.length === 0 && (
              <div class="text-center py-16 border border-dashed border-gray-800 rounded-xl">
                {games.length === 0 ? (
                  <>
                    <p class="text-gray-300 text-sm font-medium">
                      <code class="text-amber-400 font-mono">{displayDir}</code> 폴더가 비어 있습니다.
                    </p>
                    <p class="text-gray-500 text-xs mt-1">
                      해당 경로에 DOS 게임 폴더나 .zip 파일을 넣은 뒤 &quot;목록 새로고침&quot;을 눌러주세요.
                    </p>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Info & Tips Box */}
        <div class="mt-12 p-5 rounded-xl border border-gray-800/80 bg-gray-900/40 backdrop-blur">
          <h3 class="text-xs font-bold text-gray-300 mb-3 flex items-center gap-2 uppercase tracking-wider font-mono">
            <span class="text-amber-400">💡</span> 기본 조작 가이드 & 로컬 동기화 안내
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
              <div class="font-medium text-gray-300">로컬 세이브 실시간 동기화</div>
              <div>게임 저장 시 <code class="text-gray-300 font-mono">{displayDir}</code> 원본 폴더에 자동 반영</div>
              <div>네이티브 DOSBox와 세이브 파일 100% 호환</div>
              <div>원본 초기 상태 자동 백업 및 세이브 초기화 지원</div>
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
                <span class="text-amber-400">🎮</span> 로컬 DOS 게임 추가 방법
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
                별도로 코드를 수정하거나 압축할 필요 없이 로컬{" "}
                <code class="text-amber-400 bg-gray-950 px-1.5 py-0.5 rounded font-mono">
                  {displayDir}
                </code>{" "}
                경로에 게임을 넣기만 하면 됩니다!
              </p>

              <div class="p-3 bg-gray-950 rounded border border-gray-800 space-y-2">
                <div class="font-semibold text-amber-300">
                  1단계: {displayDir} 아래에 게임 폴더 (또는 .zip) 복사
                </div>
                <div>
                  DOS 게임 폴더를 그대로 복사해 넣으세요. 실행 파일(.BAT / .COM / .EXE)을 자동으로 감지합니다.
                  <br />
                  <span class="text-gray-500 font-mono">
                    예: {displayDir}/sam3/MAIN.EXE 또는 {displayDir}/doom.zip
                  </span>
                </div>
              </div>

              <div class="p-3 bg-gray-950 rounded border border-gray-800 space-y-2">
                <div class="font-semibold text-amber-300">
                  2단계 (선택): 메타데이터 & 썸네일 지정
                </div>
                <div>
                  게임 폴더 안에{" "}
                  <code class="text-amber-400 bg-gray-900 px-1 py-0.5 rounded font-mono">
                    cover.png
                  </code>{" "}
                  이미지를 넣으면 카드 썸네일로 표시되며,{" "}
                  <code class="text-amber-400 bg-gray-900 px-1 py-0.5 rounded font-mono">
                    game.json
                  </code>{" "}
                  파일로 제목/설명/기본 실행 파일을 지정할 수 있습니다:
                </div>
                <pre class="p-2 bg-gray-900 text-gray-300 rounded font-mono text-[11px] overflow-x-auto">
{`{
  "title": "삼국지 3",
  "developer": "KOEI",
  "entry": "MAIN.EXE",
  "saveFile": "SAVEDATA.DAT"
}`}
                </pre>
              </div>

              <p class="text-gray-400">
                폴더를 넣은 후 상단의 <strong>&quot;목록 새로고침&quot;</strong> 버튼을 누르면 즉시 런처에 표시됩니다.
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
                <div class="flex gap-1.5 mt-1.5 flex-wrap">
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
