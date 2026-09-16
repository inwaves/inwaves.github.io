import { Vector3 } from 'three';
import { formatDegMin, formatZodiacal, lonLatOf, RAD } from '../astro/math';
import { formatCalendarDate, formatClock, localCalendarDate } from '../astro/time';
import { geocentric } from '../astro/ephemeris';
import type { EraDefinition } from '../models/era';
import type { Mechanism } from '../models/mechanism';
import type { TimeContext } from '../models/types';

export interface BodyReadout {
  id: string;
  name: string;
  kind: string;
  role: string;
  longitude: string;
  latitude: string;
  distance: string;
  /** modern (real) position and the model's error, when a modern counterpart exists */
  realLongitude?: string;
  errorDeg?: number;
  elongationDeg?: number;
  /** illuminated fraction 0..1 as the worldview's geometry implies */
  illuminated?: number;
}

export interface ClockReadout {
  jd: number;
  date: string;
  time: string;
  calendar: 'Julian' | 'Gregorian';
  place: string;
  year: number;
}

const v = new Vector3();
const w = new Vector3();

function formatDistance(value: number, unitLabel: string): string {
  const unit = unitLabel.split(' (')[0];
  if (value >= 1000) return `${Math.round(value).toLocaleString('en-GB')} ${unit}`;
  if (value >= 10) return `${value.toFixed(1)} ${unit}`;
  return `${value.toFixed(3)} ${unit}`;
}

/** How a body appears from the worldview's observer, and how far that is from reality. */
export function bodyReadout(m: Mechanism, bodyId: string, t: TimeContext): BodyReadout | null {
  const model = m.model;
  const def = model.bodies.find((b) => b.id === bodyId);
  if (!def) return null;
  const observer = m.node(model.observerNode).worldPos;
  const body = m.node(def.node).worldPos;
  const rel = v.copy(body).sub(observer);
  const isObserver = def.id === model.earthBody || rel.lengthSq() < 1e-18;
  const readout: BodyReadout = {
    id: def.id,
    name: def.name,
    kind: def.kind,
    role: def.role,
    longitude: '\u2014',
    latitude: '\u2014',
    distance: '\u2014',
  };
  if (isObserver) return readout;
  const ll = lonLatOf(rel);
  readout.longitude = formatZodiacal(ll.lon);
  readout.latitude = formatDegMin(ll.lat);
  readout.distance = formatDistance(ll.r, model.unitLabel);
  if (def.truth) {
    const truth = geocentric(def.truth, t.jd, w);
    readout.realLongitude = formatZodiacal(lonLatOf(truth).lon);
    readout.errorDeg = rel.angleTo(truth) * RAD;
  }
  if (model.sunNode && def.kind !== 'sun') {
    const sun = m.node(model.sunNode).worldPos;
    const toSun = w.copy(sun).sub(observer);
    readout.elongationDeg = rel.angleTo(toSun) * RAD;
    if (def.appearance.phases) {
      const bodyToSun = w.copy(sun).sub(body);
      const bodyToObserver = new Vector3().copy(observer).sub(body);
      const phaseAngle = bodyToSun.angleTo(bodyToObserver);
      readout.illuminated = (1 + Math.cos(phaseAngle)) / 2;
    }
  }
  return readout;
}

export function clockReadout(era: EraDefinition, t: TimeContext): ClockReadout {
  const d = localCalendarDate(t.ut, era.location.lon, era.location.reformJd);
  return {
    jd: t.jd,
    date: formatCalendarDate(d),
    time: formatClock(d),
    calendar: d.gregorian ? 'Gregorian' : 'Julian',
    place: era.location.name,
    year: d.year,
  };
}
