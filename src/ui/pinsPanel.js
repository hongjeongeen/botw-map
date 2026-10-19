import { state, upsertPin, deletePin, newId, on } from '../state/store.js';
import { esc } from '../util.js';
import { PIN_COLORS } from '../map/icons.js';

/**
 * 핀 탭: 맵 핀 목록 + 편집 폼. 지도에서 '맵 핀 추가'를 누르면 openEditor 로 새 핀을 만든다
 */
export function createPinsPanel({ section, panel, onFocusPin, onStartAdd }) {
  let editing = null; // { id?, x, z, title, note, color, linkedId? }

  function listHtml() {
    if (!state.pins.length) return '<div class="muted">아직 맵 핀이 없습니다.</div>';
    const pins = [...state.pins].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return `<ul class="list">${pins.map((p) => `
      <li data-id="${esc(p.id)}">
        <span class="swatch" style="background:${esc(p.color || '#ff5252')}"></span>
        <span>${esc(p.title || '(제목 없음)')}${p.note ? `<div class="muted small">${esc(p.note.length > 40 ? p.note.slice(0, 40) + '…' : p.note)}</div>` : ''}</span>
        <span class="meta">X ${Math.round(p.x)} · Z ${Math.round(p.z)}</span>
      </li>`).join('')}</ul>`;
  }

  function editorHtml(p) {
    return `
      <form id="pin-form" class="pin-form">
        <h3>${p.id ? '맵 핀 편집' : '새 맵 핀'} <span class="muted">X ${Math.round(p.x)} · Z ${Math.round(p.z)}</span></h3>
        <input class="input" name="title" placeholder="제목 (예: 라이넬 조심)" value="${esc(p.title ?? '')}" maxlength="60">
        <textarea class="input" name="note" placeholder="메모" rows="3" maxlength="500">${esc(p.note ?? '')}</textarea>
        <div class="chips">${PIN_COLORS.map((c) => `<label class="chip" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === (p.color || PIN_COLORS[0]) ? 'checked' : ''}><span></span></label>`).join('')}</div>
        <div class="pp-actions">
          <button type="submit" class="btn primary">저장</button>
          <button type="button" class="btn" data-action="cancel">취소</button>
          ${p.id ? '<button type="button" class="btn danger" data-action="delete">삭제</button>' : ''}
        </div>
      </form>`;
  }

  function render() {
    section.innerHTML = `
      <div class="nearby-actions">
        <button type="button" class="btn primary" data-action="add">지도에서 위치 찍어 추가</button>
      </div>
      <div class="muted small" style="margin:8px 0 12px">버튼을 누른 뒤 지도를 탭하세요. 지도를 길게 눌러도(우클릭) 추가할 수 있습니다.</div>
      ${editing ? editorHtml(editing) : ''}
      <h3>내 맵 핀 (${state.pins.length})</h3>
      ${listHtml()}`;
  }

  function openEditor(p) {
    editing = { ...p };
    render();
    panel.show('pins');
    section.querySelector('input[name=title]')?.focus();
  }

  section.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-action]');
    if (a) {
      if (a.dataset.action === 'add') { onStartAdd(); return; }
      if (a.dataset.action === 'cancel') { editing = null; render(); return; }
      if (a.dataset.action === 'delete' && editing?.id && confirm('이 맵 핀을 삭제할까요?')) { deletePin(editing.id); editing = null; render(); return; }
      return;
    }
    const li = ev.target.closest('li[data-id]');
    if (li) onFocusPin(li.dataset.id);
  });

  section.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'pin-form') return;
    ev.preventDefault();
    const f = new FormData(ev.target);
    upsertPin({
      ...editing,
      id: editing.id ?? newId(),
      title: String(f.get('title') ?? '').trim(),
      note: String(f.get('note') ?? '').trim(),
      color: String(f.get('color') ?? PIN_COLORS[0]),
    });
    editing = null;
    render();
  });

  on('pins', () => { if (!editing) render(); });
  render();
  return { render, openEditor, editById: (id) => { const p = state.pins.find((q) => q.id === id); if (p) openEditor(p); } };
}
