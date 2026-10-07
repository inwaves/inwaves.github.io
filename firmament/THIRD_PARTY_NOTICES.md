# Third-party notices

Firmament bundles or derives from the following works. This file is shipped with every build as
`THIRD_PARTY_NOTICES.txt` and linked from the application.

## three.js

https://github.com/mrdoob/three.js. Bundled into the production build.

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## d3-celestial data (stars and constellation figures)

https://github.com/ofrohn/d3-celestial, at commit `7e720a3de062059d4c5400a379146a601d9010e0`.
`src/data/stars.json` and `src/data/constellations.json` are derived from its
`data/stars.6.json` and `data/constellations.lines.json` by `scripts/build-stars.mjs`, which
keeps position, magnitude and colour index and converts J2000 equatorial coordinates to J2000
ecliptic ones. Both are bundled into the production build.

```
Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

d3-celestial's own readme, at that commit, gives its sources as: for the stars, *XHIP: An
Extended Hipparcos Compilation* (Anderson and Francis, 2012; VizieR V/137D); for the
constellation lines, the IAU constellation pages, with some modifications by Olaf Frohn.

## Numerical sources

These are facts and figures, not bundled works; they are credited here and set out value by
value in `SOURCES.txt` (`docs/SOURCES.md` in the source tree).

- Planetary elements: NASA JPL Solar System Dynamics, *Approximate Positions of the Planets*,
  a work of the U.S. Government.
- Almagest and *Planetary Hypotheses* constants: read from R. H. van Gent's *Almagest Ephemeris
  Calculator*, Utrecht University.
- Copernicus's orbit radii: Monterey Institute for Research in Astronomy.
- The comet of 1682: D. K. Yeomans, "The Dynamical History of Comet Halley" (1985), and
  Wikipedia's list of apparitions, as cited in the provenance notes.

The textures are procedural. The application ships no image assets and loads no fonts.
