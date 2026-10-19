# 하이랄 지도 — 젤다의 전설 야생의 숨결 개인용 인터랙티브 맵

사당·시커 타워·코로그 열매·마을·대요정의 샘·사진기의 기억·강적·가디언·몬스터·소재 위치를 한 지도에서 보고,
완료한 것을 체크하며 진행도를 기록하는 개인용 지도입니다. 모든 이름은 **스위치 공식 한국어판 텍스트**를 그대로 씁니다.

## 실행

```powershell
npm install
npm run dev
```

- PC: http://localhost:5180/botw-map/
- 같은 Wi-Fi의 폰/태블릿: `http://<PC의 IP>:5180/botw-map/` (처음 접속 시 Windows 방화벽에서 Node 허용)

## 기능

| 탭 | 내용 |
|---|---|
| 레이어 | 카테고리 켜기/끄기, 완료 수(예: 사당 37/136), 종류별 필터(소재·몬스터 등), 완료 항목 숨기기, 던전(신수) 보물 상자 체크 |
| 검색 | 한국어 이름 검색. 가운뎃점·띄어쓰기는 무시 (예: "마오누" → 마·오누의 사당) |
| 주변 | '현재 위치' 마커(초록) 기준으로 켜 둔 레이어의 항목을 가까운 순으로 표시. 마커는 끌어서 옮기거나 지도를 길게 눌러(우클릭) 이동 |
| 핀 | 내 맵 핀 + 메모. 지도를 길게 눌러(우클릭) 추가하거나, 마커 팝업의 "맵 핀 추가" |
| 설정 | 진행도·맵 핀 JSON 백업/복원, 보물 상자 내용물 표시 여부, 초기화 |

- 마커를 누르면 팝업에서 **완료** 체크, 사당 안의 **보물 상자** 개수와 상자별 체크, "내용물 보기"(스포일러 방지로 기본 접힘).
- 대량 카테고리(코로그·강적·몬스터·소재)는 지정 줌 이상에서만 표시됩니다.
- 주소창의 `#줌/X/Z` 해시로 현재 위치를 공유할 수 있습니다. 예: `#7/-560/1694` = 시작의 탑

진행도와 맵 핀은 **브라우저(localStorage)에만** 저장됩니다. 기기를 옮기거나 브라우저 데이터를 지우기 전에 설정 탭에서 JSON으로 내보내세요.

## 데이터 갱신

```powershell
npm run fetch-data   # 원본 다운로드(.cache/raw 캐시) → public/data/*.json 생성, 누락은 .cache/missing-ko.json
npm run lint:ko      # 표시 문자열에 영문/가나가 섞였는지 검사
```

- 지도 타일·좌표: ZeldaMods [objmap](https://objmap.zeldamods.org) · radar API
- 한국어 이름: 게임 메시지 파일(`Msg_KRko`)을 MessageID/액터명으로 조인. 게임에 명칭이 없는 항목(코로그 퍼즐 유형, UI 분류명 등)은 `scripts/ko-overrides.json`에서 관리

## 배포 (GitHub Pages)

1. GitHub에 **Public** 저장소 `botw-map` 생성 (저장소 이름을 바꾸면 `vite.config.js`의 `base`도 같이 수정)
2. `git init -b main`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`
3. 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정
4. 이후 `main`에 push할 때마다 `.github/workflows/deploy.yml`이 빌드·배포 → `https://<사용자명>.github.io/botw-map/`

현재 배포 주소: **https://hongjeongeen.github.io/botw-map/** (폰에서 홈 화면에 추가해 두면 세컨드 스크린으로 쓰기 편합니다)

## 주의

지도 타일과 게임 데이터는 닌텐도의 자산이며, 이 프로젝트는 개인 용도입니다. 타일은 objmap 서버에서 바로 불러오며(핫링크) 저장소에 포함하지 않습니다.
