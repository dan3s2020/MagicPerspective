// The Evaluare tab: a copy of one graph, loaded from its save, examined on the CPU on what it never lived
// (unseen labyrinths from small to large, unseen text, unseen desired configurations). Training goes on untouched.
import {parentPort, workerData} from "node:worker_threads";
import {Brain} from "./brain.mjs";
const brain = Brain.load(workerData.saveFile);
parentPort.postMessage({type: "loaded", lived: brain.lived, chars: brain.chars});
parentPort.on("message", m => { let r;
  try {
    if (m.kind === "maze") r = brain.examMazes(m.opts.sizes, m.opts.per, undefined, {T: m.opts.T, noise: m.opts.noise});
    else if (m.kind === "transform") r = brain.evalTransforms(m.opts.count, m.opts.impossible, undefined, {noise: m.opts.noise});
    else if (m.kind === "text") r = brain.evalTextExercises(m.opts.list, {T: m.opts.T, noise: m.opts.noise});
    else r = {error: "unknown kind " + m.kind};
  } catch (err) { r = {error: err.message}; }
  parentPort.postMessage({type: "result", id: m.id, lived: brain.lived, chars: brain.chars, ...r}); });
