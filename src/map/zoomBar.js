import L from 'leaflet';

/** 세로 줌 바: + / 단계 눈금(현재 줌 표시, 클릭하면 이동) / − */
export const ZoomBar = L.Control.extend({
  options: { position: 'bottomright' },

  onAdd(map) {
    const el = L.DomUtil.create('div', 'zoombar');
    el.innerHTML = '<button type="button" class="zb-btn" data-d="1" title="확대" aria-label="확대">+</button><div class="zb-track"></div><button type="button" class="zb-btn" data-d="-1" title="축소" aria-label="축소">−</button>';
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    const track = el.querySelector('.zb-track');
    const min = map.getMinZoom();
    const max = map.getMaxZoom();
    for (let z = max; z >= min; z--) {
      const t = L.DomUtil.create('button', 'zb-tick', track);
      t.type = 'button';
      t.dataset.z = z;
      t.title = `줌 ${z}`;
    }
    const update = () => {
      const z = Math.round(map.getZoom());
      for (const t of track.children) {
        const tz = +t.dataset.z;
        t.classList.toggle('on', tz <= z);
        t.classList.toggle('cur', tz === z);
        t.textContent = tz === z ? String(z) : '';
      }
      el.querySelector('[data-d="1"]').disabled = z >= max;
      el.querySelector('[data-d="-1"]').disabled = z <= min;
    };
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('.zb-btn');
      if (b) { map.setZoom(Math.round(map.getZoom()) + Number(b.dataset.d)); return; }
      const t = ev.target.closest('.zb-tick');
      if (t) map.setZoom(+t.dataset.z);
    });
    map.on('zoomend zoomlevelschange', update);
    update();
    this._update = update;
    return el;
  },

  onRemove(map) {
    map.off('zoomend zoomlevelschange', this._update);
  },
});
