import { CATEGORIES, CAT_BY_ID } from '../data/categories.js';
import { loadAndKeep } from '../data/loader.js';
import { esc, norm } from '../util.js';
import { swatchHtml } from '../map/icons.js';

/** 검색 탭: 검색 가능한 카테고리(지명·타워·사당·마을·대요정·기억)를 한국어 이름으로 찾는다 */
export function createSearchPanel({ section, onPick }) {
  section.innerHTML = `
    <input id="q" class="input" type="search" placeholder="이름 검색 (예: 쌍둥이, 마오누, 하테노)" autocomplete="off" enterkeyhint="search">
    <div class="muted small" style="margin:6px 0">가운뎃점·띄어쓰기는 무시합니다.</div>
    <ul id="results" class="list"></ul>`;
  const input = section.querySelector('#q');
  const list = section.querySelector('#results');

  let corpus = null; // [{ e, cat, key }]
  async function ensureCorpus() {
    if (corpus) return corpus;
    const cats = CATEGORIES.filter((c) => c.searchable);
    const all = await Promise.all(cats.map((c) => loadAndKeep(c.id)));
    corpus = [];
    cats.forEach((cat, i) => { for (const e of all[i]) corpus.push({ e, cat, key: norm(e.name) + ' ' + norm(e.sub ?? '') }); });
    return corpus;
  }

  let seq = 0;
  async function run() {
    const q = norm(input.value);
    const my = ++seq;
    if (!q) { list.innerHTML = ''; return; }
    const c = await ensureCorpus();
    if (my !== seq) return;
    const hits = [];
    for (const item of c) {
      if (item.key.includes(q)) { hits.push(item); if (hits.length >= 50) break; }
    }
    list.innerHTML = hits.length
      ? hits.map(({ e, cat }, i) => `<li data-i="${i}">${swatchHtml(cat, e)}<span>${esc(e.name)}${e.sub ? `<div class="muted small">${esc(e.sub)}</div>` : ''}</span><span class="meta">${esc(cat.label)}</span></li>`).join('')
      : '<li class="muted">결과가 없습니다.</li>';
    list._hits = hits;
  }
  input.addEventListener('input', run);
  list.addEventListener('click', (ev) => {
    const li = ev.target.closest('li[data-i]');
    if (!li) return;
    const { e, cat } = list._hits[+li.dataset.i];
    onPick(e, CAT_BY_ID[cat.id]);
  });
  return { focus: () => input.focus() };
}
