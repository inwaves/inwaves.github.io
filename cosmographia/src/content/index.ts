import type { ContentRegistry, EraContent } from './types';
import type { EraId } from './eraIds';
import { anaximanderContent } from './eras/anaximander';
import { philolausContent } from './eras/philolaus';
import { eudoxusContent } from './eras/eudoxus';
import { aristotleContent } from './eras/aristotle';
import { aristarchusContent } from './eras/aristarchus';
import { hipparchusContent } from './eras/hipparchus';
import { ptolemyContent } from './eras/ptolemy';
import { medievalContent } from './eras/medieval';
import { copernicusContent } from './eras/copernicus';
import { tychoContent } from './eras/tycho';
import { galileoContent } from './eras/galileo';
import { keplerContent } from './eras/kepler';
import { newtonContent } from './eras/newton';

export const CONTENT: ContentRegistry = {
  anaximander: anaximanderContent,
  philolaus: philolausContent,
  eudoxus: eudoxusContent,
  aristotle: aristotleContent,
  aristarchus: aristarchusContent,
  hipparchus: hipparchusContent,
  ptolemy: ptolemyContent,
  medieval: medievalContent,
  copernicus: copernicusContent,
  tycho: tychoContent,
  galileo: galileoContent,
  kepler: keplerContent,
  newton: newtonContent,
};

export function contentFor(id: EraId): EraContent | undefined {
  return CONTENT[id];
}
