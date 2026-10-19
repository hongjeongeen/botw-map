import { getLoaded } from '../data/loader.js';
import { isDone } from '../state/store.js';
import { iconImg } from '../map/icons.js';

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
