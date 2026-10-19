import { state, mergeBackup, SCHEMA_VERSION } from './store.js';

/** 진행도·맵 핀·설정을 JSON 파일로 내려받기 */
export function exportBackup() {
  const data = {
    app: 'botwmap',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    progress: state.progress,
    pins: state.pins,
    settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `hyrule-map-backup-${data.exportedAt.slice(0, 10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 백업 파일을 읽어 병합. 버전이 바뀌면 migrate 에 변환을 추가한다 */
export async function importBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'botwmap' || typeof data.version !== 'number') throw new Error('하이랄 지도 백업 파일이 아닙니다.');
  mergeBackup(migrate(data));
  return { done: Object.keys(data.progress?.done ?? {}).length, pins: (data.pins ?? []).length };
}

function migrate(d) {
  // version 1 이 현재 형식. 이후 스키마가 바뀌면 여기서 변환
  return d;
}
