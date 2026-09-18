/**
 * The application: state, the animation loop, and the interface around the stage.
 *
 * State is one plain object. The interface writes to it and calls `refresh` for
 * whatever it changed; the loop reads it every frame. There is no framework,
 * because there is little interface and the frame loop must stay cheap.
 *
 * The URL fragment can preset the state, e.g.
 *   #era=ptolemy&body=mars&view=sky&paused=1
 * which makes any configuration linkable and lets it be inspected repeatably.
 */
import { formatDate } from '../core/time.js';
import { BODIES, ERAS, ERA_IDS, getEra } from '../data/eras.js';
import { ROLE_NAMES } from '../render/guides.js';
import { DIURNAL_SPEED_LIMIT, Stage } from '../render/stage.js';
import { clear, h } from './dom.js';

const MIN_SPEED = 1 / 24;
const MAX_SPEED = 730;
const SLIDER_STEPS = 1000;

const UNIT_NAMES = { au: 'au', 'earth-radii': 'Earth radii', 'earth-diameters': 'Earth diameters', schematic: null };

const sliderToSpeed = (v) => Math.exp(Math.log(MIN_SPEED) + (v / SLIDER_STEPS) * (Math.log(MAX_SPEED) - Math.log(MIN_SPEED)));
const speedToSlider = (s) => Math.round(((Math.log(s) - Math.log(MIN_SPEED)) / (Math.log(MAX_SPEED) - Math.log(MIN_SPEED))) * SLIDER_STEPS);

function formatSpeed(daysPerSecond) {
  if (daysPerSecond < 1) return `${(daysPerSecond * 24).toFixed(daysPerSecond * 24 < 10 ? 1 : 0)} hours per second`;
  if (daysPerSecond < 365) return `${daysPerSecond.toFixed(daysPerSecond < 10 ? 1 : 0)} days per second`;
  return `${(daysPerSecond / 365.25).toFixed(1)} years per second`;
}

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  back: 'M18 5v14L8 12zM6 5h2v14H6z',
  forward: 'M6 5v14l10-7zM16 5h2v14h-2z',
  reverse: 'M11 5L4 12l7 7v-4h9V9h-9z',
  reset: 'M12 5a7 7 0 1 0 6.3 4H16l3.5-4 3 4.3h-2A9 9 0 1 1 12 3z',
};

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name]);
  svg.appendChild(path);
  return svg;
}

/** Reads presets from the URL fragment. Unknown or malformed values are ignored. */
function readFragment() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const number = (key) => (params.has(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : null);
  return {
    era: ERA_IDS.includes(params.get('era')) ? params.get('era') : null,
    view: ['cosmos', 'sky'].includes(params.get('view')) ? params.get('view') : null,
    body: params.get('body') && BODIES[params.get('body')] ? params.get('body') : null,
    jd: number('jd'),
    speed: number('speed'),
    fov: number('fov'),
    paused: params.get('paused') === '1',
    panels: params.get('panels') !== '0',
    zoom: params.get('zoom') === '1',
    camera: params.get('cam')?.split(',').map(Number).filter(Number.isFinite) ?? null,
    on: (params.get('on') ?? '').split(',').filter(Boolean),
    off: (params.get('off') ?? '').split(',').filter(Boolean),
  };
}

