# Native Brain forecasting the future from actual atmospheric history
Date: 2026-11-13

## Evidence first — not a fallout or radiation model

This work runs **the actual original MagicPerspective V42** `Brain`, imported without modifying its original files from Git commit `ac205b5bc561274b957584a7dee058a1110ab6f8` (`perf/V42-FAST-EXACT-CPU-RESUME-V41FAST-20261107`). All experiments are isolated additive scripts. Their neural algorithm is `Brain.live()`, `Brain.predict()`, or the exact original `AligningGraph.write()` / `imagineAhead()`; the earlier weather maze used the native `Discoverer.shapeGraph()`. No new surrogate language/weather predictor and no fabricated weather target was used.

**This is NOT a nuclear fallout forecast, airborne dose estimate, safety map, validated atmospheric trajectory or prediction of a particular real-world attack.** A real radiological emergency requires professionally validated atmospheric dispersion, actual source data, radionuclides, deposition and physical measurements.

## 1. ERA5 unseen future without external forecast donor

Script `native-future-blind.mjs`, run [43402921573](https://github.com/dan3s2020/MagicPerspective/actions/runs/43402921573).
Hourly actual 2025-08-01..10-31 ERA5 reanalysis for Berlin, Vienna, Budapest, Bucharest. The original organism lived **266,760 symbols / 56,160 time-target exercises** on the first 50 days, after which no future holdout targets were supplied. Selection of the four native context/reader variations used a separate 12-day validation block. Final test comprised about 30 subsequent days:

| Lead | Original organism | Repeat last direction | Interpretation |
|---|---:|---:|---|
| 6h | 47.51% | 52.94% | Organism worse |
| 12h | 38.88% | 41.42% | Organism worse |
| 24h | 36.53% | 35.88% | Tiny advantage, NOT established generality |

Other independent seasonal runs [43403404478](https://github.com/dan3s2020/MagicPerspective/actions/runs/43403404478):
- Spring 2025: 24h 25.11% native vs 25.60% persistence (native worse).
- Nov 2025–Jan 2026: 12h 46.47% native vs 44.95% persistence (native better); 24h 36.17% native vs 37.21% persistence (native worse).
- Jan–Mar 2025 could not run: public ERA5 endpoint returned HTTP 429 daily quota. Treat as MISSING, not zero or failure.

**Verdict:** Native blind future weather prediction was actually executed, but consistent advantage over very simple controls has not been demonstrated.

## 2. Three-level 3D atmosphere lived by the original brain

Script `native-vertical-future.mjs`, run [43403946154](https://github.com/dan3s2020/MagicPerspective/actions/runs/43403946154).
Actual historical forecast archive fields `wind_direction_100m`, `wind_direction_850hPa`, `wind_direction_700hPa`, speed and pressure; 519,480 actual lived native symbols:

| Lead | Original organism | Persistence |
|---|---:|---:|
| 6h | 43.73% | 50.91% |
| 12h | 38.17% | 37.50% |
| 24h | 35.17% | 33.44% |

At 12h the validation-selected codec included 850 hPa; at 24h the selected codec used only surface wind. This does **not** demonstrate that multi-altitude sensing causally improved forecast skill. These are 3D sensory levels in the original Brain's memory, not a genuine moving 4D particle world or validated transport equation.

## 3. Real *pre-issued 24h numerical forecast* as a sensed donor

Script `native-issued24h-organ.mjs`, run [43404566489](https://github.com/dan3s2020/MagicPerspective/actions/runs/43404566489).

Independent **input**: Open-Meteo Previous Runs API `wind_direction_100m_previous_day1`, a forecast field nominally initialised 24 hours ahead of valid timestamp. Its actual publication can lag model initialisation (typically several hours), so do not claim it was necessarily available at the exact nominal 24h mark.

**Verification target:** Open-Meteo Historical Forecast API's stitched near-analysis hourly `wind_direction_100m`, which incorporates meteorological models and observations and is NOT an independent ground-station measurement. Both input and target may share upstream forecast-model information, so they are NOT independent experimental physical observations.

50-day native training, 12-day validation, subsequent 30-day evaluation; Berlin/Vienna/Budapest/Bucharest. Original V42 lived 112,224 symbols / 23,380 forecast-to-observation exercises. One native perspective selected on validation.

| Validation, 1152 origin/timestamp-station forecasts | Correct | Accuracy |
|---|---:|---:|
| Actual original Brain (code 0) | 845 | 73.35% |
| External issued forecast | 845 | 73.35% |
| Persistence | 504 | 43.75% |

| Holdout, 2880 origin/timestamp-station forecasts | Correct | Accuracy |
|---|---:|---:|
| Actual original Brain (code 0) | 1994 | 69.24% |
| External issued forecast | 1994 | 69.24% |
| Persistence | 986 | 34.24% |
| Original Brain when donor direction forcibly shifted 180° at readout | 14 | 0.49% |

**Critical causal audit:** the native original Brain's predictions were **identical to the upstream issued forecast on all 1,152 validation + all 2,880 test records**. This is a demonstrated original-Brain *internal reproduction/assimilation of donor categorical predictions*, not evidence of newly discovered meteorological dynamics, improvement beyond the donor, radiation safety, full autonomy from donor information, or model-operator assimilation. The 180° shift is a deliberately corrupted-signal ablation, not a physically realistic counterfactual weather scenario.

City-specific heldout issued/native agreement: Berlin 72.36%; Vienna 67.22%; Budapest 71.39%; Bucharest 65.97% (720 forecasts each).

## 4. The original Brain's own confidence signal is informative but weak

Independent analysis of the **raw real original Brain** directional distribution readouts (not a replacement predictor):

- Heldout prediction correctness versus native directional confidence: ROC AUC ~0.595 (validation ~0.570).
- Choose a confidence threshold **using only validation**, at the validation median about 0.4311.
- Apply frozen threshold to 2880 heldout records: higher-confidence partition covers 78.58% of test records and yields 72.56% accuracy; remaining lower-confidence partition yields 57.05%.
- These scores are uncalibrated: a score of 0.6 is NOT a 60% probability. These statistics are observational and cannot certify public safety.
- A day-block bootstrap across heldout date blocks gives ~28.68–41.63 percentage point advantage over simple 24h persistence; this measures the *already available external forecast advantage*, not newly acquired independent Brain forecasting ability.

## 5. Attempt to learn sub-bin forecast correction failed

Script `native-issued24h-quantization-organ.mjs`, run [43404861041](https://github.com/dan3s2020/MagicPerspective/actions/runs/43404861041).
Use exactly the same real input/target archive, but allow native Brain additional 16-/32-direction quantization and original multi-perspective sensory experiences; 173,012 original Brain.live symbols.

Validation-selected variant: 24h heldout **67.19%** native vs **69.24%** raw issued numeric forecast and **34.24%** persistence. Therefore **NO predictive correction gain**; expanded learned perspectives can interfere with original native memory. Do not present this as a breakthrough.

## 6. Original organism persistence: verified

Script `native-issued24h-persistent-organ.mjs`, run [43405685666](https://github.com/dan3s2020/MagicPerspective/actions/runs/43405685666).

The ORIGINAL `Brain.save()` serialised the 112,224-experience organism to a genuine 21,884,696-byte `.v8` checkpoint, SHA256:

`fcba7b61006eb8afe69b215831abe70d82105b93829f2d75d3d7a528076ffa77`

The ORIGINAL `Brain.load()` restored identical lived counters and verified the same frozen probe prediction **before** any holdout testing. All holdout results matched the previous 69.24% test.

Original checkpoint + full raw results: [workflow artifact 14027082801](https://github.com/dan3s2020/MagicPerspective/actions/runs/43405685666/artifacts/14027082801). Nothing was merged into `main`.

## 7. Previously verified real-wind maze navigation

[The earlier full research ledger](./RESULTS_2026-11-13.md) and [run 43352063740](https://github.com/dan3s2020/MagicPerspective/actions/runs/43352063740) show `Discoverer.shapeGraph` succeeded 14/14 reachable observed-wind grid paths, 0 unreachable false positives, from 16 real grid points. **The goal and current wind graph were visible.** This is genuine graph navigation on externally discretised weather, NOT a future forecast.

## Scope, falsifiability, next-stage acceptance gates

1. First obtain date-indexed **actual issued** numerical model runs available in real time at decision origin, with known model release latency.
2. Create ONE original organism-owned time-evolving **3D weather state + fourth temporal coordinate**, not a second weather predictor. Real physical transport truth should use independent observation/trajectory evidence, not only forecasts from related models.
3. Keep all future targets invisible and compare not just direction-category accuracy but errors over 6h/12h/24h, location, altitude, physically grounded advection, and uncertainty versus independent forecasts and persistence.
4. To claim a genuinely NEW forecasting discovery, original Brain must improve meaningfully and repeatably over the strongest physically available forecast on **independent unseen periods and geographically separated sites**; any donor copying, target-guided maze, or weak calendar-specific lift is insufficient.
5. Never label air `SAFE` or `UNSAFE` from only wind direction, a confidence threshold or any of these experiments. A certified radiological assessment requires source term, physical dispersion/deposition and measurement by authorized experts.

Primary research status: original Brain can reproduce pre-issued future weather forecast categorical output with verified persistence, and it has conditional blind short-horizon skill, but *independent future atmospheric forecasting beyond existing physical weather models is not established*.

Public data definitions:
- https://open-meteo.com/en/docs/previous-runs-api
- https://open-meteo.com/en/docs/historical-forecast-api
- https://www.arl.noaa.gov/hysplit/
