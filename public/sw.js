// 홈 화면 앱용 서비스 워커. 같은 주소의 파일(앱 셸·데이터·아이콘)만 "네트워크 우선, 실패 시 캐시"로 다룬다.
// 온라인이면 항상 최신 배포본을 받고, 오프라인이면 마지막으로 받은 앱과 데이터로 연다. 지도 타일(외부 서버)은 건드리지 않는다.
const CACHE = 'botw-map-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await cache.match(new URL(self.registration.scope).pathname);
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
