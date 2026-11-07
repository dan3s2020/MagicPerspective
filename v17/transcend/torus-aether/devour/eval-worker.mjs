// The Evaluare tab: a copy of one graph, loaded from its save, examined on the CPU on what it never lived
// (unseen labyrinths from small to large, unseen text, unseen desired configurations). Training goes on untouched.
import {parentPort, workerData} from "node:worker_threads";
import {Brain} from "./brain.mjs";
const brain = Brain.load(workerData.saveFile);
parentPort.postMessage({type: "loaded", lived: brain.lived, chars: brain.chars});
parentPort.on("message", m => { let r;
  try {
    if (m.kind === "maze") r = brain.examMazes(m.opts.sizes, m.opts.per, m.opts.seed ?? undefined, {T: m.opts.T, noise: m.opts.noise});
    else if (m.kind === "transform") r = brain.evalTransforms(m.opts.count, m.opts.impossible, m.opts.seed ?? undefined, {noise: m.opts.noise});
    else if (m.kind === "text") {
      r = brain.evalTextExercises(m.opts.list, {T: m.opts.T, noise: m.opts.noise});
      // Do NOT certify a 70% complete-answer test when the evaluator was
      // given only a 20k-prefix of an unknown-length Q/A exercise.
      if (m.opts.fullAnswerRequested !== true || m.opts.verifiedUniqueHeldout !== true) {
        r.firstAnswerExactRate = null;
        r.firstAnswerExactCorrect = 0;
        r.firstAnswerExactTotal = 0;
        r.firstAnswerTarget70Reached = null;
        for (const row of r.exercises) row.firstAnswerExact = null;
        r.firstAnswerMetric = "NOT CERTIFIABLE: require FULL original length 0 AND unique, independent original heldout examples (no replacement)";
      }
      r.heldoutAnswerComplete = m.opts.fullAnswerRequested === true && m.opts.verifiedUniqueHeldout === true;
    }
    else r = {error: "unknown kind " + m.kind};
  } catch (err) { r = {error: err.message}; }
  parentPort.postMessage({type: "result", id: m.id, lived: brain.lived, chars: brain.chars, ...r}); });
