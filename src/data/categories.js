// 카테고리 메타. label 은 화면에 그대로 표시되므로 공식 한국어 용어만 쓴다.
// style: 'icon' = DOM 아이콘 마커(소수 랜드마크), 'dot' = 캔버스 점 마커(대량), 'label' = 지명 텍스트
// minZoom: 이 줌 이상에서만 표시 (대량 카테고리는 확대했을 때만)
// subtypes: 종류별 켜기/끄기에 쓰는 필드명
export const CATEGORIES = [
  { id: 'labels',    label: '지명',          style: 'label', color: '#e8d9a8', trackable: false, searchable: true,  minZoom: 1, defaultOn: true },
  { id: 'regions',   label: '지역 경계선',   style: 'lines', color: '#f3e3a0', trackable: false, searchable: false, minZoom: 1, defaultOn: true },
  { id: 'climate',   label: '기후 구역',     style: 'areas', color: '#ffeb3b', trackable: false, searchable: false, minZoom: 1, defaultOn: true,
    legend: [['#42a5f5', '추위'], ['#ffeb3b', '더위(사막 · 밤엔 추위)'], ['#ff5252', '화산(불 피해)']] },
  { id: 'towers',    label: '시커 타워',     style: 'icon',  color: '#4fc3f7', trackable: true,  searchable: true,  minZoom: 1, defaultOn: true },
  { id: 'shrines',   label: '사당',          style: 'icon',  color: '#ffa726', trackable: true,  searchable: true,  minZoom: 1, defaultOn: true },
  { id: 'places',    label: '마을·시설',     style: 'icon',  color: '#9ccc65', trackable: false, searchable: true,  minZoom: 1, defaultOn: true,  subtypes: 'kind' },
  { id: 'fountains', label: '대요정의 샘',   style: 'icon',  color: '#f48fb1', trackable: true,  searchable: true,  minZoom: 1, defaultOn: true },
  { id: 'memories',  label: '사진기의 기억', style: 'icon',  color: '#ce93d8', trackable: true,  searchable: true,  minZoom: 1, defaultOn: true },
  { id: 'statues',   label: '여신상',        style: 'icon',  color: '#ffe082', trackable: false, searchable: true,  minZoom: 1, defaultOn: true },
  // 아래 셋은 제공된 PNG 아이콘이 없어 색 동그라미로 표시 (dotRadius 로 크기)
  { id: 'hotsprings', label: '온천',         style: 'dot',   color: '#4dd0e1', trackable: false, searchable: true,  minZoom: 1, defaultOn: false, dotRadius: 8 },
  { id: 'dragons',   label: '드래곤 출현 지점', style: 'dot', color: '#9ccc65', trackable: false, searchable: true, minZoom: 1, defaultOn: false, dotRadius: 8,
    legend: [['#ff7043', '올드래곤'], ['#9ccc65', '필로드래곤'], ['#64b5f6', '넬드래곤']] },
  { id: 'fairies',   label: '요정',          style: 'dot',   color: '#ff8fd8', trackable: false, searchable: false, minZoom: 3, defaultOn: false, dotRadius: 6 },
  { id: 'koroks',    label: '코로그 열매',   style: 'dot',   color: '#e6d64a', trackable: true,  searchable: false, minZoom: 4, defaultOn: false },
  { id: 'chests',    label: '보물 상자',     style: 'dot',   color: '#ffd54f', trackable: true,  searchable: false, minZoom: 4, defaultOn: false, subtypes: 'name' },
  { id: 'ores',      label: '광석',          style: 'dot',   color: '#cfd8dc', trackable: false, searchable: false, minZoom: 5, defaultOn: false, subtypes: 'name', dotRadius: 6,
    legend: [['#cfd8dc', '광석'], ['#ffd54f', '희귀 광석'], ['#64b5f6', '야광석']] },
  { id: 'bosses',    label: '강적',          style: 'dot',   color: '#ef5350', trackable: true,  searchable: false, minZoom: 3, defaultOn: false, subtypes: 'name' },
  { id: 'guardians', label: '가디언',        style: 'dot',   color: '#ff8a65', trackable: false, searchable: false, minZoom: 3, defaultOn: false, subtypes: 'name' },
  { id: 'enemies',   label: '몬스터',        style: 'dot',   color: '#ab47bc', trackable: false, searchable: false, minZoom: 5, defaultOn: false, subtypes: 'name' },
  { id: 'materials', label: '소재',          style: 'dot',   color: '#66bb6a', trackable: false, searchable: false, minZoom: 5, defaultOn: false, subtypes: 'name' },
];

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// 마을·시설의 종류(kind) → public/icons 아이콘 키
export const PLACE_ICON = {
  '마을': 'village', '마구간': 'stable', '하이랄 성': 'settlement', '주요 장소': 'settlement', '고대 연구소': 'lab',
  '방어구점': 'armor', '염색숍': 'dye', '보석점': 'jewelry', '여관': 'inn', '만물상': 'store',
};
