import L from 'leaflet';
import { toLatLng } from './crs.js';
import { iconKeyFor, iconUrl, iconSizeFor, getImage } from './icons.js';
import { IconMarker } from './canvasIcons.js';

// 모든 캔버스 마커가 공유하는 렌더러. tolerance = 터치 히트 영역 확장(px)
export const canvas = L.canvas({ tolerance: 8 });

// 캔버스 아이콘 가로 폭(px)
const CANVAS_ICON_WIDTH = { koroks: 22, bosses: 28, guardians: 26, materials: 22 };

/** DOM 마커용 L.icon (랜드마크). scale: 줌이 낮을 때 축소 */
export function markerIcon(cat, key, done, scale = 1) {
  const [w, h] = iconSizeFor(key, Math.round(30 * scale));
  return L.icon({
    iconUrl: iconUrl(key),
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
    popupAnchor: [0, -h / 2],
    className: `mk mk-${cat.id}${done ? ' done' : ''}`,
  });
}

const dotStyle = (cat, done) => ({
  radius: 5,
  weight: 1,
  color: '#141414',
  fillColor: done ? '#8d8d8d' : cat.color,
  fillOpacity: done ? 0.35 : 0.9,
});

/**
 * 카테고리 하나의 마커 묶음.
 * entries: [{ id, name, x, y, z, … }], isDone(id), onSelect(entry, cat, marker)
 */
export function createCategoryLayer(cat, entries, { isDone, onSelect }) {
  const group = L.layerGroup();
  const byId = new Map();
  const markers = [];

  for (const e of entries) {
    const ll = toLatLng(e.x, e.z);
    const key = iconKeyFor(cat, e);
    let m;
    if (cat.style === 'icon') {
      m = L.marker(ll, { icon: markerIcon(cat, key ?? 'settlement', isDone(e.id)), title: e.name, keyboard: false });
    } else if (key) {
      const [w, h] = iconSizeFor(key, CANVAS_ICON_WIDTH[cat.id] ?? 24);
      m = new IconMarker(ll, {
        renderer: canvas, bubblingMouseEvents: false, image: getImage(key), iconW: w, iconH: h, done: isDone(e.id),
        radius: Math.ceil(Math.max(w, h) / 2) + 3, ...dotStyle(cat, isDone(e.id)),
      });
    } else {
      m = L.circleMarker(ll, { renderer: canvas, bubblingMouseEvents: false, ...dotStyle(cat, isDone(e.id)) });
    }
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
      if (m instanceof IconMarker) m.setDone(done);
      else if (m.setIcon) m.setIcon(markerIcon(cat, m.iconKey ?? 'settlement', done, scale));
      else m.setStyle(dotStyle(cat, done));
      if (filters.hideDone && cat.trackable) apply();
    },
    /** 줌이 낮을 때 아이콘 축소 (0.55 ~ 1) */
    setScale(s) {
      if (s === scale) return;
      scale = s;
      for (const m of markers) {
        if (m instanceof IconMarker) {
          const [w, h] = iconSizeFor(m.iconKey, Math.round((CANVAS_ICON_WIDTH[cat.id] ?? 24) * s));
          m.options.iconW = w;
          m.options.iconH = h;
          m.setRadius(Math.ceil(Math.max(w, h) / 2) + 3); // 경계·히트 영역 갱신 + 다시 그리기
        } else if (m.setIcon) {
          m.setIcon(markerIcon(cat, m.iconKey ?? 'settlement', isDone(m.entry.id), s));
        }
      }
    },
    setFilters({ hideDone, hidden }) {
      filters = { hideDone: !!hideDone, hidden: new Set(hidden ?? []) };
      apply();
    },
  };
}
