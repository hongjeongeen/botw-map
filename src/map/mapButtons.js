import L from 'leaflet';
import { meSvg } from './icons.js';

/** 지도 위 플로팅 버튼 (좌하단): 내 위치로 이동 / 전체 지도 보기 */
export const MapButtons = L.Control.extend({
  options: { position: 'bottomleft', onMyLocation: null, onFitAll: null },

  onAdd() {
    const el = L.DomUtil.create('div', 'mapbtns');
    el.innerHTML = `
      <button type="button" class="mapbtn" data-act="me" title="현재 위치로 이동">${meSvg}<span>내 위치</span></button>
      <button type="button" class="mapbtn" data-act="all" title="전체 지도 보기"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg><span>전체</span></button>`;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'me') this.options.onMyLocation?.();
      else this.options.onFitAll?.();
    });
    return el;
  },
});
