# Topology-aware Continuous Experimentation in Microservice-based Applications - Online Appendix

This is the online appendix for our submission at ICSOC'20. It provides the heuristics' source code, a full replication package for the ranking quality evaluation, and screenshots of our interactive tooling.

### Table of Contents
1. **[Source Code](#source-code)**<br>
2. **[Screenshots UI](#screenshots-ui)**<br>
3. **[Ranking Quality Evaluation](#ranking-quality)**<br>

### Source Code
The source code of the implemented heuristics can be found in the folder `heuristics/src`. 
* `rankingAlgorithm.ts` contains the overall generic algorithm presented in Section 4
* `strategies.ts` contains the concrete heuristics' implementations as embodiments of the algorithm

### Screenshots UI
Screenshots are presented [here](screenshots.md).

### Ranking Quality
The replication package for the _ranking quality evaluation_ can be found in the folder `ranking_quality_evaluation`. To execute both nDCG computation and data analysis an installation of _Python 3_ and _R_ (including package `tidyverse` is required).

The package consists of:
* Relevance ratings for all scenarios in folder `relevance` <br>
* Resulting rankings (heuristic output) for all scenarios in folders `running` (Scenario 1) and `multichange` (Scenario 2) <br>
* Script `ndcg.py` to compute nDCG scores based on the relevance ratings and rankings<br>
* Data Analysis script `script.R` to explore results and create plots<br>

Relevance ratings can be adjusted to explore how nDCG scores would change. For every sub-scenario there is a respective relevance-rating file in folder `relevance`. Every line contains a single change (i.e., source and target) plus the rating between 0 and 4.

To compute scores based on the given relevance ratings simply execute `python ndcg.py relevance`.
This creates a `results_ndcg.csv` file containing all nDCG scores for all scenarios, all heuristics, and multiple combinations of parameters (e.g., penalties, number of rankings to consider).

Use our _R_ script `script.R` to explore the results and create plots on demand.