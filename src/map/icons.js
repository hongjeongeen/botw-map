// 직접 그린 단순 도형 아이콘 (닌텐도 아이콘 복제 아님). 인라인 SVG 문자열.
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">${body}</svg>`;

export const ICONS = {
  tower: svg('<path d="M12 2 L17 21 H7 Z" fill="#4fc3f7" stroke="#0b2a3a" stroke-width="1.3"/><circle cx="12" cy="6.5" r="2.2" fill="#fff"/>'),
  shrine: svg('<rect x="4" y="4" width="16" height="16" rx="4" fill="#ffa726" stroke="#3a2200" stroke-width="1.3"/><circle cx="12" cy="12" r="4" fill="none" stroke="#3a2200" stroke-width="1.6"/><circle cx="12" cy="12" r="1.4" fill="#3a2200"/>'),
  village: svg('<path d="M3 11 L12 3 L21 11 V21 H3 Z" fill="#9ccc65" stroke="#1f3a12" stroke-width="1.3"/><rect x="10" y="14" width="4" height="7" fill="#1f3a12"/>'),
  stable: svg('<path d="M3 12 Q12 2 21 12 V21 H3 Z" fill="#bcaaa4" stroke="#3e2723" stroke-width="1.3"/><path d="M8 21 V14 H16 V21 Z" fill="#3e2723"/>'),
  castle: svg('<path d="M4 21 V8 H7 V5 H10 V8 H14 V5 H17 V8 H20 V21 Z" fill="#cfd8dc" stroke="#263238" stroke-width="1.3"/><rect x="10" y="14" width="4" height="7" fill="#263238"/>'),
  lab: svg('<path d="M9 3 H15 V9 L20 19 Q21 21 19 21 H5 Q3 21 4 19 L9 9 Z" fill="#80deea" stroke="#004d40" stroke-width="1.3"/>'),
  shop: svg('<path d="M5 8 H19 L20 21 H4 Z" fill="#ffcc80" stroke="#4e2a00" stroke-width="1.3"/><path d="M9 8 V6 a3 3 0 0 1 6 0 V8" fill="none" stroke="#4e2a00" stroke-width="1.6"/>'),
  poi: svg('<path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#fff59d" stroke="#5d4037" stroke-width="1.3"/>'),
  fountain: svg('<path d="M12 2 C7 9 5 12 5 15 a7 7 0 0 0 14 0 c0-3-2-6-7-13z" fill="#f48fb1" stroke="#4a0a2a" stroke-width="1.3"/>'),
  memory: svg('<rect x="3" y="6" width="18" height="14" rx="2" fill="#ce93d8" stroke="#2a0a3a" stroke-width="1.3"/><circle cx="12" cy="13" r="4" fill="none" stroke="#2a0a3a" stroke-width="1.6"/><rect x="8" y="3" width="8" height="3" fill="#2a0a3a"/>'),
  me: svg('<circle cx="12" cy="12" r="10" fill="#2e7d32" stroke="#fff" stroke-width="2"/><path d="M12 5 L17 17 L12 14 L7 17 Z" fill="#fff"/>'),
};

export const pinSvg = (color) =>
  svg(`<path d="M12 2 a7 7 0 0 0-7 7 c0 5 7 13 7 13 s7-8 7-13 a7 7 0 0 0-7-7z" fill="${color}" stroke="#111" stroke-width="1.3"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>`);

export const PIN_COLORS = ['#ff5252', '#ffb300', '#66bb6a', '#29b6f6', '#ab47bc', '#eceff1'];
