import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';
import { createMap } from './map/map.js';
import { toLatLng, toGame, distance, MAP_BOUNDS } from './map/crs.js';
import { MapButtons } from './map/mapButtons.js';
import { CATEGORIES, CAT_BY_ID } from './data/categories.js';
import { loadAndKeep, loadIndex, loadCategory, getLoaded } from './data/loader.js';
import { state, setSetting, setDone, setDoneMany, on, deletePin } from './state/store.js';
import { createCategoryLayer } from './map/layers.js';
import { createLabelLayer } from './map/labels.js';
import { createRegionsLayer, createAreasLayer } from './map/regions.js';
import { openEntryPopup, openHtmlPopup, closePopup } from './map/popup.js';
import { createPinsLayer } from './map/pins.js';
import { preloadIcons } from './map/icons.js';
import { createMyLocation } from './map/myLocation.js';
import { initPanel } from './ui/panel.js';
import { createLayersPanel } from './ui/layersPanel.js';
import { createSearchPanel } from './ui/search.js';
import { createNearbyPanel } from './ui/nearbyPanel.js';
import { createPinsPanel } from './ui/pinsPanel.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { esc, isMobile } from './util.js';

// ---------------------------------------------------------------- 지도
// 시작 시 해시를 먼저 보관: 지도 이동(moveend)이 해시를 덮어쓰기 전에 #sync= 링크를 읽어야 한다
const initialHash = location.hash;
// URL 해시 #<줌>/<X>/<Z> 로 현재 위치를 공유·복원 (예: #7/-560/1694 = 시작의 탑)
function parseHash() {
  const m = initialHash.match(/^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  return m ? { zoom: +m[1], x: +m[2], z: +m[3] } : null;
}
const map = createMap(document.getElementById('map'), parseHash() ?? state.settings.lastView);
map.on('moveend', () => {
  const { x, z } = toGame(map.getCenter());
  const view = { x: Math.round(x), z: Math.round(z), zoom: map.getZoom() };
  history.replaceState(null, '', `#${view.zoom}/${view.x}/${view.z}`);
  setSetting('lastView', view);
});

const panel = initPanel();

// 모바일: 지도를 탭/드래그하면 바텀시트를 닫는다 (맵 핀 추가 클릭보다 먼저 등록되어야 편집 폼이 다시 열린다)
map.on('click dragstart', () => { if (isMobile() && panel.isOpen()) panel.close(); });

// ---------------------------------------------------------------- 레이어
const layers = {};   // catId → 레이어 객체 (또는 생성 중 Promise)

function selectEntry(e, cat) {
  openEntryPopup(map, e, cat, toLatLng(e.x, e.z));
}

async function ensureLayer(cat) {
  if (!layers[cat.id]) {
    layers[cat.id] = (async () => {
      const rows = await loadAndKeep(cat.id);
      const layer = cat.style === 'label' ? createLabelLayer(map, rows)
        : cat.style === 'lines' ? createRegionsLayer(map, rows)
          : cat.style === 'areas' ? createAreasLayer(map, rows)
            : createCategoryLayer(cat, rows, { isDone: (id) => !!state.progress.done[id], onSelect: selectEntry });
      layer.setFilters({ hideDone: state.settings.hideDone, hidden: state.settings.hiddenSub[cat.id] });
      layer.setScale?.(iconScale);
      layers[cat.id] = layer;
      return layer;
    })();
  }
  return layers[cat.id];
}

const activeLayers = () => CATEGORIES.map((c) => layers[c.id]).filter((l) => l && !(l instanceof Promise) && map.hasLayer(l.group));

// 줌이 낮을 때(전체 보기)는 아이콘을 줄여 지방 이름·지형이 가려지지 않게
const scaleForZoom = (z) => (z <= 2 ? 0.55 : z <= 3 ? 0.75 : 1);
let iconScale = scaleForZoom(map.getZoom());
map.on('zoomend', () => {
  const s = scaleForZoom(map.getZoom());
  if (s === iconScale) return;
  iconScale = s;
  for (const cat of CATEGORIES) {
    const layer = layers[cat.id];
    if (layer && !(layer instanceof Promise)) layer.setScale?.(s);
  }
});

async function refreshVisibility() {
  const z = map.getZoom();
  for (const cat of CATEGORIES) {
    const want = !!state.settings.visible[cat.id] && z >= cat.minZoom;
    if (want) {
      const layer = await ensureLayer(cat);
      if (!map.hasLayer(layer.group)) layer.group.addTo(map);
      layer.refresh?.();
    } else {
      const layer = layers[cat.id];
      if (layer && !(layer instanceof Promise) && map.hasLayer(layer.group)) map.removeLayer(layer.group);
    }
  }
  nearby?.render();
}
map.on('zoomend', refreshVisibility);

function applyFilters() {
  for (const cat of CATEGORIES) {
    const layer = layers[cat.id];
    if (layer && !(layer instanceof Promise)) layer.setFilters({ hideDone: state.settings.hideDone, hidden: state.settings.hiddenSub[cat.id] });
  }
}

on('settings', ({ key }) => {
  if (key === 'visible') refreshVisibility();
  if (key === 'hideDone' || key === 'hiddenSub' || key === '*') { applyFilters(); refreshVisibility(); }
});
on('progress', ({ id, ids, done }) => {
  const list = ids ?? (id ? [id] : []);
  for (const cat of CATEGORIES) {
    const layer = layers[cat.id];
    if (layer && !(layer instanceof Promise)) for (const i of list) layer.setDone(i, done);
  }
});

/** 종류 검색 결과 선택: 레이어·종류를 켜고 가장 가까운 곳으로 이동. only = 그 종류만 표시 */
async function goToKind({ cat, e, entries }, { only } = {}) {
  const rows = (await loadAndKeep(cat.id)) ?? [];
  const hidden = new Set(state.settings.hiddenSub[cat.id] ?? []);
  if (only) for (const r of rows) if (r.name !== e.name) hidden.add(r.name);
  hidden.delete(e.name);
  setSetting('hiddenSub', { ...state.settings.hiddenSub, [cat.id]: [...hidden] });
  if (!state.settings.visible[cat.id]) setSetting('visible', { ...state.settings.visible, [cat.id]: true });
  const from = state.settings.myLocation ?? toGame(map.getCenter());
  let best = null;
  let bestD = Infinity;
  for (const r of entries) { const d = distance(from, r); if (d < bestD) { bestD = d; best = r; } }
  if (best) {
    map.setView(toLatLng(best.x, best.z), Math.max(map.getZoom(), cat.minZoom, 6));
    await ensureLayer(cat);
    selectEntry(best, cat);
  }
  if (isMobile()) panel.close();
}

/** 검색/주변 결과 선택: 레이어를 켜고 이동한 뒤 팝업 */
async function goTo(e, cat) {
  if (!state.settings.visible[cat.id]) setSetting('visible', { ...state.settings.visible, [cat.id]: true });
  const ll = toLatLng(e.x, e.z);
  map.setView(ll, Math.max(map.getZoom(), Math.max(cat.minZoom, 6)));
  if (cat.style === 'label') openHtmlPopup(map, ll, `<div class="pp"><div class="pp-cat muted small">지명</div><div class="pp-name">${esc(e.name)}</div></div>`);
  else selectEntry(e, cat);
  if (isMobile()) panel.close();
}

// ---------------------------------------------------------------- 맵 핀 · 현재 위치
const pins = createPinsLayer(map);
let nearby = null;
const myLocation = createMyLocation(map, { onMove: () => nearby?.render() });

function startAddPin() {
  pins.startAdd((g) => pinsPanel.openEditor({ x: Math.round(g.x), z: Math.round(g.z), title: '', note: '', color: '#ff5252' }));
  if (isMobile()) panel.close();
}

// 지도 플로팅 버튼: 내 위치로 / 전체 지도
new MapButtons({
  position: 'bottomleft',
  onMyLocation() {
    const loc = myLocation.get();
    if (loc) { myLocation.set(loc.x, loc.z, { save: false, pan: true }); return; }
    const c = toGame(map.getCenter());
    myLocation.set(Math.round(c.x), Math.round(c.z));
    myLocation.marker()?.openTooltip();
  },
  onFitAll() { map.fitBounds(MAP_BOUNDS); },
}).addTo(map);

// 길게 누르기(모바일) / 우클릭: 여기에 맵 핀 또는 현재 위치
map.on('contextmenu', (ev) => {
  if (isMobile()) panel.close();
  const g = toGame(ev.latlng);
  openHtmlPopup(map, ev.latlng, `
    <div class="pp">
      <div class="pp-coords muted small">X ${Math.round(g.x)} · Z ${Math.round(g.z)}</div>
      <div class="pp-actions column">
        <button type="button" class="btn" data-action="pin-here" data-x="${g.x}" data-z="${g.z}" data-title="">여기에 맵 핀 추가</button>
        <button type="button" class="btn" data-action="me-here" data-x="${g.x}" data-z="${g.z}">현재 위치를 여기로</button>
      </div>
    </div>`);
});

// ---------------------------------------------------------------- 패널
const [index, dungeons] = await Promise.all([loadIndex(), loadCategory('dungeons'), preloadIcons()]);
await Promise.all(CATEGORIES.filter((c) => c.trackable).map((c) => loadAndKeep(c.id))); // 완료 수 표시용

const layersPanel = createLayersPanel({ section: panel.section('layers'), index, dungeons });
createSearchPanel({ section: panel.section('search'), onPick: goTo, onPickKind: goToKind });
nearby = createNearbyPanel({ section: panel.section('nearby'), map, myLocation, getActiveLayers: activeLayers, onPick: goTo });
const pinsPanel = createPinsPanel({
  section: panel.section('pins'),
  panel,
  onFocusPin: (id) => { pins.focus(id); if (isMobile()) panel.close(); },
  onStartAdd: startAddPin,
});
const settingsPanel = createSettingsPanel({ section: panel.section('settings'), dungeons });

// 다른 기기에서 만든 동기화 링크(#sync=…)로 열렸으면 합칠지 물어본다
if (/^#sync=/.test(initialHash)) {
  try {
    const merged = await settingsPanel.importFromText(initialHash);
    if (merged) { layersPanel.render(); nearby?.render(); }
  } catch (e) {
    alert(`동기화 링크를 읽지 못했습니다: ${e.message}`);
  }
  const { x, z } = toGame(map.getCenter());
  history.replaceState(null, '', `#${map.getZoom()}/${Math.round(x)}/${Math.round(z)}`);
}

// ---------------------------------------------------------------- 팝업 안 버튼/체크박스 (이벤트 위임)
/** 로드된 데이터에서 id 로 항목 찾기 (완료 체크 → 현재 위치 이동용) */
function findEntry(id) {
  for (const cat of CATEGORIES) {
    const rows = getLoaded(cat.id);
    const e = rows?.find((r) => r.id === id);
    if (e) return e;
  }
  return null;
}
/** 완료 체크한 항목(상자면 그 상자가 있는 사당)의 자리로 현재 위치 이동 */
function moveLocationTo(ownerId) {
  if (state.settings.moveOnDone === false) return;
  const e = findEntry(ownerId);
  if (e && Number.isFinite(e.x) && Number.isFinite(e.z)) myLocation.set(e.x, e.z);
}
document.addEventListener('change', (ev) => {
  const id = ev.target?.dataset?.done;
  if (!id) return;
  setDone(id, ev.target.checked);
  if (ev.target.checked) moveLocationTo(ev.target.closest('.chest-list')?.dataset.owner ?? id);
});
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-action]');
  if (!b) return;
  const d = b.dataset;
  switch (d.action) {
    case 'pin-here':
      closePopup(map);
      pinsPanel.openEditor({ x: Math.round(+d.x), z: Math.round(+d.z), title: d.title ?? '', note: '', color: '#ff5252', linkedId: d.linked || undefined });
      break;
    case 'me-here':
      closePopup(map);
      myLocation.set(+d.x, +d.z);
      break;
    case 'edit-pin':
      closePopup(map);
      pinsPanel.editById(d.id);
      break;
    case 'delete-pin':
      if (confirm('이 맵 핀을 삭제할까요?')) { closePopup(map); deletePin(d.id); }
      break;
    case 'chests-all': {
      // 팝업/패널의 상자 목록을 한 번에 체크·해제
      const box = b.closest('.pp-chests');
      const inputs = [...box.querySelectorAll('input[data-done]')];
      const on = d.on === '1';
      setDoneMany(inputs.map((i) => i.dataset.done), on);
      inputs.forEach((i) => { i.checked = on; });
      const sum = box.querySelector('summary .muted');
      if (sum) sum.textContent = `(${on ? inputs.length : 0}/${inputs.length})`;
      if (on) moveLocationTo(box.querySelector('.chest-list')?.dataset.owner);
      break;
    }
    case 'toggle-items': {
      const show = !state.settings.showChestItems;
      setSetting('showChestItems', show);
      b.closest('.pp, details')?.querySelectorAll('.chest-item').forEach((el) => el.classList.toggle('hidden', !show));
      b.textContent = show ? '내용물 숨기기' : '내용물 보기';
      break;
    }
    default:
  }
});

refreshVisibility();
