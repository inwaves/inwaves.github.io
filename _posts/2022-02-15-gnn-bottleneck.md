---
title: "Are graph neural networks (GNNs) fundamentally bottlenecked?"
date: 2022-02-15
permalink: /gnn-bottleneck/
categories: [Machine learning]
---

Generally speaking, the performance of neural networks on various tasks scales with their depth. Deep learning has been wildly successful on classification and regression tasks, and most recently on generating novel input. How does scale affect graph neural networks (GNN), a type of neural network designed to take advantage of structured data, where interactions can be modelled as a graph? This project discusses the phenomena of oversmoothing and oversquashing observed in deep GNNs, and evaluates the performance of a hybrid architecture. GraphTrans (introduced in [Wu et al. 2021](https://proceedings.neurips.cc/paper/2021/hash/6e67691b60ed3e4a55935261314dd534-Abstract.html)) is a GNN-transformer hybrid -- a GNN whose readout function is a transformer -- which has recently had promising benchmark results.

The full write-up is available at [this link](../../assets/mpnn.pdf).