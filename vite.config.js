import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 저장소 이름과 동일해야 함 → https://<사용자명>.github.io/botw-map/
  base: '/botw-map/',
  // 같은 Wi-Fi의 폰/태블릿에서 http://<PC-IP>:5180/botw-map/ 로 접속 가능
  // (5173은 다른 프로젝트와 겹칠 수 있어 5180 사용)
  server: { host: true, port: 5180 },
});
