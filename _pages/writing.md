---
layout: page
title: Writing
permalink: /writing/
---

Here are a few projects I've worked on and their write-ups. Some also have a public codebase.

## Non-factorised identifiable variational autoencoders for causal discovery and out-of-distribution generalisation
Abstract: "In many situations, given a set of observations, we would like to find the factors which cause or influence the data we observe. To learn these factors, we can use a deep generative model such as a variational auto-encoder (VAE), which maps the data to a latent space. However, a limitation of the VAE is that it is not identifiable, in the sense that two different sets of parameters may yield the same model. To address this, it is possible to augment the VAE in such a way that it becomes identifiable while remaining capable of flexible representations. This paper explores invariant causal representation learning (ICaRL), an algorithm for causal representation learning with possible applications in causal discovery and out-of-distribution generalisation."

Full [write-up](../assets/icarl.pdf) and [code](https://github.com/inwaves/icarl).

## Sharpness-aware minimisation and label noise
Do flat minima generalise better? Is there a way to bias standard optimisation algorithms like stochastic gradient descent (SGD) to prefer flatter minima? Sharpness-aware minimisation (SAM), introduced by [Foret et al., 2020](https://arxiv.org/abs/2010.01412) is a modified version of SGD that reliably finds flat minima, resulting in improved performance. This project evaluates the performance of SAM on classification tasks where the labels are noisy -- meaning that they do not always represent the correct class.

Full [write-up](../assets/sam.pdf) and [code](https://github.com/inwaves/sam-noisy-labels).

## Are graph neural networks (GNNs) fundamentally bottlenecked?
Generally speaking, the performance of neural networks on various tasks scales with their depth. Deep learning has been wildly successful on classification and regression tasks, and most recently on generating novel input. How does scale affect graph neural networks (GNN), a type of neural network designed to take advantage of structured data, where interactions can be modelled as a graph? This project discusses the phenomena of oversmoothing and oversquashing observed in deep GNNs, and evaluates the performance of a hybrid architecture. GraphTrans (introduced in [Wu et al. 2021](https://proceedings.neurips.cc/paper/2021/hash/6e67691b60ed3e4a55935261314dd534-Abstract.html)) is a GNN-transformer hybrid -- a GNN whose readout function is a transformer -- which has recently had promising benchmark results.
The full write-up is available at [this link](../assets/mpnn.pdf).

## Comparing GPT-3 and RNNs as probabilistic generative models
An investigation of transformers' and RNNs' ability to model long-term dependencies through the lens of probabilistic modelling. You can find the write-up [here](../assets/gpt3rnn.pdf), and the code [here](https://github.com/inwaves/prob-models).

## Investigating short-term climate forecasts with surrogate modelling
Using Gaussian Processes as surrogate models for accurate climate forecasting. This project emulates the UKESM1.0 climate model for precipitation, surface temperature and snow thickness. With ZI Attahiru, M Salam and K Spukas. Write-up [here](../assets/surrogate-modelling.pdf), codebase [here](https://github.com/inwaves/climate-surrogate-model).

## Presentation on "Counterfactual Reasoning and Learning Systems..."
This is a presentation on the paper [Counterfactual Reasoning and Learning Systems: The Example of Computational Advertising](https://www.jmlr.org/papers/volume14/bottou13a/bottou13a.pdf) by Bottou et al. You can find the slides [here](../assets/counterfactual-reasoning.pdf).
