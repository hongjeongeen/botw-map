import L from 'leaflet';
import { GAME_MIN_X, GAME_MAX_X, GAME_MIN_Z, GAME_MAX_Z, TILE_SIZE } from './mapConfig.js';

// objmap과 동일한 변환: 줌 z에서 px = 2^z · (4X + 24000) / 256, py = 2^z · (4Z + 20000) / 256
// latlng = [Z, X] 그대로 사용하므로 부호 반전이 없다. (Z가 클수록 화면 아래 = 남쪽)
const MAP_W = GAME_MAX_X - GAME_MIN_X; // 12000
const MAP_H = GAME_MAX_Z - GAME_MIN_Z; // 10000

export const GameCRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(
    4 / TILE_SIZE, (MAP_W * 2) / TILE_SIZE,
    4 / TILE_SIZE, (MAP_H * 2) / TILE_SIZE,
  ),
});

/** 게임 좌표 (x, z) → Leaflet LatLng */
export const toLatLng = (x, z) => L.latLng(z, x);

/** Leaflet LatLng → 게임 좌표 {x, z} */
export const toGame = (ll) => ({ x: ll.lng, z: ll.lat });

export const MAP_BOUNDS = L.latLngBounds(
  toLatLng(GAME_MIN_X, GAME_MIN_Z),
  toLatLng(GAME_MAX_X, GAME_MAX_Z),
);

/** 두 게임 좌표 사이 거리 (게임 단위 ≈ m) */
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

/** from에서 to를 바라본 8방위 (북 = −Z) */
export function directionKo(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (dx === 0 && dz === 0) return '';
  // atan2(동, 북): 북쪽이 0°, 시계 방향
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return DIRS[Math.round(((deg + 360) % 360) / 45) % 8];
}
