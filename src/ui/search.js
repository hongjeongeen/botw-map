import { CATEGORIES, CAT_BY_ID } from '../data/categories.js';
import { loadAndKeep } from '../data/loader.js';
import { esc, norm } from '../util.js';
import { swatchHtml } from '../map/icons.js';

const MAX_RESULTS = 60;

/** 검색 탭: 검색 가능한 카테고리(지명·타워·사당·마을·대요정·기억·여신상)를 한국어 이름으로 찾는다 */
export function createSearchPanel({ section, onPick }) {
  section.innerHTML = `
    <input id="q" class="input" type="search" placeholder="이름 검색 (예: 쌍둥이, 마오누, 하테노)" autocomplete="off" enterkeyhint="search">
    <div class="muted small" style="margin:6px 0">가운뎃점·띄어쓰기는 무시합니다. Enter를 누르면 첫 번째 결과로 이동합니다.</div>
    <div id="result-info" class="muted small"></div>
    <ul id="results" class="list"></ul>`;
  const input = section.querySelector('#q');
  const info = section.querySelector('#result-info');
  const list = section.querySelector('#results');

  let corpus = null; // [{ e, cat, name, sub }]
  async function ensureCorpus() {
    if (corpus) return corpus;
    const cats = CATEGORIES.filter((c) => c.searchable);
    const all = await Promise.all(cats.map((c) => loadAndKeep(c.id)));
    corpus = [];
    cats.forEach((cat, i) => { for (const e of all[i]) corpus.push({ e, cat, name: norm(e.name), sub: norm(e.sub ?? '') }); });
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
      ? hits.map(({ e, cat }, i) => `<li data-i="${i}">${swatchHtml(cat, e)}<span>${esc(e.name)}${e.sub ? `<div class="muted small">${esc(e.sub)}</div>` : ''}</span><span class="meta">${esc(cat.label)}</span></li>`).join('')
      : '<li class="muted">결과가 없습니다.</li>';
  }
  input.addEventListener('input', run);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && hits.length) { ev.preventDefault(); const { e, cat } = hits[0]; onPick(e, CAT_BY_ID[cat.id]); input.blur(); }
  });
  list.addEventListener('click', (ev) => {
    const li = ev.target.closest('li[data-i]');
    if (!li) return;
    const { e, cat } = hits[+li.dataset.i];
    onPick(e, CAT_BY_ID[cat.id]);
  });
  return { focus: () => input.focus(), query: (text) => { input.value = text; return run(); } };
}
