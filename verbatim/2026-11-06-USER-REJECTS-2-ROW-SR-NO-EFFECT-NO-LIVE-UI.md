# 2026-11-06 — user correction / empirical failed experiment (literal source)

## Exact user log (verbatim)

> ℹ duration_ms 255.5245
> MAGICPERSPECTIVE native V17, real-corpus goal-path comparison
> Dataset: D:\training\OpenThoughts3-1.2M rows: 10000 training: 9984 held-out: 16
> Isolated output: D:\MagicPerspective-Multipath-Run resume: false
> Maze lived: 20 self: 3 target attraction: 0.9286
> Maze lived: 40 self: 3 target attraction: 0.9706
> Maze lived: 60 self: 3 target attraction: 0.9815
> Maze lived: 80 self: 3 target attraction: 0.9865
> Maze lived: 100 self: 3 target attraction: 0.9894
> Maze lived: 120 self: 3 target attraction: 0.9912
> Maze lived: 140 self: 3 target attraction: 0.9925
> Maze lived: 160 self: 3 target attraction: 0.9935
> Observed real Q/A: 1 native characters: 50435 elapsed seconds: 58.0
> Observed real Q/A: 2 native characters: 113531 elapsed seconds: 120.1
> Held-out 1/8 V17-shape 0.244 SR-tie 0.244 lexical 0.244 character 0.047 loop-resist 0.047 shortest-paths 24 actual-ties 2
> Held-out 2/8 V17-shape 0.289 SR-tie 0.289 lexical 0.289 character 0.047 loop-resist 0.047 shortest-paths 24 actual-ties 1
> Held-out 3/8 V17-shape 0.286 SR-tie 0.286 lexical 0.286 character 0.039 loop-resist 0.048 shortest-paths 24 actual-ties 2
> Held-out 4/8 V17-shape 0.273 SR-tie 0.273 lexical 0.273 character 0.049 loop-resist 0.049 shortest-paths 24 actual-ties 1
> Held-out 5/8 V17-shape 0.193 SR-tie 0.193 lexical 0.193 character 0.222 loop-resist 0.222 shortest-paths 24 actual-ties 1
> Held-out 6/8 V17-shape 0.286 SR-tie 0.286 lexical 0.286 character 0.039 loop-resist 0.039 shortest-paths 24 actual-ties 2
> Held-out 7/8 V17-shape 0.260 SR-tie 0.260 lexical 0.260 character 0.056 loop-resist 0.056 shortest-paths 24 actual-ties 1
> Held-out 8/8 V17-shape 0.333 SR-tie 0.333 lexical 0.333 character 0.041 loop-resist 0.041 shortest-paths 24 actual-ties 1
>
> METRICS (actual held-out Parquet rows):
> {
>   "heldOutEvaluated": 8,
>   "unseenIndexChecksPassed": 8,
>   "referenceIndexLeak": 0,
>   "goalFieldReachRate": 1,
>   "pathValidityRate": 1,
>   "successorTieGoalReachRate": 1,
>   "actualFieldTies": 11,
>   "actualTieChanges": 0,
>   "repeatFraction": {
>     "window": 24,
>     "original": 0.1061,
>     "loopResistant": 0.0189
>   },
>   "wordF1": {
>     "nativeShape": 0.2704,
>     "successorTie": 0.2704,
>     "lexicalOnly": 0.2704,
>     "nextCharacter": 0.0674,
>     "loopResistantCharacter": 0.0685
>   },
>   "exactAnswer": {
>     "nativeShape": 0,
>     "successorTie": 0,
>     "lexicalOnly": 0,
>     "nextCharacter": 0,
>     "loopResistantCharacter": 0
>   }
> }
> Real evidence, routes, models, checkpoints: D:\MagicPerspective-Multipath-Run
> Raport real: D:\MagicPerspective-Multipath-Run\report.json
> Compare original V17, SR tie-break, lexical retrieval, repeated-text guard in report.json
> Nu reprezinta dovada de intelegere semantica generala sau interferenta cuantica.
> PS C:\Users\DSV>
> PS C:\Users\DSV> if ($LASTEXITCODE -ne 0) {
> >>     throw "Antrenarea sau evaluarea a esuat."
> >> }
> PS C:\Users\DSV>
> PS C:\Users\DSV> notepad "$out\report.json"
> PS C:\Users\DSV>

## Exact user correction (verbatim)

> CE E ASTA? DEMO? TI-AM CERUT DEMO SAU TI-AM CERUT UPDATE-UL DUPA CE GASESTI SOLUTIA LA PROBLEMA SI OBTII REZULTATELE!?!?!? SI NICI NU VAD IN UI TAB ADAUGAT CU MARUSATURI SI GRAFURI SI CHESTII CARE SA ARATE CE AI IMPLEMENTAT,CAT AJUTA LA INVATARE,CAT DE MULST SE FOLOSESTE,CAND,ETC

## Interpretation — NOT user's literal source

- 120000-character cap allowed two unusually long records, starving the training set.
- Native field and SR produced exactly equal score and no changed decisions; retrieved training answers did not generalize.
- Build a LIVE tab in the unchanged original V17 graph UI, based exclusively on backend observations, and display zero/failure whenever results do not improve.
- Instrument real per-exercise usage and truthful held-out evaluations on actual dataset, preserve source and test split, never write fake chart events.
- This note MUST NOT be used to claim complete chat export; it records the current exact user message and the logged empirical results.
