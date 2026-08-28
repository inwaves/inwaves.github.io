const fmt = (v) => {
  if (v >= 365.25) return `${(v / 365.25).toFixed(v / 365.25 < 10 ? 1 : 0)} yr/s`;
  if (v >= 10) return `${Math.round(v)} days/s`;
  if (v >= 1) return `${v.toFixed(1)} days/s`;
  if (v >= 0.1) return `${v.toFixed(2)} day/s`;
  return `${(v * 24).toFixed(1)} h/s`;
};

export function buildTopbar(root, { onPlay, onSpeed, onEpoch, onTogglePanel, onHelp }) {
  const btnPlay = root.querySelector('#btn-play');
  const dateEl = root.querySelector('#date');
  const speed = root.querySelector('#speed');
  const readout = root.querySelector('#speed-readout');
  const btnEpoch = root.querySelector('#btn-epoch');

  btnPlay.addEventListener('click', onPlay);
  speed.addEventListener('input', () => onSpeed(10 ** Number.parseFloat(speed.value)));
  btnEpoch.addEventListener('click', onEpoch);
  root.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => onTogglePanel(b.dataset.panel, b)));
  root.querySelector('#btn-help').addEventListener('click', onHelp);

  return {
    setDate(s) { dateEl.textContent = s; },
    setPaused(p) { btnPlay.textContent = p ? 'Play' : 'Pause'; },
    setSpeed(v, { slider = true } = {}) {
      if (slider) speed.value = String(Math.log10(v));
      readout.textContent = fmt(v);
    },
    setPanelState(name, open) {
      const b = root.querySelector(`[data-panel="${name}"]`);
      if (b) b.classList.toggle('active', open);
    },
  };
}
