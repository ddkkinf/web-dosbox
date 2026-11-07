/* eslint-disable @typescript-eslint/no-explicit-any */
import { debounce } from "../utils/timing";

interface BundleFileEntry {
  path: string;
  offset: number;
  size: number;
}

interface BundleHeader {
  files: BundleFileEntry[];
}

const SYSTEM_DIRS = new Set(["dev", "proc", "home", "tmp"]);
const SYSTEM_FILES = new Set(["state.fs"]);

function fnv1aHash(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Downloads the packed local game directory bundle and populates js-dos MEMFS at "/".
 */
export async function extractLocalBundleToDosFs(
  dosFs: any,
  bundleUrl: string,
): Promise<void> {
  const res = await fetch(bundleUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`게임 파일 번들 로드 실패 (HTTP ${res.status})`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 4) {
    throw new Error("유효하지 않은 게임 번들 데이터입니다.");
  }

  const view = new DataView(buffer);
  const headerLen = view.getUint32(0, true);
  const headerBytes = new Uint8Array(buffer, 4, headerLen);
  const headerJson = new TextDecoder("utf-8").decode(headerBytes);
  const header = JSON.parse(headerJson) as BundleHeader;

  const dataStart = 4 + headerLen;
  const emFs = dosFs.fs;

  for (const file of header.files) {
    const cleanRel = file.path.replace(/^\/+/, "");
    const absPath = "/" + cleanRel;
    if (emFs.analyzePath(absPath).exists) {
      emFs.unlink(absPath);
    }
    const slice = new Uint8Array(buffer, dataStart + file.offset, file.size);
    dosFs.createFile(absPath, slice);
  }

  dosFs.chdir("/");
}

interface FileSnapshot {
  mtimeMs: number;
  size: number;
  hash: number;
}

function listEmscriptenGameFiles(emFs: any): string[] {
  const found: string[] = [];

  function walk(dirPath: string, relPrefix: string) {
    let names: string[];
    try {
      names = emFs.readdir(dirPath);
    } catch {
      return;
    }

    for (const name of names) {
      if (name === "." || name === ".." || name.startsWith(".")) continue;
      if (!relPrefix && (SYSTEM_DIRS.has(name) || SYSTEM_FILES.has(name))) continue;

      const fullPath = dirPath === "/" ? `/${name}` : `${dirPath}/${name}`;
      const relPath = relPrefix ? `${relPrefix}/${name}` : name;

      try {
        const stat = emFs.stat(fullPath);
        if (emFs.isDir(stat.mode)) {
          walk(fullPath, relPath);
        } else if (emFs.isFile(stat.mode)) {
          found.push(relPath);
        }
      } catch {
        // Ignore transient FS errors
      }
    }
  }

  walk("/", "");
  return found;
}

/**
 * Watches all files in DOSBox's virtual C:\ drive ("/") and reports newly created or modified files
 * so they can be written directly back to `${HOME}/games/<gameId>/`.
 */
export function watchDosFsDirectoryChanges(
  dosFs: any,
  onChangedFiles: (changed: Array<{ relPath: string; bytes: Uint8Array }>) => void,
): () => void {
  const emFs = dosFs.fs;
  const snapshots = new Map<string, FileSnapshot>();

  // Record baseline before DOSBox starts modifying anything
  for (const relPath of listEmscriptenGameFiles(emFs)) {
    try {
      const fullPath = "/" + relPath;
      const stat = emFs.stat(fullPath);
      const bytes: Uint8Array = emFs.readFile(fullPath);
      snapshots.set(relPath, {
        mtimeMs: stat.mtime.getTime(),
        size: bytes.byteLength,
        hash: fnv1aHash(bytes),
      });
    } catch {
      // Ignore unreadable baseline entry
    }
  }

  const pendingPaths = new Set<string>();

  const flushChanges = debounce(() => {
    if (pendingPaths.size === 0) return;
    const toSync: Array<{ relPath: string; bytes: Uint8Array }> = [];

    for (const relPath of pendingPaths) {
      try {
        const fullPath = "/" + relPath;
        const stat = emFs.stat(fullPath);
        const bytes: Uint8Array = emFs.readFile(fullPath);
        const hash = fnv1aHash(bytes);
        const prev = snapshots.get(relPath);

        if (!prev || prev.size !== bytes.byteLength || prev.hash !== hash) {
          const copy = new Uint8Array(bytes.byteLength);
          copy.set(bytes);
          snapshots.set(relPath, {
            mtimeMs: stat.mtime.getTime(),
            size: copy.byteLength,
            hash,
          });
          toSync.push({ relPath, bytes: copy });
        } else {
          prev.mtimeMs = stat.mtime.getTime();
        }
      } catch {
        // File may have been temporary and deleted
      }
    }

    pendingPaths.clear();
    if (toSync.length > 0) {
      onChangedFiles(toSync);
    }
  }, 450);

  const intervalId = window.setInterval(() => {
    const currentFiles = listEmscriptenGameFiles(emFs);
    for (const relPath of currentFiles) {
      try {
        const fullPath = "/" + relPath;
        const stat = emFs.stat(fullPath);
        const mtimeMs = stat.mtime.getTime();
        const prev = snapshots.get(relPath);

        if (!prev || prev.mtimeMs !== mtimeMs || prev.size !== stat.size) {
          pendingPaths.add(relPath);
        }
      } catch {
        // Ignore transient stat error
      }
    }

    if (pendingPaths.size > 0) {
      flushChanges();
    }
  }, 500);

  return () => {
    window.clearInterval(intervalId);
  };
}

/**
 * Case-insensitive file lookup & read from live Emscripten MEMFS.
 */
export function readDosFsFileCaseInsensitive(
  dosFs: any,
  relTarget: string,
): { relPath: string; bytes: Uint8Array } | null {
  const emFs = dosFs.fs;
  const normalized = relTarget.replace(/^\/+/, "");
  const exactFull = "/" + normalized;

  if (emFs.analyzePath(exactFull).exists) {
    const bytes: Uint8Array = emFs.readFile(exactFull);
    return { relPath: normalized, bytes: new Uint8Array(bytes) };
  }

  const targetUpper = normalized.toUpperCase();
  const match = listEmscriptenGameFiles(emFs).find(
    (rel) => rel.toUpperCase() === targetUpper,
  );
  if (match) {
    const bytes: Uint8Array = emFs.readFile("/" + match);
    return { relPath: match, bytes: new Uint8Array(bytes) };
  }

  return null;
}

/**
 * Case-insensitive file overwrite in live Emscripten MEMFS.
 */
export function writeDosFsFileCaseInsensitive(
  dosFs: any,
  relTarget: string,
  bytes: Uint8Array,
): string {
  const emFs = dosFs.fs;
  const normalized = relTarget.replace(/^\/+/, "");
  const targetUpper = normalized.toUpperCase();

  const existing = listEmscriptenGameFiles(emFs).find(
    (rel) => rel.toUpperCase() === targetUpper,
  );
  const finalRel = existing || normalized;
  const fullPath = "/" + finalRel;

  if (emFs.analyzePath(fullPath).exists) {
    emFs.unlink(fullPath);
  }
  dosFs.createFile(fullPath, bytes);
  return finalRel;
}
