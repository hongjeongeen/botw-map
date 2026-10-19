// 마커 아이콘. PNG 는 public/icons/*.png (사용자가 제공), 맵 핀·현재 위치만 인라인 SVG.
import { PLACE_ICON } from '../data/categories.js';

const BASE = import.meta.env.BASE_URL;

// key → [파일명, 원본 가로, 원본 세로]
export const PNG = {
  tower: ['tower.png', 28, 39],
  shrine: ['shrine.png', 26, 27],
  village: ['village.png', 30, 30],
  stable: ['stable.png', 30, 30],
  settlement: ['settlement.png', 27, 27],
  lab: ['lab.png', 31, 25],
  armor: ['armor.png', 30, 30],
  dye: ['dye.png', 30, 30],
  jewelry: ['jewelry.png', 30, 30],
  inn: ['inn.png', 30, 30],
  store: ['store.png', 30, 30],
  fountain: ['fountain.png', 29, 29],
  memory: ['memory.png', 30, 28],
  seed: ['seed.png', 30, 28],
  lynel: ['lynel.png', 29, 30],
  hinox: ['hinox.png', 30, 30],
  talus: ['talus.png', 26, 30],
  molduga: ['molduga.png', 29, 30],
  guardian: ['guardian.png', 32, 28],
  pot: ['pot.png', 30, 27],
  treasure: ['treasure.png', 30, 25],
  statue: ['statue.png', 24, 30],
  raft: ['raft.png', 27, 30],
  sidequest: ['sidequest.png', 30, 23],
  // 2차 제공 아이콘 (32px)
  hotspring: ['hotspring.png', 32, 32],
  fairy: ['fairy.png', 32, 32],
  dragon: ['dragon.png', 32, 32],
  ore_common: ['ore_common.png', 32, 32],
  ore_rare: ['ore_rare.png', 32, 32],
  ore_luminous: ['ore_luminous.png', 32, 32],
};

export const iconUrl = (key) => `${BASE}icons/${PNG[key][0]}`;

/** 아이콘이 없는 항목의 점 색. 종류별로 다른 색을 쓰는 카테고리는 여기서 결정 */
export function colorFor(cat, e) {
  if (cat.id === 'dragons') return /Fire/.test(e?.actor ?? '') ? '#ff7043' : /Electric/.test(e?.actor ?? '') ? '#9ccc65' : '#64b5f6';
  if (cat.id === 'ores') return e?.name === '희귀 광석' ? '#ffd54f' : e?.name === '야광석' ? '#64b5f6' : '#cfd8dc';
  return cat.color;
}
/** 가로 폭이 width(px)가 되도록 비율 유지 */
export function iconSizeFor(key, width) {
  const [, w, h] = PNG[key];
  const s = width / w;
  return [Math.round(w * s), Math.round(h * s)];
}

const BOSS_KEYS = [[/Lynel/, 'lynel'], [/Giant/, 'hinox'], [/Golem/, 'talus'], [/Sandworm/, 'molduga']];

/** 항목(entry)에 맞는 아이콘 키. 없으면 null → 점 마커 */
export function iconKeyFor(cat, e) {
  switch (cat.id) {
    case 'towers': return 'tower';
    case 'shrines': return 'shrine';
    case 'fountains': return 'fountain';
    case 'memories': return 'memory';
    case 'statues': return 'statue';
    case 'hotsprings': return 'hotspring';
    case 'fairies': return 'fairy';
    case 'dragons': return 'dragon'; // 드래곤은 아이콘 하나, 이름으로 구분
    case 'ores': return e?.name === '희귀 광석' ? 'ore_rare' : e?.name === '야광석' ? 'ore_luminous' : 'ore_common';
    case 'koroks': return 'seed';
    case 'chests': return 'treasure';
    case 'guardians': return 'guardian';
    case 'places': return PLACE_ICON[e?.kind] ?? 'settlement';
    case 'bosses': return BOSS_KEYS.find(([re]) => re.test(e?.actor ?? ''))?.[1] ?? null;
    case 'materials': return /^Item_CookSet/.test(e?.actor ?? '') ? 'pot' : null;
    default: return null;
  }
}

/** 카테고리 대표 아이콘 (패널 행) */
export const CATEGORY_ICON = { towers: 'tower', shrines: 'shrine', places: 'village', fountains: 'fountain', memories: 'memory', statues: 'statue', hotsprings: 'hotspring', fairies: 'fairy', dragons: 'dragon', koroks: 'seed', chests: 'treasure', ores: 'ore_common', bosses: 'lynel', guardians: 'guardian' };

export const iconImg = (key, cls = 'inline-icon') => `<img class="${cls}" src="${iconUrl(key)}" alt="">`;

/** 목록/패널용 작은 아이콘. PNG 가 없으면 색 점 (종류별 색 반영) */
export function swatchHtml(cat, e) {
  const key = e ? iconKeyFor(cat, e) : CATEGORY_ICON[cat.id];
  return key ? iconImg(key, 'swatch icon') : `<span class="swatch" style="background:${colorFor(cat, e)}"></span>`;
}

// ---- 캔버스 마커용 이미지 캐시 ----
const images = new Map();
export function getImage(key) {
  let img = images.get(key);
  if (!img) {
    img = new Image();
    img.src = iconUrl(key);
    images.set(key, img);
  }
  return img;
}
export async function preloadIcons() {
  await Promise.all(Object.keys(PNG).map((k) => getImage(k).decode().catch(() => {})));
}

// ---- SVG: 맵 핀, 현재 위치 ----
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">${body}</svg>`;
export const pinSvg = (color) =>
  svg(`<path d="M12 2 a7 7 0 0 0-7 7 c0 5 7 13 7 13 s7-8 7-13 a7 7 0 0 0-7-7z" fill="${color}" stroke="#111" stroke-width="1.3"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>`);
export const meSvg = svg('<circle cx="12" cy="12" r="10" fill="#2e7d32" stroke="#fff" stroke-width="2"/><path d="M12 5 L17 17 L12 14 L7 17 Z" fill="#fff"/>');
export const PIN_COLORS = ['#ff5252', '#ffb300', '#66bb6a', '#29b6f6', '#ab47bc', '#eceff1'];
