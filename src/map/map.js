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
    // 지도 가장자리 항목의 팝업이 화면 안으로 들어올 수 있도록 바깥 여유를 넉넉히 (팝업 자동 이동이 한계에 막히지 않게)
    maxBounds: MAP_BOUNDS.pad(0.5),
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
