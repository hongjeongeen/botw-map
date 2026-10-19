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

// 구역별 색: 서로 확실히 다른 색상(파랑/노랑/빨강). 노랑은 점선 테두리로 한 번 더 구분
export const ZONE_STYLE = {
  cold: { color: '#1e88e5', fillColor: '#42a5f5', fillOpacity: 0.3, weight: 2, opacity: 0.9 },
  heat: { color: '#ffb300', fillColor: '#ffeb3b', fillOpacity: 0.3, weight: 2, opacity: 0.9, dashArray: '6 5' },
  volcano: { color: '#e53935', fillColor: '#ff5252', fillOpacity: 0.32, weight: 2, opacity: 0.9 },
};

/** 기후 구역(추위·더위·화산) 색 면. 구역마다 하나의 다중 폴리곤으로 그려 겹치는 곳이 진해지지 않게 한다 */
export function createAreasLayer(map, rows) {
  if (!map.getPane('climate')) map.createPane('climate').style.zIndex = 340;
  const renderer = L.canvas({ pane: 'climate' });
  const group = L.layerGroup();
  const byZone = new Map();
  for (const r of rows) {
    if (!byZone.has(r.zone)) byZone.set(r.zone, []);
    for (const poly of r.polys) byZone.get(r.zone).push(poly.map((ring) => ring.map(([x, z]) => toLatLng(x, z))));
  }
  for (const [zone, polys] of byZone) {
    group.addLayer(L.polygon(polys, { renderer, pane: 'climate', interactive: false, ...(ZONE_STYLE[zone] ?? ZONE_STYLE.heat) }));
  }
  return { cat: { id: 'climate' }, group, entries: rows, setFilters() {}, setDone() {}, visibleEntries: () => [] };
}
