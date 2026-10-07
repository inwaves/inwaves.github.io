# Sources and provenance of model parameters

Every numerical parameter used by the simulation is listed here with where it came
from. Values fall into three classes, and the class is stated for each:

- **Sourced**: read from a cited source during development.
- **Reconstruction**: a modern scholarly reconstruction; no ancient value survives.
- **Illustrative**: chosen for the visualisation because no value, ancient or
  reconstructed, could be verified. These make no historical claim.

Sexagesimal numbers are written `a;b,c` meaning a + b/60 + c/3600.

## 1. Ptolemy, Almagest (c. 150 CE) -- Sourced

Source: R. H. van Gent, *Almagest Ephemeris Calculator*, Utrecht University,
`https://webspace.science.uu.nl/~gent0113/astro/almagestephemeris.htm`
(constants read from its script `addfiles/almagest.js`, which states that the
mean motions "correspond exactly with Ptolemy's mean motion tables").

All lengths are in units where the deferent radius is 60, as the script stores
them as fractions of the deferent radius (so `0;6,30` means 6;30 parts of 60).

Epoch: era of Nabonassar, Julian day 1448637 + (22 - 0;17,34)/24.

### Sun (eccentric circle, no epicycle, no equant)

| Quantity | Value |
|---|---|
| Mean daily motion | 0;59,8,17,13,12,31 deg/day |
| Mean longitude at epoch | 330;45 deg |
| Longitude of apogee (fixed) | 65;30 deg |
| Eccentricity | 2;30 parts of 60 |
| Obliquity of the ecliptic | 23;51,20 deg |
| Tropical year | 365;14,48 days |

### Moon

| Quantity | Value |
|---|---|
| Mean daily motion in longitude | 13;10,34,58,33,30,30 deg/day |
| Mean daily motion in anomaly | 13;3,53,56,17,51,59 deg/day |
| Mean daily motion in argument of latitude | 13;13,45,39,48,56,37 deg/day |
| Mean daily motion in elongation | 12;11,26,41,20,17,59 deg/day |
| Mean longitude at epoch | 41;22 deg |
| Mean anomaly at epoch | 268;49 deg |
| Argument of latitude at epoch | 354;15 deg |
| Mean elongation at epoch | 70;37 deg |
| Epicycle radius | 6;20 parts of 60 |
| Eccentricity | 12;29 parts of 60 |
| Inclination | 5;0 deg |
| Synodic month | 29;31,50,8,20 days |

Note on normalisation: the Almagest text gives the lunar deferent as 49;41,
eccentricity 10;19 and epicycle 5;15 (sum 60). Rescaling to a deferent of 60
multiplies by 60/49;41. The epicycle becomes 6;20,24, matching the script's
6;20. The eccentricity becomes 12;27,32, which rounds to 12;28, whereas the
script carries 12;29. The two differ by about one minute of a part (roughly
0.1 percent of the eccentricity). The reason for the script's figure was not
established. The simulation uses the script's 12;29, as the value actually
read from the cited source; the difference is far below anything visible.

### Planets (eccentric deferent + epicycle + equant)

The equant lies at twice the eccentricity from Earth, on the apsidal line. The
"double eccentricity" quoted in some references is that Earth-equant distance.

| Planet | Mean motion in longitude (deg/day) | Mean motion in anomaly (deg/day) | Apogee at epoch | Epicycle r | Eccentricity e | Mean longitude at epoch | Mean anomaly at epoch |
|---|---|---|---|---|---|---|---|
| Saturn | 0;2,0,33,31,28,51 | 0;57,7,43,41,43,40 | 224;10 | 6;30 | 3;25 | 296;43 | 34;2 |
| Jupiter | 0;4,59,14,26,46,31 | 0;54,9,2,46,26,0 | 152;9 | 11;30 | 2;45 | 184;41 | 146;4 |
| Mars | 0;31,26,36,53,51,33 | 0;27,41,40,19,20,58 | 106;40 | 39;30 | 6;0 | 3;32 | 327;13 |
| Venus | equals mean Sun | 0;36,59,25,53,11,28 | 46;10 | 43;10 | 1;15 | equals mean Sun | 71;7 |
| Mercury | equals mean Sun | 3;6,24,6,59,35,50 | 181;10 | 22;30 | 3;0 | equals mean Sun | 21;55 |

