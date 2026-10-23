import L from 'leaflet';
import { toLatLng } from './crs.js';

/**
 * 점 구름 레이어: 수천 개 항목을 Leaflet 레이어 하나로 캔버스에 직접 그린다.
 * 항목마다 L.CircleMarker 를 만들면 줌/이동 때마다 전부 재투영돼 느려지므로,
 * 줌 0 기준 픽셀 좌표를 한 번만 계산해 두고 그릴 때 2^zoom 배율만 곱한다. 화면 안의 점만 그린다.
 * options.spriteFor(i) → { canvas, w, h } (미리 구운 스프라이트), options.hitRadius (클릭 반경 px)
 */
export const PointCloud = L.Path.extend({
  options: { interactive: true, bubblingMouseEvents: false, weight: 0, hitRadius: 12 },

  initialize(entries, options) {
    L.Util.setOptions(this, options);
    this._entries = entries;
    const n = entries.length;
    this._x0 = new Float64Array(n);
    this._y0 = new Float64Array(n);
    this._show = new Uint8Array(n).fill(1);
    this._drawn = [];      // 마지막 전체 그리기에서 화면에 그린 항목 번호 (클릭 판정용)
    this._hit = -1;
    this._lastScale = 1;
    this._lastOrigin = null;
    this._crsReady = false;
  },

  onAdd(map) {
    if (!this._crsReady) {
      const crs = map.options.crs;
      for (let i = 0; i < this._entries.length; i++) {
        const p = crs.latLngToPoint(toLatLng(this._entries[i].x, this._entries[i].z), 0);
        this._x0[i] = p.x;
        this._y0[i] = p.y;
      }
      this._crsReady = true;
    }
    L.Path.prototype.onAdd.call(this, map);
  },

  // 항상 그리기 대상이 되도록 넉넉한 픽셀 경계
  _project() { this._pxBounds = new L.Bounds([-1e6, -1e6], [1e6, 1e6]); },
  _update() { if (this._map) this._updatePath(); },
  _updatePath() { this._renderer._drawPointCloud(this); },

  /** 전체 다시 그리기 요청 */
  redraw() {
    const r = this._renderer;
    if (this._map && r) {
      r._redrawBounds = null;
      r._redrawRequest = r._redrawRequest || L.Util.requestAnimFrame(r._redraw, r);
    }
    return this;
  },

  /** 표시 여부 갱신: fn(entry, i) → boolean. 숨긴 점은 다시 그리기 전에도 바로 클릭 대상에서 뺀다 */
  setShow(fn) {
    for (let i = 0; i < this._entries.length; i++) this._show[i] = fn(this._entries[i], i) ? 1 : 0;
    this._drawn = this._drawn.filter((i) => this._show[i]);
    return this.redraw();
  },

  onRemove(map) {
    this._drawn = [];
    this._hit = -1;
    L.Path.prototype.onRemove.call(this, map);
  },

  visibleEntries() {
    const out = [];
    for (let i = 0; i < this._entries.length; i++) if (this._show[i]) out.push(this._entries[i]);
    return out;
  },

  /** 클릭/호버 판정: 마지막에 그린 점 중 가장 가까운 것 */
  _containsPoint(p) {
    const o = this._lastOrigin;
    if (!o || !this._map) { this._hit = -1; return false; } // 지도에서 빠진 레이어는 클릭 대상이 아님
    const s = this._lastScale;
    const tol = (this._renderer?.options.tolerance || 0) + this.options.hitRadius;
    let best = -1;
    let bestD = tol * tol;
    for (const i of this._drawn) {
      if (!this._show[i]) continue;
      const dx = this._x0[i] * s - o.x - p.x;
      const dy = this._y0[i] * s - o.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    this._hit = best;
    return best >= 0;
  },

  hitEntry() { return this._hit >= 0 ? this._entries[this._hit] : null; },
});

L.Canvas.include({
  _drawPointCloud(layer) {
    if (!this._drawing) return;
    const map = this._map;
    const ctx = this._ctx;
    const full = !this._redrawBounds;
    const vb = this._redrawBounds || this._bounds;
    const s = map.options.crs.scale(map.getZoom());
    const o = map.getPixelOrigin();
    const pad = 40;
    const { _x0: x0, _y0: y0, _show: show } = layer;
    const spriteFor = layer.options.spriteFor;
    if (full) { layer._drawn.length = 0; layer._lastScale = s; layer._lastOrigin = o; }
    for (let i = 0; i < x0.length; i++) {
      if (!show[i]) continue;
      const lx = x0[i] * s - o.x;
      const ly = y0[i] * s - o.y;
      if (lx < vb.min.x - pad || lx > vb.max.x + pad || ly < vb.min.y - pad || ly > vb.max.y + pad) continue;
      const sp = spriteFor(i);
      ctx.drawImage(sp.canvas, Math.round(lx - sp.w / 2), Math.round(ly - sp.h / 2), sp.w, sp.h);
      if (full) layer._drawn.push(i);
    }
  },
});
