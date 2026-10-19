import L from 'leaflet';
import { toLatLng } from './crs.js';

/**
 * 지역(시커 타워 영역) 경계선. 마커 아래 전용 pane 에 캔버스로 그린다.
 * 굵은 밝은 선 + 어두운 테두리(halo) 두 겹으로 어떤 지형 위에서도 눈에 띄게.
 */
export function createRegionsLayer(map, rows) {
  if (!map.getPane('regions')) map.createPane('regions').style.zIndex = 350; // 타일(200) 위, 마커(400+) 아래
  const renderer = L.canvas({ pane: 'regions' });
  const group = L.layerGroup();
  const halo = [];
  const lines = [];
  for (const r of rows) {
    for (const ring of r.rings) {
      const latlngs = ring.map(([x, z]) => toLatLng(x, z));
      // 타일의 도로(연노랑 실선)와 구분되도록: 어두운 굵은 실선 위에 밝은 점선
      halo.push(L.polyline(latlngs, { renderer, pane: 'regions', interactive: false, color: '#15100a', weight: 8, opacity: 0.75, lineJoin: 'round', lineCap: 'round' }));
      lines.push(L.polyline(latlngs, { renderer, pane: 'regions', interactive: false, color: '#fff2c2', weight: 3.5, opacity: 1, dashArray: '12 9', lineJoin: 'round', lineCap: 'butt' }));
    }
  }
  for (const h of halo) group.addLayer(h);
  for (const l of lines) group.addLayer(l);
  return { cat: { id: 'regions' }, group, entries: rows, setFilters() {}, setDone() {}, visibleEntries: () => [] };
}

const ZONE_STYLE = {
  cold: { color: '#4fc3f7', fillColor: '#4fc3f7' },
  heat: { color: '#ffb74d', fillColor: '#ffb74d' },
  volcano: { color: '#ff5252', fillColor: '#ff5252' },
};

/** 기후 구역(추위·더위·화산) 색 면. 경계선 pane 아래, 타일 위 */
export function createAreasLayer(map, rows) {
  if (!map.getPane('climate')) map.createPane('climate').style.zIndex = 340;
  const renderer = L.canvas({ pane: 'climate' });
  const group = L.layerGroup();
  for (const r of rows) {
    const st = ZONE_STYLE[r.zone] ?? ZONE_STYLE.heat;
    for (const poly of r.polys) {
      const latlngs = poly.map((ring) => ring.map(([x, z]) => toLatLng(x, z)));
      group.addLayer(L.polygon(latlngs, { renderer, pane: 'climate', interactive: false, ...st, weight: 1.5, opacity: 0.7, fillOpacity: 0.2 }));
    }
  }
  return { cat: { id: 'climate' }, group, entries: rows, setFilters() {}, setDone() {}, visibleEntries: () => [] };
}
