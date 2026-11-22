export type GameSourceType = "local-dir" | "local-zip" | "custom-zip";

export interface GameConfig {
  id: string;
  title: string;
  originalTitle?: string;
  version?: string;
  releaseYear?: number;
  developer?: string;
  genre?: string;
  description?: string;
  gameFile: string; // '/api/local-games/<id>/bundle' | '/api/local-games/<id>/archive.zip' | blob URL
  entry: string; // e.g. 'KOEI.COM' or 'PLAY.BAT'
  executables?: string[];
  saveFile?: string; // e.g. 'KOUKAI2.DAT'
  cycles?: number | string;
  useMouse?: boolean;
  coverImage?: string;
  badge?: string;
  category?: string;
  sourceType?: GameSourceType;
  localPath?: string;
  totalSize?: number;
}

export interface LocalGamesResponse {
  gamesDir: string;
  displayDir: string;
  games: GameConfig[];
}

export async function fetchLocalGames(): Promise<LocalGamesResponse> {
  try {
    const res = await fetch("/api/local-games", { cache: "no-store" });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      return (await res.json()) as LocalGamesResponse;
    }
  } catch {
    // Fallback to static manifest (GitHub Pages / static hosting)
  }

  const baseUrl = import.meta.env.BASE_URL || "./";
  const staticRes = await fetch(`${baseUrl}static-games/manifest.json`, {
    cache: "no-store",
  });
  if (!staticRes.ok) {
    throw new Error(
      `게임 목록을 불러오지 못했습니다 (HTTP ${staticRes.status})`,
    );
  }
  const data = (await staticRes.json()) as LocalGamesResponse;
  return {
    ...data,
    games: data.games.map((g) => ({
      ...g,
      gameFile:
        g.gameFile.startsWith("http") || g.gameFile.startsWith("/")
          ? g.gameFile
          : `${baseUrl}${g.gameFile}`,
      coverImage:
        g.coverImage &&
        !g.coverImage.startsWith("http") &&
        !g.coverImage.startsWith("/")
          ? `${baseUrl}${g.coverImage}`
          : g.coverImage,
    })),
  };
}

export async function uploadLocalGameFile(
  gameId: string,
  relPath: string,
  bytes: Uint8Array,
): Promise<{ ok: boolean; savedPath: string; relPath: string }> {
  const encodedId = encodeURIComponent(gameId);
  const encodedPath = encodeURIComponent(relPath);
  const res = await fetch(`/api/local-games/${encodedId}/files?path=${encodedPath}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: bytes as unknown as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`로컬 파일 저장 실패 (HTTP ${res.status})`);
  }
  return (await res.json()) as { ok: boolean; savedPath: string; relPath: string };
}

export async function resetLocalGameFiles(gameId: string): Promise<void> {
  const encodedId = encodeURIComponent(gameId);
  const res = await fetch(`/api/local-games/${encodedId}/reset`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`로컬 세이브 초기화 실패 (HTTP ${res.status})`);
  }
}
