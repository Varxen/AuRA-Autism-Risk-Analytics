- **2.2 Rule-Based Lexicon Matching**
  - Ilarawan ang `machine-learning/behavioral_indicators_lexicon.json` bilang kasalukuyang baseline lexicon.
  - Huwag ipahiwatig na validated o direktang kopya ang lexicon mula sa M-CHAT-R/F, Q-CHAT, o CSBS-DP ITC kung wala pang aprubadong cross-reference.
  - Ipakita na ang kasalukuyang tanong ang nagtatakda ng indicator na hahanapan; huwag pumili ang matcher ng ibang indicator.
  - Gawing malinaw ang output: matched indicator at matched phrase/cue. Huwag tawaging behavioral conclusion o score ang simpleng phrase match.

- **2.3 Context and Behavioral Interpretation**
  - Alisin ang hakbang na muling nagtatanong ng "How often does this kind of behavior happen?" dahil nakapili na ang magulang ng Always/Sometimes/Never o Yes/Sometimes/No bago sumagot sa follow-up.
  - Palitan ang frequency detection ng pag-interpret sa follow-up text at pag-check kung tugma ito sa napiling structured answer.
  - Kung malinaw at tugma ang sagot, ipasa ang na-interpret na observation sa 2.4.
  - Kung magkasalungat o malabo ang sagot, humingi ng paglilinaw sa kasalukuyang follow-up; tukuyin sa flowchart ang retry limit at gagawin kapag hindi pa rin malinaw.
  - Ihiwalay ang polarity/context (hal. may tugon o walang tugon) sa frequency (Always/Sometimes/Never). Huwag ipagpalagay na ang `positive_terms`, `concern_terms`, o `negation_terms` lang ay sapat nang magbigay ng tiyak na interpretasyon.
  - Alisin o linawin ang "Frequency Normalization" na para bang kinukuha rito ang frequency mula sa free text. Nasa structured answer na ang frequency; gamitin iyon bilang pangunahing frequency value.

- **2.4 Ordinal Feature Encoding**
  - Ipakita ang magkahiwalay at tamang mapping para sa dalawang pangkat:
    - Q1-Q9: Always = 0, Sometimes = 1, Never = 2.
    - Q10-Q13: No = 0, Sometimes = 1, Yes = 2.
  - Huwag gamitin ang Always/Sometimes/Never mapping para sa Q10-Q13.
  - Ipakita kung paano hinahawakan ang hindi nasagutan, hindi valid, o hindi pa nareresolbang sagot; huwag tahimik na gawing 0.
  - Panatilihin ang parehong ayos ng 13 feature sa questionnaire, training data, at model inference.
  - Ipakita ang iisang Numerical Feature Vector na ipapasa sa lahat ng modelo; huwag magpakita ng magkakaibang input vector para sa LR, RF, at XGBoost.

- **3.1 Multi-Model Classification**
  - Ipakita na pare-pareho ang training records, feature definitions/order, at target labels na ginagamit ng LR, RF, at XGBoost.
  - Ihiwalay sa diagram ang score-derived target label at ang model prediction; huwag ipahiwatig na ang score-derived label ay independent clinical ground truth.

- **3.2 Soft Voting Ensemble**
  - Palitan ang "Majority Voting" at "Vote Count" ng pag-average ng class probabilities mula sa LR, RF, at XGBoost.
  - Piliin ang klase na may pinakamataas na average probability; tiyaking consistent ang class order: Low, Moderate, High.
  - Palitan ang "Final ASD Risk Classification" ng "Model-predicted score-based category" o katumbas na label na hindi nag-aangking clinical ASD risk.
  - Markahan ang probabilities at classification bilang demonstration/model output; hindi ito posibilidad na may ASD ang bata o clinical diagnosis.

- **End-to-end flow**
  - Ipakita ang buong ayos: napiling structured answer at follow-up text -> preprocessing -> question-specific lexicon match -> context/consistency interpretation -> 13-value encoding -> tatlong model probabilities -> soft-voting average.
  - Panatilihin ang orihinal na sagot at follow-up text ng magulang; itala nang hiwalay ang system interpretation.
