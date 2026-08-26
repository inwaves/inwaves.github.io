+++
title = "Conceptions of the Heavens"
description = "An interactive tour of the models of the cosmos, from Anaximander to Newton and beyond"
date = 2026-08-25
draft = true

[taxonomies]
categories = ["history of science"]
tags = ["astronomy", "kuhn", "visualisation"]

[extra]
lang = "en"
+++

<!--
Placeholder. Everything below is scaffolding to be rewritten in your own words.
Remove `draft = true` from the front matter to publish; Zola excludes drafts from the build.
-->

<!-- Motivation: what prompted this while reading Kuhn's *The Copernican Revolution*; what you
could not picture (what the sky looked like to Hipparchus, what an epicycle actually does, why
retrograde motion was the problem); why a simulation rather than diagrams. -->

While reading Thomas Kuhn's *The Copernican Revolution* I kept failing to picture what the
astronomers he describes actually imagined: not the diagrams, but the moving machinery, and the
sky it was supposed to produce. So I built something to look at.

### The app

[Conceptions of the Heavens](/space/) is an interactive 3D tour through sixteen models of the
cosmos, from Anaximander's wheels of fire to the solar system as we know it today, taking in the
two-sphere universe, Eudoxus' homocentric spheres, Aristotle, Hipparchus, Ptolemy, the medieval
and Maragha astronomers, Copernicus, Tycho, Kepler, Galileo and Newton along the way. Each model is a
working mechanism (deferents and epicycles, eccentrics and equants, nested spheres, ellipses), and
all of them are driven from the same modern orbital elements, so the sky each one predicts is the
real one, to within that model's genuine historical errors. The machinery producing it is the one
its authors imagined. Before Galileo there are no moons of Jupiter; from 1610 on there are.

<!-- Perhaps one or two screenshots here. -->

### A few things to try

<!-- Trim or replace with what you actually found interesting. -->

- Stand on the Earth (the "From the Earth" view) in the two-sphere universe and watch Mars draw its
  retrograde loop against the constellations: this is the problem every later model exists to solve.
- In Ptolemy's stage, follow Mars with the mechanism on and watch its epicycle arm stay parallel
  to the Earth–Sun line. The heliocentric system is hiding in plain sight.
- Switch the trail frame to "Relative to Earth" in the Copernican stage and the Ptolemaic loops
  reappear; switch it back and they dissolve into circles.
- Set Proportions to "As conceived" in Ptolemy's stage to see his 20,000-Earth-radius cosmos at
  its real proportions, then zoom in to find the Moon.

### Caveats

<!-- Adjust as you see fit. -->

The models use each period's geometry with modern parameters, which is not quite the same thing as
reconstructing Ptolemy's or Copernicus' tables. Sizes and distances in the default layout are
compressed for legibility; the "As conceived" layout uses each period's own figures. Stars in
the post-Tycho stages cannot be drawn at their real distances.

<!-- Closing thought; maybe a link back to the Kuhn chapters that the stages follow. -->