Apogees precess at 1 degree per 36525 days (Ptolemy's 1 degree per century),
added to the epoch value. This is why references quoting Ptolemy's apogees for
his own time (Saturn 233, Jupiter 161, Mars 115;30, Venus 55, Mercury 190) are
uniformly 8;50 larger than the epoch values above: about 884 years at 1 deg per
century. The two sets agree.

Structural facts confirmed from the same source and used as test invariants:

- For Saturn, Jupiter and Mars, (mean motion in longitude) + (mean motion in
  anomaly) equals the Sun's mean motion, so the epicycle radius vector stays
  parallel to the Earth-mean-Sun line.
- For Venus and Mercury the epicycle centre has the mean Sun's longitude.

Latitude parameters (deg):

| Planet | Deferent inclination | Epicycle inclination(s) | Northern-limit offset |
|---|---|---|---|
| Saturn | 2;30 | 4;30 | 50 |
| Jupiter | 1;30 | 2;30 | 340 |
| Mars | 1;0 | 2;15 | 0 |
| Venus | 0;10 | 2;30, 3;30 | -- |
| Mercury | 0;45 | 6;15, 7;0 | -- |

The last column is the constant the script names `node`, but it is not a node
longitude. The script forms the argument of latitude as (true eccentric
anomaly + this value) and takes the latitude proportional to its cosine, so the
northern limit of the deferent lies at longitude (apogee - value): 50 degrees
before the apogee for Saturn, 20 degrees after it for Jupiter (340 = -20), and
at the apogee for Mars. The ascending node is 90 degrees before the northern
limit. The Moon's argument of latitude is likewise counted from the northern
limit (its latitude is 5 deg times the cosine of the argument).

### Absolute distances (Planetary Hypotheses nesting)

The Almagest fixes each model only up to scale. The same script carries the
deferent radii in Earth radii from Ptolemy's *Planetary Hypotheses*, where each
planet's shell is packed directly against the next -- **Sourced**:

| Body | Deferent radius (Earth radii) |
|---|---|
| Mercury | 115 |
| Venus | 622.5 |
| Sun | 1210 |
| Mars | 5040 |
| Jupiter | 11503.5 |
| Saturn | 17026 |

The script gives no such figure for the Moon. The simulation scales the lunar
model so that the epicycle centre stands 59 Earth radii away at syzygy, the
figure usually quoted from Almagest V.13. That figure was recalled, not
re-verified during development -- **Illustrative** until checked.

These distances span a factor of several hundred, so the inner spheres are
small when the whole cosmos is in view. The application keeps the true
proportions and provides focus controls rather than shrinking the epicycles,
because shrinking them would change the apparent motions seen from Earth.

### Equant geometry

The simulation's Ptolemaic kinematics follow the construction in the same
script's `eqplan` routine: with deferent radius 1, eccentricity e, mean
eccentric anomaly k (measured from apogee) and mean epicyclic anomaly a, the
planet's position relative to Earth, in a frame whose x axis points at the
apogee, is obtained by placing the epicycle centre on the deferent (centre at e
from Earth) such that its angle as seen from the equant (at 2e) is k, then
adding the epicycle vector of length r at anomaly a measured from the line
equant-to-epicycle-centre.

Mercury uses a different construction (`eqme`): the deferent centre itself
revolves on a small circle, giving two perigees. The simulation reproduces this
crank mechanism.

Both constructions are implemented geometrically in the simulation and checked
in the test suite against a direct port of the script's closed-form `eqplan`
and `eqme` expressions, so the two independent formulations must agree.

Simplifications: the Moon's *prosneusis* (the small correction to the point
from which lunar anomaly is counted) is omitted. Latitudes use an inclined
deferent for Saturn, Jupiter and Mars with the epicycle kept parallel to the
ecliptic, and for Venus and Mercury an epicycle of fixed inclination; Ptolemy's
oscillating latitude devices in the Almagest are not reproduced.

## 2. Hipparchus (c. 150-125 BCE) -- Sourced

Solar eccentric: eccentricity 1/24 of the radius, apogee at Gemini 5;30, i.e.
ecliptic longitude 65;30. Season lengths 94 1/2, 92 1/2, 88 1/8, 90 1/8 days.
These are attributed to Hipparchus by Ptolemy; 1/24 of 60 is 2;30, identical to
the Almagest solar eccentricity above, as expected since Ptolemy adopted it.

Lunar model: a single-anomaly model (eccentric or equivalent epicycle). No
explicit numerical epicycle ratio attributable to Hipparchus could be verified,
so the simulation uses the Almagest lunar epicycle ratio and omits Ptolemy's
second anomaly. **Illustrative** in that respect.

