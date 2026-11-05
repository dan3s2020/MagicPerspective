# TORUS-AETHER A/B/C — measured

Branch `experiment/TORUS-AETHER-ABC-20261104`, parent `experiment/TRANSCEND-EPISTEMIC-TEXT-A-B-C-20261030` (`cba83b0`).
`transcend/epistemic-text/engine.mjs` is not changed (a test checks this). A, B and C learn exactly as before;
the new layer only reads their beliefs and mixes them.

## The construction

From the Portal 0D → 2D ⊕ 2D = 4D: A lives in plane XY, B in plane ZW, they share only the origin, and a point of
the Clifford torus is A + B with radii r₁ = cos η, r₂ = sin η (r₁² + r₂² = 1).

- **Aether** = probability mass. Every belief sums to 1, every mix sums to 1: it flows, it is never created or lost.
- **Torus**: field F = cos²η·P_A + sin²η·P_B; C enters through a second angle: P = cos²χ·F + sin²χ·P_C.
- **Aether through all wires**: the wires are A, B and all 45 perspectives C generates (C trains all of them but
  promotes only one). Each point of the market keeps how much aether flows through each wire. After the true byte is
  revealed, the flow through a wire is multiplied by how much that wire believed it (least resistance, coagula),
  renormalised, with a small leak so no wire dies (solve).
- **The market (crystal mode)**: points are global → previous character → previous two characters. A finer point is
  born from its parent and only speaks after it has carried 20 updates of flow (crystallisation).
- Angles and flows are learned online by the gradient / likelihood of the true byte, only after all predictions were
  made. Held-out evaluation is frozen.

## Results (held-out characters, never trained on)

Real corpora: 5 corpora of ~99k ASCII characters (repository docs and license texts), every 5th line held out.

**Mean over 5 corpora, by training steps**

| steps | B | C (current best) | torus | aether |
|---|---|---|---|---|
| 1 000 | 29.1% / 4.51 b | 25.6% / 4.60 b | 28.9% / 4.25 b | 27.9% / 4.22 b |
| 3 000 | 36.5% / 3.83 b | 34.6% / 4.08 b | 37.8% / 3.72 b | 36.7% / 3.65 b |
| 10 000 | 40.8% / 3.15 b | 46.0% / 3.45 b | **48.3%** / 2.97 b | 47.4% / 2.96 b |
| 40 000 | 41.0% / 2.91 b | 52.0% / 2.83 b | 51.8% / 2.57 b | **52.4% / 2.54 b** |
| 120 000 | 41.6% / 2.82 b | 57.1% / 2.65 b | **58.7%** / 2.35 b | 58.6% / **2.32 b** |

(accuracy of the top byte / bits per character; lower bits = less surprise)

**Projectio (learn on one domain, test on the other, 40 000 steps)**

| | C | torus | aether |
|---|---|---|---|
| licenses → repo docs | 34.2% / 4.09 b | **35.9% / 3.67 b** | 35.1% / 3.71 b |
| repo docs → licenses | 34.9% / 4.16 b | 37.5% / 3.69 b | **38.5% / 3.70 b** |

