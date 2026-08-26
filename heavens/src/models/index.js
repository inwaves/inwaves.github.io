import anaximander from './anaximander.js';
import philolaus from './philolaus.js';
import twoSphere from './two-sphere.js';
import eudoxus from './eudoxus.js';
import aristotle from './aristotle.js';
import hipparchus from './hipparchus.js';
import ptolemy from './ptolemy.js';
import medieval from './medieval.js';
import maragha from './maragha.js';
import copernicus from './copernicus.js';
import tycho from './tycho.js';
import kepler from './kepler.js';
import galileo from './galileo.js';
import newton from './newton.js';
import leverrier from './leverrier.js';
import today from './today.js';

/** Chronological progression of worldviews. */
export const MODELS = [
  anaximander, philolaus, twoSphere, eudoxus, aristotle, hipparchus, ptolemy,
  medieval, maragha, copernicus, tycho, kepler, galileo, newton, leverrier, today,
];

export const modelIndexById = (id) => MODELS.findIndex((m) => m.id === id);
