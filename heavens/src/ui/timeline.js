export function buildTimeline(container, models, onSelect) {
  container.innerHTML = '';
  let current = 0;

  const arrow = (text, delta, title) => {
    const b = document.createElement('button');
    b.className = 'icon-btn arrow';
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', () => onSelect(Math.min(models.length - 1, Math.max(0, current + delta))));
    return b;
  };

  const track = document.createElement('div');
  track.className = 'track';
  const buttons = models.map((m, i) => {
    const b = document.createElement('button');
    b.className = 'stage';
    b.title = m.name;
    const yr = document.createElement('span');
    yr.className = 'yr';
    yr.textContent = m.era;
    const dot = document.createElement('span');
    dot.className = 'dot';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = m.shortName || m.name;
    b.append(yr, dot, nm);
    b.addEventListener('click', () => onSelect(i));
    track.appendChild(b);
    return b;
  });

  container.append(arrow('\u2039', -1, 'Previous worldview (\u2190)'), track, arrow('\u203a', 1, 'Next worldview (\u2192)'));

  return {
    setActive(i) {
      current = i;
      buttons.forEach((b, k) => b.classList.toggle('active', k === i));
      buttons[i]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    },
  };
}