Hipparchus produced no planetary theory. The Hipparchus era therefore shows the
Sun and Moon on his models, and the planets on simple concentric epicycles in
the manner of Apollonius, with **Illustrative** parameters. This is stated in
the application's description of that era.

## 3. Anaximander (c. 550 BCE) -- Reconstruction

Earth: a cylinder (column drum), diameter three times its height. Wheels of
fire with inner radii 9, 18 and 27 Earth diameters and outer radii 10, 19, 28,
for stars, Moon and Sun respectively, in that order outward. The 3:1 proportion
is well attested in the doxography; the 9/18/27 scheme is the Tannery-Diels
reconstruction, widely followed but not stated as a set in any ancient text.

## 4. Eudoxus (c. 370 BCE), Callippus, Aristotle

Sphere counts -- **Sourced** (Aristotle, Metaphysics Lambda 8, via Simplicius):

| Body | Eudoxus | Callippus | Aristotle counteracting |
|---|---|---|---|
| Saturn | 4 | 4 | 3 |
| Jupiter | 4 | 4 | 3 |
| Mars | 4 | 5 | 4 |
| Venus | 4 | 5 | 4 |
| Mercury | 4 | 5 | 4 |
| Sun | 3 | 5 | 4 |
| Moon | 3 | 5 | 0 |

Eudoxus: 26 plus the fixed stars = 27. Callippus: 33 moving spheres.
Aristotle: 33 + 22 = 55.

What the simulation does with these counts differs by kind, deliberately:

- **Eudoxus's 26 carrying spheres** are all constructed and drawn, and they
  produce the motion.
- **Aristotle's counteracting spheres** are well defined: each turns about the
  same axis as one carrying sphere at an equal and opposite rate, the set being
  taken in reverse order, so that a planet's private motions are cancelled and
  only the daily rotation is handed down to the nest below. The daily sphere is
  therefore not counteracted, which is why there is one fewer than the carrying
  spheres, and the Moon, having nothing below it, has none. They change no
  appearance at all, so the planets move exactly as in Eudoxus's model; that is
  the historically correct outcome and not an approximation. 17 of the 22 can be
  drawn on known axes and are. The test suite verifies that they cancel, and
  that taking them in the wrong order does not.
- **Callippus's 7 additional carrying spheres** are counted but neither drawn
  nor given any effect. It is recorded that the two each for the Sun and Moon
  addressed the unequal seasons, but the axes and rates of none of the seven
  are preserved, so any construction would be invention. The remaining 5 of
  Aristotle's counteracting spheres are the partners of these and are omitted
  for the same reason. The application states this on screen.

Hippopede mechanism -- **Sourced**: two concentric spheres with mutually
inclined axes rotating with equal and opposite angular speeds; a point on the
inner sphere's equator traces a figure of eight lying along the ecliptic.

Inclinations between the third and fourth spheres -- no ancient values survive.

| Planet | Inclination | Hippopede period | Class |
|---|---|---|---|
| Saturn | 6 deg | synodic, 378 d | **Reconstruction** (Schiaparelli, verified range 6-7) |
| Jupiter | 13 deg | synodic, 399 d | **Reconstruction** (Schiaparelli, verified range 10-13) |
| Mercury | 23 deg | synodic, 116 d | Derived: the hippopede's half-length must equal the greatest elongation from the Sun |
| Venus | 46 deg | synodic, 584 d | Derived on the same argument |
| Mars | 34 deg | 260 d | **Illustrative**: recalled as Schiaparelli's conjecture, not verified |

Two failures of the model are real and are shown rather than hidden. Venus
cannot be made to retrograde at all: that would need an inclination above 90
degrees. Mars cannot retrograde with its true 780-day synodic period without an
inclination near 65 degrees and absurd latitudes; the 260-day period shown makes
it retrograde three times too often. And no homocentric model can vary a
planet's distance, so none can explain changes in brightness.

## 5. Copernicus, De revolutionibus (1543) -- Sourced to two decimals

Orbit radii in units of the Earth-Sun distance, from the Monterey Institute for
Research in Astronomy lecture notes (`http://www.mira.org/ana/copernic.htm`):

| Planet | Copernicus | Modern |
|---|---|---|
| Mercury | 0.38 | 0.387 |
| Venus | 0.72 | 0.723 |
| Earth | 1.00 | 1.000 |
| Mars | 1.52 | 1.52 |
| Jupiter | 5.22 | 5.20 |
| Saturn | 9.17 | 9.54 |

