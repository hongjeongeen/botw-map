import L from 'leaflet';
import { toLatLng, toGame } from './crs.js';
import { ICONS } from './icons.js';
import { state, setSetting } from '../state/store.js';

const meIcon = L.divIcon({ className: 'mk mk-me', html: ICONS.me, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });

/** 드래그 가능한 '현재 위치' 마커 (게임 맵에 좌표가 없으므로 직접 옮긴다) */
export function createMyLocation(map, { onMove } = {}) {
  let marker = null;

  function set(x, z, { save = true, pan = false } = {}) {
    const ll = toLatLng(x, z);
    if (!marker) {
      marker = L.marker(ll, { draggable: true, icon: meIcon, zIndexOffset: 1000, title: '현재 위치' })
        .bindTooltip('현재 위치 (끌어서 이동)', { direction: 'top', offset: [0, -12] })
        .addTo(map);
      marker.on('dragend', () => {
        const g = toGame(marker.getLatLng());
        setSetting('myLocation', { x: Math.round(g.x), z: Math.round(g.z) });
        onMove?.(state.settings.myLocation);
      });
    } else {
      marker.setLatLng(ll);
    }
    if (save) setSetting('myLocation', { x: Math.round(x), z: Math.round(z) });
    if (pan) map.panTo(ll);
    onMove?.({ x, z });
  }

  function clear() {
    if (marker) { map.removeLayer(marker); marker = null; }
    setSetting('myLocation', null);
    onMove?.(null);
  }

  if (state.settings.myLocation) set(state.settings.myLocation.x, state.settings.myLocation.z, { save: false });

  return { set, clear, get: () => state.settings.myLocation, marker: () => marker };
}
