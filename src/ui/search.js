import { CATEGORIES, CAT_BY_ID } from '../data/categories.js';
import { loadAndKeep } from '../data/loader.js';
import { esc, norm } from '../util.js';
import { swatchHtml } from '../map/icons.js';

const MAX_RESULTS = 60;

/**
 * 검색 탭.
 * - 개별 항목: 지명·타워·사당·마을·대요정·기억·여신상 (searchable 카테고리)
 * - 종류: 소재·몬스터·강적·가디언의 종류 이름 (예: 냄비, 고고버섯, 보코블린) → 가까운 곳으로 이동 / "이것만" 표시
 */
export function createSearchPanel({ section, onPick, onPickKind }) {
  section.innerHTML = `
    <div class="search-top">
      <input id="q" class="input" type="search" placeholder="이름·종류 검색 (예: 쌍둥이, 마오누, 냄비, 고고)" autocomplete="off" enterkeyhint="search">
      <div id="result-info" class="muted small"></div>
    </div>
    <div class="muted small" style="margin:6px 0">가운뎃점·띄어쓰기는 무시합니다. Enter를 누르면 첫 번째 결과로 이동합니다. 종류(소재·몬스터 등) 결과를 누르면 <b>그 종류만</b> 지도에 표시하고 가까운 곳으로 이동합니다. 지금 보이는 종류에 더하려면 <b>추가</b>를 누르세요.</div>
    <ul id="results" class="list"></ul>`;
  const input = section.querySelector('#q');
  const info = section.querySelector('#result-info');
  const list = section.querySelector('#results');

  let corpus = null; // [{ e, cat, name, sub, kind?, entries? }]
  async function ensureCorpus() {
    if (corpus) return corpus;
    const itemCats = CATEGORIES.filter((c) => c.searchable);
    const kindCats = CATEGORIES.filter((c) => c.subtypes === 'name');
    const [itemRows, kindRows] = await Promise.all([
      Promise.all(itemCats.map((c) => loadAndKeep(c.id))),
      Promise.all(kindCats.map((c) => loadAndKeep(c.id))),
    ]);
    corpus = [];
    itemCats.forEach((cat, i) => { for (const e of itemRows[i]) corpus.push({ e, cat, name: norm(e.name), sub: norm(e.sub ?? '') }); });
    kindCats.forEach((cat, i) => {
      const groups = new Map();
      for (const e of kindRows[i]) (groups.get(e.name) ?? groups.set(e.name, []).get(e.name)).push(e);
      for (const [name, entries] of groups) corpus.push({ kind: true, e: { name }, cat, entries, name: norm(name), sub: '' });
    });
    return corpus;
  }

  // 점수: 이름이 검색어로 시작 > 이름에 포함 > 부제목에 포함. 같은 점수면 짧은 이름 먼저
  function score(item, q) {
    if (item.name.startsWith(q)) return 0;
    if (item.name.includes(q)) return 1;
    if (item.sub.includes(q)) return 2;
    return -1;
  }

  let seq = 0;
  let hits = [];
  async function run() {
    const q = norm(input.value);
    const my = ++seq;
    if (!q) { list.innerHTML = ''; info.textContent = ''; hits = []; return; }
    info.textContent = corpus ? '' : '데이터 불러오는 중…';
    const c = await ensureCorpus();
    if (my !== seq) return;
    const scored = [];
    for (const item of c) {
      const s = score(item, q);
      if (s >= 0) scored.push({ item, s });
    }
    scored.sort((a, b) => a.s - b.s || a.item.name.length - b.item.name.length);
    hits = scored.slice(0, MAX_RESULTS).map((x) => x.item);
    info.textContent = scored.length ? `${scored.length}개 결과${scored.length > MAX_RESULTS ? ` 중 ${MAX_RESULTS}개 표시` : ''}` : '';
    list.innerHTML = hits.length
      ? hits.map((h, i) => h.kind
        ? `<li data-i="${i}">${swatchHtml(h.cat, h.entries[0])}<span>${esc(h.e.name)}<div class="muted small">${esc(h.cat.label)} 종류 · ${h.entries.length.toLocaleString()}곳 · 이 종류만 보기</div></span><button type="button" class="btn small" data-add="${i}" title="지금 보이는 종류에 더하기">추가</button></li>`
        : `<li data-i="${i}">${swatchHtml(h.cat, h.e)}<span>${esc(h.e.name)}${h.e.sub ? `<div class="muted small">${esc(h.e.sub)}</div>` : ''}</span><span class="meta">${esc(h.cat.label)}</span></li>`).join('')
      : '<li class="muted">결과가 없습니다.</li>';
  }
  function pick(h, { add = false } = {}) {
    input.blur(); // 모바일 키보드 내리기
    if (h.kind) onPickKind(h, { only: !add });
    else onPick(h.e, CAT_BY_ID[h.cat.id]);
  }
  input.addEventListener('input', run);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && hits.length) { ev.preventDefault(); pick(hits[0]); }
  });
  list.addEventListener('click', (ev) => {
    const add = ev.target.closest('[data-add]');
    if (add) { pick(hits[+add.dataset.add], { add: true }); return; }
    const li = ev.target.closest('li[data-i]');
    if (li) pick(hits[+li.dataset.i]);
  });
  return { focus: () => input.focus(), query: (text) => { input.value = text; return run(); } };
}
