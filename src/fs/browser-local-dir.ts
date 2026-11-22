/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameConfig } from "../config/games";

function ensureDosFsDir(rawFs: any, dirPath: string): void {
  const parts = dirPath.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += "/" + part;
    try {
      rawFs.mkdir(cur);
    } catch {
      // Directory already exists
    }
  }
}

const HANDLE_DB_NAME = "web-dosbox-local-handles";
const HANDLE_STORE_NAME = "handles";
const ROOT_HANDLE_KEY = "root-games-dir";

const PRESET_METADATA: Record<string, Partial<GameConfig> & { order?: number }> = {
  water2: {
    title: "대항해시대 2 (원본)",
    originalTitle: "Uncharted Waters: New Horizons",
    version: "1993 정식 한글판",
    releaseYear: 1993,
    developer: "KOEI",
    genre: "역사 시뮬레이션 / RPG",
    description:
      "6명의 주인공으로 16세기 대항해시대를 배경으로 무역, 모험, 해전을 펼치는 코에이의 불후의 명작 시뮬레이션 RPG.",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    badge: "오리지널",
    category: "original",
    order: 1,
  },
  water2_correction: {
    title: "대항해시대 2 (버그/번역 교정판)",
    originalTitle: "Uncharted Waters II - Correction Patch",
    version: "v4.1",
    releaseYear: 1993,
    developer: "KOEI / 커뮤니티 패치",
    genre: "역사 시뮬레이션 / RPG",
    description:
      "원본의 오역과 각종 버그를 수정하여 쾌적하게 즐길 수 있도록 다듬어진 권장 플레이 버전.",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    badge: "추천 패치",
    category: "original",
    order: 2,
  },
  water2_ernst: {
    title: "대항해시대 2: 에른스트 외전",
    originalTitle: "Ernst von Bohr Gaiden",
    version: "v2.1a",
    releaseYear: 1993,
    developer: "커뮤니티 모드",
    genre: "모험 / 지리학 외전",
    description:
      "네덜란드의 지리학자 에른스트 폰 보어의 이야기를 확장한 스토리 외전 모드.",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    badge: "스토리 모드",
    category: "mods",
    order: 3,
  },
  water2_miranda: {
    title: "대항해시대 2: 미란다 외전",
    originalTitle: "Miranda Verte Gaiden",
    version: "v1.5b",
    releaseYear: 1993,
    developer: "커뮤니티 모드",
    genre: "모험 / 스토리 외전",
    description:
      "제노바의 여항해사 미란다 베르테를 주인공으로 새로운 이벤트와 모험을 즐길 수 있는 외전 모드.",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    badge: "외전 모드",
    category: "mods",
    order: 4,
  },
  water2_miranda_p2: {
    title: "대항해시대 2: 미란다 외전 파트 2",
    originalTitle: "Miranda Verte Gaiden Part 2",
    version: "v0.4a",
    releaseYear: 1993,
    developer: "커뮤니티 모드",
    genre: "모험 / 스토리 외전",
    description:
      "미란다 베르테 외전의 후속 파트로 추가 시나리오와 항해 이벤트를 담은 확장 버전.",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    badge: "외전 Part 2",
    category: "mods",
    order: 5,
  },
  water2_salvador: {
    title: "대항해시대 2: 살바도르 외전",
    originalTitle: "Salvador Reis Gaiden",
    version: "v1.4a",
    releaseYear: 1993,
    developer: "커뮤니티 모드",
    genre: "해적 / 해전 외전",
    description:
      "알제 해적 살바도르 레이스를 주인공으로 지중해와 대양의 패권을 다투는 해전 중심 외전 모드.",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    badge: "해적 외전",
    category: "mods",
    order: 6,
  },
  water2_junghwa: {
    title: "대항해시대 2: 정화 대원정",
    originalTitle: "Zheng He Expedition Mod",
    version: "v1.3b",
    releaseYear: 1993,
    developer: "커뮤니티 모드",
    genre: "대원정 시나리오 모드",
    description:
      "명나라의 대제독 정화의 남해 대원정을 테마로 새롭게 구성된 대규모 개조 시나리오 모드.",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    badge: "대규모 개조",
    category: "mods",
    order: 7,
  },
};

const COVER_CANDIDATES = [
  "cover.png",
  "cover.jpg",
  "cover.jpeg",
  "cover.webp",
  "cover.gif",
  "title.png",
  "screenshot.png",
  "thumbnail.png",
];

