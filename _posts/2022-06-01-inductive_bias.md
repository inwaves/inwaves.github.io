---
title: "Inductive bias of neural networks on 1D regression: an empirical examination"
date: 2022-06-01
categories: [Machine learning]
---

The full write-up of my dissertation is now public [here](https://drive.google.com/file/d/10u8LjfHjnfsqv8Jtre90Ysf93LDHLDKt/view?usp=sharing). You can also find the code on [Github](https://github.com/inwaves/nn-inductive-bias-regression). 

Here is the abstract:

> Modern network architectures generalise well even when the size of the network is very large relative to the amount of data it is trained on. This contradicts the received wisdom from statistical learning theory that models with high capacity overfit training data and do poorly on test data. One explanation for why neural networks generalise so well comes in the form of an implicit bias of the optimisation process. Recent theoretical results pinpoint the bias of gradient descent optimisation toward a class of smooth functions called interpolating splines. In this paper, we conduct a large-scale empirical evaluation of these results in the univariate regression case when subjected to changes in the training set-up along several hyperparameters commonly tweaked in practice. We find that these results are robust for shallow networks, but that the bias seems to change as network depth is increased. We additionally highlight several areas that could be further explored in order to better understand this bias and to generate practical recommendations for future machine learning systems.

