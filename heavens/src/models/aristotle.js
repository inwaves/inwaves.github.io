import { elementShells } from './common.js';
import { eudoxanSystem } from './eudoxus.js';

function build(mode) {
  const s = eudoxanSystem(mode);
  return {
    camera: s.camera,
    sky: { radius: s.stars, shell: true },
    markerScale: s.markerScale,
    shells: [
      ...elementShells(s.earthSize),
      { radius: s.stars * 1.07, color: 0xcad6ff, opacity: 0.05, name: 'Prime Mover (unmoved)', wire: true },
    ],
    bodies: s.bodies,
  };
}

export default {
  id: 'aristotle',
  name: 'Aristotle',
  year: -340,
  era: 'c. 340 BCE',
  place: 'Athens, the Lyceum',
  epoch: { year: -339, month: 1, day: 1 },
  defaultSpeed: 3,
  diurnal: 'cosmos',
  build,
  text: {
    tagline: 'The sphere-universe becomes a physics: a finite, full, purposeful cosmos with the Earth at the centre because that is where earth belongs.',
    picture: [
      'Below the Moon the four elements, earth, water, air and fire, seek their natural places in concentric shells (shown here). This is the realm of change, decay and straight-line motion. Above the Moon is the fifth element, aether, which moves only in eternal uniform circles; the heavens are perfect and unchanging.',
      'The spheres of Eudoxus and Callippus are made physical and mechanically connected. Between one planet\'s set and the next Aristotle inserts "unrolling" spheres that cancel the motions of the set above, so that each planet receives only its own motions: fifty-five spheres in all, driven from the outermost sphere of the fixed stars by the Unmoved Mover, whom the spheres imitate out of love.',
      'There is no void, no other world, and nothing outside the last sphere, not even empty space. The universe is finite, yet it has no "beyond". The order here follows Aristotle\'s and Plato\'s: Moon, Sun, Venus, Mercury, Mars, Jupiter, Saturn.',
    ],
    changes: [
      'Astronomy, physics and theology become one package. The Earth\'s central place now follows from the theory of motion: heavy bodies fall toward the centre, so the Earth must be there.',
      'This interlocking system, not merely an astronomical diagram, is what Copernicus would have to break, and why his innovation was a revolution rather than a technical adjustment.',
      'The qualitative picture satisfied philosophers for two thousand years even after astronomers had abandoned homocentric spheres for epicycles.',
    ],
    lookFor: [
      'The element shells around the Earth, and the faint outer shell of the Prime Mover beyond the stars.',
      'Because Venus rides on a sphere outside the Sun\'s here, it would always appear nearly full from Earth. Follow Venus to see it lit: no one could check this before the telescope.',
      'The mechanism is still Eudoxan; Aristotle added physics, not accuracy.',
    ],
    scale: 'Aristotle gives no planetary distances, though he reports the mathematicians\' estimate of the Earth\'s circumference (400,000 stades) and insists the Earth is small compared with the heavens. The period layout therefore uses the same Timaeus proportions as the Eudoxus stage, with the element shells scaled to the Earth.',
    kuhn: 'Chapter 3, "The Two-Sphere Universe in Aristotelian Thought": the plenum, natural place, the unchanging heavens, and the immense authority this synthesis acquired.',
  },
};
