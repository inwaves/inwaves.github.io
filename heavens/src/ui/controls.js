export const TOGGLES = [
  { id: 'guides', label: 'Orbit guides', def: true },
  { id: 'mechanism', label: 'Mechanism', hint: 'centres, equants, epicycle arms. White: centre of a deferent; magenta: equant; cyan: empty focus. Follow a body to label its own. Hidden in the view from Earth.', def: true },
  { id: 'spheres', label: 'Crystalline spheres and shells', def: true },
  { id: 'trails', label: 'Trails', def: true },
  { id: 'labels', label: 'Labels', def: true },
  { id: 'stars', label: 'Stars', def: true },
  { id: 'lines', label: 'Constellation figures', def: true },
  { id: 'names', label: 'Constellation names', def: false },
  { id: 'ecliptic', label: 'Ecliptic, zodiac band, equator of date', def: true },
  { id: 'signs', label: 'Signs of the zodiac', hint: 'counted from the equinox of date, so they drift against the constellations', def: false },
  { id: 'diurnal', label: 'Daily rotation of the heavens', hint: 'turns when the clock runs at 0.5 days/s or slower; faster than that the sky is shown at the same sidereal time each day', def: true },
];

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function checkboxRow(tg, checked, onChange) {
  const row = h('div', 'row');
  const input = h('input');
  input.type = 'checkbox';
  input.id = `flag-${tg.id}`;
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(tg.id, input.checked));
  const label = h('label');
  label.htmlFor = input.id;
  label.textContent = tg.label;
  if (tg.hint) label.appendChild(h('small', null, tg.hint));
  row.append(input, label);
  return { row, input };
}

function segmented(options, value, onChange) {
  const seg = h('div', 'seg');
  const buttons = options.map(([val, text]) => {
    const b = h('button', val === value ? 'active' : '', text);
    b.addEventListener('click', () => onChange(val));
    seg.appendChild(b);
    return [val, b];
  });
  return {
    el: seg,
    set(v) { buttons.forEach(([val, b]) => b.classList.toggle('active', val === v)); },
  };
}

export function buildControls(container, cb) {
  container.innerHTML = '';

  // --- view
  container.appendChild(h('h3', null, 'View'));
  const view = segmented([['orbit', "God's-eye view"], ['earth', 'From the Earth']], 'orbit', cb.onView);
  container.appendChild(view.el);

  const followRow = h('div', 'row');
  const followLabel = h('label', null, 'Follow');
  const followSelect = h('select');
  followSelect.addEventListener('change', () => cb.onFollow(followSelect.value || null));
  followRow.append(followLabel, followSelect);
  container.appendChild(followRow);

  const reset = h('button', 'btn', 'Reset camera (R)');
  reset.addEventListener('click', cb.onResetCamera);
  container.appendChild(reset);
  container.appendChild(h('div', 'hint', 'Drag to orbit or look around, wheel to zoom, click a body to follow it.'));

  // --- proportions
  container.appendChild(h('h3', null, 'Proportions'));
  const proportions = segmented([['legible', 'Legible'], ['period', 'As conceived']], 'legible', cb.onProportions);
  container.appendChild(proportions.el);
  container.appendChild(h('div', 'hint', 'Legible: distances compressed and bodies enlarged. As conceived: the sizes and distances each period actually held, in Earth radii; the bodies become specks, so follow one or zoom in.'));

  // --- trails frame
  container.appendChild(h('h3', null, 'Trail frame'));
  const frame = segmented([['center', 'Model centre'], ['earth', 'Relative to Earth']], 'center', cb.onFrame);
  container.appendChild(frame.el);
  container.appendChild(h('div', 'hint', 'Trails drawn relative to the Earth show what an observer there would have had to explain.'));

  // --- display
  container.appendChild(h('h3', null, 'Display'));
  const inputs = new Map();
  for (const tg of TOGGLES) {
    const { row, input } = checkboxRow(tg, tg.def, cb.onFlag);
    inputs.set(tg.id, input);
    container.appendChild(row);
  }

  // --- model specific
  const modelHead = h('h3', null, 'This worldview');
  const modelBox = h('div');
  container.append(modelHead, modelBox);

  return {
    setModel(model, bodies, flags) {
      followSelect.innerHTML = '';
      const none = h('option', null, '\u2014 none \u2014');
      none.value = '';
      followSelect.appendChild(none);
      for (const b of bodies) {
        const o = h('option', null, b.name);
        o.value = b.id;
        followSelect.appendChild(o);
      }
      modelBox.innerHTML = '';
      const toggles = model.extras?.toggles || [];
      modelHead.style.display = toggles.length ? '' : 'none';
      for (const tg of toggles) {
        const { row } = checkboxRow(tg, flags[tg.id], cb.onFlag);
        modelBox.appendChild(row);
      }
    },
    setView(mode) {
      view.set(mode);
      followLabel.textContent = mode === 'earth' ? 'Point at' : 'Follow';
    },
    setFollow(id) { followSelect.value = id || ''; },
    setFrame(f) { frame.set(f); },
    setProportions(p) { proportions.set(p); },
    setFlag(id, v) { const i = inputs.get(id); if (i) i.checked = !!v; },
  };
}