**Synthetic corpus (engine's 8 sentences, 5 000 steps):** C 77.5% → torus 82.5%, aether 82.5%.

## What the measurements say

1. The torus beats the best single learner at every training length from 3 000 steps on, and in both transfer
   directions: about +1.5 to +3.6 points of accuracy and 10–12% fewer bits per character.
2. The gain is mostly in surprise (bits), less in the top-1 byte: the mix knows better *how sure* to be.
3. **A carries almost no aether.** The learned A:B share is 0–5 : 95–100, not 20:80. A's bit cells predict about
   5% of characters alone; the field learns to route around them. B and C share the flow; C takes 45–76%.
4. Ablation: the torus without C (A + B only) equals B. The gain comes from B and C meeting in the field.
5. The local field matters: one global angle helps less than angles that vary over the market (previous characters).

## Run

```
node --test tests/torus-aether.test.mjs
node transcend/torus-aether/measure.mjs 40000                 # synthetic + repo docs
node transcend/torus-aether/measure.mjs 40000 my-text.txt     # any ASCII text file, one corpus each
```

Node.js only; works the same in Windows PowerShell and Termux.

## Entanglement (added 2026-11-04, `entangled.mjs`, `measure-entangled.mjs`)

Definition taken from the repo itself (`CONCEPTS/COMPLEMENTARY_COUPLED_ORGANISMS.md`, Same-Dish Entangled A/B):
independent organisms, one shared medium, each sees only the OTHER's observable behaviour, complementary roles,
proof = LIVE vs MASKED OTHER channel with the same frozen parameters on held-out data.

In text: the medium is the stream; the observable behaviour is the byte an organism is about to type and how firmly.
One step, in the dish's resolution order:
1. the seeker (B, or C) shows its intended byte;
2. A sees it and answers with a counter-byte. A's private table learns **only from the seeker's rejections**
   (the resistance explorer), through its own view of the medium: the whole word being typed (up to 12 bytes),
   which no 4-byte window of B or C reaches;
3. the seeker sees A's byte and how firmly A shows it, and re-reads by learned trust.
No tables, weights or states cross; engine.mjs learners are untouched; MASKED returns exactly each organism's own belief (tested).

Development path, measured (5 real corpora, 40 000 steps, 2 000 held-out bytes each):
- **mirror** (A reads B's intent, learns from every byte): A goes 4% → 42% LIVE, back to 4% MASKED — causal, but A
  only copies B (rescues 5–28 of ~1 100 B errors).
- **complementary on 2 bytes**: A shows the right byte in ~28% of B's errors, but B cannot use it (C already knows it).
- **complementary + A sees the word**: A shows the right byte in 35–45% of B's errors; B after reading A:

| corpus | B MASKED | B LIVE |
|---|---|---|
| licenses 0 | 43.0% | **47.6%** |
| licenses 1 | 43.4% | **48.0%** |
| licenses 2 | 45.0% | **47.9%** |
| repo-md 0 | 38.8% | **44.1%** |
| repo-md 1 | 36.1% | **38.1%** |

- **triad** (A explores both B's and C's rejections; B and C each re-read A; everything flows into the market):

| corpus | C MASKED | C LIVE | market MASKED | market LIVE | C errors fixed by C~A |
|---|---|---|---|---|---|
| licenses 0 | 54.4% | 54.6% | 53.6% / 2.56 b | 54.3% / 2.51 b | 32 / 913 |
| licenses 1 | 56.1% | **57.7%** | 55.5% / 2.29 b | 56.3% / 2.24 b | 52 / 877 |
| licenses 2 | 54.9% | **57.1%** | 55.6% / 2.29 b | 56.4% / 2.26 b | 115 / 903 |
| repo-md 0 | 51.1% | 51.3% | 51.3% / 2.63 b | 51.6% / 2.58 b | 32 / 977 |
| repo-md 1 | 42.9% | **44.0%** | 43.5% / 2.99 b | 44.3% / 2.94 b | 56 / 1 143 |

LIVE beats MASKED for every entangled organism on every corpus: the coupling is causal. C entangled with A beats C
alone on all 5 corpora (mean +1.1 points). The market's top-1 accuracy stays about where the non-entangled market
was (its flow follows likelihood, so it gains in bits, −0.03 to −0.05, more than in top-1). In the market's flow the
entangled wires carry the most aether (B~A 28–55%, C~A 8–31%); plain A carries none.

```
node transcend/torus-aether/measure-entangled.mjs 40000 my.txt            # triad (default)
node transcend/torus-aether/measure-entangled.mjs 40000 my.txt --pair     # A <-> B only
node transcend/torus-aether/measure-entangled.mjs 40000 my.txt --mirror   # the copying version, for comparison
```

## Emergent chain — six local rules (`emergent.mjs`, `measure-emergent.mjs`)

Instead of giving A the word by hand, A grows its own perception. Between organisms (R1–R3), inside each organism (R4–R6):

1. **SHOW** — an organism exposes only the byte it intends and how firmly.
2. **RESISTANCE** — the next organism in the chain learns only where the previous one was rejected: C → A1 → A2 → …
3. **TRUST** — going back down the chain, each organism re-reads its successor's byte by learned trust.
4. **FLOW** — aether is conserved inside an organism; wires that believed the truth thicken; a small leak.
5. **BUDDING** — the wire carrying most flow buds a child that sees one byte further back (or the same bytes folded);
   the child is born with half the parent's flow and speaks with the parent's voice until it has experience.
6. **DISSOLUTION** — a wire that keeps almost no flow dissolves; its children pass to its parent.

Every A starts as one wire seeing one byte. 5 real corpora, 40 000 steps, top-1 accuracy on held-out:

| corpus | C | C ↔ A, word given by hand | emergent chain, 1 A | emergent chain, 2 A |
|---|---|---|---|---|
| licenses 0 | 54.4% | 54.6% | 54.4% | 55.5% |
| licenses 1 | 56.1% | 57.7% | **57.9%** | 56.3% |
| licenses 2 | 54.9% | 57.1% | **57.4%** | 56.5% |
| repo-md 0 | 51.1% | 51.3% | 49.6% | 51.2% |
| repo-md 1 | 42.9% | 44.0% | **44.1%** | 43.4% |
| **mean** | 51.9% | 53.0% | 52.7–52.8% | 52.6% |

MASKED (no shown bytes cross) returns exactly C on every corpus (tested).

What emerged: each A converged to a stable form of its own, different per medium — e.g. 95% of its aether through
"the last 2 bytes" on licenses 1 and 2, through long folded views (9–10 bytes) on licenses 0. Six rules and a single
starting wire reach, within ~0.3 points, the A whose perception was designed by hand.

Measured and not kept as default:
- chains of 2–3 A are not better than 1 A;
- a strong metabolism for R6 (dissolve below 1% flow) — 51.7% mean; with a maturity period before judging a wire —
  51.8%: young or long wires die or overfit; the gentle default threshold (2·leak/wires) is better.

```
node transcend/torus-aether/measure-emergent.mjs 40000 my.txt
```

## Search over rule arrangements (`search-rules.mjs`)

Every rule switched off in turn, alternatives and parameters, then combinations around the winner.
5 real corpora, 40 000 steps, held-out top-1 accuracy (mean, then per corpus):

| arrangement | mean | per corpus |
|---|---|---|
| C alone | 51.87% | 54.4 56.1 54.9 51.1 42.9 |
| C ↔ A, word given by hand | 52.98% | 54.6 57.7 57.1 51.3 44.0 |
| all 6 rules | 52.77% | 54.4 57.9 57.4 49.6 44.6 |
| − R3 trust | 45.97% | trust is essential: without it the chain falls far below C |
| − R5 budding (A keeps 1 wire) | 51.79% | budding is essential |
| R5 replaced by "all wires born at start" | 51.79% | growing beats having everything from the start |
| − R6 dissolution | 52.76% | no effect |
| seeker B instead of C | 42.70% | C must lead |
| − R2 (A learns from every byte, not only rejections) | 53.65% | |
| − R2 − R4 (no flow selection inside A) | 55.28% | 57.0 59.4 59.0 54.4 46.7 |
| **− R2 − R4, budding every 100** | **55.51%** | **57.7 59.6 58.9 54.7 46.7** |

Found by the search: the arrangement that works is **fewer** rules, not more —
1. C shows its byte; 2. A answers, learning from every byte what C's shown byte means in its own view of the past;
3. C re-reads A by learned trust; 4. A's perception grows by budding (each new wire sees one byte further, or the
same bytes folded), and every wire keeps speaking (newer wires share flow with their parents by halving).
Letting flow select a winner wire inside A (R4) and learning only from rejections (R2) both hurt: A collapses onto one
view (95% of its flow on one wire); keeping all its views alive is better (+2.5 points over the 6-rule version,
+3.6 over C alone, +2.5 over the hand-designed perception).

## Starting from nothing, and the living graph UI

`empty: true, fold: false` — A is born with no wire (its first wire appears with its first experience) and has no
built-in knowledge of letter case: perception is only "how far back I look". Same search setup, 5 corpora, 40 000 steps:
winner 55.51% → **empty, no fold 56.03%** (58.1 61.1 58.9 54.5 47.6). Giving nothing is better than giving something.
120 000 steps, winner arrangement: **62.06%** vs C alone 57.09% (63.7 70.3 62.9 58.7 54.6 vs 58.5 64.8 58.5 54.1 49.6).

UI: run the server in `transcend/torus-aether/ui` with an optional text file and port → http://127.0.0.1:8840/.
The graph starts empty: no node, no edge, no target, no action. Symbols are born when the stream first shows them,
C's perspectives when C first acts through them, A's perceptions when A buds them; edges are born from what happened
(what follows what, who saw correctly, who budded whom, A correcting C) and fade when it stops happening. Training
runs in the page; "Testează pe text nevăzut" measures held-out LIVE vs MASKED with frozen parameters
(repo docs: C 51.9%, graph 59.5%, MASKED 51.9%). Screenshot: `transcend/torus-aether/ui/screenshot.png`.

## Where noise belongs, and concepts in 5D (`lab.mjs`, temperature option of `EmergentChain`)

Measured on the empty-start winner:

| where the noise is | result |
|---|---|
| temperature of what organisms show while learning (5 corpora) | T 0: 56.0% · 0.1: 55.6 · 0.3: 55.5 · 0.5: 54.9 · 0.7: 53.7 · 1: 52.8 · 1.5: 52.1 · 3: 51.9 (= C). Monotonic loss, no resonance |
| noise in what A perceives while learning (2 corpora) | q 0 → 0.2: 61.1→57.9% and 54.5→51.5%. Flat then loss, no resonance |
| temperature of free writing (licenses 1) | T 0: loops 97%, real 97% · 0.4: 46/96 · **0.6: loops 21%, real 86%, alive 68%** · 0.8: 6/56 · 1: 1/25 · 1.7: 0/1. Clear resonance |
| repulsion noise in the geometry (symbols in D dims) | D 5: noise 0 purity 78% (chance 60) · 1: 86 (49) · **3: 89 (53)** · 10: 86 (51) |

Concepts emerge with no number of groups and no classes given: in 5D the symbols separate into upper-case letters,
lower-case consonants, digits, and space-with-punctuation. Without noise (no repulsion) they do not separate well.
2–3D are too cramped (purity 58–77%); 5D is the first dimension where the groups come out clean; 10D gives purer but
smaller and more numerous groups.

Reading: learning what is true stays deterministic; noise belongs to the geometry (polarity: what pushes apart) and to
expression (what the graph writes or does), where determinism loops and full randomness dissolves, with a peak between.

## Ouroboros: learning from its own writing (`lab.mjs ouroboros`)

One lived byte + one byte of its own writing per step, 40 000 steps, held-out accuracy / bits, then free writing at T 0.6:

| arm | licenses 1 | repo-md 0 | its free writing afterwards |
|---|---|---|---|
| lived only | 61.1% / 2.42 b | 54.5% / 2.86 b | loops 16% / 5%, real 85% / 82% |
| own writing T 0 | 58.4% / 2.74 | 53.0% / 2.89 | "contributor contributor …" loops 93–96% |
| own writing T 0.6 | 58.2% / 2.69 | 53.8% / 2.78 | "ta ta ta …", "rrrrr…" loops 91–99% |
| anchored T 0.6 (5-gram must exist in the lived stream) | 58.9% / 2.66 | 53.7% / 2.90 | "in in in …" loops 87–98% |
| anchored + the dream dissolves when it repeats itself | 62.0% / 2.60 | 54.8% / 3.08 | "in in in …", "and and and …" loops 71–98% |

Reading its own writing collapses the graph into loops in every arm — the same degeneration as a looping language
model. A local anchor (each piece is real) does not stop it; a whole-dream anchor (no self-repetition) stops the loss in
top-1 accuracy (+0.9 / +0.3, within noise) but makes the graph overconfident (more bits) and its writing still loops.
Conclusion: the graph must learn only from the lived world; its own writing can be expression, not teacher.

## Improvising through concepts, and richer time (all measured against the empty-start winner, 5 corpora, 40 000 steps)

| arrangement of A's perception | mean held-out |
|---|---|
| **winner: exact bytes, all wires speak equally** | **56.03%** |
| + wires that see the past through emergent concepts (mixed in) | 54.25% |
| + precedent rule: exact wire without a precedent improvises through its concept twin | 55.68% |
| + near past sharp, far past blurred into concepts (mixed / precedent) | 54.81% / 54.63% |
| + event time (past cut where lived transitions are rare) | 55.41% |
| + log time (bins 1 · 2 · 3-4 · 5-8 · 9-16 · 17-32, older bins unordered) | 55.67% |
| any of the above, wires weighted by how many precedents they have here | 53.1–53.5% |
| any of the above, wires weighted by how far back they see (when they have a precedent) | 55.2–55.6% |

None beats the winner on these worlds. Coarse views (concepts, events, blurred bins) lose the letter identity that
next-byte prediction needs here; weighting by evidence favours short generic contexts. With ~80k lived bytes per world
the information that predicts the next byte is local; richer time can only pay where the world has longer structure
and is larger than what can be memorised.

## Devouring worlds in parallel (`devour/`, `lean-c.mjs`, `START_V17.ps1`)

- **Memory first.** A graph used ~3.5 GB per million characters (every memory row reserved 128 slots). Rows are now
  sparse, and a row lived only once is just the byte: ~0.65 GB per million (5.4× less). `lean-c.mjs` is C with the
  same decisions stored lean; `tests/torus-devour.test.mjs` checks it predicts, promotes and believes exactly like
  `engine.mjs` (unchanged). The winner's result is unchanged (58.15% on licenses 0).
- **Solve.** Past the memory budget, rows lived only once dissolve (they never speak anyway: a row needs 2 cases).
- **Many graphs at once.** One worker thread per graph; each devours its own share of OpenThoughts (exercise k, k+N,
  k+2N, …) exactly once, and every N characters all are tested, frozen, on the same unseen held-out exercises
  (graph LIVE, MASKED, C alone). With several arms (`winner,log,event,concepts`) each group of arms devours the same
  share, so arms compare fairly. Reader: the repo's own `text-dataset.mjs` with vendored hyparquet + zstd.
- **CUDA.** These graphs are made of counted memories looked up byte by byte, so one graph is sequential and the
  parallelism is across graphs — CPU threads, as many as cores and RAM allow. A CUDA port is only worth doing once a
  method is validated on the large world, and it needs an NVIDIA GPU to verify; it is not part of this step.

```
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 8 -Arms winner,log -Mem 3
```

## The graph that contains itself (main view, 2026-11-05)

The point-cloud fractal view was a different picture, not the graph, and is removed. The main view is the graph again
(symbols, A's perceptions, C's perspectives, their wires, the aether), and the scale transitions come from the way the
graph grows, with one rule for every scale and no modes:

- **Research understood, not copied.** Graph-directed IFS (Mauldin & Williams 1988): every node owns a region, and every
  link to what it holds places a smaller copy inside it. Geometric branching growth (Zheng et al., PNAS 2021; their code
  github.com/networkgeometry/geometric-branching-growth was read): descendants are placed around the ancestor within half
  the gap to the nearest neighbour, the ancestor's weight is shared by its descendants, and links are inherited.
  Geometric renormalization (García-Pérez et al., Nat. Phys. 2018) is the inverse.
- **In our graph.** A node w (a context: the moments that ended in w) opens into the contexts x·w really lived, which is
  how the graph buds. Their weights add up exactly to w's (tested), and closing a descendant gives back exactly w
  (tested). The links between descendants are inherited from the links between the symbols they start with.
- **Placement.** Every descendant sits at its learned place in 6D: the 5 torus axes plus time, i.e. how long ago it was
  last lived, on a logarithmic clock. Its territory is half the 6D gap to its nearest sibling. 15 rotation planes, 5 of
  which turn time into the screen.
- **Transition.** A node whose territory passes 70 px fades into its descendants, and they fade back when zooming out.
  It is continuous in the zoom.
- **Endless outward.** The moment just lived has the whole lived stream as its past, so the whole graph is the inside of
  that node in a bigger whole (the same graph), then the moment before, and so on.
- **Camera.** It lives in the frame of one node (rebasing). Where the lived past is thin, the graph's own continuation
  (what precedes the shorter contexts) is drawn hollow and dashed, never presented as lived. Zooming in, the nearest
  lived past slides under the point being zoomed (a pan a little faster than the zoom widens the gap).
- **Measured (tests/torus-fractal.test.mjs).** 500 zoom steps in and 1500 out, across 122 frame changes: the largest
  deviation of any node from where the zoom puts it is 0.0000 px. It reached 34 characters deep into the lived past and
  53 lived moments outward, with the camera scale staying around 10³.

The fractal moment space (fractal.mjs) stays as a predictor. Prediction on unseen text from the k nearest lived moments
beats the winner graph on clean worlds (61.6/60.9/56.8/52.5% vs 58.1/58.9/54.5/47.6%). Graph and fractal averaged
(λ=.75, k=12) reach 59.45% vs 54.77%.

## The laws of the devoured universe (2026-11-05, transcend/torus-aether/laws/)

The question: which laws emerged in the world the graph builds from what it devours, and which laws of the real
universe are missing? Everything below was measured on 4 clean texts (repo-md_0/1, licenses_0/2). Accuracy is on
unseen text.

| law | real universe | ours (measured) |
|---|---|---|
| expansion | Hubble: larger distances recede faster | distinct structures grow as nᵝ (r²≈.99); β rises with scale: .06–.12 (1 char) → .34–.43 (2) → .60–.70 (4) → .86–.96 (12) |
| mass spectrum | power laws | Zipf α≈.44–.58 at 6 chars (r²≈.96–.97), inherited from language |
| force law | gravity | association falls with distance in the learned geometry: +1.4…+2.0 close, −0.9…−1.3 far |
| gravity needs antigravity | — | no repulsion at all: −1 to −2 points at every amount of experience; how strong it is barely matters (flat) |
| mass attracts | heavy bodies gather | **inverted**: frequent symbols sit farther out (corr .65–.77). Uniform vacuum pushes fix it at low experience (−.17) but not later (.49 at 48k), and prediction does not change (±.35) |
| arrow of time | laws symmetric, arrow from low-entropy start | forward ≈ backward within 1–2 points, mixed sign |
| locality in time | causality | C uses position 1 most, position 4 least |
| symmetries | Noether | C finds case symmetry (fold) by itself |
| stable constants | constants are constant | C flips 54–117 times (noise between near-equal perspectives); margin .05 + window 400 cuts that to 3–5 at ±1 point |
| self-similarity | wide range | pasts per context 14–24 → 4.2–4.4 → 2.2–2.3 → 1.6–1.7 → 1.3–1.4 → 1.2–1.25; 86–89% single at depth 6, so it breaks with depth |
| dimensions grow with expansion | — | geometry: no (flat from ~4 to 10 dims at 6k–48k). C's attention: yes, slowly. The best width is 2 positions in 3 of 4 texts at 6k, 3 at 12k–48k, 4 at 84k on licenses_0. The cap of 4 is not binding yet |
| conservation of energy | yes | missing (weight is conserved only by construction) |
| quantum amplitudes | yes | missing |

The C-thermostat (C picks the field width to hold a target entropy) did not beat the best fixed width: 51.52% vs 51.76%.

### The mind, validated online (laws/mind.mjs)

One pass, everything learned online exactly as the trainer lives it, learning on 85% of each of the 4 clean worlds and
testing on the unseen 15%. The field must be rebuilt with the current places before it reads: without that it fell to
21–30%.

| arm | graph | field | graph + field | C |
|---|---|---|---|---|
| winner (engine C) | 55.02 | 56.86 | 57.55 | 50.29 |
| stable (C needs evidence to switch: 54–122 flips → 3–6) | 55.77 | 56.86 | 57.63 | 50.16 |
| stable+many (C = its 12 best perspectives voting, each by its record) | **57.16** | 56.86 | **57.86** | **55.12** |

Concepts attract or repel (laws/polarity.mjs). In space they repel: concept centres are 0.58–0.64 apart, against
0.41–0.44 for random groups of the same sizes, in all 4 worlds. In time there are two kinds:
- the common ones call their opposite, coming back right after themselves at 0.04–0.8× their share: vowels → consonants,
  spaces → letters, a dipole;
- the structured ones bind to themselves at 2–167× their share: capitals, digits, quotes come in runs.

### The labyrinths in the same brain (worlds/labyrinth.mjs, laws/labyrinth.mjs)

MagicPerspective V16's labyrinths: the same generator, sizes, unseen test seeds, step limit and teacher used only in
training. The brain lives them as symbols in the same graph as the text. Training is like reading (the teacher's moves,
30% its own). Acting is like writing: its next symbol after what it perceives is its move. The shape of the solution is
the next 6 moves it imagines, including what it expects to perceive after each one.

Test on 100 unseen labyrinths (7, 9, 11):

| | solved | steps / optimal | shape at start (first 6 moves right) |
|---|---|---|---|
| untrained brain, same memory of visited cells | 7% | 3.55 | 0.22 |
| stable+many, 1000 episodes | 76% | 1.14 | 0.55 |
| stable+many, 5000 episodes | 82% | 1.17 | 0.56 |
| winner, 5000 episodes | 81% | 1.14 | 0.54 |
| (V16's own fabric, its report, 5000 episodes) | 92–97% | 1.26–1.35 | 0.55–0.57 |

C seeing 6 positions instead of 4 made it worse (62% for winner).

### Fusion: one node per concept (laws/fusion.mjs)

The test: should a context that leads to the same future as another be the same node? Causal states, CSSR-style:
contexts are added from short to long, and a context joins its parent's node, or the nearest node it cannot be told
apart from (G-test). It gets a new node only if it matches none. The question was whether this generalizes. Results on
unseen text, contexts up to 5 characters:

| text | every context its own node | fused (threshold 1) | nodes before → after |
|---|---|---|---|
| repo-md_0 | 49.28% | 46.97% | 41,523 → 1,545 |
| repo-md_1 | 52.23% | 48.59% | 57,121 → 1,170 |
| licenses_0 | 57.78% | 56.00% | 31,179 → 1,526 |
| licenses_2 | 67.42% | 64.73% | 30,909 → 920 |

Fusion compresses the graph 20–49× for 1.8–3.6 points, and stronger fusion costs more (threshold 3: 4.0–14.8 points).
On text, hard fusion compresses but does not generalize better. What did generalize was the field: it reads similar
moments without merging them (+2.5 points).

### The whole exercise, nothing explained (worlds/exercise.mjs, laws/exercise.mjs)

The setup:
- **What it sees.** The brain sees the whole V16 labyrinth as a retina of 4 raw symbols. Nothing says which one is floor,
  wall or target, or which one is itself.
- **What it can do.** It can emit 8 symbols. The world moves something for 4 of them, with a different mapping for every
  brain, and ignores the other 4.
- **What it is not given.** There is no teacher, no direction to the target and no reward signal, only that the
  exercise ends and a new one begins.

What it discovers from what happens:
- **Itself:** the kind that changes place when it acts.
- **Its moves:** the displacement each output causes.
- **What repels:** pushing into it, it does not move.
- **What attracts:** what it entered when the exercise ended.

The shape of the solution is attraction spreading from what attracts, through what lets it through, climbed from
itself. That gives the whole trajectory, predicted before the first move. How much to trust the predicted shape against
exploring is learned from which way ends exercises.

The propagation rule (attraction spreads through what lets it through) is given. Everything it propagates (who is
self, what the outputs do, what repels, what attracts) is discovered.

| brain (action mapping) | everything discovered after | solved while learning (first 30) | 100 unseen (7, 9, 11) after 30 exercises |
|---|---|---|---|
| seed 2 | 5 exercises | 27/30 | 100% solved, steps/optimal 1.00, whole trajectory right at start 100% |
| seed 3 | 5 | 28/30 | 100%, 1.00, 100% |
| seed 4 | 5 | 27/30 | 100%, 1.00, 100% |

Before any experience: 1–7% solved. This sees the whole exercise; V16 sees a 3×3 window, so they are not the same task.

### The transformation world and the causal loop (worlds/transform.mjs, worlds/causal.mjs, laws/transform.mjs)

The experiment exactly as described in the MagicPerspective conversation of 2026-11-05.

**The world.** Movable objects, barriers, two kinds of switch and doors, all as raw symbols with no names:
- a PLATE opens its doors only while something stands on it, so the change reverses;
- a LEVER toggles its doors, so the change persists;
- doors change which actions become possible.

There are 8 outputs. 4 move the organism, in a mapping different for each organism, and 4 do nothing. The desired
configuration uses the same symbols, with "any" everywhere else.

**The loop:**
- **Perceive and discover structure.** Which symbol is itself, and every form it takes when it stands on something. What
  each output does. Rewrite rules P(S'|S, do(a)), meaning what the cells at itself, one ahead and two ahead become, and
  what changes elsewhere.
- **Intention.** The desired configuration.
- **Imagine.** A counterfactual search over its own model.
- **Act and measure.** Count failed causal predictions and correct the rule.
- **Curiosity and limitation.** It tries situations it has never seen. It says when no way exists and nothing untried
  is reachable.

**Training and test.** Training is 300 tasks with single kinds of goal: an object on a cell, itself beyond a door, or a
door left open. The test is 90 new arrangements whose goals combine kinds it never encountered (object+self, self+door,
object+door), plus 20 impossible tasks.

| | unseen goal configurations reached | steps / optimal | failed causal predictions | impossible recognised |
|---|---|---|---|---|
| causal loop, organisms 1–5 | 94.4% (85/90) each | 1.01–1.02 | 0.5–0.8% | 20/20 |
| immediate-reward controller (organisms 1, 2) | 0% | — | 1.8% | 0/20 |

The 5 failures in the 90 are experiments it chose out of curiosity in situations it had never seen. Those experiments
pushed an object where it can no longer be moved. From there it says, correctly, that the goal is no longer possible.

### Many worlds at once on the GPU, one brain (gpu/worlds_gpu.py, gpu/client.mjs)

The worlds run in parallel on the card, in batches of N chosen by the person (no limit written in the code, only the
VRAM decides). The brain stays the same, learns the same way, and lives every world's experience one world after the
other after each batch. The one change is that inside a batch it decides with what it knew at the start of the batch.
- **The labyrinth exercise:** the worlds and the decisions run on the card. Attraction spreads through the whole batch at
  once.
- **The transformation world:** the physics of every world runs on the card. The imagination (search over its own
  model) stays on the CPU, and each world keeps its own count of what it has tried.
- **Text:** stays on the CPU, because the graph is a set of tables that grow with every symbol.

Settings, from the command line or the page at any time:
- the device (cuda:0, cuda:1, cpu, off);
- worlds at once;
- VRAM in GB, split among the brains (torch.cuda.set_per_process_memory_fraction);
- % of the GPU, where the card works and then rests so its average use is that %.

tests/torus-gpu-worlds.test.mjs runs the Python side on its numpy backend. It checks the same labyrinths bit for bit,
the same decisions output for output, the same transformation physics state for state, and that every GPU world is lived
again identically by the brain. On the card the same code runs on PyTorch. START_V17.ps1 installs PyTorch with
CUDA and runs a self-test on the card before training. Here there is no card, so the first CUDA run is on the person's
PC.

Measured here (numpy stand-in, 2 cores): a batch of 256 labyrinths takes 12 s, mostly the brain living the experiences.
A batch of 256 transformation tasks takes 140 s, mostly imagination on the CPU.

## The graph that aligns itself to the context and loses nothing (2026-11-05, align.mjs, laws/align-*.mjs)

The requirement (verbatim, 2026-11-05): the graph must know how to align itself according to the context, lose
nothing, and know when and how to take whatever form is needed; the longer a text exercise, the closer it is to a
1000×1000 labyrinth, and it must cope gradually from the smallest to the largest, as it learns labyrinths.

What the old text graph did instead: it guessed the next character from at most 12 exact characters (A) and 4 (C),
links faded and rows lived once were dissolved. On text it plateaus.

The aligning graph (align.mjs):
- everything lived is kept, every symbol of every world, in order (no fading, no dissolving);
- at every moment the whole present context, read backwards as far as it goes, is aligned with all the past at once
  (suffix arrays over the reversed memory: the deepest alignment and the shallower ones);
- it also aligns with the exercise being lived (its own earlier parts, a suffix automaton) and, at the level of FORM,
  with the past where every digit is the same symbol (the structure of a solution, whatever the numbers; which number,
  the concrete alignments say);
- which alignment to follow, when, is learned: before every symbol it predicts, then sees what came, and each kind of
  alignment (source, depth, how much past supports it) earns or loses trust.

Measured on GSM8K (7,473 Q→A reasoning exercises, the text world available here; OpenThoughts is not reachable from
this machine), curriculum from the shortest exercise to the longest, tested frozen on 240 unseen test exercises
spread over all lengths; accuracy on the characters of the ANSWER, guessed at the first try:

| exercises lived | current V17 brain (stable+many) | aligning: memory only | + its own exercise | + form |
|---|---|---|---|---|
| 500 | 50.3% | 52.4% | 65.8% | 67.0% |
| 1,000 | 53.2% | 56.2% | 67.5% | 69.1% |
| 2,000 | 55.3% | 59.6% | 69.3% | 71.4% |
| 4,000 | 56.7% | 63.0% | 70.5% | 72.4% |
| 7,473 | — | — | 72.0% | 73.9% |

By exercise length (answer accuracy at 7,473; lengths <300, 300–450, 450–650, 650–900, >900 characters):
73.5%, 72.1%, 73.7%, 74.4%, 76.3%. The longest exercises are not harder for it: the more of the exercise it has
lived, the more it has to align with.

Online (as the trainer lives it, align-online.mjs): 66.8% after 500 exercises, 68.6% after 1,000, ~5,500 symbols/s.
In the trainer (GSM8K text + labyrinths, held-out paragraphs): ALIGNED 63.3% → 65.6% at 0.1M → 0.2M characters,
against the old graph's 58.0% → 59.6%.

In V17 the aligning graph lives every symbol of every world (Brain.live), is saved with the brain, is what writes in
the chat, and is what reads in Evaluare → text. The old graph is kept and still measured, for comparison.
Not yet done: the labyrinths and the transformations are still decided by Discoverer and CausalOrganism, not by the
aligning graph; the graph drawn on the page is still the old trace, not the aligning graph.

Reproduce: `GSM=<path to grade-school-math/grade_school_math/data> node transcend/torus-aether/laws/align-align2.mjs`
(SIZES=500,1000,… NT=240 G=8), and `laws/align-baseline.mjs` for the old brain.

## One organism (2026-11-05, evening): everything connected, nothing forced, nothing lost

Source (verbatim, 2026-11-05 19:03): "REZULTATUL E DOAR CAND AI FACUT TOT PUZZLE-UL DIN VERBATIM SA RESPIRE CA UN SINGUR
ORGANISM, SA SE LEGE TOTUL NATURAL NU SA FORTEZI TU NIMIC". Requirements followed: verbatim/implementation-mirror.json
(REQ-04/05/06/07/08/11, V11-04/05/07, V14-SELF-WORLD, V14-INGEST), the 2026-11-05 V17/Torus archive (determinism ↔
randomness, noise, hallucination sliders that act for real), Q5D-14..17 (noise as a mechanism; God = the whole graph
that devours worlds, learns how they work and how it works itself, and improves itself recursively), and today's
messages (align by context, lose nothing, take any form needed, text from the smallest exercise to the largest).

| piece | what it is now | measured |
|---|---|---|
| nothing lost | the aligning graph keeps every symbol of every world; the old graph no longer dissolves (over the memory budget it stops growing); links of the drawn graph dim but are never deleted | test: kept memory = lived stream, byte for byte, even with perception noise on |
| one body | what each output does to itself is learned in whichever world it acts and read by every world | first 10 transformation tasks, 6 brains: 53 solved / 928 steps without labyrinths before, 54 / 882 after 30 labyrinths (before the fix below it fell to 0) |
| self vs world, discovered | in a new world it does not know which symbol is itself; its body knows which outputs move it, so it moves to find out (it used to try first what it knew nothing about, and never moved) | the transfer above |
| determinism ↔ randomness, noise | the page's sliders act on the trainer: ltemp (temperature of expecting/acting while learning), pnoise (perception noise; random actions in the worlds, also on the GPU), gnoise/glr/repel (geometry), wtemp (writing), ttemp (test); per graph or for all | tests: geometry, labyrinth and transformation learners receive them; reading at T=0 is deterministic, at T>0 + noise it is not |
| evaluation | new unseen labyrinths/configurations/exercises at every press, temperature and noise chosen; text evaluated per whole exercise from the smallest to the largest | two presses give different worlds (test) |
| the shape of the solution in text | from the question alone it writes the whole answer before seeing it; shown next to the real answer | see below |
| trust in its own imagination | every 31 symbols it writes 48 ahead from its own expectations; as reality comes, each alignment it followed while imagining earns or loses the trust it gets WHEN it imagines (as plan vs explore in the labyrinths) | GSM8K, 1,500 exercises, 120 unseen: words of the real answer it writes 13.9% → 31.1%, characters in place 3.1% → 6.0%; reading unchanged (69.25%) |
| knows itself, improves itself | its self-model is the trust it has earned per kind of alignment; next to how it reads, it reads the same moments with variations of itself and becomes the one that guessed best what it had not seen (G_t → G_{t+1}), history kept and shown | 2,000 exercises: 70.3% → 71.0% unseen answers; 5 self-changes recorded |
| the drawn graph is the organism | the node "eu" (itself, discovered), its body (each output → its direction), what attracts and what repels it, the alignments it followed, red impulses where prediction ≠ reality, its self-model and self-changes on the page | live snapshot (2026-11-05): self = the labyrinth's moving symbol and 5 transformation symbols, wall repels, target attracts, 4 moves |

Bugs found on the way and fixed: the field had stopped learning (`field 0.0%`) and the page had stopped finding concepts
and redrawing on every snapshot: in both places a call had ended up inside a comment. Tests now guard both.

Still not done, stated plainly: in the labyrinths and the transformations the decisions are taken by the organism's
discovery and causal parts (now sharing one body and one self, drawn in the same graph), not by the aligning memory
itself; the written answers have the form of a solution but the numbers are mostly wrong (no arithmetic is learned);
the 51×51 labyrinth that is predicted but not walked waits for the diagnostic from the user's own brain; OpenThoughts
could not be measured from this machine (GSM8K was used).
