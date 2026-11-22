import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const gamesDir =
  process.env.DOSBOX_GAMES_DIR || path.join(os.homedir(), "games", "dos-box");
const outDir = path.resolve(process.cwd(), "public", "static-games");

const PRESET_METADATA = {
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

function isExecutable(relPath) {
  const ext = path.extname(relPath).toUpperCase();
  return ext === ".COM" || ext === ".EXE" || ext === ".BAT";
}

function pickDefaultEntry(executables) {
  if (executables.length === 0) return "KOEI.COM";
  const upperMap = new Map(executables.map((e) => [e.toUpperCase(), e]));
  for (const preferred of PREFERRED_ENTRIES) {
    const match = upperMap.get(preferred);
    if (match) return match;
  }
  const rootCandidates = executables.filter((e) => !e.includes("/"));
  const nonHelpers = (rootCandidates.length > 0 ? rootCandidates : executables).filter(
    (e) => !HELPER_BINARIES.has(path.basename(e).toUpperCase()),
  );
  const pool = nonHelpers.length > 0 ? nonHelpers : executables;
  const bat = pool.find((e) => e.toUpperCase().endsWith(".BAT"));
  if (bat) return bat;
  const com = pool.find((e) => e.toUpperCase().endsWith(".COM"));
  if (com) return com;
  return pool[0];
}

function pickDefaultSaveFile(files) {
  const koukai = files.find((f) => path.basename(f).toUpperCase() === "KOUKAI2.DAT");
  if (koukai) return koukai;
  const sav = files.find((f) => {
    const upper = path.basename(f).toUpperCase();
    return upper.endsWith(".SAV") || upper.startsWith("SAVE");
  });
  return sav;
}

function collectFilesRecursive(rootDir, currentDir = rootDir) {
  const results = [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursive(rootDir, fullPath));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      results.push({ relPath, fullPath, size: stat.size });
    }
  }
  return results;
}

fs.mkdirSync(outDir, { recursive: true });

const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
const games = [];

for (const dirent of entries) {
  if (dirent.name.startsWith(".")) continue;
  if (!dirent.isDirectory()) continue;

  const id = dirent.name;
  const fullPath = path.join(gamesDir, dirent.name);
  let customMeta = {};
  const metaPath = path.join(fullPath, "game.json");
  if (fs.existsSync(metaPath)) {
    try {
      customMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch {
      // ignore invalid json
    }
  }

  const preset = PRESET_METADATA[id] || {};
  const meta = { ...preset, ...customMeta };
  const allFiles = collectFilesRecursive(fullPath);
  const files = allFiles.filter((f) => {
    const lower = f.relPath.toLowerCase();
    if (lower === "game.json") return false;
    if (COVER_CANDIDATES.includes(lower)) return false;
    return true;
  });
  if (files.length === 0) continue;

  const relPaths = files.map((f) => f.relPath);
  const rawExecs = relPaths.filter(isExecutable);
  const userExecs = rawExecs.filter(
    (e) => !INTERNAL_DRIVERS.has(path.basename(e).toUpperCase()),
  );
  const executables = userExecs.length > 0 ? userExecs : rawExecs;
  const entry = meta.entry || pickDefaultEntry(executables);
  const orderedExecs = [
    entry,
    ...executables.filter((e) => e.toUpperCase() !== entry.toUpperCase()),
  ];
  const saveFile = meta.saveFile || pickDefaultSaveFile(relPaths);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Copy cover image if present
  let coverImage;
  for (const candidate of COVER_CANDIDATES) {
    const coverPath = path.join(fullPath, candidate);
    if (fs.existsSync(coverPath) && fs.statSync(coverPath).isFile()) {
      const ext = path.extname(candidate);
      const destCoverName = `${id}-cover${ext}`;
      fs.copyFileSync(coverPath, path.join(outDir, destCoverName));
      coverImage = `static-games/${destCoverName}`;
      break;
    }
  }

  // Create zip archive of the game folder
  const zipName = `${id}.zip`;
  const zipDest = path.join(outDir, zipName);
  if (fs.existsSync(zipDest)) {
    fs.unlinkSync(zipDest);
  }
  execFileSync(
    "zip",
    [
      "-r",
      "-q",
      zipDest,
      ".",
      "-x",
      ".*",
      ".initial-backup/*",
      "game.json",
      "cover.*",
      "__MACOSX/*",
    ],
    { cwd: fullPath },
  );

  games.push({
    id,
    title: meta.title || id,
    originalTitle: meta.originalTitle,
    version: meta.version,
    releaseYear: meta.releaseYear,
    developer: meta.developer,
    genre: meta.genre || "DOS 게임",
    description: meta.description || `${id} DOS 게임`,
    gameFile: `static-games/${zipName}`,
    entry,
    executables: orderedExecs,
    saveFile,
    cycles: meta.cycles,
    useMouse: meta.useMouse,
    coverImage,
    badge: meta.badge || "DOS 게임",
    category: meta.category,
    sourceType: "local-zip",
    localPath: `~/games/dos-box/${id}`,
    totalSize,
    _order: meta.order ?? 999,
  });
}

games.sort((a, b) => {
  if (a._order !== b._order) return a._order - b._order;
  return a.title.localeCompare(b.title, "ko");
});

const cleanGames = games.map(({ _order, ...rest }) => rest);
const manifest = {
  gamesDir: "~/games/dos-box",
  displayDir: "GitHub Pages / ~/games/dos-box",
  games: cleanGames,
};

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(`Exported ${cleanGames.length} games to ${outDir}`);
