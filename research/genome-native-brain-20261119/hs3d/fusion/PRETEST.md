# Pre-registered genuine original Brain multi-view evidence integration test

**Date:** 2026-11-20. Written and committed BEFORE any new path-fusion runtime outputs.

## Mechanistic research question

The original MagicPerspective V42 Brain learned two physically meaningful primitive genome sensing actions and demonstrated positive external-source zero-shot transfer: `chain-delayed` trained only on HS3D achieved **62.8125% accuracy, 60.3201% macro-F1** on 1,600 separate DRANet human AG acceptors, compared with the SAME original Brain fixed64 **57.8125%, 48.8743%**. This shows value in **where** it chooses to observe, but final P/N classification currently uses only **the LAST 4 real DNA bases and position token**. We have not demonstrated that the same original Brain combines multiple observed genomic views into one *integrated* conclusion.

Native original `Brain.ctxOf()` uses the last `CTX=6` lived tokens, and `Brain.histOf()` supplies the last **32** ordered tokens to `EmergentChain.play()`. Hence the original organism *could potentially learn* temporal evidence across the whole 3-viewport trajectory without an outside trained model or a new `Brain`, but this must be verified empirically and causally rather than inferred from code.

**New capability test:** after navigating an actual physical two-step path, the original Brain lives the **full observed sensory history + final true label** and learns to predict P/N from *all actually encountered views*, rather than a teacher-chosen single genomic section. Test whether changing prior observed history (while preserving the exact same last real 4nt window) changes its actual P/N inference and predictive accuracy on new sequences.

## Exact genuine data, all previously used science identified

Only original human HS3D AG acceptor real 140nt upstream Train P/N (2,197 unique P, 2,190 N) from `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. No invented positive/negative DNA.
- Original initial native C6 class supervision: 600 P+600 N ×7 real legal 4nt viewports, same original Brain seed20261120, native R2/R3 off/A2.
- Original 1,000 real 2-step delayed outcome-feedback episodes on the next 500 P+500 N, exactly as in the previously frozen `chain-delayed` original experiment. No different action policy or parameter.
- NEW path-fusion class training: first **500** of those 1,000 genuine calibration samples (250P+250N), each with the original trained Brain physically picking two real primitive moves (without exploration), seeing only their real destinations. Construct **one** ordered original-sensory trajectory from genuinely seen symbols:
  `[pos0Token,real4Bases0,actualActionSymbol1,pos1Token,real4Bases1,actualActionSymbol2,pos2Token,real4Bases2]` exactly **17 bytes**, then reveal actual P/N source label plus newline, and have the SAME original `Brain.live()` experience all **19** original tokens.
- Class truth is never supplied to the original Brain before the actual two physical movements and its own existing P/N prediction. It is revealed only after the real path was executed. Input history is not an external embedding, scientific feature engineer, PWM or new network: only the original organism's own actual sensor/action trajectory.
- Frozen original Train-derived 200 P+200 N (indices1100..1299/class) for *exploratory* testing; these labels were already used by prior researchers for other experiments. No untouched/external confirmation claim for any revised path learner.
- Original DRANetSplicer external 1,600 outcome has already been examined. It cannot be reused as a new virgin test for a tuned path learner. Do not do this.

## Predeclared three original-native arms (same A/C/seed/train/calibration)

1. `history-noextra` — exact original two-step Brain without NEW 19-symbol path training; compare full path vs terminal-only prediction and shuffled history read-only.
2. `history-true` — extra 500 *genuine chronological* full original Brain sensor/action paths, each `Brain.live(fullRealPath+actualClass+"\n")`.
3. `history-broken` — same number of extra class-labeled 19-symbol lives and same last real 4nt viewport, but *deliberately pair the first two historical actual 4nt observations from another real calibration case* (offset +37) with the same target's final 4nt view. This destroys temporal causal consistency while preserving same class, prefix length and real genuine nucleotide alphabet. This is a **negative control**, not a valid organism action or alternative genomics dataset.

### Strict evaluation comparisons

Original native primitive policy still selects both movement actions physically, with no future or unseen genomic DNA at decision. On the frozen 400 cases:
- `fullHistory` — predict original Brain's P/N on ordered 17 actually observed path bytes.
- `lastViewOnly` — same exact frozen Brain predicts on final position+4 bases only.
- `historyBrokenReadOnly` — same Brain predicts on 17 bytes with only the *earlier observed* DNA windows replaced by actual observed windows from a different row (no biological target in action selection); final position/base and actual two action symbols unchanged.
- `untrainedFirstView` — Brain P/N from original initial4 to measure before navigation.
- Report macro-F1 primary, accuracy, confusion, how often native P/N changes when earlier actual history is modified, full per-example actions/prediction traces, native lived-symbol continuity, and strict same-length matched training-exposure control.

**Success requires** (a) true chronological fullHistory macro-F1 exceeds same-Brain lastViewOnly by **≥3 percentage points**; (b) true-path training beats broken-path training in macro-F1; (c) perturbing earlier native-history DNA while leaving final view unchanged changes ≥5% of predictions; and (d) new fullPath labels have never entered prior native action selection. Otherwise classify as no demonstrated path integration.

No additional large pretrained model, GGUF causal assimilation, real clinical variant effects, AlphaGenome 2 head-to-head or homology independent biological science is claimed.

**Global scientific novelty UNVERIFIED**, since temporal sequence learning and evidence integration are known concepts. Novel study is whether this original native V42 organism uses its own 32-byte historical perspective on actual real DNA after primitive navigations.

All changes additive in research branch, preserve working original Brain and every user's existing code.
