import { CATEGORIES } from '../data/categories.js';
import { loadAndKeep, getLoaded } from '../data/loader.js';
import { state, setSetting, isDone, doneCount, on } from '../state/store.js';
import { esc } from '../util.js';
import { chestsHtml } from '../map/popup.js';
import { swatchHtml, iconImg } from '../map/icons.js';

/**
 * 레이어 탭: 카테고리 켜기/끄기 + 완료 수, 종류별 필터, 던전 보물 상자 목록
 */
export function createLayersPanel({ section, index, dungeons }) {
  const openSub = new Set();      // 펼쳐진 종류별 목록
  const openDungeon = new Set();
  const totalChests = Object.values(index.categories).reduce((n, c) => n + (c.chests ?? 0), 0);

  function countText(cat) {
    const total = index.categories[cat.id]?.count ?? 0;
    if (!cat.trackable) return `${total}`;
    const rows = getLoaded(cat.id);
    const done = rows ? rows.filter((r) => isDone(r.id)).length : 0;
    return `${done}/${total}`;
  }

  function subListHtml(cat) {
    const rows = getLoaded(cat.id);
    if (!rows) return '<div class="muted small">불러오는 중…</div>';
    const counts = new Map(); // 종류 → { n, sample }
    for (const r of rows) {
      const k = r[cat.subtypes];
      const c = counts.get(k) ?? { n: 0, sample: r };
      c.n++;
      counts.set(k, c);
    }
    const hidden = new Set(state.settings.hiddenSub[cat.id] ?? []);
    const items = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
    return `
      <div class="sub-actions">
        <button type="button" class="btn small" data-sub-all="${cat.id}" data-on="1">모두 켜기</button>
        <button type="button" class="btn small" data-sub-all="${cat.id}" data-on="0">모두 끄기</button>
      </div>
      ${items.map(([name, { n, sample }]) => `
        <label class="row sub-row">
          <input type="checkbox" data-subcat="${cat.id}" data-sub-name="${esc(name)}" ${hidden.has(name) ? '' : 'checked'}>
          ${swatchHtml(cat, sample)}${esc(name)}<span class="count">${n}</span>
        </label>`).join('')}`;
  }

  function dungeonsHtml() {
    if (!dungeons?.length) return '';
    return `
      <h3>던전 보물 상자</h3>
      <div class="muted small">신수 등 던전 내부의 상자. 사당 내부 상자는 각 사당 팝업에서 체크합니다.</div>
      ${dungeons.map((d) => {
        const done = d.chests.filter((c) => isDone(c.id)).length;
        return `
          <details class="dungeon" data-dungeon="${esc(d.id)}" ${openDungeon.has(d.id) ? 'open' : ''}>
            <summary>${esc(d.name)}${d.dlc ? ' <span class="hint">(추가 콘텐츠)</span>' : ''} <span class="count">${done}/${d.chests.length}</span></summary>
            ${chestsHtml(d.chests, d.id)}
          </details>`;
      }).join('')}`;
  }

  function render() {
    const s = state.settings;
    section.innerHTML = `
      <label class="row">
        <input type="checkbox" data-set="hideDone" ${s.hideDone ? 'checked' : ''}> 완료한 항목 숨기기
        <span class="count">${iconImg('treasure')} ${doneCount('chest:')}/${totalChests}</span>
      </label>
      <h3>레이어</h3>
      ${CATEGORIES.map((cat) => `
        <div class="cat" data-cat="${cat.id}">
          <label class="row">
            <input type="checkbox" data-vis="${cat.id}" ${s.visible[cat.id] ? 'checked' : ''}>
            ${swatchHtml(cat)}
            ${esc(cat.label)}
            ${cat.minZoom > 1 ? `<span class="hint">(줌 ${cat.minZoom}+)</span>` : ''}
            <span class="count">${countText(cat)}</span>
          </label>
          ${cat.subtypes ? `
            <button type="button" class="sub-toggle" data-sub="${cat.id}">${openSub.has(cat.id) ? '▾' : '▸'} 종류별 보기</button>
            <div class="sub-list" ${openSub.has(cat.id) ? '' : 'hidden'}>${openSub.has(cat.id) ? subListHtml(cat) : ''}</div>` : ''}
        </div>`).join('')}
      ${dungeonsHtml()}`;
  }

  section.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.dataset.vis) {
      setSetting('visible', { ...state.settings.visible, [t.dataset.vis]: t.checked });
    } else if (t.dataset.set === 'hideDone') {
      setSetting('hideDone', t.checked);
    } else if (t.dataset.subcat) {
      const id = t.dataset.subcat;
      const hidden = new Set(state.settings.hiddenSub[id] ?? []);
      t.checked ? hidden.delete(t.dataset.subName) : hidden.add(t.dataset.subName);
      setSetting('hiddenSub', { ...state.settings.hiddenSub, [id]: [...hidden] });
    }
  });

  section.addEventListener('click', async (ev) => {
    const sub = ev.target.closest('[data-sub]');
    if (sub) {
      const id = sub.dataset.sub;
      openSub.has(id) ? openSub.delete(id) : openSub.add(id);
      if (openSub.has(id) && !getLoaded(id)) { render(); await loadAndKeep(id); }
      render();
      return;
    }
    const all = ev.target.closest('[data-sub-all]');
    if (all) {
      const id = all.dataset.subAll;
      const rows = getLoaded(id) ?? [];
      const cat = CATEGORIES.find((c) => c.id === id);
      const hidden = all.dataset.on === '1' ? [] : [...new Set(rows.map((r) => r[cat.subtypes]))];
      setSetting('hiddenSub', { ...state.settings.hiddenSub, [id]: hidden });
      return;
    }
    const d = ev.target.closest('details.dungeon');
    if (d && ev.target.closest('summary')) {
      // toggle 이벤트는 다음 틱에 반영되므로 현재 상태의 반대를 기록
      d.open ? openDungeon.delete(d.dataset.dungeon) : openDungeon.add(d.dataset.dungeon);
    }
  });

  on('progress', render);
  on('settings', ({ key }) => { if (key !== 'lastView' && key !== 'myLocation') render(); });
  render();
  return { render };
}