Copernicus retained uniform circular motion and replaced the equant with a
small epicyclet. In his construction the eccentric carries three quarters of
Ptolemy's Earth-to-equant distance and the epicyclet radius is the remaining
quarter, that is, one third of the eccentric's own eccentricity. With e the
bisected (Ptolemaic) eccentricity, the eccentric is offset by 3e/2, the
epicyclet has radius e/2 and turns at twice the mean rate, which reproduces the
equant's effect to first order.

Mean motions, epoch longitudes, apsidal lines and eccentricities for this era
are taken from the modern elements in section 7, not from the Almagest.
Reusing Ptolemy's rates would put the Sun about six degrees out by 1543 (his
tropical year is too long by about 0.0045 days), an error Copernicus did not
have because he refitted his parameters to his own time. Only the orbit radii
above are Copernicus's. **Illustrative** in that respect.

Simplifications: Venus and Mercury use the same eccentric-plus-epicyclet
construction as the outer planets, whereas Copernicus tied their models to the
Earth's motion; the Earth moves on a simple eccentric with no epicyclet.

## 6. Tycho Brahe (1588)

No independent parameters are needed: the Tychonic system is the Copernican
arrangement with the origin moved to the Earth. The Sun and Moon circle the
Earth; the five planets circle the Sun. Geocentric directions are identical to
the Copernican ones, which the test suite asserts.

## 7. Kepler (1609-1619) and the telescopic era

Elliptical orbits with the Sun at a focus and the area law, solved with
Kepler's equation. Orbital elements are the J2000 mean elements and secular
rates from NASA JPL, *Approximate Positions of the Planets*, Table 1
(`https://ssd.jpl.nasa.gov/planets/approx_pos.html`) -- **Sourced** as
astronomy. They are not Kepler's Rudolphine values, so they are
**Illustrative** as history. Stated on screen. JPL gives Table 1 as valid for
1800-2050; the simulation extrapolates it to earlier dates, where accuracy
degrades gradually.

The Moon, the four moons of Jupiter, Titan and Saturn's ring orientation use
approximate elements recalled from general knowledge and not re-verified --
**Illustrative**.

The comet shown in the Newtonian era is Halley's, the comet of 1682. Two
sources were read directly for it:

- **Wikipedia**, "Halley's Comet", section "List of apparitions",
  `https://en.wikipedia.org/wiki/Halley%27s_Comet` (revision
  `oldid=1375206184`, read 17 September 2026). Secondary.
- **D. K. Yeomans**, "The Dynamical History of Comet Halley", in A. Carusi and
  G. B. Valsecchi (eds.), *Dynamics of Comets: Their Origin and Evolution*,
  Reidel, 1985, pp. 389-398, `https://doi.org/10.1017/S0252921100084074`.
  Primary.

| Quantity | Value | Source | Class |
|---|---|---|---|
| Perihelion, 1682 apparition (1P/1682 Q1) | 15 September 1682, Gregorian | Wikipedia | **Sourced**, one secondary source |
| Perihelion distance q | 0.5870992 au | Yeomans | **Sourced**, for the 1986 apparition |
| Eccentricity e | 0.9672724 | Yeomans | **Sourced**, for the 1986 apparition |
| Semi-major axis a | 17.9390 au | derived as q / (1 - e) | -- |
| Inclination, node, argument of perihelion | 162.26, 58.42, 111.33 deg (J2000) | recalled | **Illustrative** |

The 1682 date rests on Wikipedia alone. Yeomans discusses the 1682 apparition
at length but never states its date of perihelion. An earlier note in this
project's history called the date "confirmed by two sources"; both turned out
to be the same Wikipedia article reached through two addresses. Yeomans does
give, in plain text, the perihelia of 1759 March 13.1, 1835 November 16.4, 1910
April 20.18 and 1986 February 9.44, and Wikipedia's table agrees on 13 March
1759. Wikipedia's summary box gives 8 February for 1986 where Yeomans has
February 9.44; the model no longer depends on that date.

No elements for the 1682 apparition could be sourced, so q and e are Yeomans's
osculating values for 1986 (epoch 1986 February 19.0). The three angles were
recalled rather than read and remain **Illustrative**. Yeomans gives them as
162.23932, 58.14397 and 111.84657 degrees, but for the equinox of 1950.0,
whereas this scene is drawn in the frame of J2000, so they were not
substituted. They were used as a check instead, as follows.

