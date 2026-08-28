+++
title = "fab: how to do (alignment) research at scale"
description = ""
date = 2026-06-25

[taxonomies]
categories = ["research"]

[extra]
lang = "en"
+++

Over the last month, I've been working on a project I'm calling fab.[^name] Nominally, it's an interface that enables a human researcher to make sense of research produced by many agents running in parallel. I haven't "finished" fab — in fact, I'm stuck searching for the crux of building something like this — but I still think it is worth posting a short explanation of the problem it is meant to solve, and how it tries to address it.

In what follows I'm imagining this being used for automated alignment research. This is not because I see it as a silver bullet. I am just observing that a lot of current empirical alignment work could be automated (and in fact some of it already has been, just not the more open-ended stuff). If we can shift more work to the left through automation, that's a win. I am deliberately assuming humans as the final decision-makers, and asking how far we can get by augmenting human judgement.[^scalable-oversight]

### Research at scale
Imagine a near future where you can spin up dozens of agents to do research for you in parallel.[^comparison] You loosely specify a question you're interested in, and they do all the legwork: operationalise that question, look at prior work, run quick experiments to get a mechanistic understanding, run bigger experiments (training models, perhaps, or doing white-box interpretability), analyse the results, position the findings in the broader context. Ideally, they all take slightly different approaches, trying to find different "handles" on the question you specified. When they're done, you have on the order of tens of write-ups to review, with the ultimate goal of updating your understanding of that question in light of new evidence.

I think this is actually really hard, for a couple of reasons that have to do with the interplay between how we do research and current agent failure modes.[^capability]

Attention is the big problem. There are only so many human researchers in a given field. In alignment, there are maybe a few thousand in total, with maybe 30 or so who are highly productive. You don't want these people reviewing LLM slop. I think this is the binding constraint of the entire system, because it dictates how much work you can fan out. In other words, nothing is stopping you from _kicking off_ 100 research agents right now (okay, maybe token spend), but good luck making sense of all hundred research reports.

In reality, of those 100 research agents, many will not produce anything worthwhile. In my experience the most common reasons for that are:
- sycophancy: the agent produces well-polished prose, but does not go deep enough into the actual work. You have a nice report at the end that clarifies nothing, and somehow discourages further investigation. At worst, you are persuaded that the "findings" are correct, even though they are thin. I grant that the worst kinds of sycophancy are gone, but a couple of times recently I thought that I would rather trade the subtle kinds for the obvious "you're absolutely right!" kind;
- reward hacking: the classic "things that look good might not actually be good" problem. As with sycophancy, this has improved leaps and bounds over the last year, but it's still there, just harder to see. If you want to offload completely, you need to anchor the agent in some form of verification, otherwise it *will* reward hack. My guess is that this is why most sessions are still human-in-the-loop: a lot of checking in and making sure it hasn't gone off the rails. Agents are plenty capable when there is a hill to climb, and your job is to find it.
- mode collapse: most of those agents will take very similar routes, even if they call them by different names. If they search the literature, they'll converge on the same 3-5 papers, and discuss the same points in those papers. The severity of this varies, but I've tried all versions of Claude Opus and GPT over the last year (I did not get that much time with Fable). Even when prompted for diversity, e.g. with an initial observation or claim from the human researcher it is possible for the agent to revert to its median trajectory — sometimes after a cursory investigation of that initial seed. This is probably the main reason I can't go fully hands-off right now.

