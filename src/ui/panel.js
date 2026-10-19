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
    panel.classList.remove('open');
    barButtons.forEach((b) => b.classList.remove('active'));
  }
  const current = () => tabs.find((b) => b.classList.contains('active'))?.dataset.tab;

  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  barButtons.forEach((b) => b.addEventListener('click', () => {
    if (panel.classList.contains('open') && current() === b.dataset.open) close();
    else show(b.dataset.open);
  }));
  panel.querySelector('.handle').addEventListener('click', close);

  return {
    show,
    close,
    current,
    isOpen: () => panel.classList.contains('open'),
    section: (tab) => panel.querySelector(`section[data-tab="${tab}"]`),
  };
}
