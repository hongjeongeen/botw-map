/** HTML 이스케이프 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 거리 표기 (게임 단위 ≈ m) */
export const fmtDist = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`);

/** 검색용 정규화: NFC, 소문자, 공백·가운뎃점 제거 → "마오누"로 "마·오누의 사당" 검색 가능 */
export const norm = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/[\s·‧・]/g, '');

/** HTML 문자열 → 엘리먼트 */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
