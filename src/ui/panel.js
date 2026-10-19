// 사이드바(데스크톱) / 바텀시트(모바일) 공통 탭 제어
export function initPanel() {
  const panel = document.getElementById('panel');
  const tabs = [...panel.querySelectorAll('.tabs button')];
  const sections = [...panel.querySelectorAll(':scope > section')];
  const barButtons = [...document.querySelectorAll('#bar button[data-open]')];

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

  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  barButtons.forEach((b) => b.addEventListener('click', () => {
    if (panel.classList.contains('open') && current() === b.dataset.open) close();
    else show(b.dataset.open);
  }));
  panel.querySelector('.handle').addEventListener('click', close);

  // 모바일: 손잡이·탭 영역을 아래로 쓸면 닫고, 위로 쓸면 더 크게 펼친다
  let startY = null;
  for (const grab of [panel.querySelector('.handle'), panel.querySelector('.tabs')]) {
    grab.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    grab.addEventListener('touchend', (e) => {
      if (startY == null) return;
      const dy = e.changedTouches[0].clientY - startY;
      startY = null;
      if (dy > 50) close();
      else if (dy < -50) panel.classList.add('tall');
    });
  }

  return {
    show,
    close,
    current,
    isOpen: () => panel.classList.contains('open'),
    section: (tab) => panel.querySelector(`section[data-tab="${tab}"]`),
  };
}
