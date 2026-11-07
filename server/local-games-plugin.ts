import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export interface LocalGameMeta {
  title?: string;
  originalTitle?: string;
  version?: string;
  releaseYear?: number;
  developer?: string;
  genre?: string;
  description?: string;
  entry?: string;
  saveFile?: string;
  coverImage?: string;
  badge?: string;
  category?: string;
  order?: number;
}

export interface LocalGameResponseItem {
  id: string;
  title: string;
  originalTitle?: string;
  version?: string;
  releaseYear?: number;
  developer?: string;
  genre?: string;
  description?: string;
  gameFile: string;
  entry: string;
  executables: string[];
  saveFile?: string;
  coverImage?: string;
  badge?: string;
  category?: string;
  sourceType: "local-dir" | "local-zip";
  localPath: string;
  totalSize: number;
  order?: number;
}

const IGNORED_META_FILES = new Set([
  "game.json",
  "cover.png",
  "cover.jpg",
  "cover.jpeg",
  "cover.webp",
  "thumbnail.png",
]);

const COVER_CANDIDATES: Array<{ name: string; mime: string }> = [
  { name: "cover.png", mime: "image/png" },
  { name: "cover.jpg", mime: "image/jpeg" },
  { name: "cover.jpeg", mime: "image/jpeg" },
  { name: "cover.webp", mime: "image/webp" },
  { name: "thumbnail.png", mime: "image/png" },
];

const HELPER_BINARIES = new Set([
  "SETUP.EXE",
  "SETUP.COM",
  "INSTALL.EXE",
  "INSTALL.BAT",
  "SETSOUND.EXE",
  "SOUND.EXE",
  "CONFIG.EXE",
  "END.EXE",
  "OPEN.EXE",
  "GRPDRV.EXE",
  "FMDRV.COM",
  "HORIEDIT.EXE",
  "MK.BAT",
  "MKS.BAT",
]);

const PREFERRED_ENTRIES = [
  "PLAY.BAT",
  "START.BAT",
  "RUN.BAT",
  "GAME.BAT",
  "KOEI.COM",
  "GAME.COM",
  "MAIN.COM",
  "GAME.EXE",
  "MAIN.EXE",
  "START.EXE",
];

function isExecutable(filePath: string): boolean {
  const ext = path.extname(filePath).toUpperCase();
  return ext === ".COM" || ext === ".EXE" || ext === ".BAT";
}

function pickDefaultEntry(executables: string[]): string {
  if (executables.length === 0) return "MAIN.EXE";

  // Prefer root-level executables over subdirectory ones
  const rootExecs = executables.filter((e) => !e.includes("/"));
  const pool = rootExecs.length > 0 ? rootExecs : executables;

  for (const preferred of PREFERRED_ENTRIES) {
    const found = pool.find((e) => path.basename(e).toUpperCase() === preferred);
    if (found) return found;
  }

  const nonHelper = pool.filter(
    (e) => !HELPER_BINARIES.has(path.basename(e).toUpperCase()),
  );
  if (nonHelper.length > 0) {
    // Prefer .BAT > .COM > .EXE
    const bat = nonHelper.find((e) => e.toUpperCase().endsWith(".BAT"));
    if (bat) return bat;
    const com = nonHelper.find((e) => e.toUpperCase().endsWith(".COM"));
    if (com) return com;
    return nonHelper[0];
  }

  return pool[0];
}

function pickDefaultSaveFile(files: string[]): string | undefined {
  const upperMap = new Map(files.map((f) => [f.toUpperCase(), f]));
  for (const known of ["KOUKAI2.DAT", "CHENGHO.DAT", "SAVEDATA.DAT", "SAVE.DAT"]) {
    if (upperMap.has(known)) return upperMap.get(known);
  }
  const savFile = files.find((f) => /\.(SAV|SV\d)$/i.test(f) || /^SAVE.*\.(DAT|BIN)$/i.test(path.basename(f)));
  return savFile;
}

