import { esc, fmtDist } from '../util.js';
import { distance, directionKo } from '../map/crs.js';
import { on } from '../state/store.js';

/**
 * 주변 탭: '현재 위치' 마커 기준으로 켜져 있는 카테고리의 마커를 거리순으로 나열
 */
export function createNearbyPanel({ section, map, myLocation, getActiveLayers, onPick }) {
  function render() {
    const loc = myLocation.get();
    const header = `
      <div class="nearby-actions">
        <button type="button" class="btn primary" data-action="me-center">현재 위치를 화면 중앙에 놓기</button>
        ${loc ? '<button type="button" class="btn" data-action="me-goto">현재 위치로 이동</button>' : ''}
      </div>
      <div class="muted small" style="margin:8px 0 12px">초록 마커를 끌어서 옮기거나, 지도를 길게 눌러(우클릭) '현재 위치를 여기로'를 고르세요. 켜 둔 레이어만 검색합니다.</div>`;
    if (!loc) { section.innerHTML = header + '<div class="muted">현재 위치가 아직 없습니다.</div>'; return; }

    const rows = [];
    for (const layer of getActiveLayers()) {
      if (!layer.cat.label) continue;
      for (const e of layer.visibleEntries()) rows.push({ e, cat: layer.cat, d: distance(loc, e) });
    }
    rows.sort((a, b) => a.d - b.d);
    const top = rows.slice(0, 40);
    section.innerHTML = header + `
      <h3>가까운 순 (${rows.length}개 중 ${top.length}개)</h3>
      <ul class="list">${top.map(({ e, cat, d }, i) => `
        <li data-i="${i}">
          <span class="swatch" style="background:${cat.color}"></span>
          <span>${esc(e.name)}<div class="muted small">${esc(cat.label)}${e.sub ? ` · ${esc(e.sub)}` : ''}</div></span>
          <span class="meta">${fmtDist(d)} ${directionKo(loc, e)}</span>
        </li>`).join('') || '<li class="muted">켜 둔 레이어에 항목이 없습니다.</li>'}</ul>`;
    section._top = top;
  }

  section.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-action]');
    if (a?.dataset.action === 'me-center') {
      const c = map.getCenter();
      myLocation.set(Math.round(c.lng), Math.round(c.lat));
      return;
    }
    if (a?.dataset.action === 'me-goto') {
      const loc = myLocation.get();
      if (loc) myLocation.set(loc.x, loc.z, { save: false, pan: true });
      return;
    }
    const li = ev.target.closest('li[data-i]');
    if (li && section._top) { const { e, cat } = section._top[+li.dataset.i]; onPick(e, cat); }
  });

  on('settings', ({ key }) => { if (key === 'myLocation' || key === 'visible' || key === 'hiddenSub' || key === 'hideDone') render(); });
  on('progress', render);
  render();
  return { render };
}
