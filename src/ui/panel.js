// 사이드바(데스크톱) / 바텀시트(모바일) 공통 탭 제어 + 모바일 스와이프
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

export function initPanel() {
  const panel = document.getElementById('panel');
  const handle = panel.querySelector('.handle');
  const tabsEl = panel.querySelector('.tabs');
  const tabs = [...tabsEl.querySelectorAll('button')];
  const sections = [...panel.querySelectorAll(':scope > section')];
  const bar = document.getElementById('bar');
  const barButtons = [...bar.querySelectorAll('button[data-open]')];

  let suppressClick = false; // 끌다 놓은 직후의 click 무시

  function show(tab) {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    sections.forEach((s) => s.classList.toggle('active', s.dataset.tab === tab));
    barButtons.forEach((b) => b.classList.toggle('active', b.dataset.open === tab));
    panel.classList.add('open');
  }
  function close() {
    panel.classList.remove('open', 'tall');
    barButtons.forEach((b) => b.classList.remove('active'));
  }
  const current = () => tabs.find((b) => b.classList.contains('active'))?.dataset.tab;

  tabs.forEach((b) => b.addEventListener('click', () => { if (!suppressClick) show(b.dataset.tab); }));
  barButtons.forEach((b) => b.addEventListener('click', () => {
    if (suppressClick) return;
    if (panel.classList.contains('open') && current() === b.dataset.open) close();
    else show(b.dataset.open);
  }));
  handle.addEventListener('click', () => { if (!suppressClick) close(); });

  // ---- 모바일: 손잡이·탭 영역을 끌어서 닫기/펼치기 (포인터 이벤트, 시트가 손가락을 따라옴) ----
  let drag = null;
  function onDown(e) {
    if (!isMobile() || !panel.classList.contains('open')) return;
    drag = { startY: e.clientY, moved: false };
    panel.style.transition = 'none';
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 6) drag.moved = true;
    // 아래로는 그대로 따라오고, 위로는 살짝만 (저항감)
    panel.style.transform = `translateY(${dy > 0 ? dy : Math.max(dy, -80) * 0.35}px)`;
  }
  function onUp(e) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const { moved } = drag;
    drag = null;
    panel.style.transition = '';
    if (dy > 70) {
      if (panel.classList.contains('tall')) panel.classList.remove('tall');
      else close();
    } else if (dy < -40) {
      panel.classList.add('tall');
    }
    // 인라인 transform 을 다음 프레임에 지워야 현재 위치에서 목표 위치로 부드럽게 이동한다
    requestAnimationFrame(() => { panel.style.transform = ''; });
    if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 350); }
  }
  for (const g of [handle, tabsEl]) {
    g.addEventListener('pointerdown', onDown);
    g.addEventListener('pointermove', onMove);
    g.addEventListener('pointerup', onUp);
    g.addEventListener('pointercancel', onUp);
  }

  // 하단 바를 위로 쓸어 올리면 시트 열기
  let barDrag = null;
  bar.addEventListener('pointerdown', (e) => {
    barDrag = { startY: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId); // 바 밖에서 손을 떼도 pointerup 을 받기 위해
  });
  bar.addEventListener('pointerup', (e) => {
    if (!barDrag) return;
    const dy = e.clientY - barDrag.startY;
    barDrag = null;
    if (dy < -40) {
      show(current() ?? 'layers');
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 350);
    }
  });
  bar.addEventListener('pointercancel', () => { barDrag = null; });

  return {
    show,
    close,
    current,
    isOpen: () => panel.classList.contains('open'),
    section: (tab) => panel.querySelector(`section[data-tab="${tab}"]`),
  };
}
