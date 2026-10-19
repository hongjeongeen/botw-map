import L from 'leaflet';
import { toLatLng } from './crs.js';
import { ICONS } from './icons.js';
import { PLACE_ICON, CAT_ICON } from '../data/categories.js';

// 모든 점 마커가 공유하는 캔버스 렌더러. tolerance = 터치 히트 영역 확장(px)
export const canvas = L.canvas({ tolerance: 8 });

const iconKey = (cat, e) => (cat.id === 'places' ? PLACE_ICON[e.kind] ?? 'shop' : CAT_ICON[cat.id] ?? 'poi');

export function divIconFor(cat, e, done) {
  return L.divIcon({
    className: `mk mk-${cat.id}${done ? ' done' : ''}`,
    html: ICONS[iconKey(cat, e)],
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
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
    const m = cat.style === 'icon'
      ? L.marker(ll, { icon: divIconFor(cat, e, isDone(e.id)), title: e.name, keyboard: false })
      : L.circleMarker(ll, { renderer: canvas, bubblingMouseEvents: false, ...dotStyle(cat, isDone(e.id)) });
    m.entry = e;
    m.on('click', () => onSelect(e, cat, m));
    byId.set(e.id, m);
    markers.push(m);
  }

  let filters = { hideDone: false, hidden: new Set() };

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
      if (m.setIcon) m.setIcon(divIconFor(cat, m.entry, done));
      else m.setStyle(dotStyle(cat, done));
      if (filters.hideDone && cat.trackable) apply();
    },
    setFilters({ hideDone, hidden }) {
      filters = { hideDone: !!hideDone, hidden: new Set(hidden ?? []) };
      apply();
    },
  };
}
