import L from 'leaflet';
import { toLatLng } from './crs.js';
import { iconKeyFor, iconUrl, iconSizeFor, getImage, colorFor } from './icons.js';
import { PointCloud } from './pointCloud.js';
import { iconSprite, dotSprite } from './sprites.js';

// 모든 캔버스 레이어가 공유하는 렌더러. tolerance = 터치 히트 영역 확장(px)
export const canvas = L.canvas({ tolerance: 8 });

// 캔버스 아이콘 그림 크기(px, 긴 변 기준)
const CANVAS_ICON_WIDTH = { koroks: 22, bosses: 28, guardians: 26, materials: 22, chests: 22, ores: 22 };
// 랜드마크 아이콘 그림 크기(px). 캔버스 여백과 무관하게 모든 아이콘이 같은 크기로 보인다
const ICON_CONTENT_PX = 28;

/** DOM 마커용 L.icon (랜드마크). scale: 줌이 낮을 때 축소 */
export function markerIcon(cat, key, done, scale = 1) {
  const [w, h] = iconSizeFor(key, Math.round(ICON_CONTENT_PX * scale));
  return L.icon({
    iconUrl: iconUrl(key),
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
    popupAnchor: [0, -h / 2],
    className: `mk mk-${cat.id}${done ? ' done' : ''}`,
  });
}

/**
 * 대량 카테고리(코로그·강적·가디언·몬스터·소재·상자·광석): 점 구름 레이어 하나로 캔버스에 그린다.
 */
function createPointCloudLayer(cat, entries, { isDone, onSelect }) {
  const base = CANVAS_ICON_WIDTH[cat.id] ?? 24;
  const r = cat.dotRadius ?? 5;
  const big = r >= 6;
  const keys = entries.map((e) => iconKeyFor(cat, e));
  const colors = entries.map((e) => colorFor(cat, e));
  let scale = 1;
  let filters = { hideDone: false, hidden: new Set() };

  const cloud = new PointCloud(entries, {
    renderer: canvas,
    hitRadius: Math.round(base / 2) + 2,
    spriteFor(i) {
      const done = cat.trackable && isDone(entries[i].id);
      const key = keys[i];
      if (key) {
        const img = getImage(key);
        if (img.complete && img.naturalWidth) {
          const [w, h] = iconSizeFor(key, Math.round(base * scale));
          return iconSprite(key, img, w, h, done);
        }
      }
      return dotSprite(colors[i], Math.max(3, Math.round(r * scale)), done, big);
    },
  });
  cloud.on('click', () => {
    const e = cloud.hitEntry();
    if (e) onSelect(e, cat, cloud);
  });

  const applyShow = () => cloud.setShow((e) => !(filters.hideDone && cat.trackable && isDone(e.id))
    && !(cat.subtypes && filters.hidden.has(e[cat.subtypes])));

  return {
    cat,
    group: cloud,
    entries,
    visibleEntries: () => cloud.visibleEntries(),
    setDone() {
      if (filters.hideDone && cat.trackable) applyShow();
      else cloud.redraw();
    },
    setFilters({ hideDone, hidden }) {
      filters = { hideDone: !!hideDone, hidden: new Set(hidden ?? []) };
      applyShow();
    },
    setScale(s) {
      if (s === scale) return;
      scale = s;
      cloud.redraw();
    },
  };
}

/**
 * 카테고리 하나의 마커 묶음.
 * entries: [{ id, name, x, y, z, … }], isDone(id), onSelect(entry, cat, marker)
 */
export function createCategoryLayer(cat, entries, deps) {
  if (cat.style !== 'icon') return createPointCloudLayer(cat, entries, deps);

  const { isDone, onSelect } = deps;
  const group = L.layerGroup();
  const byId = new Map();
  const markers = [];
  for (const e of entries) {
    const key = iconKeyFor(cat, e) ?? 'settlement';
    const m = L.marker(toLatLng(e.x, e.z), { icon: markerIcon(cat, key, isDone(e.id)), title: e.name, keyboard: false });
    m.entry = e;
    m.iconKey = key;
    m.on('click', () => onSelect(e, cat, m));
    byId.set(e.id, m);
    markers.push(m);
  }

  let filters = { hideDone: false, hidden: new Set() };
  let scale = 1;

  function apply() {
    for (const m of markers) {
      const e = m.entry;
      const show = !(filters.hideDone && cat.trackable && isDone(e.id))
        && !(cat.subtypes && filters.hidden.has(e[cat.subtypes]));
      if (show !== group.hasLayer(m)) (show ? group.addLayer(m) : group.removeLayer(m));
    }
  }
  apply();

  return {
    cat,
    group,
    entries,
    byId,
    /** 표시 중(필터 통과)인 항목만 */
    visibleEntries: () => markers.filter((m) => group.hasLayer(m)).map((m) => m.entry),
    setDone(id, done) {
      const m = byId.get(id);
      if (!m) return;
      m.setIcon(markerIcon(cat, m.iconKey, done, scale));
      if (filters.hideDone && cat.trackable) apply();
    },
    setFilters({ hideDone, hidden }) {
      filters = { hideDone: !!hideDone, hidden: new Set(hidden ?? []) };
      apply();
    },
    /** 줌이 낮을 때 아이콘 축소 (0.55 ~ 1) */
    setScale(s) {
      if (s === scale) return;
      scale = s;
      for (const m of markers) m.setIcon(markerIcon(cat, m.iconKey, isDone(m.entry.id), s));
    },
  };
}
