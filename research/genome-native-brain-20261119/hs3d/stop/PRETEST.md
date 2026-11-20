# Pre-registered original-Brain native STOP/OBSERVE, observation cost on real human AG DNA

Date: 2026-11-20. This file is created BEFORE any native STOP run. This is a new question distinct from V5 primitive two-step training.

## Hypothesis
V4 Braivour found completing a world != knowing it is complete. Can the original V42 Brain, after making one genuine physical DNA observation, learn to choose STOP vs CONTINUE based on its own native prediction of action success, while paying a real observation cost? It must beat trivial "always continue" in average cost at comparable classification error, not just select STOP always.

## Frozen design
- Same authentic human HS3D acceptor Train source, same SHA ordered original 600P+600N native class train, next 500P+500N calibration, next 200P+200N dev, same native original V42 Brain class and 6-primitive policy as preceding research.
- Original Brain chooses first physical action and sees its true 4nt DNA destination. It then gets two native reward predictions: `Brain.predict(fourActuallySeenBases+previousPrimitive+"g")` for STOP, and candidate primitive rewards for CONTINUE. STOP means final class answer at current physical view; CONTINUE means second original Brain-selected physical action and final class answer.
- The native STOP reward is not a hand-written confidence threshold. Only the world computes whether the original native P/N answer at first view is correct. STOP gets success token `+` when correct, `-` when wrong. CONTINUE receives reward for actual final P/N correctness. Same original Brain.live stores the lived STOP outcome `[fourActualBases,previousPrimitive,g,reward,\n]`, and delayed action trajectories. The original classifier is never replaced.
- Training feedback is allowed on calibration records only, after prediction. No dev label or destination bases enter native STOP choice. The STOP semantic is researcher-authored, as were all other primitives.
- Cost objective measured **post hoc** at 0.01, 0.03 and 0.05 per extra real view; no tuning thresholds on development labels. All actual action choices remain native.
- Compare two arms: `stop-real` (actual STOP outcome feedback) vs `stop-destroyed` (deterministic unrelated STOP feedback, with same native token exposure). Also compare frozen always-continue and always-stop read-only on the same Brain; report native 2-3 view average, accuracy, macro-F1, risk-cost frontier and exact STOP fraction.
- Primary success: native STOP policy has lower mean real observations than always continue while keeping macro-F1 within 1 percentage point on same trained Brain; also outperforms destroyed STOP feedback in error-cost frontier. Secondary: calibration of STOP decision based on native confidence and actual first-view correctness.
- Failure: all-stop collapse, no-stop collapse, class interference, performance/cost worse than trivial policies, or no advantage over destroyed rewards. Must report negative.
- This dev set has been previously examined; any result is exploratory only. Do not reuse already-open 1600 frozen confirmation as untouched.
- Do not modify original Brain source, previously working V5 composition script, or previous results.
