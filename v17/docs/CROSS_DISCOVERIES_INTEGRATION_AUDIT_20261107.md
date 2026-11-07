# MagicPerspective V17 — verified cross-discovery audit, 2026-11-07

## Verdict

The earlier real-corpus V17 test did NOT cover all recent PRs. This research audit tested them as independent modules against the SAME original V17 source files, and separately checked V20 and the shared-world core in their own preserved revisions.

Evidence: https://github.com/dan3s2020/MagicPerspective/actions/runs/42319454367

Source versions pinned:
- PR #35: 26054133e0812b321e05adac093bff57c46be73f
- PR #32 local frames: 282a393264564bd901fe944520f19240bf40393d
- PR #34 coupled axes: f3155b3d978f42a1fcf9911de6bd7a8d214bd606
- Holonomy (descendant of #34): c85ecd63de7a3aac11dadd87c506360fe77d406e
- V20 native hypermaze: b6a5d3aba4784fe7643509f03906ec4bb1752199
- V17 shared-world core: 40c12dc6e72935863763f9f5ccc663024b3a7687
- main archival snapshot at audit start: 5c013b3cf34d3facf9eb41d49eab98dad7b3cdb1

## Actual combined execution

The workflow imports only ADDITIVE research source files and tests from pinned sibling branches. The production V17 files devour/brain.mjs, align.mjs and concepts.mjs are SHA256 checked byte-identical before and after. No old UI, saved checkpoint, or existing working branch is edited.

- All real-corpus/axis-gating, local-frame, coupled math axes, holonomy, frozen native text and original V17 observer tests executed together on one unchanged V17 checkout: **73/73 pass**.
- Original isolated V20 worker/source/cognition/UI tests at the exact prior V20 revision: **26/26 pass**.
- Original opt-in shared transformation V17 Brain and HTTP tests at its own revision: **6/6 pass**.
- **Total 105 passed, 0 failures.**

These results prove TEST co-existence of additive modules and separate integrity of incompatible production branches. V20 and shared-core were NOT actually merged into the V17 research model.

## New cross-branch measured findings

Native Brain on 100 real MagicPerspective documentation paragraphs:
- 8,264 learned original text tokens and 110 native contextual edit operators;
- 99 adjacent real document-paragraph pairs probed as potential multi-number action observations;
- 0/99 suitable numeric paired transformations for CoupledTextMaze;
- 0/99 suitable nonlinear state-dependent pairs for StateDependentTextAxes.
- 353 diagnostic held-out tokens: 7.08% native and 7.37% validation-gated (tiny text split, not enough to establish useful improvement).

Critical conclusion: real, unrelated text passages do not automatically provide observable interventions in a mathematical world. Claiming the model learned a general arithmetic operator from such passages would be incorrect.

In a SEPARATE controlled arithmetic transition experiment, both models received the same genuine observed numeric pairs. The experimental nonlinear model learned to predict 5*6=30 → 6*7=42 through two steps, while the original one-edit model could not navigate that unseen numerical state. This establishes an architectural capability gap, NOT general semantic language learning.

The production original Brain and AligningGraph.write() were inspected: they do NOT import the learned local frames, coupled math fields, or path holonomy. All these research modules remain unconnected to the original text generator and UI.

## Important latest discovery: path history can itself be a necessary dimension

Holonomy test re-run through VALID audit workflow:
- X then Y reaches numeric state (6,7,48), while Y then X reaches (6,7,47).
- Closed X,Y,-X,-Y loop returns to same visible x,y but changes dependent value.
- 200 new random paths: 200/200 exact when a signed-area path-memory coordinate is retained;
  only 5/200 exact with endpoint-only prediction; 3/200 when path memory is shuffled.
- On repeated k-by-k loops, hidden value change scaled proportionally to k².

For this explicitly locally affine, two-axis noncommuting world, ONE signed traversal-area statistic is sufficient to replace full history for its dependent coordinate. The compression is mathematically derived and hand-programmed, not autonomously invented by the native Brain. This is a useful candidate hypothesis about language context/history, not proof of quantum dimensions or universal text understanding.

The same test demonstrates the extra memory coordinate is unnecessary for the commuting/integrable multiplication field.

## Negative cross-evidence: native V17 text geometry

PR32 native frozen-text evaluations:
- Existing original AligningGraph: 51.4375% correct;
- native symbol Geometry interpolation: 51.2625%;
- new contextual Geometry interpolation: 51.2625%;
- scrambled contextual geometry: 49.725%.

These tests were re-run and passed, including their assertions of the NEGATIVE result. Therefore a geometric score term alone is not an improvement over original V17 text prediction.

## V20 and shared world-core, without conflating branches

V20 proves shortest paths through a graph of OBSERVED symbol successor edges toward a KNOWN target. It does not solve unseen free-form text semantically; its dedicated sparse graph uses Node.js CPU.

The shared-world V17 branch updates the SAME opt-in learned action/effect policy using real text, maze, and transformation experiences. Tests establish cross-world weight influence and checkpoint restoration. It is not an independently demonstrated universal semantic physics engine, and is not merged into PR35.

The original Path-Holonomy CI workflow failed before creating any jobs: its YAML contains an unquoted step name with the text "Hypothesis: route-area ...", which has an illegal colon in a plain scalar. The independent audit workflow quoted its step names correctly and ran the math and real V17 tests successfully. The original other agent's branch was left untouched.

## What remains before a true full MagicPerspective language labyrinth

1. Learn local action-effect transforms from ACTUAL text state/intervention/next-state observations, not unrelated paragraphs.
2. Discover whether path-history sufficient statistics predict text consequences, using held-out states and contrasts.
3. Connect action-conditioned planning with native text generation through a DEFAULT-OFF, A/B-tested, checkpoint-safe V17 integration.
4. Preserve original UI/buttons and show REAL before-action shape, observed transition, noise branches and corrected route live.
5. Prove correctness on hard new mathematical/text tasks against native original V17, shuffled actions, blank/noise axes, and removed path memory.
6. Test GPU/CUDA execution separately on appropriate devices; Linux Node CI is no evidence of all-CUDA training.

The user requested actual code integration rather than another demo. This audit does NOT claim such full integration. It identifies which missing pieces must be implemented and what tests would make the claim valid. Do not merge unsupported experimental branches over working production.