There are mitigations for all three:
- for sycophancy, check the code or artefact directly (e.g. a Weights & Biases run). I noticed on several occasions that getting a second agent to review the first agent's work preserves the sycophancy, even the reviewer is a completely different model family or harness. Most likely conditioning on the contents of a (sycophantic) research report induces sycophancy in any reviewer. If that's the case, a good solution might be to [blind the reviewer to the prose](https://www.lesswrong.com/posts/yXSKGm4txgbC3gvNs/paranoia-a-beginner-s-guide) entirely!
- for reward hacking: verifiability is the name of the game. Where you have the ability to verify artefacts through code, you must use it. Where you don't, you can find proxies, but those are gameable. For instance, with fab you could spin up pairs of executor-falsifier agents. One does the work, the other is adversarially probing the validity of that work, and reports if any of it remains in good standing. You could have pre-registered kill criteria for each run — what you would have to see in order to cut that run short. You can base them on telemetry coming from the agent, or they could be fairly simple: wall-clock time, number of iterations, making sure there is an artefact...
- for mode collapse, so far the best solution is staying in the loop for a while longer, until each trajectory "locks in" what you consider to be a novel path. The initial prompt isn't enough, especially if you have a lot of intervening context like paper references. But I find steering many sessions at once quite difficult (the context switching is bad), and this does not scale past a handful of sessions. I haven't figured out a better solution yet.

Even when these are taken care of, there is a lot of information to review. A side point: the format we've settled on for academic publication is partly a reflection of bandwidth constraints in human reviewers. That need not be the case in the future, if we can offload some of that to agents. Ideally we would not share just the findings; we would record what was tried, what worked & what didn't, what assumptions were made, as well as any resources used (open-science efforts often focus on these points).

### How fab works
fab is supposed to be the layer/interface that converts lots of agent attempts into one human update. Today fab is mostly exploration. I am assuming that a good agent platform exists externally, such that I can spin up persistent background agents with tools, skills, execution sandboxes, durable filesystems etc. Those agents receive a research contract, do some work, and return a specific kind of artefact bundle.

The research contract is a specification of the research question. It is partly structured, but leaves a lot of room for nuance. Here is an example for [weak-to-strong generalisation](https://github.com/inwaves/fab/blob/10c118f7a3ce4cf43a4de5293fc0bca714a57095/dogfood/w2s/store/contracts/contract_w2s_generalization/v001.md). I get the sense that, with current-generation agents, investing in a good spec has large returns. Saying "go investigate phenomenon X" tends to not work.

The [fab artefact bundle](https://github.com/inwaves/fab/blob/main/docs/artifacts.md) is adapted from [this paper](https://arxiv.org/abs/2604.24658). It contains results, code, logs, and a report. I also expect the entire agent trace to be at least inspectable, but it is better if there is a rich snapshot of the state so that the agent can be spun up again with the same execution state, trajectory history etc. (this exists today).

fab is explicitly not the data layer, and stays out of how agents might want to structure or persist intermediate work. As long as the artefact shape is correct, the rest is open to experimentation. I put together a lightweight knowledge base repo to accompany fab; [here](https://github.com/inwaves/alexandria/pull/2) is an example of an artefact from a real multi-agent run investigating what happens to a model's support before and after RLVR. That said, I've noticed that you have to be very careful when you get agents to work on a knowledge base. The default outcome is accumulation; agents often behave as librarians, filing things away. I would like them to consolidate that knowledge, pruning the corpus as needed, updating previous notes, etc. I think this append-only bias mostly falls out of how they're trained, so it's not easy to remove.

I've used fab a few times now with different kinds of agent harnesses. It doesn't yet clear the bar for switching from directly interacting with the agents to this added interface. The few runs I did were just *okay* — but they only used 3 agents, and the core value proposition is when you fan out more.

### What's next
A fun idea I had is "FellowsBench": how easy would it be to use fab to replicate work from past Anthropic Safety Fellows? It's an easier problem because the work has already been done, but it tests many of the execution paths you would hit in real-world use (e.g. fan out replications of ablations at the same time). It's also easier than the abstract "do research" question because most of the projects are empirical, so more tractable for agents.

I'm planning to run this at a larger scale and see if that works as a forcing function for the design. If using fab causes me to update on a view, that seems like a win; measuring the delta between using fab and using plain agents seems harder. I don't anticipate the architecture or code generation to be big obstacles here; rather I think nailing the ergonomics is most important.

### What fab is and isn't
There is a lot of overlap between fab and *agent orchestration*. For single-agent work, this looks like coming up with a good harness. For multi-agent work, it's trying to figure out how to get swarms to make useful progress. fab is a bit more like the latter, but in my mind it is subtly different in focus. Similarly, fab overlaps but doesn't try to rehash other efforts:

- rewriting infrastructure so agents have an easier time with code execution, parallel exploration, versioning and so on. As with the agent execution platform, I am assuming that this either already exists, or is < 6 months away from reaching the market.
- systems for preventing or avoiding known failures, including AI control and observability platforms. Above, I mentioned a few failure modes of agents; there are of course, some that we don't even know about yet. This x-at-scale thing collapses if you can't reliably do x even once. Here, for instance, [Watcher](https://watcher.apolloresearch.ai/blog/mdm-for-coding-agents.html) seems good.
- more "mundane" evaluation platforms. The overlap there is caring about behaviour at scale, wanting to characterise what emerges when lots of agents work at the same time.

### Adjacent questions
Asking how fab should work led me to other questions like "how does science happen?" or "how is knowledge produced?". There are a few threads worth chasing here.

{% detail(title="Within or across paradigms", default_open=false) %}
It could be that a research system that works well within-paradigm does not work well across them, and vice-versa. Within a paradigm there is typically incremental progress, even though you can't trace a neat graph curving up-and-to-the-right. It is still hard to discover the future, but in retrospect it is obvious that those pieces line up. Discovering a new paradigm is not like this; it is a "shock" to the existing body of knowledge that seems to occur when enough anomalies accrue under that body of knowledge. It's plausible that the kind of work that eventually leads to noticing those anomalies, to putting the picture together, is not the same kind of work that yields incremental progress within-paradigm. (One example that comes to mind is adding epicycles to explain planetary orbits under a geocentric model, when the better model, the new paradigm, is heliocentrism.)

I am more sceptical that you can do this kind of discovery by just ramping up the amount of work you do, though the connection is somewhat subtle. To be clear, I do think that even paradigm-changing research requires a lot of attempts, a lot of shots on goal; in that sense parallelising those attempts isn't bad by default. But the function that tells you whether those attempts are coalescing into a broader paradigm is harder to pin down, and not something I expect to "crack" with fab. [This recent write-up](@/posts/2026-06-19-thoughts-on-why-greatness-cannot-be-planned.md) is relevant!

{% end %}

{% detail(title="Research flows", default_open=false) %}
I am finding out that even though there is an archetypal "flow" for research, it varies quite a lot between fields. Even with expensive training runs in ML our feedback loops are short. Most experiments are computational in nature. That dictates how we iterate, and ultimately how progress gets made. You can view the advances in the last few years as accumulated knowledge from repeated experimentation. The best in the field carry tacit knowledge: heuristics about hyperparameters, intuitions about anomalies, and so on.

The picture is completely different when you're, say, manufacturing viral vectors for gene therapy. Assays take several days. You can't hurry your cells along because you have a deadline, you're mostly operating on their schedule instead. Wet lab work has an added overhead, and added complexity from biology not-quite-behaving according to your model, that dictates how research is done there.

Can fab support both of these things? Other types of research? Should the research workflow be constrained or open-ended? And there is a trade-off here: more structure means more legibility, but less novelty. For fab, if you allow fully free-form outputs from agents, the verification/oversight mechanism completely breaks down, and you get even less out than if you had, say, forced a particular structure that somewhat restricted what the agents could do.

{% end %}

{% detail(title="Debate", default_open=false) %}
We might want to use fab to carry out debate, between:

- the human researcher and the executor agent;
- two separate executor agents chasing different threads in the same workstream;
- an executor agent and its falsifier agent;

The hope there would be that the debate contains more information than either side presenting its own arguments. Ideally the debate helps to elicit the crux of the research question — sometimes asking the right question is an extremely valuable contribution.

{% end %}

{% detail(title="Which fields are productive?", default_open=false) %}
[Automated Alignment Is Harder Than You Think](https://arxiv.org/abs/2605.06390) makes the observation that there are differences in productivity between academic fields. Part of the explanation is whether it is possible to discard unproductive hypotheses in a given field. If it isn't possible, or if it takes a long time, progress in that field is extremely slow. That implies we need a way to distinguish between productive and unproductive hypotheses. Historically, reproducibility has been a mechanism to do this. There are other methods, but they are more uneven; for example a great mathematician can probably discern through intuition when an approach is fruitful, but a mediocre mathematician might make matters worse.

{% end %}

Overall I think these are fascinating points which we may have to revisit if agents can do science at scale.[^sarcastic] I have, however, tried to steer clear of the big-big questions, because I don't want to boil the ocean ("before designing fab, I have to figure out science" is not a workable goal). My plan is to move outward from a useful prototype.

---
### Why write this?

Even though this work isn't ready, I wanted to write about it for a few reasons, most of which are selfish:
- to get feedback from others who might be thinking about similar things. It's a fairly popular topic among people who work on agents, though I think the motivation and design are quite nuanced. "X doesn't seem correct" is the best kind of engagement;
- to gain clarity about what is actually difficult when building fab; to understand what it is and what it is not;
- to overcome the fear of looking stupid in public. [This piece](https://sashachapin.substack.com/p/if-you-have-writers-block-maybe-you) seems correct;
- to disseminate partial work and maybe stimulate collaboration;

[^name]: As in, semiconductor fab. Also, lowercase, because that's cool these days.

[^scalable-oversight]: Delegating the judgement unlocks scale, but takes away alignment. I think scalable oversight has some hairy problems, and I am trying to dodge them if I can by *not doing scalable oversight*.

[^comparison]: If that's difficult, imagine you are a [principal investigator](https://en.wikipedia.org/wiki/Principal_investigator) managing a bunch of capable-but-junior researchers. Or copies of you. Or, in the future, copies of von Neumann.

[^capability]: I am assuming somewhat aligned agents, plus a harness that allows us to implement control techniques, which is why the failure modes are pedestrian with respect to the alignment problem proper.

[^sarcastic]: Or maybe not think about at all, if the agents are too good.
