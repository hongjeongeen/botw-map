import L from 'leaflet';
import { esc } from '../util.js';
import { isDone, state } from '../state/store.js';
import { iconKeyFor, iconImg } from './icons.js';

// 팝업은 하나를 재사용한다 (마커 수천 개에 bindPopup 하지 않음)
const popup = L.popup({
  maxWidth: 300,
  minWidth: 220,
  offset: L.point(0, -8),
  autoPanPaddingTopLeft: L.point(12, 12),
  autoPanPaddingBottomRight: L.point(12, 72),
});

export function chestsHtml(chests, ownerId) {
  if (!chests?.length) return '';
  const done = chests.filter((c) => isDone(c.id)).length;
  const show = state.settings.showChestItems;
  return `
    <details class="pp-chests" open>
      <summary>${iconImg('treasure')} 보물 상자 ${chests.length}개 <span class="muted">(${done}/${chests.length})</span></summary>
      <ul class="chest-list" data-owner="${esc(ownerId)}">
        ${chests.map((c, i) => `
          <li>
            <label><input type="checkbox" data-done="${esc(c.id)}" ${isDone(c.id) ? 'checked' : ''}> 상자 ${i + 1}</label>
            <span class="chest-item${show ? '' : ' hidden'}">${esc(c.item ?? '내용 정보 없음')}</span>
          </li>`).join('')}
      </ul>
      <div class="pp-actions">
        <button type="button" class="btn small" data-action="chests-all" data-on="1">상자 모두 체크</button>
        <button type="button" class="btn small" data-action="chests-all" data-on="0">모두 해제</button>
        <button type="button" class="btn small linklike" data-action="toggle-items">${show ? '내용물 숨기기' : '내용물 보기'}</button>
      </div>
    </details>`;
}

export function renderEntry(e, cat) {
  const kind = e.kind && e.kind !== e.name ? ` · ${esc(e.kind)}` : '';
  const coords = `X ${Math.round(e.x)} · Z ${Math.round(e.z)}${Number.isFinite(e.y) ? ` · 높이 ${Math.round(e.y)}` : ''}`;
  const key = iconKeyFor(cat, e);
  return `
    <div class="pp">
      <div class="pp-cat muted small">${esc(cat.label)}${kind}${e.dlc ? ' · 추가 콘텐츠' : ''}</div>
      <div class="pp-head">${key ? iconImg(key, 'pp-icon') : ''}<div class="pp-name">${esc(e.name)}</div></div>
      ${e.sub ? `<div class="pp-sub">${esc(e.sub)}</div>` : ''}
      ${e.code ? `<div class="pp-sub">번호 <b>${esc(e.code)}</b></div>` : ''}
      <div class="pp-coords muted small">${coords}</div>
      ${cat.trackable ? `<label class="pp-done"><input type="checkbox" data-done="${esc(e.id)}" ${isDone(e.id) ? 'checked' : ''}> 완료</label>` : ''}
      ${chestsHtml(e.chests, e.id)}
      <div class="pp-actions">
        <button type="button" class="btn small" data-action="pin-here" data-x="${e.x}" data-z="${e.z}" data-title="${esc(e.name)}" data-linked="${esc(e.id)}">맵 핀 추가</button>
      </div>
    </div>`;
}

export function openEntryPopup(map, e, cat, latlng) {
  popup.setLatLng(latlng).setContent(renderEntry(e, cat)).openOn(map);
  return popup;
}

export function openHtmlPopup(map, latlng, html) {
  popup.setLatLng(latlng).setContent(html).openOn(map);
  return popup;
}

export const closePopup = (map) => map.closePopup(popup);
