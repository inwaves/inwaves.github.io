import type { EraContent } from '../types';

export const newtonContent: EraContent = {
  headline:
    'One force for heaven and Earth: gravitation, weakening as the square of the distance, holds the Moon to the Earth and the planets to the Sun, in a universe of countless suns filling infinite space.',
  overview: [
    'In the Philosophiae Naturalis Principia Mathematica (1687) Isaac Newton derived Kepler’s laws from three laws of motion and a single attraction between every pair of bodies. The force that makes an apple fall makes the Moon fall around the Earth — 3,600 times weaker at 60 Earth radii. The same mathematics gives the ellipses of the planets, the parabolas of comets, the tides and the precession of the equinoxes.',
    'The cosmos of spheres was gone. After Bruno, Digges and Descartes the stars were suns scattered through space without limit. Huygens had shown that Saturn wears a thin flat ring and has a moon, Cassini had found four more, and Halley would use Newton’s theory to show that the comets of 1531, 1607 and 1682 were one body returning. Kuhn ends his account here: the Copernican Revolution was completed by a new physics, not by astronomy alone.',
  ],
  mechanism: [
    {
      title: 'Universal gravitation',
      text: 'Every body attracts every other with a force proportional to the product of their masses and inversely proportional to the square of the distance between them.',
    },
    {
      title: 'Orbits as falling',
      text: 'A projectile thrown fast enough around the Earth would never land. The Moon is such a projectile, and so is every planet around the Sun.',
    },
    {
      title: 'Conic sections',
      text: 'Under an inverse-square force every path is a conic: an ellipse, a parabola or a hyperbola. Comets on long ellipses or near-parabolas obey the same law as the planets.',
    },
    {
      title: 'Perturbations',
      text: 'Because the planets attract one another, the ellipses are only nearly exact: over the centuries Jupiter and Saturn pull each other ahead and behind.',
    },
  ],
  explained: [
    'Kepler’s three laws, derived rather than assumed',
    'The tides, the precession of the equinoxes and the flattening of the Earth',
    'The paths of comets, and their returns',
    'Why the planets move at all: one physics for Earth and heavens',
  ],
  problems: [
    'Action at a distance with no mechanism: “I frame no hypotheses”',
    'Newton could not prove the solar system stable and suspected it needed correcting from time to time',
    'The distances of the stars remained unknown until stellar parallax was measured in 1838',
  ],
  kuhn: 'Chapter 7, “The New Universe”.',
  sources: [
    'I. Newton, The Principia, trans. I. B. Cohen and A. Janiszewski (1999), Book III',
    'A. Koyré, From the Closed World to the Infinite Universe (1957)',
    'E. Halley, A Synopsis of the Astronomy of Comets (1705)',
  ],
  modelNotes: [
    'Planetary orbits are Keplerian ellipses from JPL’s elements, including the long-period Jupiter–Saturn terms: Newtonian motion as a modern ephemeris computes it.',
    'Saturn’s ring and the five moons known by 1687 (Titan, Iapetus, Rhea, Tethys, Dione) are drawn, with the ring plane set by Saturn’s modern pole.',
    'Comets: the Great Comet of 1680 (nearly parabolic, perihelion 0.006 AU) and Halley’s Comet on its 1682 passage, with modern orbital elements.',
    'The stars are scattered in depth to suggest an infinite universe; their directions remain the catalogue positions.',
  ],
  tryThis: [
    'Choose “The Great Comet, December 1680” and follow the comet as it whips around the Sun.',
    'Select Saturn and zoom in on the ring and the moons Huygens and Cassini found.',
    'Switch “Lines of attraction” off and on under Layers: the Sun holds every planet, and the Earth holds the Moon.',
  ],
};
