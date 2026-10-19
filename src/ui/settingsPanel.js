import QRCode from 'qrcode';
import { exportBackup, importBackup } from '../state/backup.js';
import { resetAll, state, setSetting } from '../state/store.js';
import { makeSyncLink, readSyncLink, applySync } from '../state/sync.js';
import { esc } from '../util.js';

const QR_MAX = 2800; // QR(바이트 모드) 용량 한계 근처

export function createSettingsPanel({ section, dungeons }) {
  function render() {
    section.innerHTML = `
      <h3>기기 간 동기화</h3>
      <div class="muted small" style="margin-bottom:8px">이 기기의 완료 기록과 맵 핀을 다른 기기로 보냅니다. 받는 기기에서 링크를 열거나 QR을 카메라로 스캔하면 기록이 <b>합쳐집니다</b>(지워지지 않음).</div>
      <div class="pp-actions"><button type="button" class="btn primary" data-action="sync-make">다른 기기로 보내기 (QR·링크 만들기)</button></div>
      <div id="sync-box" class="sync-box" hidden>
        <canvas id="sync-qr" width="240" height="240"></canvas>
        <div id="sync-info" class="muted small"></div>
        <input id="sync-link" class="input" readonly>
        <div class="pp-actions">
          <button type="button" class="btn" data-action="sync-copy">링크 복사</button>
          ${navigator.share ? '<button type="button" class="btn" data-action="sync-share">공유…</button>' : ''}
        </div>
      </div>
      <div class="muted small" style="margin:10px 0 4px">다른 기기에서 복사한 링크가 있으면 붙여넣어 합치세요.</div>
      <textarea id="sync-paste" class="input" rows="2" placeholder="https://…/botw-map/#sync=…"></textarea>
      <div class="pp-actions"><button type="button" class="btn" data-action="sync-import">가져와서 합치기</button></div>

      <h3>백업 파일</h3>
      <div class="muted small" style="margin-bottom:8px">진행도와 맵 핀은 이 브라우저에만 저장됩니다. 보관용으로 JSON 파일로도 내보낼 수 있습니다.</div>
      <div class="pp-actions">
        <button type="button" class="btn" data-action="export">JSON으로 내보내기</button>
        <label class="btn">JSON 가져오기(병합)<input type="file" accept=".json,application/json" hidden data-action="import"></label>
      </div>
      <h3>동작</h3>
      <label class="row"><input type="checkbox" data-set="moveOnDone" ${state.settings.moveOnDone !== false ? 'checked' : ''}> 완료 체크 시 현재 위치를 그곳으로 이동</label>
      <div class="muted small" style="margin:-4px 0 8px 34px">사당·코로그 등을 완료로 표시하면 보통 그 자리에 있으므로, 현재 위치 마커를 자동으로 옮겨 주변 목록이 갱신되게 합니다.</div>
      <h3>표시</h3>
      <label class="row"><input type="checkbox" data-set="showChestItems" ${state.settings.showChestItems ? 'checked' : ''}> 보물 상자 내용물 기본 표시 <span class="hint">(스포일러)</span></label>
      <h3>초기화</h3>
      <button type="button" class="btn danger" data-action="reset">모든 진행도·맵 핀·설정 지우기</button>
      <h3>정보</h3>
      <div class="muted small">
        지도 타일과 좌표 데이터는 ZeldaMods objmap(objmap.zeldamods.org)·radar, 이름은 게임의 공식 한국어 텍스트를 사용합니다. 개인용.
      </div>`;
  }

  async function makeSync() {
    const box = section.querySelector('#sync-box');
    const info = section.querySelector('#sync-info');
    const linkEl = section.querySelector('#sync-link');
    const canvas = section.querySelector('#sync-qr');
    box.hidden = false;
    info.textContent = '만드는 중…';
    let r = await makeSyncLink({ dungeons, includePins: true });
    let note = '';
    if (r.url.length > QR_MAX && r.pinCount) {
      // QR 에는 완료 기록만 담고, 링크(복사)는 전체를 담는다
      const noPins = await makeSyncLink({ dungeons, includePins: false });
      note = ' · 맵 핀이 많아 QR에는 완료 기록만 담겼습니다 (링크 복사에는 모두 포함)';
      linkEl.value = r.url;
      r = { ...noPins, pinCount: r.pinCount, qrUrl: noPins.url };
    } else {
      linkEl.value = r.url;
      r.qrUrl = r.url;
    }
    try {
      await QRCode.toCanvas(canvas, r.qrUrl, { width: 240, margin: 1, errorCorrectionLevel: 'L' });
      canvas.hidden = false;
    } catch (e) {
      canvas.hidden = true;
      note += ` · QR을 만들 수 없습니다(${e.message})`;
    }
    info.textContent = `완료 ${r.doneCount}개 · 맵 핀 ${r.pinCount}개 · 링크 ${linkEl.value.length.toLocaleString()}자${note}`;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const el = section.querySelector('#sync-link');
    el.focus(); el.select();
    try { return document.execCommand('copy'); } catch { return false; }
  }

  async function importFromText(text) {
    const r = await readSyncLink(text, dungeons);
    const msg = `다른 기기의 완료 ${r.done.length}개, 맵 핀 ${r.pins.length}개를 이 기기와 합칠까요?${r.skipped.length ? `\n(데이터 버전이 달라 건너뜀: ${r.skipped.join(', ')})` : ''}`;
    if (!confirm(msg)) return false;
    applySync(r);
    return true;
  }

  section.addEventListener('click', async (ev) => {
    const a = ev.target.closest('[data-action]');
    if (!a || a.tagName === 'INPUT') return;
    switch (a.dataset.action) {
      case 'sync-make': await makeSync(); break;
      case 'sync-copy': {
        const ok = await copyText(section.querySelector('#sync-link').value);
        a.textContent = ok ? '복사됨!' : '복사 실패 — 직접 선택해 복사하세요';
        setTimeout(() => { a.textContent = '링크 복사'; }, 2000);
        break;
      }
      case 'sync-share':
        try { await navigator.share({ title: '하이랄 지도 동기화', url: section.querySelector('#sync-link').value }); } catch {}
        break;
      case 'sync-import': {
        const text = section.querySelector('#sync-paste').value.trim();
        if (!text) { alert('링크를 붙여넣어 주세요.'); break; }
        try {
          if (await importFromText(text)) { alert('합쳤습니다.'); section.querySelector('#sync-paste').value = ''; }
        } catch (e) { alert(`가져오기 실패: ${e.message}`); }
        break;
      }
      case 'export': exportBackup(); break;
      case 'reset':
        if (confirm('정말 모든 진행도·맵 핀·설정을 지울까요? 되돌릴 수 없습니다.')) { resetAll(); location.reload(); }
        break;
      default:
    }
  });
  section.addEventListener('change', async (ev) => {
    const t = ev.target;
    if (t.dataset.action === 'import' && t.files?.[0]) {
      try {
        const r = await importBackup(t.files[0]);
        alert(`가져왔습니다. 완료 항목 ${r.done}개, 맵 핀 ${r.pins}개를 병합했습니다.`);
      } catch (e) {
        alert(`가져오기 실패: ${e.message}`);
      }
      t.value = '';
    } else if (t.dataset.set === 'showChestItems') {
      setSetting('showChestItems', t.checked);
    } else if (t.dataset.set === 'moveOnDone') {
      setSetting('moveOnDone', t.checked);
    }
  });

  render();
  return { render, importFromText };
}
