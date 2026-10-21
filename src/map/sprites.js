import L from 'leaflet';

// 캔버스에 반복해서 그릴 스프라이트를 미리 구워 둔다 (그림자·회색 처리를 매번 계산하지 않도록).
// Leaflet 캔버스는 레티나에서 2배 해상도를 쓰므로 같은 배율로 굽는다.
const cache = new Map();
const ratio = () => (L.Browser.retina ? 2 : 1);

function make(w, h, draw) {
  const r = ratio();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * r);
  canvas.height = Math.ceil(h * r);
  const g = canvas.getContext('2d');
  g.scale(r, r);
  draw(g);
  return { canvas, w, h };
}

/** 아이콘 스프라이트 (그림자 포함, done 이면 회색·반투명). w,h = 표시 크기(px) */
export function iconSprite(key, img, w, h, done) {
  const k = `i|${key}|${w}x${h}|${done ? 1 : 0}|${ratio()}`;
  let s = cache.get(k);
  if (!s) {
    const pad = 4;
    s = make(w + pad * 2, h + pad * 2, (g) => {
      if (done) {
        g.globalAlpha = 0.4;
        if ('filter' in g) g.filter = 'grayscale(1)';
      } else {
        g.shadowColor = 'rgba(0,0,0,0.75)';
        g.shadowBlur = 3;
        g.shadowOffsetY = 1;
      }
      g.drawImage(img, pad, pad, w, h);
    });
    cache.set(k, s);
  }
  return s;
}

/** 점 스프라이트. big 이면 흰 테두리(온천·요정 등 소수 항목용) */
export function dotSprite(color, radius, done, big = false) {
  const k = `d|${color}|${radius}|${done ? 1 : 0}|${big ? 1 : 0}|${ratio()}`;
  let s = cache.get(k);
  if (!s) {
    const lw = big ? 2 : 1;
    const size = radius * 2 + lw * 2 + 2;
    s = make(size, size, (g) => {
      g.beginPath();
      g.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
      g.fillStyle = done ? '#8d8d8d' : color;
      g.globalAlpha = done ? 0.35 : 0.95;
      g.fill();
      g.globalAlpha = 1;
      g.lineWidth = lw;
      g.strokeStyle = big ? '#ffffff' : '#141414';
      g.stroke();
    });
    cache.set(k, s);
  }
  return s;
}
