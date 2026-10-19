// 기기 간 동기화: 완료 기록(비트맵) + 맵 핀을 압축해 링크(#sync=…)에 담는다.
// 비트맵은 데이터 파일의 항목 순서를 기준으로 하므로 양쪽 기기가 같은 배포본을 쓰면 된다 (개수가 다르면 그 카테고리는 건너뜀).
import { getLoaded } from '../data/loader.js';
import { state, isDone, mergeBackup } from './store.js';

const CATS = ['shrines', 'towers', 'koroks', 'fountains', 'memories', 'bosses', 'chests'];

/** 순서가 고정된 id 목록 (카테고리 항목 + 사당 상자 + 던전 상자) */
function idLists(dungeons) {
  const lists = {};
  for (const c of CATS) lists[c] = (getLoaded(c) ?? []).map((e) => e.id);
  lists.shrineChests = (getLoaded('shrines') ?? []).flatMap((s) => (s.chests ?? []).map((c) => c.id));
  lists.dungeonChests = (dungeons ?? []).flatMap((d) => (d.chests ?? []).map((c) => c.id));
  return lists;
}

function bytesToB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function bitsToB64(bits) {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 1 << (i & 7); });
  return bytesToB64url(bytes);
}
function b64ToBits(s, n) {
  const bytes = b64urlToBytes(s);
  return Array.from({ length: n }, (_, i) => !!(bytes[i >> 3] & (1 << (i & 7))));
}

async function deflate(text) {
  const input = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') return { raw: true, bytes: input };
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  w.write(input);
  w.close();
  return { raw: false, bytes: new Uint8Array(await new Response(cs.readable).arrayBuffer()) };
}
async function inflate(bytes, raw) {
  if (raw) return new TextDecoder().decode(bytes);
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new Response(ds.readable).text();
}

/** 동기화 링크 만들기. includePins=false 면 완료 기록만 (QR 용량 초과 시) */
export async function makeSyncLink({ dungeons, includePins = true }) {
  const lists = idLists(dungeons);
  const n = {};
  const b = {};
  let doneCount = 0;
  for (const [k, ids] of Object.entries(lists)) {
    const bits = ids.map(isDone);
    doneCount += bits.filter(Boolean).length;
    n[k] = ids.length;
    b[k] = bitsToB64(bits);
  }
  const p = includePins ? state.pins.map((x) => ({ i: x.id, x: x.x, z: x.z, t: x.title, m: x.note, c: x.color, u: x.updatedAt })) : [];
  const { raw, bytes } = await deflate(JSON.stringify({ v: 1, t: Date.now(), n, b, p }));
  const url = `${location.origin}${location.pathname}#sync=${raw ? 'r' : 'z'}${bytesToB64url(bytes)}`;
  return { url, doneCount, pinCount: p.length };
}

/** 링크(또는 해시 값)에서 기록 꺼내기 → { done: ids, pins, skipped } */
export async function readSyncLink(text, dungeons) {
  const m = String(text).match(/#sync=([rz])([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('동기화 링크가 아닙니다.');
  const payload = JSON.parse(await inflate(b64urlToBytes(m[2]), m[1] === 'r'));
  if (payload.v !== 1) throw new Error('지원하지 않는 동기화 형식입니다.');
  const lists = idLists(dungeons);
  const done = [];
  const skipped = [];
  for (const [k, ids] of Object.entries(lists)) {
    if (!payload.b?.[k]) continue;
    if (payload.n?.[k] !== ids.length) { skipped.push(k); continue; } // 데이터 버전이 다르면 건너뜀
    const bits = b64ToBits(payload.b[k], ids.length);
    ids.forEach((id, i) => { if (bits[i]) done.push(id); });
  }
  const pins = (payload.p ?? []).map((x) => ({ id: x.i, x: x.x, z: x.z, title: x.t ?? '', note: x.m ?? '', color: x.c, updatedAt: x.u ?? payload.t, createdAt: x.u ?? payload.t }));
  return { done, pins, skipped, at: payload.t };
}

/** 꺼낸 기록을 이 기기와 합치기 (합집합) */
export function applySync({ done, pins, at }) {
  mergeBackup({ progress: { done: Object.fromEntries(done.map((id) => [id, at ?? Date.now()])) }, pins });
}
