import { read, write, clearAll } from './storage.js';
import { CATEGORIES } from '../data/categories.js';

export const SCHEMA_VERSION = 1;

const bus = new EventTarget();
/** 이벤트: 'progress' {id, done} · 'pins' · 'settings' {key, value} */
export const on = (type, fn) => bus.addEventListener(type, (e) => fn(e.detail));
const emit = (type, detail = {}) => bus.dispatchEvent(new CustomEvent(type, { detail }));

const defaultSettings = () => ({
  visible: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.defaultOn])),
  hiddenSub: {},          // { [catId]: [종류 이름…] } 숨긴 종류
  hideDone: false,
  showChestItems: false,  // 보물 상자 내용물 표시 (스포일러)
  lastView: null,         // { x, z, zoom }
  myLocation: null,       // { x, z }
});

const savedSettings = read('settings', {});
export const state = {
  progress: read('progress', { done: {} }),   // { done: { [id]: timestamp } }
  pins: read('pins', []),                      // [{ id, x, z, title, note, color, linkedId?, createdAt, updatedAt }]
  settings: {
    ...defaultSettings(),
    ...savedSettings,
    visible: { ...defaultSettings().visible, ...(savedSettings.visible ?? {}) },
  },
};

export const isDone = (id) => !!state.progress.done[id];

export function setDone(id, done) {
  if (done) state.progress.done[id] = Date.now();
  else delete state.progress.done[id];
  write('progress', state.progress);
  emit('progress', { id, done });
}

/** 접두사로 완료 수 세기 (예: 'chest:') */
export function doneCount(prefix) {
  let n = 0;
  for (const id in state.progress.done) if (id.startsWith(prefix)) n++;
  return n;
}

// LAN http 환경(비보안 컨텍스트)에선 crypto.randomUUID 가 없다
export const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export function upsertPin(pin) {
  const i = state.pins.findIndex((p) => p.id === pin.id);
  const now = Date.now();
  if (i < 0) state.pins.push({ ...pin, createdAt: pin.createdAt ?? now, updatedAt: now });
  else state.pins[i] = { ...state.pins[i], ...pin, updatedAt: now };
  write('pins', state.pins);
  emit('pins');
}

export function deletePin(id) {
  state.pins = state.pins.filter((p) => p.id !== id);
  write('pins', state.pins);
  emit('pins');
}

export function setSetting(key, value) {
  state.settings[key] = value;
  write('settings', state.settings);
  emit('settings', { key, value });
}

export function resetAll() {
  state.progress = { done: {} };
  state.pins = [];
  state.settings = defaultSettings();
  clearAll();
  emit('progress', {});
  emit('pins');
  emit('settings', { key: '*' });
}

/** 백업 병합: 합집합이라 데이터가 줄어들지 않는다. 설정은 기기별이므로 합치지 않음 */
export function mergeBackup(b) {
  for (const [id, ts] of Object.entries(b.progress?.done ?? {})) state.progress.done[id] ??= ts;
  for (const p of b.pins ?? []) {
    if (!p || typeof p.id !== 'string') continue;
    const i = state.pins.findIndex((q) => q.id === p.id);
    if (i < 0) state.pins.push(p);
    else if ((p.updatedAt ?? 0) > (state.pins[i].updatedAt ?? 0)) state.pins[i] = p;
  }
  write('progress', state.progress);
  write('pins', state.pins);
  emit('progress', {});
  emit('pins');
}
