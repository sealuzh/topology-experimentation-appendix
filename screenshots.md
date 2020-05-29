### Screenshots
The following screenshot of the first evaluation scenario (sub-scenario _basic_) presents the graphical user interface of our tooling.
An interactive version of the topological difference graph is shown in the center accompanied by the identified changes listed on the right. On top is the interface to specify which and how many traces should be considered for constructing the topological difference. It is also possible to specify different periods for both the _baseline_ and _canary_ variants.

All of the rankings presented in the screenshots of this appendix are based on the extended hybrid heuristics (HYB Ext).

#### Basic Scenario of Sample Application
![basic scenario of the sample application](/screenshots/sample_basic.png?raw=true "Basic Scenario Sample Application")

#### Basic Scenario of Sample Application with Interactive Behavior
Single ranking entries can be selected resulting in a graphical highlighting of the respective change in the graphs presentation.
![basic scenario of the sample application interactive](/screenshots/sample_basic_selection.png?raw=true "Basic Scenario Sample Application - Interactive")

#### Delayed Scenario of Sample Application
The following screenshot shows the graphical representation including the ranking for the _delayed_ sub-scenario of the first evaluation scenario.
Note how not only the ranking changes, but also the color coding of the ranking (which is based on the heuristic's scores) and the coding of the edges in the graph.
![delayed scenario of the sample application](/screenshots/sample_delay.png?raw=true "Delayed Scenario Sample Application")

#### Breaking Changes - Basic
The following screenshots cover the second evaluation scenario.
It starts off with the basic sub-scenario followed by the scenarios including simulated performance delays.
![breaking changes basic](/screenshots/breaking_basic.png?raw=true "Basic Scenario Breaking Changes")

#### Breaking Changes - Service J Delayed
![breaking changes j delayed](/screenshots/breaking_j_delayed.png?raw=true "J Delayed Scenario Breaking Changes")

#### Breaking Changes - Service S Delayed
![breaking changes s delayed](/screenshots/breaking_s_delayed.png?raw=true "S Delayed Scenario Breaking Changes")

#### Breaking Changes - Service J and S Delayed
![breaking changes j and s delayed](/screenshots/breaking_delayed_both.png?raw=true "S and J Delayed Scenario Breaking Changes")