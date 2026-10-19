// objmap / radar / 공식 한국어 메시지 파일을 내려받아 public/data/*.json 을 만든다.
// 실행: npm run fetch-data   (원본은 .cache/raw/ 에 캐시, 다시 받으려면 폴더 삭제)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, '.cache', 'raw');
const OUT = path.join(ROOT, 'public', 'data');
const CACHE = path.join(ROOT, '.cache');

const OBJMAP = 'https://objmap.zeldamods.org/game_files';
const RADAR = 'https://radar.zeldamods.org';
const MSG = 'https://raw.githubusercontent.com/leoetlino/botw/master/Message';

const overrides = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'ko-overrides.json'), 'utf8'));
const missing = { labels: new Set(), actors: new Set(), korokTypes: new Set(), dungeons: new Set(), notes: [] };

// ---------------------------------------------------------------- 다운로드
async function fetchCached(url, file) {
  const p = path.join(RAW, file);
  if (existsSync(p)) return readFile(p, 'utf8');
  console.log('GET', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'botw-map (personal fetch-data script)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, text, 'utf8');
  return text;
}
const fetchJson = async (url, file) => JSON.parse(await fetchCached(url, file));

async function radar(mapType, q, file, limit = 50000) {
  const url = `${RADAR}/objs/${mapType}?${new URLSearchParams({ q, withMapNames: '1', limit: String(limit) })}`;
  const rows = await fetchJson(url, `radar/${file}.json`);
  // limit 상한에 걸려 잘렸는지 objids 로 교차 확인
  const ids = await fetchJson(`${RADAR}/objids/${mapType}?${new URLSearchParams({ q })}`, `radar/${file}.ids.json`);
  if (ids.length !== rows.length) missing.notes.push(`radar ${mapType} "${q}": objs ${rows.length} vs objids ${ids.length} (잘림?)`);
  return rows;
}

// ---------------------------------------------------------------- msyt (YAML) → { label: text }
async function msyt(lang, file) {
  const text = await fetchCached(`${MSG}/Msg_${lang}.product.sarc/${file}.msyt`, `msg/${lang}/${file}.msyt`);
  const doc = YAML.parse(text);
  const out = {};
  for (const [label, entry] of Object.entries(doc.entries ?? {})) {
    const parts = (entry.contents ?? []).map((c) => (typeof c?.text === 'string' ? c.text : '')).join('');
    const s = parts.replace(/\s+/g, ' ').trim();
    if (s) out[label] = s;
  }
  return out;
}

const ACTOR_FILES = [
  'Item', 'PlayerItem', 'Enemy', 'GiantEnemy', 'Guardian', 'Sandworm', 'Dragon', 'SiteBoss', 'GelEnemy', 'Swarm',
  'Prey', 'NPC', 'Horse', 'MapConstActive', 'MapConstPassive', 'MapDynamicActive', 'MapDynamicPassive', 'CapturedActor',
  'WeaponBow', 'WeaponLargeSword', 'WeaponShield', 'WeaponSmallSword', 'WeaponSpear',
  'ArmorHead', 'ArmorLower', 'ArmorUpper', 'Bullet', 'CookResult', 'HorseReins', 'HorseSaddle',
];
const LAYOUT_FILES = ['AppMap_00', 'AppMapDungeon_00', 'AppAlbum_00', 'PauseMenu_00', 'MainScreen_00'];

async function loadActorText(lang) {
  const merged = {};
  for (const f of ACTOR_FILES) Object.assign(merged, await msyt(lang, `ActorType/${f}`));
  return merged;
}

// 가운뎃점 통일 (U+00B7). 게임 텍스트/위키마다 U+2027, U+30FB 등이 섞일 수 있음
const normDot = (s) => s.replace(/[‧・•]/g, '·');

console.log('한국어/영어 메시지 파일 로드…');
const koDungeon = await msyt('KRko', 'StaticMsg/Dungeon');
const koLoc = await msyt('KRko', 'StaticMsg/LocationMarker');
const koActor = await loadActorText('KRko');
const enActor = await loadActorText('USen');
const koLayout = {};
for (const f of LAYOUT_FILES) koLayout[f] = await msyt('KRko', `LayoutMsg/${f}`);
await mkdir(CACHE, { recursive: true });
await writeFile(path.join(CACHE, 'layout-ko.json'), JSON.stringify(koLayout, null, 2), 'utf8'); // UI 공식 문구 참고용

// 영문 텍스트 → 라벨 역색인 (names.json 영문명으로 한국어 라벨을 찾는 폴백)
const enLabelByText = new Map();
for (const [label, text] of Object.entries(enActor)) if (label.endsWith('_Name') && !enLabelByText.has(text)) enLabelByText.set(text, label);

const names = await fetchJson(`${OBJMAP}/names.json`, 'objmap/names.json'); // 액터명 → 영문 표시명 (폴백 조인 전용, 출력하지 않음)

function locName(messageId) {
  const v = overrides.labels[messageId] ?? koLoc[messageId];
  if (!v) missing.labels.add(messageId);
  return v ? normDot(v) : null;
}
function actorName(actor) {
  if (overrides.actors[actor]) return normDot(overrides.actors[actor]);
  const direct = koActor[`${actor}_Name`];
  if (direct) return normDot(direct);
  const en = names[actor];
  if (en) {
    const label = enLabelByText.get(en);
    if (label && koActor[label]) return normDot(koActor[label]);
  }
  missing.actors.add(actor);
  return null;
}
const r1 = (n) => Math.round(n * 10) / 10;
const pos = (t) => (Array.isArray(t) ? { x: r1(t[0]), y: r1(t[1]), z: r1(t[2]) } : { x: r1(t.X), y: r1(t.Y), z: r1(t.Z) });

// ---------------------------------------------------------------- objmap static.json
console.log('objmap static.json 로드…');
const { markers } = await fetchJson(`${OBJMAP}/map_summary/MainField/static.json`, 'objmap/static.json');

// ---------------------------------------------------------------- 던전 내부 보물 상자
console.log('radar: 던전 상자…');
const shrineChestRows = await radar('CDungeon', 'actor:^"TBox_"', 'cdungeon-tbox');
const beastChestRows = await radar('MainFieldDungeon', 'actor:^"TBox_"', 'mfd-tbox');
function chestsByMap(rows) {
  const by = new Map();
  for (const r of rows) {
    const dropActor = Array.isArray(r.drop) && typeof r.drop[1] === 'string' ? r.drop[1] : null;
    const chest = { id: `chest:${r.hash_id}`, item: dropActor ? actorName(dropActor) : null };
    if (!by.has(r.map_name)) by.set(r.map_name, []);
    by.get(r.map_name).push(chest);
  }
  return by;
}
const shrineChests = chestsByMap(shrineChestRows);
const beastChests = chestsByMap(beastChestRows);

// ---------------------------------------------------------------- 사당 / 타워 / 장소 / 지명
const shrines = markers.Dungeon.map((m) => {
  const id = m.MessageID; // Dungeon000 …
  const no = parseInt(m.SaveFlag.replace('Location_Dungeon', ''), 10);
  const name = koDungeon[id];
  if (!name) missing.labels.add(`Dungeon:${id}`);
  return {
    id: `shrine:${id}`, cat: 'shrines', name: normDot(name ?? id), sub: koDungeon[`${id}_sub`] ?? null,
    dlc: no >= 120, ...pos(m.Translate), chests: shrineChests.get(id) ?? [],
  };
});

const towers = markers.Tower.map((m) => ({ id: `tower:${m.MessageID}`, cat: 'towers', name: locName(m.MessageID) ?? m.MessageID, ...pos(m.Translate) }));

const labels = markers.Location
  .filter((m) => m.MessageID)
  .map((m) => ({ id: `label:${m.MessageID}`, cat: 'labels', name: locName(m.MessageID), level: m.ShowLevel ?? 4, ...pos(m.Translate) }))
  .filter((l) => l.name);

// 가장 가까운 지명 (이름 없는 상점·기억·대요정 위치 설명용). level 1(지방)은 너무 넓어 제외
function nearestLabel(x, z, maxDist = 600, maxLevel = 8, exclude = null) {
  let best = null;
  let bestD = maxDist;
  for (const l of labels) {
    if (l.level < 2 || l.level > maxLevel || l.name === exclude) continue;
    const d = Math.hypot(l.x - x, l.z - z);
    if (d < bestD) { bestD = d; best = l; }
  }
  return best?.name ?? null;
}

const placeRows = [
  ...markers.Place.map((m) => ({ m, icon: m.Icon })),
  ...markers.Labo.map((m) => ({ m, icon: 'Labo' })),
  ...markers.Shop.map((m) => ({ m, icon: m.Icon })),
];
const namedPlaces = [];
const places = placeRows.map(({ m, icon }) => {
  const kind = overrides.placeKinds[icon] ?? icon;
  if (!overrides.placeKinds[icon]) missing.notes.push(`placeKinds 누락: ${icon}`);
  const p = pos(m.Translate);
  const own = m.MessageID ? locName(m.MessageID) : null;
  const key = m.MessageID ?? m.SaveFlag ?? `${icon}:${p.x}:${p.z}`;
  const entry = { id: `place:${key}`, cat: 'places', kind, name: own ?? kind, ...p };
  if (own) namedPlaces.push(entry);
  return entry;
});
// 이름이 없는 상점은 가장 가까운 마을·마구간·주요 장소 이름을 붙인다: "만물상 · 하테노 마을"
for (const e of places) {
  if (e.name !== e.kind) continue;
  let best = null;
  let bestD = 800;
  for (const n of namedPlaces) {
    const d = Math.hypot(n.x - e.x, n.z - e.z);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (best) e.name = `${e.kind} · ${best.name}`;
}

// ---------------------------------------------------------------- 코로그
console.log('radar: 코로그 유형…');
let korokTypeById = new Map();
try {
  const rows = await radar('MainField', 'actor:Npc_HiddenKorok*', 'korok', 2000);
  for (const r of rows) if (r.korok_id) korokTypeById.set(r.korok_id, r.korok_type ?? null);
} catch (e) {
  missing.notes.push(`코로그 유형 쿼리 실패: ${e.message}`);
}
function korokTypeKo(t) {
  if (!t) return null;
  if (overrides.korokTypes[t]) return overrides.korokTypes[t];
  missing.korokTypes.add(t);
  return null;
}
const koroks = markers.Korok.map((k) => ({
  id: `korok:${k.id}`, cat: 'koroks', name: overrides.categories.koroks, code: k.id, hash: k.hash_id,
  sub: korokTypeKo(korokTypeById.get(k.id)), ...pos(k.Translate),
}));

// ---------------------------------------------------------------- 적 / 소재
console.log('radar: 적…');
const enemyRows = await radar('MainField', 'actor:^"Enemy_"', 'enemies');
// 강적 = 라이넬·히녹스·바위록 계열·몰드래고 (소형 돌록 Enemy_Golem_Little* 은 일반 몬스터로). 가디언은 별도 카테고리
const BOSS_RE = /^Enemy_(Lynel|Giant|Golem_(Junior|Middle|Senior|Fire|Ice)|Sandworm)/;
const GUARDIAN_RE = /^Enemy_Guardian_/;
const SKIP_ACTORS = new Set(['Enemy_Ganon']);
const bosses = [], guardians = [], enemies = [];
for (const r of enemyRows) {
  if (SKIP_ACTORS.has(r.name)) continue;
  const name = actorName(r.name);
  if (!name) continue;
  const e = { id: `enemy:${r.hash_id}`, name, actor: r.name, x: r1(r.pos[0]), y: r1(r.pos[1]), z: r1(r.pos[2]) };
  if (BOSS_RE.test(r.name)) bosses.push({ ...e, cat: 'bosses' });
  else if (GUARDIAN_RE.test(r.name)) guardians.push({ ...e, cat: 'guardians' });
  else enemies.push({ ...e, cat: 'enemies' });
}

console.log('radar: 소재…');
const itemRows = await radar('MainField', 'actor:^"Item_"', 'items');
const materials = [];
for (const r of itemRows) {
  const name = actorName(r.name);
  if (!name) continue;
  materials.push({ id: `item:${r.hash_id}`, cat: 'materials', name, actor: r.name, x: r1(r.pos[0]), y: r1(r.pos[1]), z: r1(r.pos[2]) });
}

// ---------------------------------------------------------------- 대요정 / 기억
console.log('radar: 대요정·기억…');
// 대요정의 샘: LocationTag(WeaponCureSpring) 4곳이 정확한 위치. 이름은 게임 지명 그대로
const fairyRows = await radar('MainField', 'name:"Great Fairy"', 'fairy', 100);
const fountains = fairyRows
  .filter((r) => r.name === 'LocationTag' && r.messageid === 'WeaponCureSpring')
  .map((r) => ({
    id: `fountain:${r.hash_id}`, cat: 'fountains', name: locName('WeaponCureSpring'), sub: nearestLabel(r.pos[0], r.pos[2], 1000, 4, locName('WeaponCureSpring')),
    x: r1(r.pos[0]), y: r1(r.pos[1]), z: r1(r.pos[2]),
  }));
if (fountains.length !== 4) missing.notes.push(`대요정의 샘 ${fountains.length}곳 (4곳이어야 함)`);

// 사진기의 기억: RememberTag 의 UniqueName Demo126~Demo138 이 앨범 순서 1~13 (13 = 마지막 기억).
// 제목은 스토리 스포일러라 넣지 않고 번호 + 근처 지명만 표시한다
const memoryRows = await radar('MainField', 'name:"Memory"', 'memory', 100);
const memories = [];
for (const r of memoryRows) {
  const full = await fetchJson(`${RADAR}/obj/${r.objid}`, `radar/memory-${r.objid}.json`);
  const unique = full?.data?.UniqueName ?? '';
  const no = parseInt(/Demo(\d+)/.exec(unique)?.[1] ?? '0', 10) - 125;
  if (no < 1 || no > 13) { missing.notes.push(`기억 번호를 알 수 없음: ${unique}`); continue; }
  memories.push({
    id: `memory:${r.hash_id}`, cat: 'memories', no, name: `${overrides.categories.memories} ${no}`, sub: nearestLabel(r.pos[0], r.pos[2], 1000, 4),
    x: r1(r.pos[0]), y: r1(r.pos[1]), z: r1(r.pos[2]),
  });
}
memories.sort((a, b) => a.no - b.no);

// ---------------------------------------------------------------- 여신상
console.log('radar: 여신상…');
const statueRows = await radar('MainField', 'name:"Goddess Statue"', 'statue', 500);
// 같은 자리에 연출용 변형이 여러 개 놓여 있으므로 30 단위 안의 중복은 하나만 남긴다
const statues = [];
for (const r of statueRows.sort((a, b) => a.hash_id - b.hash_id)) {
  if (statues.some((s) => Math.hypot(s.x - r.pos[0], s.z - r.pos[2]) < 30)) continue;
  statues.push({
    id: `statue:${r.hash_id}`, cat: 'statues', name: overrides.categories.statues, sub: nearestLabel(r.pos[0], r.pos[2], 800, 8),
    actor: r.name, x: r1(r.pos[0]), y: r1(r.pos[1]), z: r1(r.pos[2]),
  });
}

// ---------------------------------------------------------------- 지역 경계선 (시커 타워 영역 폴리곤)
console.log('objmap: 타워 영역 폴리곤…');
const towerAreas = await fetchJson(`${OBJMAP}/ecosystem/MapTower.json`, 'objmap/MapTower.json');

// Douglas–Peucker 단순화 (반복형). 원본은 영역당 수천 점이라 그대로 쓰기엔 너무 크다
function simplify(points, tol) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
// 지도 가장자리(X ±5000, Z ±4000)에 붙은 선분은 지도 외곽 직사각형이므로 제거하고 안쪽 경계만 남긴다
const EDGE_X = 4985, EDGE_Z = 3985;
function edgesOf([x, z]) {
  const e = [];
  if (x <= -EDGE_X) e.push('W');
  if (x >= EDGE_X) e.push('E');
  if (z <= -EDGE_Z) e.push('N');
  if (z >= EDGE_Z) e.push('S');
  return e;
}
function stripOuterEdge(ring) {
  const parts = [];
  let cur = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const ea = edgesOf(a), eb = edgesOf(b);
    const onOuter = ea.some((e) => eb.includes(e)); // 같은 변 위의 선분
    if (onOuter) { if (cur.length >= 2) parts.push(cur); cur = []; }
    else { if (!cur.length) cur.push(a); cur.push(b); }
  }
  if (cur.length >= 2) parts.push(cur);
  return parts;
}
const regions = Object.entries(towerAreas).map(([key, polys]) => ({
  id: `region:${key}`, cat: 'regions',
  rings: polys.flatMap((p) => p.coordinates.flatMap((ring) => stripOuterEdge(simplify(ring, 8).map(([x, z]) => [Math.round(x), Math.round(z)])))),
}));
missing.notes.push(`지역 경계선 점 수: ${regions.reduce((n, r) => n + r.rings.reduce((m, ring) => m + ring.length, 0), 0)} (원본 ${Object.values(towerAreas).flat().reduce((n, p) => n + p.coordinates.reduce((m, ring) => m + ring.length, 0), 0)})`);

// ---------------------------------------------------------------- 신수 등 던전 (마커 없음)
const dungeons = [...beastChests.keys()].sort().map((mapName) => {
  const name = overrides.dungeons[mapName] ?? koLoc[mapName] ?? null;
  if (!name) missing.dungeons.add(mapName);
  return { id: `dungeon:${mapName}`, cat: 'dungeons', name: name ?? mapName, dlc: mapName === 'FinalTrial', chests: beastChests.get(mapName) };
});

// ---------------------------------------------------------------- 출력
await mkdir(OUT, { recursive: true });
const files = { shrines, towers, places, labels, koroks, bosses, guardians, enemies, materials, fountains, memories, statues, regions, dungeons };
const index = { generatedAt: new Date().toISOString(), categories: {} };
for (const [name, rows] of Object.entries(files)) {
  await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(rows), 'utf8');
  const chests = rows.reduce((n, r) => n + (r.chests?.length ?? 0), 0);
  index.categories[name] = { count: rows.length, ...(chests ? { chests } : {}) };
}
await writeFile(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

const report = {
  labels: [...missing.labels].sort(),
  actors: [...missing.actors].sort(),
  korokTypes: [...missing.korokTypes].sort(),
  dungeons: [...missing.dungeons].sort(),
  notes: missing.notes,
};
await writeFile(path.join(CACHE, 'missing-ko.json'), JSON.stringify(report, null, 2), 'utf8');

console.log('\n생성 완료:', JSON.stringify(index.categories));
console.log(`누락 — 지명 ${report.labels.length}, 액터 ${report.actors.length}, 코로그 유형 ${report.korokTypes.length}, 던전 ${report.dungeons.length}, 메모 ${report.notes.length}  → .cache/missing-ko.json`);