Both orientations were turned into directions in space, using the same routine
that orients the comet on screen: the direction of perihelion, and the normal
to the plane of the orbit. Yeomans's were then carried from the equinox of 1950
to J2000 by rotating them about the pole of the ecliptic through the general
precession in longitude over those fifty years, 0.6985 degrees. (The ecliptic
itself shifts by only about 0.0065 degrees in that time, which is neglected.)

| | Perihelion direction | Plane of the orbit |
|---|---|---|
| Recalled against Yeomans, as published | 0.78 deg apart | 0.09 deg apart |
| Recalled against Yeomans carried to J2000 | 0.12 deg apart | 0.13 deg apart |

So most of the difference between the two sets of angles is the change of
equinox: carrying Yeomans's orientation to J2000 brings the perihelion
directions from 0.78 degrees apart to 0.12. But a residual of 0.12 to 0.13
degrees remains, and the planes in fact agree slightly less well after the
transformation than before it. That is about ten times what the rounding of
the recalled values to 0.01 degree could produce. Its cause was not
established; the recalled angles may belong to a different orbit solution or
epoch of osculation, or may simply be imperfectly recalled. The two sets are
therefore **not** claimed to describe the same orbit. The residual amounts to
about a pixel at the comet's aphelion and nothing nearer the Sun.

An earlier version of this section argued that the two sets were the same orbit
because the node minus the argument of perihelion differed between them by 0.79
degrees, close to the precession. That argument was wrong twice over. The node
minus the argument is the true longitude of perihelion only for an orbit
inclined at exactly 180 degrees; at this comet's 162 degrees the true longitude
is the node plus atan2(cos i sin w, cos w), which gives -53.87 degrees where
the shortcut gave -52.91. And it put the leftover 0.09 degrees down to
rounding, which cannot account for it. The test suite now pins the measurement
in the table above.

No perturbations are modelled, so the comet keeps a fixed period of 75.98
years, while its real returns have come 74.4 to 76.7 years apart. The anchor
therefore matters: an earlier version anchored it at the 1986 perihelion and
stepped back four periods, which brought it to the Sun in late 1684, two years
late for the era it is labelled for, and left it inside Saturn's orbit when the
era opens in July 1687. Anchored at 1682 it stands at 13.9 au on that date,
beyond Saturn, as it should. Elsewhere it drifts: it returns here on 9
September 1758, within the year Halley first named (Yeomans: "it might be
expected again in 1758", later revised to "late 1758 or early 1759"), whereas
the real comet, held back by Jupiter and Saturn, reached perihelion on 13 March
1759, 185 days later and 76.49 years after 1682. It will likewise not match
1986. The test suite pins the 1682 anchor, the sourced q and e, and this
margin, so that these statements cannot go stale unnoticed.

## 8. Discovery gating

Dates at which features become visible in the simulation:

| Feature | Date | Observer |
|---|---|---|
| Lunar mountains and craters | 1609-1610 | Galileo |
| Four moons of Jupiter | January 1610 | Galileo |
| Phases of Venus | late 1610 | Galileo |
| Saturn's anomalous appendages | 1610 | Galileo |
| Saturn's ring understood as a ring; Titan | 1655-1659 | Huygens |

These dates are standard and were not separately re-verified during
development.

## 9. Stars and constellation figures -- Sourced

Star positions, magnitudes and colour indices to magnitude 6, and the
constellation stick figures, come from the d3-celestial project by Olaf Frohn
(`https://github.com/ofrohn/d3-celestial`, files `data/stars.6.json` and
`data/constellations.lines.json`), distributed under the BSD 3-Clause licence.
The generated files in `src/data/` are derived from them by
`scripts/build-stars.mjs`, which converts J2000 equatorial coordinates to J2000
ecliptic coordinates. The script fetches from upstream commit
`7e720a3de062059d4c5400a379146a601d9010e0` (2022-07-05) rather than a branch,
and stamps that commit into the generated files.

## 10. Reference frame and precession

The display frame is the ecliptic and equinox of J2000, in which the stars are
fixed. Ancient longitudes are tropical (measured from the equinox of their own
date), so they are carried to the display frame by adding the accumulated
precession at the modern rate of 50.29 arcseconds per year. This is done so
that every era can be compared against the same real sky. It is not what
Ptolemy believed: he took precession to be 1 degree per century (36 arcseconds
per year), and that belief is retained inside his model, where it moves the
planetary apogees.
