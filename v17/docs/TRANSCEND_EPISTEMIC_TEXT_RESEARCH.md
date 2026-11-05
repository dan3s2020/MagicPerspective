# OCTOPUS TRANSCEND — EPISTEMIC TEXT A/B/C (isolated)

This experiment is a **next-byte text predictor**, NOT an LLM, not text understanding, and not a trained general RSI. Its branch is isolated from the original Capital A/B/C binary UI and CUDA versions. No existing code was edited.

## What actually learns

All learners receive the same text stream, predict the next ASCII byte from earlier characters, then receive the actual next byte as supervised feedback. The correct byte is never given in the input before prediction.

- A: eight independent cells, each learning the output bit conditional on its own previous-character sensor bit.
- B: local one-character and Higher Self two-character frequency predictors, with learned conditional counts and predefined hierarchy.
- C: acquired past character positions plus a generated grammar of exact, case-folded and character-class representations. C selects one using internal validation examples.

The built-in curriculum is a small synthetic English corpus with separate held-out sentences and shared vocabulary. A high score is NOT general language understanding. A/B/C have different information access and capacity, so performance differences alone do not establish recursion or RSI as the causal advantage.

C extends its readable context one position after each 112 training examples until four characters are visible. That exploration schedule is **hard-coded**, not autonomous epistemic meta-learning. It then evaluates candidate representations every 28 experiences. Candidate operations are bounded by a defined grammar; C does not invent primitive operators without human specifications.

## Run from Termux

Clone the isolated branch and execute:

    bash RUN_TRANSCEND_EPISTEMIC_TEXT_TERMUX.sh

Node.js 20+ and curl are required. The launcher runs the text regression test suite before opening http://127.0.0.1:8833/ . The server starts paused and runs on CPU, not CUDA.

Checkpoint data is stored separately in $HOME/Octopus-Text-Checkpoints. Two hash-checked generations support recovery, and corrupted checkpoints are not silently reset. The original binary A/B/C and CUDA code and checkpoints remain untouched.

## Custom text + frozen evaluation

Pause, paste at least five lines of ASCII text (each 16+ characters), then Apply as new curriculum. Every fifth line is held out and never used in training; learned parameters are retained for transfer comparisons. Press Frozen held-out evaluation while paused to measure the A/B/C accuracies and the controlled B/C ablations without changing the models.

tests/epistemic-text.test.mjs covers learning, frozen validation, text transfer, deterministic recovery, and a real Node HTTP server integration.

## Limits

- ASCII-only next-byte prediction. Not UTF-8, Romanian diacritics, free-form typing, question answering, semantic reasoning, or an LLM.
- The C representation grammar is bounded; it does not achieve open-ended autonomous perspective invention.
- Information acquisition is currently scheduled; trainable meta-control, matched-information baselines, causal learning-speed evaluation, retention and the complete RSI experimental oracle remain unimplemented in this mode.
- Binary Capital A/B/C dashboard has not been changed. This version has a separate text dashboard.
