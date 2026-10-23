import { getLoaded } from '../data/loader.js';
import { isDone, state } from '../state/store.js';
import { iconImg } from '../map/icons.js';
import { CATEGORIES } from '../data/categories.js';
import { esc } from '../util.js';

function countRows(rows) {
  let d = 0;
  for (const r of rows) if (isDone(r.id)) d++;
  return [d, rows.length];
}

function bar(label, done, total, extra = '') {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="prog">
      <div class="prog-head"><span>${label}</span><span class="count">${done}/${total}${extra}</span></div>
      <div class="prog-bar"><i style="width:${pct}%"></i></div>
    </div>`;
}

/** 완료 항목 id → 표시 이름 (상자는 "사당 이름 상자 n", 코로그는 번호) */
function labelFor(id, dungeons) {
  if (id.startsWith('chest:')) {
    const owners = [...(getLoaded('shrines') ?? []), ...(dungeons ?? [])];
    for (const o of owners) {
      const i = (o.chests ?? []).findIndex((c) => c.id === id);
      if (i >= 0) return `${o.name} 상자 ${i + 1}`;
    }
    return '보물 상자';
  }
  for (const cat of CATEGORIES) {
    if (!cat.trackable) continue;
    const e = getLoaded(cat.id)?.find((r) => r.id === id);
    if (e) return cat.id === 'chests' ? `보물 상자(${e.name})` : `${e.name}${e.code ? ` ${e.code}` : ''}`;
  }
  return id;
}

function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

/** 최근 완료 목록 + 해제 버튼 (실수로 체크했을 때 되돌리기) */
export function recentHtml({ dungeons, limit = 10 }) {
  const recent = Object.entries(state.progress.done).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!recent.length) return '';
  return `
    <div class="recent">
      <div class="recent-head muted small">최근 완료 <span class="hint">· 잘못 눌렀으면 해제</span></div>
      <ul>${recent.map(([id, ts]) => `
        <li>
          <span class="recent-name">${esc(labelFor(id, dungeons))}</span>
          <span class="muted small">${timeAgo(ts)}</span>
          <button type="button" class="btn small" data-undo="${esc(id)}">해제</button>
        </li>`).join('')}</ul>
    </div>`;
}

/**
 * 탐험 진행률 요약. 전체 %는 기본 콘텐츠 기준(추가 콘텐츠 사당 제외), 강적은 토벌 수만 따로 표시.
 */
export function dashboardHtml({ dungeons, open = true }) {
  const shrines = getLoaded('shrines') ?? [];
  const [sd, st] = countRows(shrines.filter((s) => !s.dlc));
  const [dd, dt] = countRows(shrines.filter((s) => s.dlc));
  const towers = countRows(getLoaded('towers') ?? []);
  const koroks = countRows(getLoaded('koroks') ?? []);
  const memories = countRows(getLoaded('memories') ?? []);
  const fountains = countRows(getLoaded('fountains') ?? []);
  const [cd, ct] = countRows(shrines.flatMap((s) => s.chests ?? []));
  const [dcd, dct] = countRows((dungeons ?? []).flatMap((d) => d.chests ?? []));
  const fieldChests = countRows(getLoaded('chests') ?? []);
  const bosses = getLoaded('bosses') ?? [];
  const medal = (re, excl) => countRows(bosses.filter((b) => re.test(b.actor) && !(excl && excl.test(b.actor))));
  const hinox = medal(/Giant/);
  const talus = medal(/Golem/, /Golem_Fire_R/);      // 메가 마그록(추가 콘텐츠) 제외
  const molduga = medal(/^Enemy_Sandworm$/);         // 킹래고(추가 콘텐츠) 제외
  const lynel = medal(/Lynel/);

  const done = sd + towers[0] + koroks[0] + memories[0] + fountains[0] + cd + dcd;
  const total = st + towers[1] + koroks[1] + memories[1] + fountains[1] + ct + dct;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return `
    <details class="dash" ${open ? 'open' : ''}>
      <summary><span class="chev" aria-hidden="true"></span><span>탐험 진행률</span><b>${pct}%</b><span class="muted small">${done.toLocaleString()}/${total.toLocaleString()}</span><span class="muted small dash-hint">${open ? '접기' : '펼치기'}</span></summary>
      <div class="prog-bar big"><i style="width:${pct}%"></i></div>
      ${bar(`${iconImg('shrine')} 사당`, sd, st, dt ? ` <span class="hint">· 추가 콘텐츠 ${dd}/${dt}</span>` : '')}
      ${bar(`${iconImg('tower')} 시커 타워`, ...towers)}
      ${bar(`${iconImg('seed')} 코로그 열매`, ...koroks)}
      ${bar(`${iconImg('memory')} 사진기의 기억`, ...memories)}
      ${bar(`${iconImg('fountain')} 대요정의 샘`, ...fountains)}
      ${bar(`${iconImg('treasure')} 보물 상자`, cd + dcd, ct + dct, ` <span class="hint">· 사당 ${cd}/${ct} · 던전 ${dcd}/${dct}</span>`)}
      ${bar(`${iconImg('treasure')} 필드 보물 상자`, ...fieldChests)}
      <div class="muted small" style="margin:10px 0 2px">강적 토벌</div>
      ${bar(`${iconImg('hinox')} 히녹스`, ...hinox)}
      ${bar(`${iconImg('talus')} 바위록`, ...talus)}
      ${bar(`${iconImg('molduga')} 몰드래고`, ...molduga)}
      ${bar(`${iconImg('lynel')} 라이넬`, ...lynel)}
      <div class="muted small" style="margin-top:6px">전체 %는 기본 콘텐츠 기준(추가 콘텐츠 사당·필드 상자·강적 제외)입니다.</div>
    </details>`;
}
