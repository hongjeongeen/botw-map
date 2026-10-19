import L from 'leaflet';

/**
 * 캔버스에 PNG 아이콘을 그리는 점 마커. CircleMarker 를 확장해 히트 영역·경계 계산은 그대로 쓰고
 * 그리기만 이미지로 바꾼다 (코로그 900개 같은 대량 카테고리용 — DOM 마커보다 가볍다).
 * options: image(HTMLImageElement), iconW, iconH, done
 */
export const IconMarker = L.CircleMarker.extend({
  _updatePath() {
    this._renderer._updateIconMarker(this);
  },
  setDone(done) {
    this.options.done = done;
    this.redraw();
    return this;
  },
});

L.Canvas.include({
  _updateIconMarker(layer) {
    if (!this._drawing || layer._empty()) return;
    const { image: img, iconW: w, iconH: h, done } = layer.options;
    if (!img || !img.complete || !img.naturalWidth) { this._updateCircle(layer); return; } // 이미지 준비 전엔 점
    const ctx = this._ctx;
    const p = layer._point;
    ctx.save();
    if (done) {
      ctx.globalAlpha = 0.4;
      if ('filter' in ctx) ctx.filter = 'grayscale(1)';
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
    }
    ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h);
    ctx.restore();
  },
});
