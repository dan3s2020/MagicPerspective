// Read-only analysis of a COPY of the native V17 checkpoint. No training, no saves.
// Usage: node --max-old-space-size=6144 v17/experiments/graph0-self-path-ablation.mjs
//        --checkpoint PATH_TO_COPIED_V8 --arm full|no-self|no-self-fself --out DIR
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {ARMS, QUESTIONS, TEMPERATURES, installAblation, summarizeTrace, repeatedEightGrams} from "./graph0-ablation-core.mjs";

const options = {};
for (let i=2; i<process.argv.length; i++) {
  const key = process.argv[i];
  if (!["--checkpoint", "--arm", "--out", "--max", "--seed"].includes(key)) {
    throw Error("Unrecognized argument: " + key);
  }
  if (!process.argv[i+1] || process.argv[i+1].startsWith("--")) throw Error("Missing value: " + key);
  options[key.slice(2)] = process.argv[++i];
}
if (!options.checkpoint || !options.out || !ARMS.includes(options.arm)) {
  throw Error("Required: --checkpoint COPIED.v8 --arm " + ARMS.join("|") + " --out DIRECTORY");
}
const checkpoint = path.resolve(options.checkpoint);
if (!checkpoint.toLowerCase().endsWith(".v8") || !fs.statSync(checkpoint).isFile()) throw Error("Expected existing .v8 checkpoint COPY");
const outDir = path.resolve(options.out);
fs.mkdirSync(outDir, {recursive: true});
const max = options.max == null ? 240 : Number(options.max);
const seed = options.seed == null ? 20261107 : Number(options.seed);
if (!Number.isInteger(max) || max<20 || max>2000 || !Number.isInteger(seed) || seed<0 || seed>4294967295) {
  throw Error("Invalid --max or --seed");
}
function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
const fileHashBefore = digest(checkpoint);
const b = Brain.load(checkpoint);
if (!b.align || typeof b.align.proposals !== "function") throw Error("Checkpoint missing native AligningGraph");
const learnedBefore = {
  chars: b.chars, exercises: b.exercises, lived: b.lived,
  memoryChars: b.align.mem.n, formMemoryChars: b.align.fmem.n,
  trustEntries: b.align.trust.size
};
const restore = installAblation(b.align, options.arm);
const runs = [];
const started = new Date().toISOString();
try {
  for (const question of QUESTIONS) {
    for (const T of TEMPERATURES) {
      // One question, no conversation history. Identical RNG seed and weights for each arm.
      const result = b.chat([["you", question]], {
        T, max, stopBlank: true, learn: false, observePath: true, seed
      });
      if (result.error || !result.pathTrace) throw Error("Missing native trace for " + question);
      const stats = summarizeTrace(result.pathTrace, T);
      const firstRepeat = result.pathTrace.steps.find(s=>Number(s.contextVisit)>0) || null;
      runs.push({
        question, T, output: result.text, outputRepeatedEightGramFraction: repeatedEightGrams(result.text),
        stats,
        firstRepeatedState: firstRepeat ? {
          step: firstRepeat.step,
          context: firstRepeat.context,
          contextVisit: firstRepeat.contextVisit,
          alternatives: firstRepeat.alternatives,
          entropyBits: firstRepeat.entropyBits,
          topChoices: firstRepeat.topChoices,
          supportingPerspectives: firstRepeat.supportingPerspectives
        } : null,
        observedPathTrace: result.pathTrace
      });
      console.log(JSON.stringify({arm:options.arm,question,T,chars:result.text.length,
        repeats:stats.repeatedContextSteps, highConfidence:stats.dominantStepsAt95Pct,
        eightGramLoopRate:runs.at(-1).outputRepeatedEightGramFraction,
        empty:stats.emptySuccessorSteps, singleton:stats.singleCandidateSteps,
        entropy:stats.meanEntropyBits}));
    }
  }
} finally { restore(); }
const learnedAfter = {
  chars: b.chars, exercises: b.exercises, lived: b.lived,
  memoryChars: b.align.mem.n, formMemoryChars: b.align.fmem.n,
  trustEntries: b.align.trust.size
};
if (JSON.stringify(learnedBefore)!==JSON.stringify(learnedAfter)) {
  throw Error("Frozen-model invariant FAILED: model counters or trust map changed");
}
const fileHashAfter = digest(checkpoint);
if (fileHashBefore!==fileHashAfter) throw Error("Checkpoint COPY was modified during analysis");
const output = {
  experiment:"V17 Graph #0 self/fself proposal-source ablation",
  source:"native V17 Brain.load; original AligningGraph.write; read-only TextPathObserver",
  caveats:[
    "This tests the same frozen checkpoint and RNG seed for three filter policies, not whether text was intentionally self-referential.",
    "T=0 observer assigns probability 1 to the selected symbol by definition; dominantSteps and entropy are null at T=0.",
    "Repeated contexts are 12-character suffix repeats, not necessarily identical whole-graph states.",
    "A missing successor is alternatives=0. Singletons have alternatives=1.",
    "Filtering changes candidate distributions at generation time only; it does not retrain weights."
  ],
  arm:options.arm, started, completed:new Date().toISOString(),
  checkpoint:{path:checkpoint,sha256:fileHashAfter,bytes:fs.statSync(checkpoint).size},
  seed,max, learnedBefore,learnedAfter,runs
};
const target=path.join(outDir,"graph0-"+options.arm+".json");
fs.writeFileSync(target,JSON.stringify(output,null,2),"utf8");
console.log("SAVED: "+target);
console.log("CHECKPOINT COPY SHA256: "+fileHashAfter);
