import L from 'leaflet';
import { toLatLng } from './crs.js';
import { esc } from '../util.js';

// 게임의 ShowLevel: 1 지방, 2 지역, 4 장소, 8 세부 장소 → 줌에 따라 표시
export function labelVisible(level, z) {
  if (level <= 1) return z <= 3;
  if (level === 2) return z >= 3 && z <= 6;
  if (level === 4) return z >= 5;
  return z >= 7;
}

/**
 * 한국어 지명 텍스트 오버레이. 타일에는 글자가 없으므로 직접 그린다.
 * 현재 화면 안의 라벨만 DOM 에 유지한다 (moveend/zoomend 마다 갱신).
 */
export function createLabelLayer(map, entries) {
  const group = L.layerGroup();
  const items = entries.map((e) => ({
    e,
    ll: toLatLng(e.x, e.z),
    marker: L.marker(toLatLng(e.x, e.z), {
      icon: L.divIcon({ className: 'lbl-wrap', html: `<span class="lbl lbl-${e.level}">${esc(e.name)}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
      interactive: false,
      keyboard: false,
    }),
  }));

  function refresh() {
    if (!map.hasLayer(group)) return;
    const z = map.getZoom();
    const b = map.getBounds().pad(0.15);
    for (const it of items) {
      const show = labelVisible(it.e.level, z) && b.contains(it.ll);
      if (show !== group.hasLayer(it.marker)) (show ? group.addLayer(it.marker) : group.removeLayer(it.marker));
    }
  }
  map.on('moveend zoomend', refresh);
  group.on('add', refresh);

  return { cat: { id: 'labels' }, group, entries, refresh, setFilters() {}, setDone() {}, visibleEntries: () => [] };
}
