import L from 'leaflet';
import { toLatLng, toGame } from './crs.js';
import { pinSvg } from './icons.js';
import { state, on } from '../state/store.js';
import { esc } from '../util.js';
import { openHtmlPopup } from './popup.js';

const pinIcon = (color) => L.divIcon({ className: 'mk mk-pin', html: pinSvg(color), iconSize: [28, 32], iconAnchor: [14, 30], popupAnchor: [0, -26] });

export function pinPopupHtml(p) {
  return `
    <div class="pp">
      <div class="pp-cat muted small">맵 핀</div>
      <div class="pp-name">${esc(p.title || '(제목 없음)')}</div>
      ${p.note ? `<div class="pp-note">${esc(p.note)}</div>` : ''}
      <div class="pp-coords muted small">X ${Math.round(p.x)} · Z ${Math.round(p.z)}</div>
      <div class="pp-actions">
        <button type="button" class="btn small" data-action="edit-pin" data-id="${esc(p.id)}">편집</button>
        <button type="button" class="btn small danger" data-action="delete-pin" data-id="${esc(p.id)}">삭제</button>
      </div>
    </div>`;
}

/** 사용자 맵 핀 레이어. 추가 모드(지도 탭)와 롱프레스는 main.js 에서 연결 */
export function createPinsLayer(map) {
  const group = L.layerGroup().addTo(map);
  const byId = new Map();

  function render() {
    group.clearLayers();
    byId.clear();
    for (const p of state.pins) {
      const m = L.marker(toLatLng(p.x, p.z), { icon: pinIcon(p.color || '#ff5252'), zIndexOffset: 500, title: p.title || '' });
      m.on('click', () => openHtmlPopup(map, m.getLatLng(), pinPopupHtml(p)));
      group.addLayer(m);
      byId.set(p.id, m);
    }
  }
  render();
  on('pins', render);

  let adding = false;
  const mapEl = map.getContainer();
  let onCreate = null;

  function startAdd(cb) {
    adding = true;
    onCreate = cb;
    mapEl.classList.add('adding');
  }
  function stopAdd() {
    adding = false;
    onCreate = null;
    mapEl.classList.remove('adding');
  }
  map.on('click', (ev) => {
    if (!adding) return;
    const g = toGame(ev.latlng);
    const cb = onCreate;
    stopAdd();
    cb?.(g);
  });

  return { group, byId, startAdd, stopAdd, isAdding: () => adding, focus(id) { const m = byId.get(id); if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 6)); m.fire('click'); } } };
}
