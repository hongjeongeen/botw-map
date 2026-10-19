import { exportBackup, importBackup } from '../state/backup.js';
import { resetAll, state, setSetting } from '../state/store.js';

export function createSettingsPanel({ section }) {
  function render() {
    section.innerHTML = `
      <h3>백업</h3>
      <div class="muted small" style="margin-bottom:8px">진행도와 맵 핀은 이 브라우저에만 저장됩니다. 다른 기기(폰 ↔ PC)로 옮기거나 보관하려면 JSON으로 내보내세요.</div>
      <div class="pp-actions">
        <button type="button" class="btn primary" data-action="export">JSON으로 내보내기</button>
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

  section.addEventListener('click', async (ev) => {
    const a = ev.target.closest('[data-action]');
    if (!a || a.tagName === 'INPUT') return;
    if (a.dataset.action === 'export') exportBackup();
    if (a.dataset.action === 'reset' && confirm('정말 모든 진행도·맵 핀·설정을 지울까요? 되돌릴 수 없습니다.')) {
      resetAll();
      location.reload();
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
  return { render };
}
