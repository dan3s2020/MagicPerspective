# Source-data validation failure and correction (recorded before code change)

Date 2026-11-19. First genuine native policy runs
https://github.com/dan3s2020/MagicPerspective/actions/runs/44614930436
both **FAILED before learning**. Input preflight found **one invalid/non-140nt or non-ACGT** record in the upstream *Donor_Train_Negative.txt* FASTA source and stopped due to a needlessly stricter-than-preceding HS3D parser.

The earlier externally verified `run-native-donor.mjs` and the independent PWM control both **exclude** unusable upstream records, preserving valid 140nt A/C/G/T observations and original raw source checksums. We must use the same policy for direct comparability.

Minimal correction requested:
- Do not fail on a minority of malformed genuine upstream source records.
- Exclude them from training only, count and disclose `rejected` per source file in raw output.
- Still fail for zero or insufficient valid rows.
- Preserve original Brain/policy, training/calibration/dev splits, fixed views, source SHA, native learning equations and all other lines.
- Run both original native modes on authentic source, and record any further failure; do NOT change target or scoring.

The two initial runs generated no scored results and cannot be represented as a negative biological experiment.
