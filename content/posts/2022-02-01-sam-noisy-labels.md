+++
title = "Sharpness-aware minimisation and label noise"
description = "Evaluating sharpness-aware minimization's performance on classification tasks with noisy labels"
date = 2022-02-01

[taxonomies]
categories = ["Machine learning"]

[extra]
lang = "en"
+++

Do flat minima generalise better? Is there a way to bias standard optimisation algorithms like stochastic gradient descent (SGD) to prefer flatter minima? Sharpness-aware minimisation (SAM), introduced by [Foret et al., 2020](https://arxiv.org/abs/2010.01412) is a modified version of SGD that reliably finds flat minima, resulting in improved performance. This project evaluates the performance of SAM on classification tasks where the labels are noisy -- meaning that they do not always represent the correct class.

Full [write-up](/assets/sam.pdf) and [code](https://github.com/inwaves/sam-noisy-labels).