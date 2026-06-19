+++
title = "Thoughts on 'Why Greatness Cannot Be Planned'"
description = ""
date = 2026-06-19

[taxonomies]
categories = ["research"]

[extra]
lang = "en"
+++


Why Greatness Cannot Be Planned is a 2015 book by Kenneth O. Stanley and Joe Lehman. Its main thesis, in my understanding, is that for ambitious discoveries it is basically counterproductive to set objectives, and that you would do better taking a less structured approach. In this piece I'm not going to give an account of the full contents; if you're reading this, you should probably at least skim the book itself at ~100 pages. I am also not trying to build a specific thesis for or against the book; rather I'm writing to wrestle with the implications.

I'm more confused after reading this book about how to do research than I was before. My prior going into this was that objectives are good, actually; in particular, making contact with reality, having tight feedback loops etc. are what keep you on track, and increase the odds that you achieve what you want. In the book's frame, I am espousing the status quo. The book moves me a bit in the direction of "for some goals this is not strictly true."

Their core explanation is that in some search processes — corresponding perhaps to ambitious goals — local maxima are ubiquitous, and more often than not, an objective-based search converges on them rather than the overall goal.[^deception] Then there is a second argument: following the objective gradient might take that search process further away from its goal, because the objective incentivises things that look like progress, but are not actually useful.

Here, the objective is some metric that you might use as a proxy for the final goal.[^goodhart] How do you find this for an ambitious goal — something that's not yet on the tech tree? I actually think the argument in the book is quite strong here: for this kind of unknown-unknown goal, we simply don't know which intermediate steps ("stepping stones") lead to it, or which we could work on immediately.

In this kind of environment, with lots of local maxima and an unfaithful gradient, the book claims you should not try to optimise for an objective at all. Instead, you should search, using something like novelty or interestingness in relation to what you've already discovered, to find the next discovery. Then you jump from lilypad to lilypad, accumulating a bunch of discoveries. Those could combine to produce a "final" objective, but they're not guaranteed to.

So, instead of trying to achieve a specific objective, you might orient yourself to respond to these discoveries directly, to build on them, to recombine them into something novel. (I did like the phrasing of ~"aligning oneself toward discovery, away from preconceived results", though as a pointer rather than clear advice.)

### Intuition pumps
There are a handful of intuition pumps in the book that landed better with me than the explicit arguments themselves. Two of them are: "what would your objective be if you wanted to invent a new genre of music?" (they give the example of jazz and blues ultimately leading to rock & roll); then, paraphrasing: "the modernists weren't trying to give rise to the surrealists, 50 years later".

These straightforwardly point to a thing that's hard to explain but seems obvious in retrospect. One part of it is: history seems far more solid than it is, because counterfactuals are invisible and more difficult to reason about. In retrospect, everything seems just-so: obviously after these two movements occurred, this third movement would occur. We read into path dependence as a sort of overdetermined thing about the world.

