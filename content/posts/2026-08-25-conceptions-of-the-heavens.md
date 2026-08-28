+++
title = "Conceptions of the Heavens"
description = "An interactive tour of the models of the cosmos, from Anaximander to Newton and beyond"
date = 2026-08-25

[taxonomies]
categories = ["history of science"]

[extra]
lang = "en"
+++

Asking whether LLMs can do research leads down at least one rabbit hole: what is research? how do
you define progress? what "counts"?

I've been taking a stroll around the history & philosophy of science field to understand how
others have thought about this in the past. One work squarely in this vein is Thomas Kuhn's *The
Copernican Revolution*, which discusses the enormous change that followed Copernicus' work on
heliocentrism. I enjoyed the book; it wasn't always easy reading, but I found the explanations
clear and comprehensive.

One piece that I thought I understood but couldn't picture was planetary movement under the
Ptolemaic model. For context, this was the dominant paradigm for over a millennium, until
Copernicus started reforming it. Epicycles are at the core of it. In the simplest version, a planet
travels around a small circle—the epicycle—while the epicycle’s centre travels around a larger
circle called the deferent. Among other things, they explain retrograde motion: relative to us,
some planets sometimes reverse direction before resuming their eastward path.[^orbits] In the book,
you'll find figures like this one, explaining what these systems look like:

![A one-epicycle, one-deferent system for Venus and the path it generates, from Thomas Kuhn's The Copernican Revolution](/images/conceptions-of-the-heavens/kuhn-epicycle-deferent.jpg)

This figure is clear enough; I have no objections to it. But I find it hard to go from this to
visualising the motion itself, even though I am able to explain how it works. So after finishing
the book I thought to try something more interactive. Here is the result of asking Fable to design
me such a visualisation.[^prompt]

[![Ptolemy's system of deferents, epicycles, eccentrics, and equants in Conceptions of the Heavens](/images/conceptions-of-the-heavens/ptolemy.jpg)](/space/#stage=ptolemy&follow=mars&view=orbit&frame=center&speed=3)

*Ptolemy's system of deferents, epicycles, eccentrics, and equants. Click the image to explore all
sixteen models; best viewed on a large screen.*

Let me tell you why I like it. I like it because you can *see* the motion. You intuitively grasp
how the body moves in the epicycle-deferent coupling. You *see* how it's an elegant solution to an
unexplained phenomenon. You also see the change in scale: it wasn't just the position of the Earth
and Sun that changed; the sphere of stars expands. This progress in astronomy changed our
cosmology: our idea of the origin of the Universe, of its size, of our own significance in it.[^culture]
You see this in, for instance, the purported elemental spheres in Aristotle's model.

A famous example is Einstein’s “happiest thought”: a person in free fall would feel weightless.
Imagining the observer’s perspective led him toward the equivalence principle, which became
foundational to General Relativity. Sometimes a mental picture gives you a handle that formal
description alone does not.

I also like it because I have this sense that interacting with an object of study leads to far
better retention and understanding. There's a tool-for-thought angle here, similar to Bret
Victor's work, or to the memory explorations from Andy Matuschak and Michael Nielsen (for instance
in [quantum.country](https://quantum.country/)). This app isn't about memory per se, it is about
spending time interacting with the model itself. Maybe a step further is having an agent parked
on the side, which you can ask for clarification when you are confused (maybe embedded in the app
itself, or maybe as your durable companion).

Why make it with AI? I'm approaching this in a key of wonder: we have these incredible models that
let us do things we could only do quite painstakingly before. The idea is not to diminish similar
works that were done by humans; the idea is that this is now accessible to me, as a complement to
my reading, and while not free it is quite cheap for me to generate.

I like abundance; I think we are extremely privileged, and a look into a not-too-distant past
tells you how different the world can be when you can't make things easily, cheaply. I also like
artisanal work, and appreciate the heights of human art, craftsmanship, accomplishment. I don't
think the two are mutually exclusive.

Here's an example that's quite clear to me: having a really good Physics teacher is a privilege;
the combination between knowledge, a love for the field, the mystery that underpins it, and the
progress that illuminates it, and a desire to teach is extremely rare. And yet some people, myself
included, get to benefit from this, while others do not. I would love for everyone to have access
to this, for every field, but I don't think we get there by naïvely scaling my own Physics
teacher.[^teacher] Approximating this kind of experience with better and better learning tools is
the next best thing.

I want to augment my own understanding; I don't want AI to replace it. The "tool AI" paradigm has
been short-lived. In software, at least, autocomplete has been almost entirely displaced by agents:
if you want to keep up with the current velocity, you do not write code by hand. Agents automate
the work and increasingly replace human engineers, rather than complementing them. Perhaps that's
inevitable, but even in a world where AIs do all the frontier work, people will still be curious:
what is this? Why does it work the way it does? In that world you want a tutor that can show and
tell, not just tell.

[^orbits]: As an aside, do you know why all the planets orbit the Sun in the same direction? Why
    don't some go the other way?

[^prompt]: "While reading Thomas Kuhn's The Copernican Revolution, I could not imagine what the
    ancients (Hipparchus, Anaximander, dot dot dot to Ptolemy), all the way down to Copernicus,
    Brahe, Kepler would have imagined the planetary motion to look like. Fortunately we have better
    ways of visualising this today. I want you to design a web application that lets me explore how
    each of those worldviews imagined the universe to be. It should be a 3D simulation that I can
    interact with — think Stellarium. Before Galileo, for instance, there ought to be no Galilean
    moons; afterward there should be. Imagine that it is a progression through humanity's
    conception of the heavens."

[^culture]: Indeed one of the largest barriers to Copernicus' reconceptualisation was cultural.

[^teacher]: Sure, they can publish textbooks, or MOOCs and video lectures; those are useful, but
    they are limited in imparting the full value.