/**
 * Resolves effective game root inside a folder (unwraps single nested directory if needed).
 */
function resolveEffectiveGameDir(folderPath: string): string {
  const entries = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((d) => !d.name.startsWith(".") && !IGNORED_META_FILES.has(d.name.toLowerCase()));

  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(folderPath, entries[0].name);
  }
  return folderPath;
}

interface ScannedFile {
  relPath: string;
  absPath: string;
  size: number;
}

function scanDirectoryFiles(rootDir: string): ScannedFile[] {
  const result: ScannedFile[] = [];

  function walk(currentDir: string, prefix: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (!prefix && IGNORED_META_FILES.has(entry.name.toLowerCase())) continue;

      const absPath = path.join(currentDir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walk(absPath, relPath);
      } else if (entry.isFile()) {
        const stat = fs.statSync(absPath);
        result.push({ relPath, absPath, size: stat.size });
      }
    }
  }

  walk(rootDir, "");
  return result;
}

/**
 * Lightweight ZIP Central Directory inspector to list filenames without external deps.
 */
function listZipEntries(zipPath: string): string[] {
  try {
    const fd = fs.openSync(zipPath, "r");
    try {
      const stat = fs.fstatSync(fd);
      const tailSize = Math.min(stat.size, 65557);
      const tailBuf = Buffer.alloc(tailSize);
      fs.readSync(fd, tailBuf, 0, tailSize, stat.size - tailSize);

      let eocdOffset = -1;
      for (let i = tailSize - 22; i >= 0; i--) {
        if (tailBuf.readUInt32LE(i) === 0x06054b50) {
          eocdOffset = i;
          break;
        }
      }
      if (eocdOffset === -1) return [];

      const cdSize = tailBuf.readUInt32LE(eocdOffset + 12);
      const cdOffset = tailBuf.readUInt32LE(eocdOffset + 16);
      if (cdOffset + cdSize > stat.size) return [];

      const cdBuf = Buffer.alloc(cdSize);
      fs.readSync(fd, cdBuf, 0, cdSize, cdOffset);

      const names: string[] = [];
      let ptr = 0;
      while (ptr + 46 <= cdSize) {
        if (cdBuf.readUInt32LE(ptr) !== 0x02014b50) break;
        const nameLen = cdBuf.readUInt16LE(ptr + 28);
        const extraLen = cdBuf.readUInt16LE(ptr + 30);
        const commentLen = cdBuf.readUInt16LE(ptr + 32);
        const name = cdBuf
          .subarray(ptr + 46, ptr + 46 + nameLen)
          .toString("utf8")
          .replace(/\\/g, "/");
        if (!name.endsWith("/") && !name.startsWith("__MACOSX/")) {
          names.push(name);
        }
        ptr += 46 + nameLen + extraLen + commentLen;
      }
      return names;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function readJsonIfExists<T>(filePath: string): T | undefined {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    }
  } catch {
    // Ignore malformed metadata JSON
  }
  return undefined;
}

function findCoverFile(folderPath: string): { absPath: string; mime: string; mtimeMs: number } | undefined {
  for (const candidate of COVER_CANDIDATES) {
    const absPath = path.join(folderPath, candidate.name);
    if (fs.existsSync(absPath)) {
      const stat = fs.statSync(absPath);
      if (stat.isFile()) {
        return { absPath, mime: candidate.mime, mtimeMs: stat.mtimeMs };
      }
    }
  }
  return undefined;
}

function formatDisplayPath(absPath: string): string {
  const home = os.homedir();
  if (absPath === home) return "~";
  if (absPath.startsWith(home + path.sep)) {
    return "~/" + absPath.slice(home.length + 1);
  }
  return absPath;
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

export function localGamesPlugin(customGamesDir?: string): Plugin {
  const gamesDir = path.resolve(
    customGamesDir || process.env.GAMES_DIR || path.join(os.homedir(), "games", "dos-box"),
  );

  const ensureGamesDir = () => {
    if (!fs.existsSync(gamesDir)) {
      fs.mkdirSync(gamesDir, { recursive: true });
    }
  };

  function resolveSafeChild(entryId: string): string | null {
    if (!entryId || entryId.includes("/") || entryId.includes("\\") || entryId.startsWith(".")) {
      return null;
    }
    const resolved = path.resolve(gamesDir, entryId);
    if (!resolved.startsWith(gamesDir + path.sep)) {
      return null;
    }
    return resolved;
  }

  function scanGames(): LocalGameResponseItem[] {
    ensureGamesDir();
    const dirEntries = fs.readdirSync(gamesDir, { withFileTypes: true });
    const games: LocalGameResponseItem[] = [];

    for (const dirent of dirEntries) {
      if (dirent.name.startsWith(".")) continue;

      const fullPath = path.join(gamesDir, dirent.name);

      if (dirent.isDirectory()) {
        const meta = readJsonIfExists<LocalGameMeta>(path.join(fullPath, "game.json")) ?? {};
        const effectiveRoot = resolveEffectiveGameDir(fullPath);
        const files = scanDirectoryFiles(effectiveRoot);
        if (files.length === 0) continue;

        const relPaths = files.map((f) => f.relPath);
        const executables = relPaths.filter(isExecutable);
        const entry = meta.entry || pickDefaultEntry(executables);
        const saveFile = meta.saveFile || pickDefaultSaveFile(relPaths);
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);

        const cover = findCoverFile(fullPath) || (effectiveRoot !== fullPath ? findCoverFile(effectiveRoot) : undefined);
        const encodedId = encodeURIComponent(dirent.name);
        const coverImage =
          meta.coverImage ||
          (cover ? `/api/local-games/${encodedId}/cover?t=${Math.floor(cover.mtimeMs)}` : undefined);

        games.push({
          id: dirent.name,
          title: meta.title || dirent.name,
          originalTitle: meta.originalTitle,
          version: meta.version,
          releaseYear: meta.releaseYear,
          developer: meta.developer,
          genre: meta.genre || "DOS 게임",
          description: meta.description || `${formatDisplayPath(fullPath)} 로컬 폴더 게임`,
          gameFile: `/api/local-games/${encodedId}/bundle`,
          entry,
          executables: executables.length > 0 ? executables : [entry],
          saveFile,
          coverImage,
          badge: meta.badge || "로컬 폴더",
          category: meta.category,
          sourceType: "local-dir",
          localPath: formatDisplayPath(fullPath),
          totalSize,
          order: meta.order,
        });
      } else if (dirent.isFile() && dirent.name.toLowerCase().endsWith(".zip")) {
        const baseName = dirent.name.slice(0, -4);
        const meta =
          readJsonIfExists<LocalGameMeta>(path.join(gamesDir, `${baseName}.json`)) ?? {};
        const stat = fs.statSync(fullPath);
        const zipEntries = listZipEntries(fullPath);
        const executables = zipEntries.filter(isExecutable);
        const entry = meta.entry || pickDefaultEntry(executables);
        const saveFile = meta.saveFile || pickDefaultSaveFile(zipEntries) || "SAVE.DAT";
        const encodedId = encodeURIComponent(dirent.name);

        games.push({
          id: dirent.name,
          title: meta.title || baseName,
          originalTitle: meta.originalTitle,
          version: meta.version,
          releaseYear: meta.releaseYear,
          developer: meta.developer,
          genre: meta.genre || "DOS 압축 아카이브",
          description: meta.description || `${formatDisplayPath(fullPath)} 로컬 ZIP 아카이브`,
          gameFile: `/api/local-games/${encodedId}/archive.zip`,
          entry,
          executables: executables.length > 0 ? executables : [entry],
          saveFile,
          coverImage: meta.coverImage,
          badge: meta.badge || "로컬 ZIP",
          category: meta.category,
          sourceType: "local-zip",
          localPath: formatDisplayPath(fullPath),
          totalSize: stat.size,
          order: meta.order,
        });
      }
    }

    games.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title, "ko");
    });

    return games;
  }

  async function handleMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) {
    if (!req.url || !req.url.startsWith("/api/local-games")) {
      next();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, "http://localhost");
      const subPath = parsedUrl.pathname.slice("/api/local-games".length);

      // GET /api/local-games
      if ((subPath === "" || subPath === "/") && req.method === "GET") {
        const games = scanGames();
        sendJson(res, 200, {
          gamesDir,
          displayDir: formatDisplayPath(gamesDir),
          games,
        });
        return;
      }

      // Match /api/local-games/:id/<action>
      const match = subPath.match(/^\/([^/]+)\/(.+)$/);
      if (!match) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      const entryId = decodeURIComponent(match[1]);
      const action = match[2];
      const targetFolderOrFile = resolveSafeChild(entryId);
      if (!targetFolderOrFile || !fs.existsSync(targetFolderOrFile)) {
        sendJson(res, 404, { error: "Game not found" });
        return;
      }

      // GET /api/local-games/:id/cover
      if (action === "cover" && req.method === "GET") {
        if (!fs.statSync(targetFolderOrFile).isDirectory()) {
          sendJson(res, 404, { error: "No cover" });
          return;
        }
        const effectiveRoot = resolveEffectiveGameDir(targetFolderOrFile);
        const cover =
          findCoverFile(targetFolderOrFile) ||
          (effectiveRoot !== targetFolderOrFile ? findCoverFile(effectiveRoot) : undefined);
        if (!cover) {
          sendJson(res, 404, { error: "Cover not found" });
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", cover.mime);
        res.setHeader("Cache-Control", "public, max-age=3600");
        fs.createReadStream(cover.absPath).pipe(res);
        return;
      }

      // GET /api/local-games/:id/archive.zip
      if (action === "archive.zip" && req.method === "GET") {
        if (!fs.statSync(targetFolderOrFile).isFile()) {
          sendJson(res, 400, { error: "Not a zip file" });
          return;
        }
        const stat = fs.statSync(targetFolderOrFile);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Length", stat.size);
        res.setHeader("Cache-Control", "no-store");
        fs.createReadStream(targetFolderOrFile).pipe(res);
        return;
      }

      // GET /api/local-games/:id/bundle
      if (action === "bundle" && req.method === "GET") {
        if (!fs.statSync(targetFolderOrFile).isDirectory()) {
          sendJson(res, 400, { error: "Not a directory" });
          return;
        }
        const effectiveRoot = resolveEffectiveGameDir(targetFolderOrFile);
        const files = scanDirectoryFiles(effectiveRoot);

        let offset = 0;
        const manifestFiles = files.map((f) => {
          const entry = { path: f.relPath, offset, size: f.size };
          offset += f.size;
          return entry;
        });

        const headerJson = Buffer.from(
          JSON.stringify({ files: manifestFiles }),
          "utf8",
        );
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32LE(headerJson.byteLength, 0);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", 4 + headerJson.byteLength + offset);
        res.setHeader("Cache-Control", "no-store");

        res.write(lenBuf);
        res.write(headerJson);
        for (const f of files) {
          res.write(fs.readFileSync(f.absPath));
        }
        res.end();
        return;
      }

      // PUT /api/local-games/:id/files?path=KOUKAI2.DAT
      if (action === "files" && req.method === "PUT") {
        if (!fs.statSync(targetFolderOrFile).isDirectory()) {
          sendJson(res, 400, { error: "Direct file sync is supported for game directories" });
          return;
        }
        const relFilePath = (parsedUrl.searchParams.get("path") || "")
          .replace(/^\/+/, "")
          .replace(/\\/g, "/");

        if (
          !relFilePath ||
          relFilePath.split("/").some((seg) => !seg || seg === "." || seg === ".." || seg.startsWith(".")) ||
          IGNORED_META_FILES.has(relFilePath.toLowerCase())
        ) {
          sendJson(res, 400, { error: "Invalid file path" });
          return;
        }

        const effectiveRoot = resolveEffectiveGameDir(targetFolderOrFile);
        const resolvedDest = path.resolve(effectiveRoot, relFilePath);
        if (!resolvedDest.startsWith(effectiveRoot + path.sep)) {
          sendJson(res, 403, { error: "Forbidden path" });
          return;
        }

        // Match existing file case-insensitively on disk if present
        const destDir = path.dirname(resolvedDest);
        fs.mkdirSync(destDir, { recursive: true });
        let finalDest = resolvedDest;
        const targetBaseUpper = path.basename(resolvedDest).toUpperCase();
        const existingMatch = fs
          .readdirSync(destDir)
          .find((name) => name.toUpperCase() === targetBaseUpper);
        if (existingMatch) {
          finalDest = path.join(destDir, existingMatch);
        }

        const actualRelPath = path.relative(effectiveRoot, finalDest).replace(/\\/g, "/");
        const backupRoot = path.join(effectiveRoot, ".backup");
        const createdListPath = path.join(backupRoot, ".created.json");
        const createdSet = new Set<string>(readJsonIfExists<string[]>(createdListPath) ?? []);

        if (fs.existsSync(finalDest)) {
          // Back up original file once if it wasn't newly created during play
          const backupFile = path.join(backupRoot, actualRelPath);
          if (!createdSet.has(actualRelPath) && !fs.existsSync(backupFile)) {
            fs.mkdirSync(path.dirname(backupFile), { recursive: true });
            fs.copyFileSync(finalDest, backupFile);
          }
        } else {
          fs.mkdirSync(backupRoot, { recursive: true });
          createdSet.add(actualRelPath);
          fs.writeFileSync(createdListPath, JSON.stringify([...createdSet], null, 2));
        }

        const body = await readRequestBody(req);
        const tmpFile = `${finalDest}.tmp.${process.pid}.${Date.now()}`;
        fs.writeFileSync(tmpFile, body);
        fs.renameSync(tmpFile, finalDest);

        sendJson(res, 200, {
          ok: true,
          savedPath: formatDisplayPath(finalDest),
          relPath: actualRelPath,
          bytes: body.byteLength,
        });
        return;
      }

      // POST /api/local-games/:id/reset
      if (action === "reset" && req.method === "POST") {
        if (!fs.statSync(targetFolderOrFile).isDirectory()) {
          sendJson(res, 400, { error: "Not a directory" });
          return;
        }
        const effectiveRoot = resolveEffectiveGameDir(targetFolderOrFile);
        const backupRoot = path.join(effectiveRoot, ".backup");

        if (fs.existsSync(backupRoot)) {
          const createdListPath = path.join(backupRoot, ".created.json");
          const createdFiles = readJsonIfExists<string[]>(createdListPath) ?? [];
          for (const rel of createdFiles) {
            const createdAbs = path.resolve(effectiveRoot, rel);
            if (createdAbs.startsWith(effectiveRoot + path.sep) && fs.existsSync(createdAbs)) {
              fs.unlinkSync(createdAbs);
            }
          }

          // Restore backed up originals
          const backupFiles = scanDirectoryFiles(backupRoot);
          for (const bf of backupFiles) {
            const origAbs = path.resolve(effectiveRoot, bf.relPath);
            if (origAbs.startsWith(effectiveRoot + path.sep)) {
              fs.mkdirSync(path.dirname(origAbs), { recursive: true });
              fs.copyFileSync(bf.absPath, origAbs);
            }
          }

          fs.rmSync(backupRoot, { recursive: true, force: true });
        }

        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: "Unknown endpoint" });
    } catch (err) {
      console.error("[local-games-plugin]", err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  }

  return {
    name: "vite-plugin-local-games",
    configureServer(server) {
      ensureGamesDir();
      server.middlewares.use(handleMiddleware);
    },
    configurePreviewServer(server) {
      ensureGamesDir();
      server.middlewares.use(handleMiddleware);
    },
  };
}
