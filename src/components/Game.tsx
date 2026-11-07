/* eslint-disable @typescript-eslint/no-explicit-any */
import fileDialog from "file-dialog";
import { saveAs } from "file-saver";
import nipple from "nipplejs";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

import {
  GameConfig,
  resetLocalGameFiles,
  uploadLocalGameFile,
} from "../config/games";
import { createDos } from "../dos/create-dos";
import {
  EventHandler,
  blockAddEventListener,
  createKeyboardEvent,
  getBlockedHandler,
  restoreAddEventListener,
} from "../event";
import {
  IdbFileSystem,
  createIdbFileSystem,
} from "../fs/create-idb-file-system";
import { detectFileChange } from "../fs/detect-file-change";
import {
  extractLocalBundleToDosFs,
  readDosFsFileCaseInsensitive,
  watchDosFsDirectoryChanges,
  writeDosFsFileCaseInsensitive,
} from "../fs/local-dir-sync";
import { VirtualKeyboard } from "./VirtualKeyboard";

const JOYSTICK_MAPS = [
  105, // ArrowRightUp
  104, // ArrowUp
  103, // ArrowLeftUp
  100, // ArrowLeft
  97, // ArrowLeftDown
  98, // ArrowDown
  99, // ArrowRightDown
  102, // ArrowRight
];

const KEY_ALIAS: Record<string, number> = {
  KeyR: 107, // +
  KeyE: 109, // -
  KeyW: 106, // *
  KeyQ: 111, // /

  // Tenkeyless diagonal (UIO/JKL/M,. → Numpad 789/456/123)
  KeyU: 103, // Numpad7 (LeftUp)
  KeyI: 104, // Numpad8 (Up)
  KeyO: 105, // Numpad9 (RightUp)
  KeyJ: 100, // Numpad4 (Left)
  KeyK: 101, // Numpad5 (Center)
  KeyL: 102, // Numpad6 (Right)
  KeyM: 97, // Numpad1 (LeftDown)
  Comma: 98, // Numpad2 (Down)
  Period: 99, // Numpad3 (RightDown)

  // Special
  ArrowLeftDown: 97,
  ArrowRightDown: 99,
  ArrowLeftUp: 103,
  ArrowRightUp: 105,

  Enter: 13, // NumpadEnter
  ArrowLeft: 100, // Numpad4
  ArrowUp: 104, // Numpad8
  ArrowRight: 102, // Numpad6
  ArrowDown: 98, // Numpad2
};

export interface GameProps {
  game: GameConfig;
  onExit: () => void;
}

