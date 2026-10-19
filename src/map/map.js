import L from 'leaflet';
import * as C from './mapConfig.js';
import { GameCRS, MAP_BOUNDS, toLatLng } from './crs.js';
import { ZoomBar } from './zoomBar.js';

/**
 * 지도 생성. lastView = { x, z, zoom } 가 있으면 그 위치로, 없으면 전체 맵이 보이게.
 */
export function createMap(el, lastView) {
  const map = L.map(el, {
    crs: GameCRS,
    minZoom: C.MIN_ZOOM,
    maxZoom: C.MAX_ZOOM,
    maxBounds: MAP_BOUNDS.pad(0.1),
    maxBoundsViscosity: 1.0,
    zoomControl: false,
    attributionControl: false,
  });
  new ZoomBar({ position: 'bottomright' }).addTo(map);

  L.tileLayer(C.TILE_URL, {
    tileSize: C.TILE_SIZE,
    minZoom: C.MIN_ZOOM,
    maxZoom: C.MAX_ZOOM,
    maxNativeZoom: C.TILE_MAX_NATIVE_ZOOM,
    bounds: MAP_BOUNDS, // 범위 밖 타일 요청 차단
    noWrap: true,
    keepBuffer: 2,
  }).addTo(map);

  if (lastView && Number.isFinite(lastView.x) && Number.isFinite(lastView.z) && Number.isFinite(lastView.zoom)) {
    map.setView(toLatLng(lastView.x, lastView.z), lastView.zoom);
  } else {
    map.fitBounds(MAP_BOUNDS);
  }
  return map;
}