export function createApp() {
  const preset = readFragment();
  const firstEra = getEra(preset.era ?? ERA_IDS[0]);

  const state = {
    eraId: firstEra.id,
    jd: preset.jd ?? firstEra.defaultJd,
    playing: !preset.paused,
    /** Magnitude of the playback rate, simulated days per second. */
    rate: preset.speed ?? firstEra.defaultSpeed,
    reverse: false,
    /** Signed rate, as the stage wants it. */
    get speed() {
      return this.reverse ? -this.rate : this.rate;
    },
    view: 'cosmos',
    selected: null,
    lockDate: false,
    toggles: {
      machinery: true,
      shells: true,
      trails: true,
      labels: true,
      constellations: false,
      circles: true,
      diurnal: false,
      lineOfSight: false,
      anachronisticTelescope: false,
      track: true,
    },
  };
  for (const key of preset.on) if (key in state.toggles) state.toggles[key] = true;
  for (const key of preset.off) if (key in state.toggles) state.toggles[key] = false;

  const el = {
    viewport: document.getElementById('viewport'),
    eraList: document.getElementById('era-list'),
    info: document.getElementById('info'),
    tools: document.getElementById('tools'),
    transport: document.getElementById('transport'),
  };
  if (!preset.panels) document.body.classList.add('no-panels');

  const stage = new Stage(el.viewport, {
    onSelect: (id) => select(id),
    // Turning the view by hand means the user wants to look elsewhere.
    onUserLook: () => {
      if (state.toggles.track) {
        state.toggles.track = false;
        renderTools();
      }
    },
  });

  const era = () => getEra(state.eraId);

  // ---------------------------------------------------------------- actions

  function setEra(id, { keepDate = state.lockDate } = {}) {
    const next = getEra(id);
    state.eraId = id;
    if (!keepDate) state.jd = next.defaultJd;
    state.rate = next.defaultSpeed;
    stage.setEra(next);
    // Keep the selection only if the body exists in the new worldview.
    const bodies = stage.model.state(state.jd, { guides: false }).bodies;
    if (state.selected && !bodies[state.selected]) state.selected = null;
    if (next.features.telescope) state.toggles.anachronisticTelescope = false;
    history.replaceState(null, '', `#era=${id}`);
    renderTimeline();
    renderInfo();
    renderTools();
    renderTransport();
  }

  function select(id) {
    state.selected = id === state.selected ? null : id;
    if (state.selected && state.view === 'sky') state.toggles.track = true;
    renderTools();
  }

  function setView(view) {
    state.view = view;
    stage.setView(view);
    renderTools();
  }

  function stepEra(delta) {
    const index = ERA_IDS.indexOf(state.eraId) + delta;
    if (index >= 0 && index < ERA_IDS.length) setEra(ERA_IDS[index]);
  }

  // --------------------------------------------------------------- timeline

  function renderTimeline() {
    clear(el.eraList);
    for (const item of ERAS) {
      const active = item.id === state.eraId;
      const button = h(
        'button',
        { type: 'button', class: `era${active ? ' active' : ''}`, 'aria-current': active ? 'true' : null, onclick: () => setEra(item.id) },
        h('span', { class: 'era-date' }, item.dateLabel),
        h('span', { class: 'era-title' }, item.title),
      );
      el.eraList.appendChild(button);
      if (active) button.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    document.getElementById('era-prev').disabled = state.eraId === ERA_IDS[0];
    document.getElementById('era-next').disabled = state.eraId === ERA_IDS.at(-1);
  }

  // ------------------------------------------------------------------- info

  function list(title, items) {
    return h('section', null, h('h3', null, title), h('ul', null, ...items.map((text) => h('li', null, text))));
  }

  function sphereTally() {
    const t = stage.model.sphereTally;
    if (!t) return null;
    const lines = [`${t.carrying} carrying spheres${t.counteracting ? ` and ${t.counteracting} counteracting spheres` : ', and one for the fixed stars'}: ${t.total} in all.`];
    if (t.counteracting) {
      lines.push(`${t.drawnCounteracting} of the counteracting spheres are drawn, on the same axes as the spheres they undo. Select a planet to see them.`);
      lines.push(`${t.notModelled.callippusCarrying} spheres added by Callippus, and the ${t.notModelled.counteracting} counteracting spheres paired with them, are counted but not drawn: what they did is not preserved.`);
    }
    return h('section', { class: 'tally' }, h('h3', null, 'Counting the spheres'), ...lines.map((text) => h('p', null, text)));
  }

  function renderInfo() {
    const e = era();
    clear(el.info);
    el.info.append(
      h('p', { class: 'kicker' }, `${e.dateLabel} \u00b7 ${e.place}`),
      h('h1', null, e.title),
      h('h2', null, e.subtitle),
      h('p', { class: 'lede' }, e.lede),
      ...e.paragraphs.map((text) => h('p', null, text)),
    );
    const tally = sphereTally();
    if (tally) el.info.appendChild(tally);
    el.info.append(
      list('What it achieved', e.achieved),
      list('Where it strained', e.troubles),
      list('Things to try', e.lookFor),
      h(
        'details',
        null,
        h('summary', null, 'How faithful is this picture?'),
        h('p', null, e.fidelity),
        h(
          'p',
          { class: 'fine' },
          'Every parameter, and where it came from, is set out in the ',
          h('a', { href: './SOURCES.txt', target: '_blank', rel: 'noopener' }, 'provenance notes'),
          '. The star catalogue and the libraries are credited in the ',
          h('a', { href: './THIRD_PARTY_NOTICES.txt', target: '_blank', rel: 'noopener' }, 'third-party notices'),
          '.',
        ),
      ),
    );
    el.info.scrollTop = 0;
  }

  // ------------------------------------------------------------------ tools

  function checkbox(key, label, { hint = null, disabled = false } = {}) {
    const input = h('input', {
      type: 'checkbox',
      checked: state.toggles[key] ? '' : null,
      disabled: disabled ? '' : null,
      onchange: (event) => {
        state.toggles[key] = event.target.checked;
        renderTools();
      },
    });
    return h('label', { class: `check${disabled ? ' disabled' : ''}` }, input, h('span', null, label, hint ? h('small', null, hint) : null));
  }

  function bodyIds() {
    const present = Object.keys(stage.model.state(state.jd, { guides: false }).bodies);
    const ordered = stage.model.bodyOrder.filter((id) => present.includes(id));
    // The central body and anything the order omits, then satellites and the comet.
    const rest = present.filter((id) => !ordered.includes(id));
    return [...ordered, ...rest];
  }

  let readoutNode = null;
  let legendNode = null;

  function renderTools() {
    const e = era();
    const model = stage.model;
    const sky = state.view === 'sky';
    clear(el.tools);

    el.tools.appendChild(
      h(
        'div',
        { class: 'segmented', role: 'group', 'aria-label': 'Viewpoint' },
        h('button', { type: 'button', class: sky ? '' : 'active', onclick: () => setView('cosmos') }, 'The cosmos'),
        h('button', { type: 'button', class: sky ? 'active' : '', onclick: () => setView('sky') }, 'The sky from Earth'),
      ),
    );
    el.tools.appendChild(
      h('p', { class: 'hint' }, sky ? 'Drag to look around. Scroll or pinch to magnify, as a telescope does.' : 'Drag to orbit, scroll to zoom. Click a body to select it.'),
    );

    const chips = h('div', { class: 'chips' });
    for (const id of bodyIds()) {
      // From the Earth there is no Earth to look at, except Anaximander's drum beneath our feet.
      if (sky && id === 'earth') continue;
      chips.appendChild(
        h(
          'button',
          { type: 'button', class: `chip${state.selected === id ? ' active' : ''}`, style: `--body-color:${BODIES[id].color}`, onclick: () => select(id) },
          h('i', null),
          BODIES[id].name,
        ),
      );
    }
    el.tools.append(h('h3', null, 'Bodies'), chips);

    const actions = h('div', { class: 'actions' });
    if (!sky) {
      actions.appendChild(h('button', { type: 'button', onclick: () => stage.resetCamera() }, 'Whole cosmos'));
      if (state.selected) actions.appendChild(h('button', { type: 'button', onclick: () => stage.zoomToSelected(state.selected) }, `Zoom to ${BODIES[state.selected].name}`));
    }
    el.tools.appendChild(actions);

    readoutNode = h('div', { class: 'readout' });
    legendNode = h('div', { class: 'legend' });
    el.tools.append(readoutNode, legendNode);

    const hasShells = model.id === 'ptolemy' || model.id === 'hipparchus' || model.id === 'aristotle';
    const frozen = state.playing && state.rate > DIURNAL_SPEED_LIMIT;
    const toggles = h('div', { class: 'toggles' });
    toggles.append(h('h3', null, 'Show'));
    if (!sky) toggles.appendChild(checkbox('machinery', 'The machinery', { hint: 'circles, spheres and axes' }));
    if (sky && model.earthShape === 'drum') toggles.appendChild(checkbox('machinery', 'The wheels of fire', { hint: 'rims of mist; the Sun and Moon are holes in them' }));
    if (!sky && hasShells) toggles.appendChild(checkbox('shells', model.id === 'aristotle' ? 'Solid shells, cut away' : 'Extent of each shell'));
    toggles.appendChild(checkbox('trails', sky ? 'Paths across the sky' : 'Trails'));
    toggles.appendChild(checkbox('labels', 'Names'));
    toggles.appendChild(checkbox('constellations', 'Constellation figures'));
    if (model.skyFrame === 'ecliptic' && stage.circlesMeaningful(sky)) toggles.appendChild(checkbox('circles', 'Ecliptic and equator'));
    if (!sky && state.selected && state.selected !== 'earth') {
      toggles.appendChild(checkbox('lineOfSight', 'Line of sight from Earth', { hint: 'and the path it traces on the sky' }));
    }
    if (sky && state.selected) toggles.appendChild(checkbox('track', `Keep ${BODIES[state.selected].name} in view`));

    if (model.diurnal !== 'intrinsic' && !sky) {
      const what = model.diurnal === 'earth' ? 'Daily rotation of the Earth' : 'Daily rotation of the heavens';
      toggles.appendChild(checkbox('diurnal', what, { hint: frozen ? 'held still at this speed; slow down to see it' : null }));
    }
    if (model.diurnal === 'intrinsic' && frozen) {
      toggles.appendChild(h('p', { class: 'hint' }, 'At this speed the daily turning is held still and the Sun kept at noon, so the seasons can be seen.'));
    }
    if (!e.features.telescope && model.earthShape !== 'drum') {
      toggles.appendChild(checkbox('anachronisticTelescope', 'Point a telescope at it anyway', { hint: 'an anachronism: shows the phases this arrangement would produce' }));
    }
    el.tools.appendChild(toggles);

    el.tools.appendChild(
      h(
        'label',
        { class: 'check' },
        h('input', { type: 'checkbox', checked: state.lockDate ? '' : null, onchange: (event) => { state.lockDate = event.target.checked; } }),
        h('span', null, 'Lock date when changing worldview', h('small', null, 'to compare two models on the same night')),
      ),
    );
    updateReadout();
  }

  const degrees = (v, places = 1) => `${v.toFixed(places)}\u00b0`;

  /** The selected body's observed position, refreshed a few times a second. */
  function updateReadout() {
    if (!readoutNode) return;
    clear(readoutNode);
    clear(legendNode);
    const id = state.selected;
    if (!id) {
      readoutNode.appendChild(h('p', { class: 'hint' }, 'Select a body to see where it stands in the sky and the machinery that carries it.'));
      return;
    }
    const r = stage.readout(state.jd, id);
    const rows = [];
    if (r && r.frame === 'horizon') {
      rows.push(['Altitude', degrees(r.altitude)], ['Azimuth', degrees(r.azimuth)], ['State', r.altitude > 0 ? 'above the Earth\'s face' : 'beneath the Earth']);
    } else if (r) {
      rows.push(['Longitude', degrees(r.longitude)], ['Latitude', degrees(r.latitude)]);
      if (r.elongation !== undefined) rows.push(['From the Sun', `${degrees(Math.abs(r.elongation))} ${r.elongation >= 0 ? 'east' : 'west'}`]);
      if (id !== 'sun' && id !== 'moon') rows.push(['Motion', r.retrograde ? 'retrograde' : 'direct']);
    }
    if (r && UNIT_NAMES[r.units]) rows.push(['Distance', `${r.distance < 10 ? r.distance.toFixed(3) : r.distance.toFixed(0)} ${UNIT_NAMES[r.units]}`]);
    if (r && r.units === 'schematic') rows.push(['Distance', 'never changes in this model']);

    readoutNode.append(
      h('h3', { style: `--body-color:${BODIES[id].color}` }, BODIES[id].name, id === 'earth' ? '' : ', as seen from Earth'),
      h('dl', null, ...rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', { class: v === 'retrograde' ? 'retrograde' : '' }, v)])),
    );

    const roles = state.view === 'cosmos' && state.toggles.machinery ? stage.legend(id) : [];
    if (roles.length) {
      legendNode.append(h('h3', null, 'Its machinery'), h('ul', null, ...roles.map((role) => h('li', null, ROLE_NAMES[role]))));
    }
  }

  // -------------------------------------------------------------- transport

  let dateNode = null;
  let speedNode = null;
  let playButton = null;

  function renderTransport() {
    clear(el.transport);
    const stepDays = () => Math.max(1 / 24, state.rate * 0.1);
    const button = (name, label, onclick, extra = '') => h('button', { type: 'button', class: `icon-button ${extra}`, 'aria-label': label, title: label, onclick }, icon(name));

    playButton = button(state.playing ? 'pause' : 'play', state.playing ? 'Pause' : 'Play', () => {
      state.playing = !state.playing;
      renderTransport();
      renderTools();
    }, 'primary');

    dateNode = h('output', { class: 'date' });
    speedNode = h('output', { class: 'speed' }, formatSpeed(state.rate));
    const slider = h('input', {
      type: 'range',
      min: '0',
      max: String(SLIDER_STEPS),
      value: String(speedToSlider(Math.min(MAX_SPEED, Math.max(MIN_SPEED, state.rate)))),
      'aria-label': 'Speed of time',
      oninput: (event) => {
        const wasFrozen = state.rate > DIURNAL_SPEED_LIMIT;
        state.rate = sliderToSpeed(Number(event.target.value));
        speedNode.textContent = formatSpeed(state.rate);
        if (wasFrozen !== state.rate > DIURNAL_SPEED_LIMIT) renderTools();
      },
    });

    el.transport.append(
      button('reset', `Return to ${era().dateLabel}`, () => { state.jd = era().defaultJd; }),
      button('reverse', state.reverse ? 'Time runs backwards; click to run forwards' : 'Run time backwards', () => { state.reverse = !state.reverse; renderTransport(); }, state.reverse ? 'active' : ''),
      button('back', 'Step back', () => { state.jd -= stepDays(); }),
      playButton,
      button('forward', 'Step forward', () => { state.jd += stepDays(); }),
      h('div', { class: 'speed-block' }, slider, speedNode),
      dateNode,
    );
  }

  // ------------------------------------------------------------------- wiring

  document.getElementById('era-prev').addEventListener('click', () => stepEra(-1));
  document.getElementById('era-next').addEventListener('click', () => stepEra(1));

  for (const [buttonId, panelId] of [['toggle-info', 'info'], ['toggle-tools', 'tools']]) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);
    // On a narrow screen the panels would cover the sky, so they start closed.
    if (window.matchMedia('(max-width: 900px)').matches) {
      panel.classList.add('collapsed');
      button.setAttribute('aria-expanded', 'false');
    }
    button.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  window.addEventListener('resize', () => stage.resize());
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.code === 'Space') {
      event.preventDefault();
      state.playing = !state.playing;
      renderTransport();
      renderTools();
    } else if (event.key === '[') stepEra(-1);
    else if (event.key === ']') stepEra(1);
    else if (event.key === 'v') setView(state.view === 'sky' ? 'cosmos' : 'sky');
    else if (event.key === 'Escape') select(state.selected);
  });

  // --------------------------------------------------------------------- start

  setEra(firstEra.id, { keepDate: preset.jd !== null });
  if (preset.speed !== null) state.rate = preset.speed;
  if (preset.body && stage.model.state(state.jd, { guides: false }).bodies[preset.body]) state.selected = preset.body;
  if (preset.view === 'sky') setView('sky');
  if (preset.camera?.length === 3) stage.setCosmosCamera(...preset.camera);
  if (preset.fov !== null) stage.skyControls.setFov(preset.fov);
  renderTools();
  renderTransport();

  let last = performance.now();
  let sinceReadout = 0;
  let pendingZoom = preset.zoom && state.selected !== null;
  function tick(now) {
    // Clamp the step so a backgrounded tab does not leap forward on return.
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.playing) state.jd += state.speed * dt;
    stage.frame(state);
    if (pendingZoom) {
      // A close-up needs the first frame's state to know what to frame.
      pendingZoom = false;
      stage.zoomToSelected(state.selected);
    }

    dateNode.textContent = formatDate(state.jd, { withTime: state.rate < 2 });
    sinceReadout += dt;
    if (sinceReadout > 0.2) {
      sinceReadout = 0;
      updateReadout();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return { state, stage };
}