const INTERNAL_DRIVERS = new Set([
  "END.EXE",
  "ENDING.EXE",
  "OPEN.EXE",
  "OPENING.EXE",
  "OP.EXE",
  "MA.EXE",
  "MS.EXE",
  "QUIT.EXE",
  "PROTECT.EXE",
  "RTM.EXE",
  "MEMCHK.EXE",
  "GRPDRV.EXE",
  "FMDRV.COM",
  "SBOPL2.COM",
  "TFDED.COM",
  "HBIOS.COM",
  "HRDRV.COM",
  "MDRV.COM",
  "MDV.COM",
  "SIG.COM",
  "AUTOEXEC.BAT",
  "INSTALL.BAT",
  "INSTSUB.BAT",
  "INSTALL.EXE",
  "INSTALL.COM",
  "MK.BAT",
  "MKS.BAT",
]);

const HELPER_BINARIES = new Set([
  ...INTERNAL_DRIVERS,
  "SETUP.EXE",
  "SETUP.COM",
  "SETSOUND.EXE",
  "SOUND.EXE",
  "CONFIG.EXE",
  "HORIEDIT.EXE",
  "HEDITV21.EXE",
]);

const PREFERRED_ENTRIES = [
  "PLAY.BAT",
  "START.BAT",
  "RUN.BAT",
  "GAME.BAT",
  "HERO.COM",
  "KOEI.COM",
  "GAME.COM",
  "MAIN.COM",
  "GAME.EXE",
  "MAIN.EXE",
];

function isExecutable(relPath: string): boolean {
  const upper = relPath.toUpperCase();
  return (
    upper.endsWith(".COM") || upper.endsWith(".EXE") || upper.endsWith(".BAT")
  );
}

function getBaseName(relPath: string): string {
  const parts = relPath.split("/");
  return parts[parts.length - 1] || relPath;
}

function pickDefaultEntry(executables: string[]): string {
  if (executables.length === 0) return "KOEI.COM";
  const upperMap = new Map(executables.map((e) => [e.toUpperCase(), e]));
  for (const preferred of PREFERRED_ENTRIES) {
    const match = upperMap.get(preferred);
    if (match) return match;
  }
  const rootCandidates = executables.filter((e) => !e.includes("/"));
  const nonHelpers = (
    rootCandidates.length > 0 ? rootCandidates : executables
  ).filter((e) => !HELPER_BINARIES.has(getBaseName(e).toUpperCase()));
  const pool = nonHelpers.length > 0 ? nonHelpers : executables;
  const bat = pool.find((e) => e.toUpperCase().endsWith(".BAT"));
  if (bat) return bat;
  const com = pool.find((e) => e.toUpperCase().endsWith(".COM"));
  if (com) return com;
  return pool[0];
}

function pickDefaultSaveFile(files: string[]): string | undefined {
  const koukai = files.find(
    (f) => getBaseName(f).toUpperCase() === "KOUKAI2.DAT",
  );
  if (koukai) return koukai;
  const sav = files.find((f) => {
    const upper = getBaseName(f).toUpperCase();
    return upper.endsWith(".SAV") || upper.startsWith("SAVE");
  });
  return sav;
}

// Keep active directory handles in memory keyed by game.id
const gameDirHandles = new Map<string, any>();
// Fallback in-memory file map for browsers using <input webkitdirectory>
const fallbackGameFiles = new Map<string, Map<string, File>>();

export function hasFileSystemAccessApi(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function getBrowserGameDirHandle(gameId: string): any | undefined {
  return gameDirHandles.get(gameId);
}

async function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(HANDLE_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePersistedRootDirHandle(handle: any): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).put(handle, ROOT_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB handle persistence errors
  }
}

