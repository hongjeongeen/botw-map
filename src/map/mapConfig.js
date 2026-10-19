// 지도 타일·좌표 범위 상수. 데이터 출처(objmap.zeldamods.org)에 맞춰 검증된 값.

// objmap 공개 타일 서버 (256px, 네이티브 줌 0–7). 개인용 핫링크 — 저장소에 타일을 넣지 않는다.
export const TILE_URL = 'https://objmap.zeldamods.org/game_files/maptex/{z}/{x}/{y}.png';
export const TILE_SIZE = 256;
export const TILE_MAX_NATIVE_ZOOM = 7;

// Leaflet 줌 범위. 7 이상은 줌 7 타일을 확대해서 보여준다.
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 9;

// 지도 텍스처가 덮는 게임 좌표 범위 (플레이 가능 구역은 X ±5000, Z ±4000).
// X: 동쪽이 +, Z: 남쪽이 + (북쪽이 −)
export const GAME_MIN_X = -6000;
export const GAME_MAX_X = 6000;
export const GAME_MIN_Z = -5000;
export const GAME_MAX_Z = 5000;
