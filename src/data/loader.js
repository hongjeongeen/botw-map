// public/data/*.json 지연 로드 + 메모리 캐시
const BASE = import.meta.env.BASE_URL;
const cache = new Map();

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다: ${url} (${res.status})`);
  return res.json();
}

/** 카테고리 데이터 배열 (같은 카테고리는 한 번만 받는다) */
export function loadCategory(id) {
  if (!cache.has(id)) cache.set(id, getJson(`${BASE}data/${id}.json`));
  return cache.get(id);
}

/** 이미 로드된 경우에만 동기적으로 반환 */
const loaded = new Map();
export async function loadAndKeep(id) {
  const rows = await loadCategory(id);
  loaded.set(id, rows);
  return rows;
}
export const getLoaded = (id) => loaded.get(id) ?? null;

export const loadIndex = () => getJson(`${BASE}data/index.json`);
