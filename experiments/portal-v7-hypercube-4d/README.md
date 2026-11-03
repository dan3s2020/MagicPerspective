# Portal4D V7 — 4D tesseract view contract

## Source and status

**SOURCE:** `verbatim/2026-11-03-USER-4D-HYPERCUBE-NAVIGATION-VERBATIM.txt`.
The source preserves every original byte of the newest user message, including
the linked Wikipedia quotation, spelling, and incomplete diagonal formula.
The requirement is indexed in `verbatim/recent-user-messages.json` and linked
to code, tests and status in `verbatim/implementation-mirror.json`.

**STATUS: 4D projection mathematics + standalone additive component implemented and tested.
NOT integrated or visually verified in the original `Portal_4D_v7_Universal_Graph.zip` application.**
That exact ZIP is available on the user's Windows PC, but its raw source bytes are
not accessible in this editing session. Do NOT patch a different project and claim
to have modified the original V7 application. Existing V7 START 1 / START 2,
A–H worlds, shared 9,745 parameters, CUDA worker and `universal_brain_latest.pt`
have not been changed by this component.

## Exact viewport semantics

1. A true tesseract has **16 vertices, 32 edges**, and four equal-length
   mutually perpendicular edge directions. The longest diagonal of an
   `n`-dimensional unit hypercube is **sqrt(n)**; in 4D it is **2**.
2. Render a **static, always visible tesseract wireframe** in the user's
   2D screen space as a geometric orientation/reference frame.
3. Eight clickable arrows navigate the abstract 4D graph observer in
   **X+, X−, Y+, Y−, Z+, Z−, W+, W−**; the wireframe does NOT move.
   The world appears to move in the opposite direction: a camera-relative
   projection, not a physical claim that the universe itself moved.
4. `W` is a real fourth numeric coordinate in each graph node. **Never
   synthesize W** from 3D coordinates or from simulated animations.
   The viewer must reject incomplete 3D-only graph payloads rather than
   silently displaying them as measured 4D.
5. Optional **3D cross-section at a selected W**, moved through 4D by the
   W arrow and limited with a section-width slider. The 3D section uses
   the exact same 4D graph data as the full view, not a second graph.
   It can show intersections of edges crossing the section plane.
6. Real motor actions, messages, prediction, executed transitions and
   activated cells are colored and animated only when **original V7
   backend events are supplied**. The renderer generates no fake frames
   and declares disconnected status rather than showing a dummy training demo.
7. The same original UI must retain **START 1, START 2, STOP + SAVE, A–H,
   active training, checkpoints, V7 validation and the original CUDA
   control**; the viewer is additive and may not overwrite them.

## Component API (integration contract, NOT original-source integration)

The V7 app must import `viewer.mjs` and `viewer.css` from an actually served
static directory and mount it into its existing original dashboard:

```js
import {bindPortal4DHost} from './viewer.mjs';
const tesseract = bindPortal4DHost(document.getElementById('ACTUAL_V7_PARENT_ELEMENT'));
```

Here `ACTUAL_V7_PARENT_ELEMENT` is **a placeholder, not an invented original
DOM identifier**. Identify it from the extracted source before integration.
Original V7 engine publishes actual 4D graph state:

```js
window.dispatchEvent(new CustomEvent('portal4d:graph4d', {
  detail: {nodes: realNodesWithXYZW, edges: realObservedEdges}
}));
window.dispatchEvent(new CustomEvent('portal4d:frame4d', {
  detail: {
    step: measuredTrainingStep,
    activeNodes: actuallyActivatedNodeIds,
    messages: realNodeToNodeMessages,
    predictedEdges: realModelPredictions,
    executed: actuallyExecutedEdge
  }
}));
```

These variables describe **required real engine values**, not fabricated values
or guessed source names. The adapter that maps actual V7 model outputs into
this contract is **NOT YET IMPLEMENTED** because the exact V7 Python/HTML
source has not been uploaded in this session.

## Tests

```bash
node --check experiments/portal-v7-hypercube-4d/viewer.mjs
node --test experiments/portal-v7-hypercube-4d/tests/geometry.test.mjs
```

Tests require exact hypercube topology, a fixed on-screen reference while
moving the 4D camera, observable X/Y/Z/W projection changes, W slicing,
precise 4D crossing and rejection of missing fourth coordinates.

A geometry test does **not** certify V7 original UI integration or train-time
CUDA evidence. Keep the full VERBATIM compliance gate blocked until exact
source+integration+visual+regression verification are available.
