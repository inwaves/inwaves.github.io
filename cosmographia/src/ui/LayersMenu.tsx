import { useStore } from '../state/store';
import { getEra } from '../models/registry';
import { resolveOptions } from '../models/era';
import type { Layers } from '../render/types';

const LAYER_GROUPS: { title: string; items: { key: keyof Layers; label: string; hint: string }[] }[] = [
  {
    title: 'The machinery',
    items: [
      { key: 'spheres', label: 'Spheres & shells', hint: 'Crystalline spheres, elements, the sphere of stars' },
      { key: 'mechanism', label: 'Mechanism', hint: 'Deferents, epicycles, equants, axes' },
      { key: 'orbits', label: 'Orbits', hint: 'Orbital paths of heliocentric systems' },
    ],
  },
  {
    title: 'Paths & names',
    items: [
      { key: 'trails', label: 'Trails', hint: 'Recent paths: loops in space, retrograde arcs in the sky' },
      { key: 'labels', label: 'Labels', hint: 'Names of bodies, stars and constructions' },
    ],
  },
  {
    title: 'Sky',
    items: [
      { key: 'constellations', label: 'Constellations', hint: 'Figures known in this era' },
      { key: 'grid', label: 'Ecliptic & grid', hint: 'Zodiac, celestial equator, altitude–azimuth grid' },
      { key: 'atmosphere', label: 'Daylight', hint: 'Sky brightens when the Sun is up' },
    ],
  },
  {
    title: 'Compare',
    items: [{ key: 'ghosts', label: 'Modern positions', hint: 'Where the bodies really were (JPL ephemerides)' }],
  },
];

export function LayersMenu() {
  const open = useStore((s) => s.layersOpen);
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const diurnalLock = useStore((s) => s.diurnalLock);
  const setDiurnalLock = useStore((s) => s.setDiurnalLock);
  const trailFrame = useStore((s) => s.trailFrame);
  const setTrailFrame = useStore((s) => s.setTrailFrame);
  const eraId = useStore((s) => s.eraId);
  const optionValues = useStore((s) => s.options[s.eraId]);
  const setOption = useStore((s) => s.setOption);
  if (!open) return null;
  const era = getEra(eraId);
  const options = resolveOptions(era, optionValues);
  return (
    <div className="layers-menu panel-glass" role="dialog" aria-label="Layers and options">
      {era.options.length > 0 && (
        <section>
          <h3>This worldview</h3>
          {era.options.map((opt) => (
            <div key={opt.id} className="option-row" title={opt.description}>
              <span className="option-label">{opt.label}</span>
              <div className="segmented small">
                {opt.choices.map((c) => (
                  <button key={c.value} className={options[opt.id] === c.value ? 'active' : ''} onClick={() => setOption(opt.id, c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
      {LAYER_GROUPS.map((g) => (
        <section key={g.title}>
          <h3>{g.title}</h3>
          {g.items.map((item) => (
            <label key={item.key} className="toggle-row" title={item.hint}>
              <input type="checkbox" checked={layers[item.key]} onChange={() => toggleLayer(item.key)} />
              <span className="toggle-switch" aria-hidden="true" />
              <span>{item.label}</span>
            </label>
          ))}
        </section>
      ))}
      <section>
        <h3>Frame of reference</h3>
        <label className="toggle-row" title="Turn the heavens about the Earth once a day, as the astronomer saw them turn">
          <input type="checkbox" checked={diurnalLock} onChange={() => setDiurnalLock(!diurnalLock)} />
          <span className="toggle-switch" aria-hidden="true" />
          <span>Daily rotation of the heavens</span>
        </label>
        <label className="toggle-row" title="Draw trails relative to the Earth, the frame in which every observation is made">
          <input type="checkbox" checked={trailFrame === 'earth'} onChange={() => setTrailFrame(trailFrame === 'earth' ? 'native' : 'earth')} />
          <span className="toggle-switch" aria-hidden="true" />
          <span>Trails as seen from Earth</span>
        </label>
      </section>
    </div>
  );
}
