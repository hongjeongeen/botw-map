// localStorage 읽기/쓰기. 키는 botwmap: 네임스페이스, 쓰기는 디바운스.
const NS = 'botwmap';

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const pending = new Map();
let timer = null;

export function write(key, value) {
  pending.set(key, value);
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}

export function flush() {
  for (const [k, v] of pending) {
    try {
      localStorage.setItem(`${NS}:${k}`, JSON.stringify(v));
    } catch {
      alert('저장 공간이 부족합니다. 설정에서 백업한 뒤 맵 핀·메모를 정리해 주세요.');
    }
  }
  pending.clear();
}

export function clearAll() {
  for (const k of ['progress', 'pins', 'settings']) localStorage.removeItem(`${NS}:${k}`);
}

window.addEventListener('pagehide', flush);
