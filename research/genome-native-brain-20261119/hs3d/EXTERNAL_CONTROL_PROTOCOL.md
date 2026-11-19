# Native Brain scientific controls — set before comparing external outcomes

The sole purpose of a conventional position-weight matrix (PWM) is to measure whether an existing, simple technique distinguishes true/false GT-containing human HS3D donor sites better than the native MagicPerspective Brain. **Do not replace the organism with the PWM, train on native outputs, or claim PWM is the research solution.**

- Use pinned authentic EnsembleSplice HS3D `e04aa5aeb4035adac9ce6c65c2143c2ef7163332`, donor-positive and donor-negative files.
- Exactly same split as `run-native-donor.mjs`: first 700 positive and 700 negative Train DNA by salted SHA256; next 200 each development; official Test excludes exact training/development DNA overlaps and internal duplicate sequences.
- Fixed NB/PWM binary log-likelihood **without a trained intercept or threshold**: each nucleotide position contributes `log((count_positive_base + 1)/(positive_samples+4)) - log((count_negative_base+1)/(negative_samples+4))`; predict positive iff sum >=0. This is a traditional simple baseline.
- Three explicitly defined input scopes, not selected after results: positions **70:72** (GT-only), positions **72:76** (the native winner's same 4nt view), positions **60:80** (20 bases), and positions **0:140** (all 140 bases).
- All train labels are available for this *separate control only*; final labels are strictly withheld during training and used only by external scorer. No hyperparameter selection, no scaling new architecture based on official Test.
- Report accuracy, macro-F1, balanced accuracy, confusion and per-class precision/recall for all controls, including unfavorable results.
- PWM full140 may be superior; this is expected to be possible and must be reported. Native performance on same data is still an interesting mechanism study, not state-of-the-art genomics.
- Original Braivour/MagicPerspective code, Brain, checkpoint, and donor GGUF unchanged.
