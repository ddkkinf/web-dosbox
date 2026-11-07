export interface GameConfig {
  id: string;
  title: string;
  originalTitle?: string;
  version?: string;
  releaseYear?: number;
  developer?: string;
  genre?: string;
  description?: string;
  gameFile: string; // e.g. 'water2.zip' or blob URL
  entry: string; // e.g. 'KOEI.COM' or 'PLAY.BAT'
  saveFile?: string; // e.g. 'KOUKAI2.DAT'
  coverImage?: string;
  badge?: string;
}

export const GAMES: GameConfig[] = [
  {
    id: "water2",
    title: "대항해시대 2 (원본)",
    originalTitle: "Uncharted Waters II: New Horizons",
    version: "Original",
    releaseYear: 1994,
    developer: "KOEI",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "16세기 대항해시대를 무대로 6명의 주인공 중 한 명을 선택해 세계 각지를 탐험하고 무역과 해전을 즐기는 코에이의 불후의 명작.",
    gameFile: "water2.zip",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "오리지널",
  },
  {
    id: "water2_correction",
    title: "대항해시대 2 (버그/번역 교정판)",
    originalTitle: "Uncharted Waters II: Bug & Translation Fix",
    version: "v1.08",
    releaseYear: 1994,
    developer: "KOEI / Mod Community",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "원본의 오역과 각종 버그를 깔끔하게 수정한 교정판. 쾌적한 플레이를 원하는 분들께 가장 추천하는 버전입니다.",
    gameFile: "mod_correction_v1.08.zip",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "추천 교정판",
  },
  {
    id: "water2_junghwa",
    title: "대항해시대 2: 정화편",
    originalTitle: "Uncharted Waters II: Zheng He Edition",
    version: "v3.0",
    releaseYear: 1994,
    developer: "KOEI / Mod Community",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "명나라의 대원정함대를 이끌었던 정화 제독을 주인공으로 플레이할 수 있는 대규모 인기 개조 모드.",
    gameFile: "mod_junghwa_v3.0.zip",
    entry: "KOEI.COM",
    saveFile: "CHENGHO.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "인기 모드",
  },
  {
    id: "water2_ernst",
    title: "대항해시대 2: 에르네스트 모드",
    originalTitle: "Uncharted Waters II: Ernst Mod",
    version: "v1.11",
    releaseYear: 1994,
    developer: "KOEI / Mod Community",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "네덜란드의 지리학자 에르네스트 로페스의 지도 제작 및 탐험 스토리에 초점을 맞춘 확장 모드.",
    gameFile: "mod_ernst_v1.11.zip",
    entry: "PLAY.BAT",
    saveFile: "KOUKAI2.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "확장 모드",
  },
  {
    id: "water2_miranda",
    title: "대항해시대 2 외전: 밀란다편",
    originalTitle: "Uncharted Waters II Gaiden: Miranda",
    version: "v161126",
    releaseYear: 1997,
    developer: "KOEI / Mod Community",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "제노바의 말괄량이 소녀 밀란다 베르테의 좌충우돌 모험담을 그린 외전 스토리 모드.",
    gameFile: "mod_eojeon_161126_p1.zip",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "외전 시리즈",
  },
  {
    id: "water2_salvador",
    title: "대항해시대 2 외전: 살바도르편",
    originalTitle: "Uncharted Waters II Gaiden: Salvador",
    version: "v161126",
    releaseYear: 1997,
    developer: "KOEI / Mod Community",
    genre: "해양 모험 시뮬레이션 RPG",
    description:
      "알제 해적의 후계자 살바도르 레이스의 거친 해적 라이프를 다룬 박진감 넘치는 외전 모드.",
    gameFile: "mod_eojeon_161126_p3.zip",
    entry: "KOEI.COM",
    saveFile: "KOUKAI2.DAT",
    coverImage: "/static/thumbnail.png",
    badge: "외전 시리즈",
  },
];
