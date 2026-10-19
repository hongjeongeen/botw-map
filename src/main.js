import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';
import { createMap } from './map/map.js';
import { toLatLng, toGame } from './map/crs.js';
import { CATEGORIES, CAT_BY_ID } from './data/categories.js';
import { loadAndKeep, loadIndex, loadCategory } from './data/loader.js';
import { state, setSetting, setDone, on, deletePin } from './state/store.js';
import { createCategoryLayer } from './map/layers.js';
import { createLabelLayer } from './map/labels.js';
import { openEntryPopup, openHtmlPopup, closePopup } from './map/popup.js';
import { createPinsLayer } from './map/pins.js';
import { createMyLocation } from './map/myLocation.js';
import { initPanel } from './ui/panel.js';
import { createLayersPanel } from './ui/layersPanel.js';
import { createSearchPanel } from './ui/search.js';
import { createNearbyPanel } from './ui/nearbyPanel.js';
import { createPinsPanel } from './ui/pinsPanel.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { esc, isMobile } from './util.js';

// ---------------------------------------------------------------- 지도
// URL 해시 #<줌>/<X>/<Z> 로 현재 위치를 공유·복원 (예: #7/-560/1694 = 시작의 탑)
function parseHash() {
  const m = location.hash.match(/^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
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

// ---------------------------------------------------------------- 레이어
const layers = {};   // catId → 레이어 객체 (또는 생성 중 Promise)

function selectEntry(e, cat) {
  openEntryPopup(map, e, cat, toLatLng(e.x, e.z));
}

async function ensureLayer(cat) {
  if (!layers[cat.id]) {
    layers[cat.id] = (async () => {
      const rows = await loadAndKeep(cat.id);
      const layer = cat.style === 'label'
        ? createLabelLayer(map, rows)
        : createCategoryLayer(cat, rows, { isDone: (id) => !!state.progress.done[id], onSelect: selectEntry });
      layer.setFilters({ hideDone: state.settings.hideDone, hidden: state.settings.hiddenSub[cat.id] });
      layers[cat.id] = layer;
      return layer;
    })();
  }
  return layers[cat.id];
}

const activeLayers = () => CATEGORIES.map((c) => layers[c.id]).filter((l) => l && !(l instanceof Promise) && map.hasLayer(l.group));

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
on('progress', ({ id, done }) => {
  if (!id) return;
  for (const cat of CATEGORIES) {
    const layer = layers[cat.id];
    if (layer && !(layer instanceof Promise)) layer.setDone(id, done);
  }
});

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
document.getElementById('add-pin').addEventListener('click', () => (pins.isAdding() ? pins.stopAdd() : startAddPin()));

// 길게 누르기(모바일) / 우클릭: 여기에 맵 핀 또는 현재 위치
map.on('contextmenu', (ev) => {
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
const [index, dungeons] = await Promise.all([loadIndex(), loadCategory('dungeons')]);
await Promise.all(CATEGORIES.filter((c) => c.trackable).map((c) => loadAndKeep(c.id))); // 완료 수 표시용

const layersPanel = createLayersPanel({ section: panel.section('layers'), index, dungeons });
createSearchPanel({ section: panel.section('search'), onPick: goTo });
nearby = createNearbyPanel({ section: panel.section('nearby'), map, myLocation, getActiveLayers: activeLayers, onPick: goTo });
const pinsPanel = createPinsPanel({
  section: panel.section('pins'),
  panel,
  onFocusPin: (id) => { pins.focus(id); if (isMobile()) panel.close(); },
  onStartAdd: startAddPin,
});
createSettingsPanel({ section: panel.section('settings') });

// ---------------------------------------------------------------- 팝업 안 버튼/체크박스 (이벤트 위임)
document.addEventListener('change', (ev) => {
  const id = ev.target?.dataset?.done;
  if (id) setDone(id, ev.target.checked);
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