(I feel like the book itself makes this mistake too, on a few occasions. For instance, it says that evolution couldn't have had intelligence as its objective, because it came up with tons of other things in the meantime, like bilateral symmetry. This symmetry, while not being obviously useful for intelligence, is a prerequisite of intelligence — in the sense that it was discovered before brains were. But this is *just in our world*; I haven't spent much time thinking about this specifically, but I don't see why intelligence would require bilateral symmetry in the abstract!)

Where those first two intuition pumps break for me is that they're both art-related. In art, contact with reality is limited by the criteria by which we judge greatness (more fickle, certainly less examinable than in science). Many artists we consider great in retrospect were not successful while alive. I think by default more art styles would proliferate than e.g. mammal body plans, because the latter have a ton of constraints in order to work. So it seems as though not all of that implicit argument transfers over to non-art endeavours.

There are two other oblique examples from the book that I think are still useful, but have stronger objections to. One is "how could Babbage have created the computer in 1820?" and the other is, approximately "the US couldn't have done the trip to the moon in the 1860s" (rather than 1960s). On Babbage, the argument is that he would've had to invent the vacuum tube in order to have a working computer. But again, computers routed through vacuum tubes *in our world*; we know now that the substrate for computation can be far more general.

I agree that lots of intermediate steps had to be solved in order for the first computer to be built, and similarly for the first Apollo mission to take place. Maybe lots of those steps were solved in unrelated domains, in the same way vacuum tubes weren't invented *for* computing, but for radio. But, in the case of Apollo for instance, how many of those stepping stones were discovered in e.g. 1860-1910 vs. 1910-1960? A more interesting counterfactual would be from a point when we know we're close to everything being ready, say, after human flight was demonstrated: if you had set a goal to go to the moon, and dedicated X% of US GDP to it, how long would it take? (There's a good article by Brian Potter on this point: [How Long Do We Wait for New Inventions](https://www.construction-physics.com/p/how-long-do-we-wait-for-new-inventions) — spoiler alert, not very long.)

At any rate, it does seem to be the case that had the US set their sights on the moon in 1860, a direct effort toward accomplishing this objective would have been premature, because too many things had to be discovered first.

### Work and play
I find the curiosity-driven, interestingness-as-metric approach quite appealing personally. I haven't made any big discoveries doing this, but my most enjoyable moments "doing science" involved a lot of curiosity, a loose idea, and some uninterrupted time. Does unstructured thought work in scientific endeavours? It certainly works in [music](https://www.youtube.com/watch?v=aE8b4VyY6ck), in improv, etc. — and it certainly has value as a dimension of human experience — but does it result in new discoveries? An interesting question is: how many big discoveries percolated in people's minds for years before being "discovered" in a flash? And how many were made by what we consider to be the scientific method today?

I'm not sure how to square this with being effective, with making progress. I wonder if there are better ways to still make contact with reality, but with less grasping, without stifling creativity? Are there two regimes where objectives work and where they don't, and the million-dollar question is how to tell the difference?

I think pinning it down is important, otherwise it's easy to misuse the argument. For instance, when I'm flailing and can't make progress against a goal, I could say that I'm actually doing unstructured exploration, and I'd still be failing at my goal.[^artefact] To be clear, I don't think the recommendation is "do nothing and the solution will come to you," but it's a strange mixture of pragmatism and romanticism regarding how to produce and use stepping stones ("the future as what the past unexpectedly enables rather than what you had envisioned") that I don't know how to make concrete.

When asking where this novelty approach applies I suppose a subquestion is: do you want 50 contributions of magnitude 0.1 or 5 contributions of magnitude 10? You could have more impact taking bigger swings, but what those swings are is unknowable-in-advance, since the tech tree decides what's possible at any moment. Or you could specialise, and make incremental progress in your domain. One counterpoint to seeing it this way is that the magnitude of contributions isn't something you decide unilaterally: it's part of the fabric of the field, and it could be that progress is incremental. How do you position yourself to work on discontinuous progress? "Do things that don't scale"?

### Relating this to alignment work
I have wondered recently if alignment research is stuck in a local maximum where most work is evals, control, fine-tuning to align a persona, and not much else. I get it — as LLMs got better the ROI on this kind of work increased — and they do have merits. But they are a large fraction of (visible) alignment work, and they might not be addressing the core problem. Until proven otherwise though, they're our best bet.

Certainly regarding alignment, the narrative around take-off, and recent progress on agents aren't conducive to stepping back and letting novelty pave the way to safe AI. There might be some value in doing that, though. For example, even though the Los Alamos effort was extremely mission-driven, some of the work there was fundamental research, the kind of thing you can't hurry along.

### End
I don't know whether I can integrate this into my toolbelt easily. For better or for worse objectives seem to be the dominant way of organising research. Stepping toward unstructured exploration, blue-sky thinking doesn't work when you're under pressure to deliver. I have seen the effects of this, where you try to force a research result to happen on a schedule dictated by the business — it usually doesn't work. Or it does, and you don't realise you've backed yourself into a corner until later.

Even though I found the book a bit overstated, stylistically, the core point seems true. I would love to apply this kind of approach more day-to-day, and build a practice out of it. Maybe once in a while it pays off massively, maybe not. At least I won't be able to lament not having enough time to chase down all the rabbit holes.

[^deception]: The book calls these objectives "deceptive", which I think is an unfortunate term. I associate deception with intent. The difficulty with these objectives is more about the geometry of their search space, perhaps they're problems where local maxima are particularly likely and particularly strong attractors.

[^goodhart]: Like any proxy objective this is subject to [Goodhart problems](https://arxiv.org/pdf/1803.04585), specification gaming etc.

[^artefact]: The distinction could be producing an artefact, even if it is unpolished or not that useful. Exploration produces a lot of dead ends, those probably need to be documented. One difficulty with doing research agents at scale is figuring out what artefacts they should produce — [this](https://arxiv.org/pdf/2604.24658) is a good paper IMO.