export function Game({ game, onExit }: GameProps) {
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(480);

  const [joystickCode, setJoystickCode] = useState<number | null>(null);
  const joystickCodeBefore = useRef<number | null>(null);

  const [enabledToggleFns, setEnabledToggleFns] = useState(false);
  const [enabledToggleFullscreen, setEnabledToggleFullscreen] = useState(false);
  const [enabledToggleKeyboard, setEnabledToggleKeyboard] = useState(true);

  const screen = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mobileController = useRef<HTMLDivElement>(null);

  const isClearExit = useRef(false);
  const keydownHandlers = useRef<EventHandler[]>([]);
  const keyupHandlers = useRef<EventHandler[]>([]);

  const dosFsRef = useRef<any>(null);
  const ciRef = useRef<any>(null);
  const database = useRef<IdbFileSystem>();

  const isLocalDir = game.sourceType === "local-dir";
  const saveFile = game.saveFile || "SAVE.DAT";
  const modId = game.id;

  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [innerToastMessage, setInnerToastMessage] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (toastMessage) {
      setInnerToastMessage(toastMessage);
      const timeout = setTimeout(() => {
        setToastMessage(undefined);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [toastMessage]);

  const handleResize = useCallback(() => {
    if (!screen.current) return;
    const { width: screenWidth, height: screenHeight } =
      screen.current.getBoundingClientRect();
    if (screenWidth / 640 > screenHeight / 480) {
      setWidth(~~((screenHeight * 640) / 480));
      setHeight(screenHeight);
    } else {
      setWidth(screenWidth);
      setHeight(~~((screenWidth * 480) / 640));
    }
  }, []);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (isClearExit.current) {
      return;
    }
    e.preventDefault();
    return (e.returnValue =
      "페이지를 벗어나면 저장하지 않은 내용이 날아갈 수 있습니다.");
  }, []);

  const handleFullScreenChange = useCallback(() => {
    setEnabledToggleFullscreen(!!window.document.fullscreenElement);
  }, []);

  const handleKeyDown = useCallback((code: number) => {
    const event = createKeyboardEvent("keydown", code);
    keydownHandlers.current.forEach((handler) => handler(event));
  }, []);

  const handleKeyUp = useCallback((code: number) => {
    const event = createKeyboardEvent("keyup", code);
    keyupHandlers.current.forEach((handler) => handler(event));
  }, []);

  const handleDocumentKeyDown = useCallback(
    (e: KeyboardEvent) => {
      handleKeyDown(KEY_ALIAS[e.code] ?? e.keyCode);
    },
    [handleKeyDown],
  );

  const handleDocumentKeyUp = useCallback(
    (e: KeyboardEvent) => {
      handleKeyUp(KEY_ALIAS[e.code] ?? e.keyCode);
    },
    [handleKeyUp],
  );

  useEffect(() => {
    if (joystickCode === joystickCodeBefore.current) {
      return;
    }
    if (joystickCodeBefore.current) {
      handleKeyUp(joystickCodeBefore.current);
    }
    if (joystickCode) {
      handleKeyDown(joystickCode);
    }
    joystickCodeBefore.current = joystickCode;
  }, [joystickCode, joystickCodeBefore, handleKeyDown, handleKeyUp]);

  useEffect(() => {
    handleResize();

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("beforeunload", handleBeforeUnload);

    let disposed = false;
    let stopWatcher: (() => void) | undefined;
    let joystick: ReturnType<typeof nipple.create> | undefined;

    const boot = async () => {
      if (!canvas.current || !mobileController.current) return;

      joystick = nipple.create({
        zone: mobileController.current,
      });

      blockAddEventListener(document, ["keydown", "keyup", "keypress"]);

      try {
        const { fs, main } = await createDos(canvas.current);
        if (disposed) return;
        dosFsRef.current = fs;

        if (isLocalDir) {
          await extractLocalBundleToDosFs(fs, game.gameFile);
          if (disposed) return;

          stopWatcher = watchDosFsDirectoryChanges(fs, async (changedFiles) => {
            try {
              const savedNames: string[] = [];
              for (const item of changedFiles) {
                const res = await uploadLocalGameFile(
                  game.id,
                  item.relPath,
                  item.bytes,
                );
                savedNames.push(res.relPath);
              }
              setToastMessage(
                `로컬 폴더에 저장됨: ${savedNames.join(", ")}`,
              );
              isClearExit.current = true;
              setTimeout(() => {
                isClearExit.current = false;
              }, 5000);
            } catch (err) {
              console.error("Local save sync error:", err);
              setToastMessage("로컬 세이브 동기화 중 오류가 발생했습니다.");
            }
          });
        } else {
          const db = (database.current = await createIdbFileSystem(modId, 1));
          const extractUrl =
            game.gameFile.startsWith("blob:") ||
            game.gameFile.startsWith("http:") ||
            game.gameFile.startsWith("https:") ||
            game.gameFile.startsWith("/")
              ? game.gameFile
              : `/static/game/${game.gameFile}`;
          await fs.extract(extractUrl);
          if (disposed) return;

          if (saveFile) {
            const saveFileBody = await db.load(saveFile);
            if (saveFileBody) {
              writeDosFsFileCaseInsensitive(fs, saveFile, saveFileBody);
            }
          }

          if (saveFile) {
            stopWatcher = detectFileChange(fs, saveFile, () => {
              try {
                const found = readDosFsFileCaseInsensitive(fs, saveFile);
                if (found) {
                  db.save(saveFile, found.bytes);
                  setToastMessage("세이브 파일이 브라우저에 저장되었습니다.");
                  isClearExit.current = true;
                  setTimeout(() => {
                    isClearExit.current = false;
                  }, 5000);
                }
              } catch (err) {
                console.error("Save error:", err);
              }
            });
          }
        }

        const ci = await main(["-c", game.entry]);
        ciRef.current = ci;
        if (disposed) {
          ci?.exit?.();
          return;
        }

        keydownHandlers.current = getBlockedHandler(document, "keydown");
        keyupHandlers.current = getBlockedHandler(document, "keyup");
        restoreAddEventListener(document);

        document.addEventListener("keydown", handleDocumentKeyDown);
        document.addEventListener("keyup", handleDocumentKeyUp);

        joystick.on("move", (_, data) => {
          if (data.force > 0.3) {
            setJoystickCode(
              JOYSTICK_MAPS[
                (Math.floor((data.angle.degree - 22.5) / 45) + 8) % 8
              ],
            );
          } else {
            setJoystickCode(null);
          }
        });

        joystick.on("end", () => {
          setJoystickCode(null);
        });
      } catch (err) {
        restoreAddEventListener(document);
        console.error("Failed to start game:", err);
        setToastMessage(
          err instanceof Error
            ? `구동 오류: ${err.message}`
            : "게임을 시작하는 중 오류가 발생했습니다.",
        );
      }
    };

    boot();

    return () => {
      disposed = true;
      stopWatcher?.();
      joystick?.destroy();
      try {
        ciRef.current?.exit?.();
      } catch {
        // Ignore runtime exit errors
      }
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("keyup", handleDocumentKeyUp);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    game,
    isLocalDir,
    modId,
    saveFile,
    handleResize,
    handleBeforeUnload,
    handleFullScreenChange,
    handleDocumentKeyDown,
    handleDocumentKeyUp,
  ]);

  const toggleFns = useCallback(() => {
    setEnabledToggleFns(!enabledToggleFns);
  }, [enabledToggleFns]);

  const toggleFullscreen = useCallback(() => {
    const doc = window.document;
    if (!doc.fullscreenElement) {
      doc.documentElement.requestFullscreen();
      if ((navigator as any).keyboard) {
        (navigator as any).keyboard.lock(["Escape"]);
      }
    } else {
      doc.exitFullscreen();
    }
  }, []);

  const handleExitGame = useCallback(() => {
    if (confirm("게임을 종료하고 런처 화면으로 돌아가시겠습니까?")) {
      isClearExit.current = true;
      onExit();
    }
  }, [onExit]);

  const resetGame = useCallback(async () => {
    if (
      !confirm(
        "세이브를 초기 상태로 되돌리면 진행 중인 저장 데이터가 초기화됩니다.\n계속 진행하시겠습니까?",
      )
    ) {
      return;
    }

    try {
      if (isLocalDir) {
        await resetLocalGameFiles(game.id);
        setToastMessage("로컬 세이브가 초기 상태로 복원되었습니다. 런처에서 다시 실행하세요.");
      } else if (database.current) {
        await database.current.delete(saveFile);
        setToastMessage("세이브 파일이 삭제되었습니다. 다시 실행하면 적용됩니다.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setToastMessage("세이브 초기화에 실패했습니다.");
    }
  }, [game.id, isLocalDir, saveFile]);

  const downloadSaveFile = useCallback(async () => {
    if (dosFsRef.current) {
      const liveFound = readDosFsFileCaseInsensitive(dosFsRef.current, saveFile);
      if (liveFound) {
        const url = URL.createObjectURL(
          new Blob([liveFound.bytes as unknown as BlobPart], {
            type: "application/octet-stream",
          }),
        );
        saveAs(url, liveFound.relPath.split("/").pop() || saveFile);
        return;
      }
    }

    if (database.current) {
      const data = await database.current.load(saveFile);
      if (data) {
        const url = URL.createObjectURL(
          new Blob([data as unknown as BlobPart], {
            type: "application/octet-stream",
          }),
        );
        saveAs(url, saveFile);
        return;
      }
    }

    setToastMessage(`세이브 파일(${saveFile})을 찾을 수 없습니다.`);
  }, [saveFile]);

  const uploadSaveFile = useCallback(async () => {
    if (
      !confirm(
        "세이브 파일을 불러오면 현재 진행 중인 세이브가 덮어씌워집니다.\n계속 진행하시겠습니까?",
      )
    ) {
      return;
    }
    const files = await fileDialog();
    if (!files[0]) {
      return;
    }

    const bytes = new Uint8Array(await files[0].arrayBuffer());
    const targetName = game.saveFile || files[0].name || saveFile;

    try {
      if (dosFsRef.current) {
        writeDosFsFileCaseInsensitive(dosFsRef.current, targetName, bytes);
      }

      if (isLocalDir) {
        await uploadLocalGameFile(game.id, targetName, bytes);
        setToastMessage(`로컬 폴더(${targetName})에 세이브가 복원되었습니다.`);
      } else if (database.current) {
        await database.current.save(targetName, bytes);
        setToastMessage("브라우저에 세이브 파일이 복원되었습니다.");
      }
    } catch (err) {
      console.error("Upload save error:", err);
      setToastMessage("세이브 파일 복원에 실패했습니다.");
    }
  }, [game.id, game.saveFile, isLocalDir, saveFile]);

  const toggleKeyboard = useCallback(() => {
    setEnabledToggleKeyboard(!enabledToggleKeyboard);
  }, [enabledToggleKeyboard]);

  const ignoreStopAndPrevent = useCallback((e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div class="game">
      <div class="game__header" onMouseDown={(e) => e.preventDefault()}>
        <div class="game__header__nav">
          <div class="flex grow flex-row items-center gap-1 landscape:flex-col">
            <button
              type="button"
              class="game__header__item bg-red-800/60 hover:bg-red-700 active:bg-red-800"
              title="런처로 돌아가기"
              onClick={handleExitGame}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                />
              </svg>
            </button>

            <button
              type="button"
              class="game__header__item"
              title="부가 메뉴"
              onClick={toggleFns}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <span class="text-xs text-gray-400 font-mono px-2 hidden sm:inline landscape:hidden truncate max-w-[180px]">
              {game.title}
            </span>
          </div>

          <div class="flex flex-row items-center gap-1 landscape:flex-col">
            <button
              type="button"
              class="game__header__item"
              title="전체화면"
              onClick={toggleFullscreen}
            >
              {enabledToggleFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              class={`game__header__item ${enabledToggleKeyboard ? "" : "game__header__item--disabled"}`}
              title="가상 키패드"
              onClick={toggleKeyboard}
            >
              <svg version="1.1" viewBox="0 0 128 128" className="size-5 fill-current">
                <path d="M125.5,28.1c-1.667,-1.667 -3.679,-2.501 -6.034,-2.501l-110.933,0c-2.355,0 -4.366,0.834 -6.033,2.501c-1.666,1.667 -2.5,3.678 -2.5,6.033l0,59.733c0,2.356 0.834,4.366 2.5,6.033c1.667,1.667 3.678,2.502 6.033,2.502l110.933,0c2.355,0 4.367,-0.835 6.034,-2.502c1.666,-1.667 2.5,-3.677 2.5,-6.033l0,-59.733c0,-2.355 -0.834,-4.366 -2.5,-6.033Zm-6.034,65.766l-110.933,0l0,-59.733l110.933,0l0,59.733Z" />
                <path d="M18.133,85.332l6.4,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.71 -0.355,-1.067 -1.067,-1.067l-6.4,0c-0.711,0 -1.067,0.357 -1.067,1.067l0,6.399c0,0.711 0.356,1.067 1.067,1.067Z" />
                <path d="M18.133,68.267l14.933,0c0.711,0 1.068,-0.357 1.068,-1.068l0,-6.4c0,-0.711 -0.357,-1.066 -1.068,-1.066l-14.933,0c-0.711,0 -1.067,0.355 -1.067,1.066l0,6.4c0,0.711 0.356,1.068 1.067,1.068Z" />
                <path d="M18.133,51.199l6.4,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.711 -0.355,-1.066 -1.067,-1.067l-6.4,0c-0.711,0 -1.067,0.356 -1.067,1.067l0,6.399c0,0.711 0.356,1.067 1.067,1.067Z" />
                <path d="M92.801,76.799l-57.6,0c-0.712,0 -1.067,0.357 -1.067,1.068l0,6.399c0,0.709 0.355,1.067 1.067,1.067l57.597,0c0.712,0 1.068,-0.356 1.068,-1.067l0,-6.399c0,-0.711 -0.356,-1.068 -1.065,-1.068Z" />
                <path d="M42.667,67.199c0,0.711 0.355,1.068 1.066,1.068l6.4,0c0.711,0 1.066,-0.357 1.066,-1.068l0,-6.4c0,-0.711 -0.354,-1.066 -1.066,-1.066l-6.4,0c-0.711,0 -1.066,0.355 -1.066,1.066l0,6.4Z" />
                <path d="M35.201,51.199l6.399,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.711 -0.356,-1.066 -1.067,-1.067l-6.399,0c-0.712,0 -1.067,0.356 -1.067,1.067l0,6.399c0,0.711 0.356,1.067 1.067,1.067Z" />
                <path d="M59.733,67.199c0,0.711 0.356,1.068 1.066,1.068l6.4,0c0.711,0 1.068,-0.357 1.068,-1.068l0,-6.4c0,-0.711 -0.357,-1.066 -1.068,-1.066l-6.4,0c-0.71,0 -1.066,0.355 -1.066,1.066l0,6.4Z" />
                <path d="M52.266,51.199l6.4,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.711 -0.355,-1.066 -1.067,-1.067l-6.4,0c-0.711,0 -1.067,0.356 -1.067,1.067l0,6.399c0,0.711 0.356,1.067 1.067,1.067Z" />
                <path d="M76.8,67.199c0,0.711 0.356,1.068 1.065,1.068l6.401,0c0.711,0 1.066,-0.357 1.066,-1.068l0,-6.4c0,-0.711 -0.355,-1.066 -1.066,-1.066l-6.401,0c-0.709,0 -1.065,0.355 -1.065,1.066l0,6.4Z" />
                <path d="M109.866,76.799l-6.399,0c-0.712,0 -1.068,0.357 -1.068,1.068l0,6.399c0,0.709 0.356,1.067 1.068,1.067l6.399,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.711 -0.355,-1.068 -1.067,-1.068Z" />
                <path d="M69.333,51.199l6.401,0c0.711,0 1.066,-0.356 1.066,-1.067l0,-6.399c0,-0.711 -0.355,-1.066 -1.066,-1.067l-6.401,0c-0.711,0 -1.066,0.356 -1.066,1.067l0,6.399c0,0.711 0.356,1.067 1.066,1.067Z" />
                <path d="M86.4,51.199l6.399,0c0.711,0 1.067,-0.356 1.067,-1.067l0,-6.399c0,-0.711 -0.356,-1.066 -1.067,-1.067l-6.399,0c-0.711,0 -1.068,0.356 -1.068,1.067l0,6.399c0,0.711 0.357,1.067 1.068,1.067Z" />
                <path d="M93.866,67.199c0,0.711 0.355,1.068 1.066,1.068l14.933,0c0.712,0 1.068,-0.357 1.068,-1.068l0,-23.466c0,-0.711 -0.355,-1.066 -1.068,-1.067l-6.399,0c-0.711,0 -1.067,0.356 -1.067,1.067l0,16l-7.467,0c-0.711,0 -1.066,0.355 -1.066,1.066l0,6.4l0,0Z" />
              </svg>
            </button>
          </div>
        </div>

        <div
          class={`game__header__fns ${enabledToggleFns ? "game__header__fns--toggled" : ""}`}
        >
          <button
            type="button"
            class="game__header__fns__item"
            onClick={resetGame}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>세이브 초기화</span>
          </button>
          <button
            type="button"
            class="game__header__fns__item"
            onClick={downloadSaveFile}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span>세이브 파일 백업 (다운로드)</span>
          </button>

          <button
            type="button"
            class="game__header__fns__item"
            onClick={uploadSaveFile}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
              />
            </svg>
            <span>세이브 파일 복원 (가져오기)</span>
          </button>
        </div>
      </div>

      <div
        class="game__screen"
        style={{
          "--screen-width": `${width}px`,
          "--screen-height": `${height}px`,
        }}
        ref={screen}
      >
        <div class="game__canvas">
          <canvas ref={canvas} />
        </div>

        <div
          class="game__event-blocker"
          ref={mobileController}
          onTouchStart={ignoreStopAndPrevent}
          onTouchEnd={ignoreStopAndPrevent}
          onTouchMove={ignoreStopAndPrevent}
        />
        {enabledToggleKeyboard && (
          <VirtualKeyboard onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />
        )}
      </div>

      <div class={`toast ${toastMessage ? "toast--active" : ""}`}>
        {innerToastMessage}
      </div>
    </div>
  );
}