export async function loadPersistedRootDirHandle(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
      const req = tx.objectStore(HANDLE_STORE_NAME).get(ROOT_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearPersistedRootDirHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).delete(ROOT_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function collectDirHandleFiles(
  dirHandle: any,
  prefix = "",
): Promise<Array<{ relPath: string; fileHandle: any }>> {
  const results: Array<{ relPath: string; fileHandle: any }> = [];
  for await (const [name, entry] of dirHandle.entries()) {
    if (name.startsWith(".")) continue;
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "directory") {
      const nested = await collectDirHandleFiles(entry, relPath);
      results.push(...nested);
    } else if (entry.kind === "file") {
      results.push({ relPath, fileHandle: entry });
    }
  }
  return results;
}

async function buildGameConfigFromDirHandle(
  id: string,
  dirHandle: any,
  parentName: string,
): Promise<(GameConfig & { _order: number }) | null> {
  const allEntries = await collectDirHandleFiles(dirHandle);
  if (allEntries.length === 0) return null;

  let customMeta: Record<string, any> = {};
  const metaEntry = allEntries.find(
    (e) => e.relPath.toLowerCase() === "game.json",
  );
  if (metaEntry) {
    try {
      const file: File = await metaEntry.fileHandle.getFile();
      customMeta = JSON.parse(await file.text());
    } catch {
      // Ignore malformed game.json
    }
  }

  let coverImage: string | undefined;
  for (const candidate of COVER_CANDIDATES) {
    const found = allEntries.find(
      (e) => e.relPath.toLowerCase() === candidate,
    );
    if (found) {
      try {
        const file: File = await found.fileHandle.getFile();
        coverImage = URL.createObjectURL(file);
        break;
      } catch {
        // Ignore unreadable cover
      }
    }
  }

  const gameEntries = allEntries.filter((e) => {
    const lower = e.relPath.toLowerCase();
    if (lower === "game.json") return false;
    if (COVER_CANDIDATES.includes(lower)) return false;
    return true;
  });

  const relPaths = gameEntries.map((e) => e.relPath);
  const rawExecs = relPaths.filter(isExecutable);
  if (rawExecs.length === 0) return null;

  const userExecs = rawExecs.filter(
    (e) => !INTERNAL_DRIVERS.has(getBaseName(e).toUpperCase()),
  );
  const executables = userExecs.length > 0 ? userExecs : rawExecs;
  const preset = PRESET_METADATA[id] || {};
  const meta = { ...preset, ...customMeta };
  const entry = meta.entry || pickDefaultEntry(executables);
  const orderedExecs = [
    entry,
    ...executables.filter((e) => e.toUpperCase() !== entry.toUpperCase()),
  ];
  const saveFile = meta.saveFile || pickDefaultSaveFile(relPaths);

  gameDirHandles.set(id, dirHandle);

  return {
    id,
    title: meta.title || id,
    originalTitle: meta.originalTitle,
    version: meta.version,
    releaseYear: meta.releaseYear,
    developer: meta.developer,
    genre: meta.genre || "DOS 게임",
    description:
      meta.description || `${parentName}/${id} 로컬 폴더에서 불러온 DOS 게임`,
    gameFile: `browser-dir://${id}`,
    entry,
    executables: orderedExecs,
    saveFile,
    cycles: meta.cycles,
    useMouse: meta.useMouse,
    coverImage,
    badge: meta.badge || "로컬 폴더",
    category: meta.category,
    sourceType: "browser-dir",
    localPath: `${parentName}/${id}`,
    _order: meta.order ?? 999,
  };
}

export async function scanDirectoryHandleForGames(rootHandle: any): Promise<{
  displayDir: string;
  games: GameConfig[];
}> {
  gameDirHandles.clear();
  const games: Array<GameConfig & { _order: number }> = [];

  // Check subdirectories first (e.g. picking ~/games/dos-box)
  for await (const [name, entry] of rootHandle.entries()) {
    if (name.startsWith(".")) continue;
    if (entry.kind === "directory") {
      const config = await buildGameConfigFromDirHandle(
        name,
        entry,
        rootHandle.name,
      );
      if (config) {
        games.push(config);
      }
    }
  }

  // If no game subdirectories were found, check if the selected folder itself is a single DOS game folder
  if (games.length === 0) {
    const singleConfig = await buildGameConfigFromDirHandle(
      rootHandle.name,
      rootHandle,
      "로컬 폴더",
    );
    if (singleConfig) {
      games.push(singleConfig);
    }
  }

  games.sort((a, b) => {
    if (a._order !== b._order) return a._order - b._order;
    return a.title.localeCompare(b.title, "ko");
  });

  await savePersistedRootDirHandle(rootHandle);

  return {
    displayDir: rootHandle.name,
    games: games.map(({ _order, ...rest }) => rest),
  };
}

/**
 * Fallback scanner for <input type="file" webkitdirectory multiple>
 */
export async function scanFileListForGames(fileList: FileList): Promise<{
  displayDir: string;
  games: GameConfig[];
}> {
  fallbackGameFiles.clear();
  const files = Array.from(fileList);
  if (files.length === 0) {
    return { displayDir: "선택된 폴더", games: [] };
  }

  const firstRel = (files[0] as any).webkitRelativePath || files[0].name;
  const rootName = firstRel.split("/")[0] || "선택된 폴더";

  // Group files by top-level subfolder (or single folder if executables are at root)
  const hasRootExec = files.some((f) => {
    const rel = ((f as any).webkitRelativePath || f.name)
      .split("/")
      .slice(1)
      .join("/");
    return !rel.includes("/") && isExecutable(rel);
  });

  const grouped = new Map<string, Map<string, File>>();
  for (const file of files) {
    const fullRel: string = (file as any).webkitRelativePath || file.name;
    const parts = fullRel.split("/").filter(Boolean);
    if (parts.some((p) => p.startsWith("."))) continue;

    if (hasRootExec) {
      const relPath = parts.slice(1).join("/");
      if (!relPath) continue;
      let map = grouped.get(rootName);
      if (!map) {
        map = new Map();
        grouped.set(rootName, map);
      }
      map.set(relPath, file);
    } else {
      if (parts.length < 3) continue;
      const gameId = parts[1];
      const relPath = parts.slice(2).join("/");
      let map = grouped.get(gameId);
      if (!map) {
        map = new Map();
        grouped.set(gameId, map);
      }
      map.set(relPath, file);
    }
  }

  const games: Array<GameConfig & { _order: number }> = [];
  for (const [id, fileMap] of grouped.entries()) {
    const allPaths = Array.from(fileMap.keys());
    let customMeta: Record<string, any> = {};
    const metaKey = allPaths.find((p) => p.toLowerCase() === "game.json");
    if (metaKey) {
      try {
        customMeta = JSON.parse(await fileMap.get(metaKey)!.text());
      } catch {
        // ignore
      }
    }

    let coverImage: string | undefined;
    for (const candidate of COVER_CANDIDATES) {
      const foundKey = allPaths.find((p) => p.toLowerCase() === candidate);
      if (foundKey) {
        coverImage = URL.createObjectURL(fileMap.get(foundKey)!);
        break;
      }
    }

    const relPaths = allPaths.filter((p) => {
      const lower = p.toLowerCase();
      return lower !== "game.json" && !COVER_CANDIDATES.includes(lower);
    });
    const rawExecs = relPaths.filter(isExecutable);
    if (rawExecs.length === 0) continue;

    const userExecs = rawExecs.filter(
      (e) => !INTERNAL_DRIVERS.has(getBaseName(e).toUpperCase()),
    );
    const executables = userExecs.length > 0 ? userExecs : rawExecs;
    const preset = PRESET_METADATA[id] || {};
    const meta = { ...preset, ...customMeta };
    const entry = meta.entry || pickDefaultEntry(executables);
    const orderedExecs = [
      entry,
      ...executables.filter((e) => e.toUpperCase() !== entry.toUpperCase()),
    ];
    const saveFile = meta.saveFile || pickDefaultSaveFile(relPaths);

    fallbackGameFiles.set(id, fileMap);

    games.push({
      id,
      title: meta.title || id,
      originalTitle: meta.originalTitle,
      version: meta.version,
      releaseYear: meta.releaseYear,
      developer: meta.developer,
      genre: meta.genre || "DOS 게임",
      description: meta.description || `${rootName}/${id} 로컬 폴더 게임`,
      gameFile: `browser-dir://${id}`,
      entry,
      executables: orderedExecs,
      saveFile,
      cycles: meta.cycles,
      useMouse: meta.useMouse,
      coverImage,
      badge: meta.badge || "로컬 폴더",
      category: meta.category,
      sourceType: "browser-dir",
      localPath: `${rootName}/${id}`,
      _order: meta.order ?? 999,
    });
  }

  games.sort((a, b) => {
    if (a._order !== b._order) return a._order - b._order;
    return a.title.localeCompare(b.title, "ko");
  });

  return {
    displayDir: rootName,
    games: games.map(({ _order, ...rest }) => rest),
  };
}

/**
 * Extract all files of a browser-picked directory into DOSBox virtual FS
 */
export async function extractBrowserDirToDosFs(
  dosFs: any,
  gameId: string,
): Promise<void> {
  const rawFs = dosFs?.fs;
  if (!rawFs) {
    throw new Error("DOSBox 파일시스템이 초기화되지 않았습니다.");
  }

  const dirHandle = gameDirHandles.get(gameId);
  if (dirHandle) {
    const entries = await collectDirHandleFiles(dirHandle);
    for (const item of entries) {
      const lower = item.relPath.toLowerCase();
      if (lower === "game.json" || COVER_CANDIDATES.includes(lower)) continue;
      const file: File = await item.fileHandle.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fullPath = item.relPath.startsWith("/")
        ? item.relPath
        : `/${item.relPath}`;
      const lastSlash = fullPath.lastIndexOf("/");
      if (lastSlash > 0) {
        ensureDosFsDir(rawFs, fullPath.slice(0, lastSlash));
      }
      rawFs.writeFile(fullPath, bytes);
    }
    return;
  }

  const fileMap = fallbackGameFiles.get(gameId);
  if (fileMap) {
    for (const [relPath, file] of fileMap.entries()) {
      const lower = relPath.toLowerCase();
      if (lower === "game.json" || COVER_CANDIDATES.includes(lower)) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fullPath = relPath.startsWith("/") ? relPath : `/${relPath}`;
      const lastSlash = fullPath.lastIndexOf("/");
      if (lastSlash > 0) {
        ensureDosFsDir(rawFs, fullPath.slice(0, lastSlash));
      }
      rawFs.writeFile(fullPath, bytes);
    }
    return;
  }

  throw new Error("선택된 로컬 게임 폴더 핸들을 찾을 수 없습니다. 폴더를 다시 선택해 주세요.");
}

async function getSubDirHandle(
  rootHandle: any,
  dirParts: string[],
  create: boolean,
): Promise<any> {
  let current = rootHandle;
  for (const part of dirParts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function findCaseInsensitiveEntryName(
  dirHandle: any,
  targetName: string,
): Promise<string> {
  const upper = targetName.toUpperCase();
  for await (const [name] of dirHandle.entries()) {
    if (name.toUpperCase() === upper) {
      return name;
    }
  }
  return targetName;
}

/**
 * Write a changed file directly back to the user's local folder via FileSystemDirectoryHandle
 */
export async function writeBrowserDirFile(
  gameId: string,
  relPath: string,
  bytes: Uint8Array,
): Promise<{ ok: boolean; relPath: string }> {
  const dirHandle = gameDirHandles.get(gameId);
  if (!dirHandle) {
    throw new Error("로컬 폴더 쓰기 권한이 없습니다.");
  }

  const parts = relPath.replace(/^\/+/, "").split("/").filter(Boolean);
  const fileName = parts.pop()!;
  const targetDir = await getSubDirHandle(dirHandle, parts, true);
  const actualName = await findCaseInsensitiveEntryName(targetDir, fileName);

  // Back up initial original file into .initial-backup/ before first overwrite
  if (actualName.toLowerCase() !== "cover.png") {
    try {
      const existingHandle = await targetDir.getFileHandle(actualName, {
        create: false,
      });
      const existingFile: File = await existingHandle.getFile();
      const backupRoot = await dirHandle.getDirectoryHandle(".initial-backup", {
        create: true,
      });
      const backupDir = await getSubDirHandle(backupRoot, parts, true);
      try {
        await backupDir.getFileHandle(actualName, { create: false });
      } catch {
        // Backup doesn't exist yet -> create it
        const backupFileHandle = await backupDir.getFileHandle(actualName, {
          create: true,
        });
        const writable = await backupFileHandle.createWritable();
        await writable.write(await existingFile.arrayBuffer());
        await writable.close();
      }
    } catch {
      // File did not exist previously, no initial backup needed
    }
  }

  const fileHandle = await targetDir.getFileHandle(actualName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(bytes);
  await writable.close();

  return { ok: true, relPath: [...parts, actualName].join("/") };
}

/**
 * Restore initial backup files in the user's local folder via FileSystemDirectoryHandle
 */
export async function resetBrowserDirFiles(gameId: string): Promise<void> {
  const dirHandle = gameDirHandles.get(gameId);
  if (!dirHandle) {
    throw new Error("로컬 폴더 핸들을 찾을 수 없습니다.");
  }

  try {
    const backupRoot = await dirHandle.getDirectoryHandle(".initial-backup", {
      create: false,
    });
    const backups = await collectDirHandleFiles(backupRoot);
    for (const item of backups) {
      const file: File = await item.fileHandle.getFile();
      const parts = item.relPath.split("/").filter(Boolean);
      const fileName = parts.pop()!;
      const targetDir = await getSubDirHandle(dirHandle, parts, true);
      const destHandle = await targetDir.getFileHandle(fileName, {
        create: true,
      });
      const writable = await destHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    }
  } catch {
    throw new Error("초기 세이브 백업(.initial-backup)이 아직 없습니다.");
  }
}
