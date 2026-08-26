import { body, fixed, EARTH_LOOK, helioPlanet, helioMoon, galileanMoons, LEGIBLE_HELIO } from './common.js';
import { helioPeriodLayout, GALILEO_AU, telescopicSizes } from './layouts.js';
import { helioCamera } from './copernicus.js';

function build(mode) {
  const L = mode === 'period' ? helioPeriodLayout(GALILEO_AU, { sizes: telescopicSizes(GALILEO_AU) }) : LEGIBLE_HELIO;
  const saturn = L.size.saturn;
  return {
    camera: helioCamera(L),
    sky: { radius: L.stars, shell: false },
    markerScale: L.marker,
    bodies: [
      body('sun', { motion: fixed(), size: L.size.sun, texture: 'sun', spin: 25.4 }),
      ...helioPlanet('mercury', { style: 'circle' }, L),
      ...helioPlanet('venus', { style: 'circle' }, L),
      ...helioPlanet('earth', { style: 'circle', body: EARTH_LOOK }, L),
      ...helioMoon({ style: 'circle', body: { texture: 'moon' } }, L),
      ...helioPlanet('mars', { style: 'circle' }, L),
      ...helioPlanet('jupiter', { style: 'circle' }, L),
      ...galileanMoons(L),
      ...helioPlanet('saturn', {
        style: 'circle',
        body: { attachments: [{ dx: 2 * saturn, size: 0.45 * saturn }, { dx: -2 * saturn, size: 0.45 * saturn }], name: 'Saturn ("three-bodied")' },
      }, L),
    ],
  };
}

export default {
  id: 'galileo',
  name: 'Galileo',
  year: 1610,
  era: '1610\u20131613',
  place: 'Padua and Florence \u2014 Sidereus nuncius, Letters on Sunspots',
  epoch: { year: 1610, month: 1, day: 7 },
  defaultSpeed: 0.5,
  diurnal: 'earth',
  build,
  text: {
    tagline: 'The telescope: four moons about Jupiter, the phases of Venus, mountains on the Moon, spots on the Sun.',
    picture: [
      'On 7 January 1610 Galileo saw three, then four, small "stars" beside Jupiter that kept company with it night after night: moons, orbiting a moving planet. Here was a Copernican system in miniature, and an answer to the objection that a moving Earth would leave its Moon behind. He named them the Medicean stars; Kepler called them satellites. In the legible layout their orbits are drawn much enlarged, with their true periods (1.8 to 16.7 days); in the period layout they are to scale.',
      'Venus shows a complete cycle of phases, gibbous when far and small, crescent when near and large, which is impossible in Ptolemy\'s arrangement and required in Copernicus\'s or Tycho\'s. The Moon is mountainous and cratered; the Sun is blemished by spots and turns in about a month; the Milky Way dissolves into countless stars. The heavens are not made of unchanging aether.',
      'Saturn appeared "three-bodied" in 1610 and then, to Galileo\'s alarm, lost its companions in 1612; the ring would wait for Huygens. Galileo\'s own cosmos was Copernican with plain circles (shown here); he never adopted Kepler\'s ellipses.',
    ],
    changes: [
      'New evidence rather than new geometry. None of it proves the Earth moves, but all of it destroys the Aristotelian heaven and makes the Copernican picture feel natural.',
      'The celestial/terrestrial divide collapses: the Moon is a world, Jupiter has its own moons, the Sun is imperfect.',
      'The cost: the condemnation of 1616 and the trial of 1633. Kuhn\'s theme is that the conflict was about the whole world-view, not a diagram.',
    ],
    lookFor: [
      'Follow Jupiter: Io, Europa, Ganymede and Callisto circle it at the rates Galileo timed. Before this stage no model contains them.',
      'Follow Venus and let time run: it waxes from crescent to gibbous as it rounds the far side of the Sun.',
      'Follow the Moon to see its craters, and the Sun to see the spots carried round by its rotation; Saturn carries Galileo\'s two mysterious "ears".',
    ],
    scale: 'Galileo used a Sun distance of 1,208 Earth radii (Dialogue, Third Day), so the period layout is a Copernican cosmos at Ptolemy\'s old scale, the Moon at 60 Earth radii. The telescope fixed the planets\' apparent diameters but not their distances, so at his scale Jupiter comes out about half an Earth radius across and the Sun 5.6; the satellites orbit at their true distances in Jupiter radii (Io 5.9, Callisto 26). The stars, for which he had no distance, are drawn well beyond Saturn.',
    kuhn: 'Chapter 6: the telescope and the Sidereus nuncius; Chapter 7: the conflict with the Church and the transformation of the world-view.',
  },
};
