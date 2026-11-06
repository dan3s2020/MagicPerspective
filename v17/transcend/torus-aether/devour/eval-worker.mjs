// The Evaluare tab: a copy of one graph, loaded from its save, examined on the CPU on what it never lived
// (unseen labyrinths from small to large, unseen text, unseen desired configurations). Training goes on untouched.
import {parentPort, workerData} from "node:worker_threads";
import {Brain} from "./brain.mjs";
import fs from "node:fs";
import {TextActionPaths} from "../../../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../../../isolated/noise-space/causal_text_world.mjs";
import {frozenTextRoutes} from "./text-hyperpaths-eval.mjs";
const brain = Brain.load(workerData.saveFile);
const sidecar = workerData.saveFile + ".causal.json";
let observedWorld = null, worldError = null;
try {
  if (fs.existsSync(sidecar)) {
    const saved = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    if (saved.version !== 1) throw Error("unsupported causal text checkpoint");
    observedWorld = {paths: TextActionPaths.restore(saved.paths),
      causal: CausalTextAgent.restore(saved.causal)};
  } else worldError = "No text state/action checkpoint found; character alignment is not a route map.";
} catch (err) { worldError = "Text-world checkpoint failed: " + err.message; }
parentPort.postMessage({type: "loaded", lived: brain.lived, chars: brain.chars,
  textWorldLoaded: !!observedWorld, textWorldError: worldError});
parentPort.on("message", m => { let r;
  try {
    if (m.kind === "maze") r = brain.examMazes(m.opts.sizes, m.opts.per, m.opts.seed ?? undefined, {T: m.opts.T, noise: m.opts.noise});
    else if (m.kind === "transform") r = brain.evalTransforms(m.opts.count, m.opts.impossible, m.opts.seed ?? undefined, {noise: m.opts.noise});
    else if (m.kind === "text") {
      r = brain.evalTextExercises(m.opts.list, {T: m.opts.T, noise: m.opts.noise});
      const paths = observedWorld
        ? frozenTextRoutes(m.opts.list,{...observedWorld,maxSteps:Math.max(8,Math.min(96,
            Number(m.opts.routeSteps)||48))})
        : {enabled:false,reason:worldError};
      r = {...r, observedTextWorld:paths};
      if (paths.enabled) {
        r.exercises = r.exercises.map((exercise,i)=>({...exercise,
          learnedRoute: paths.exercises[i] || null}));
      }
    }
    else r = {error: "unknown kind " + m.kind};
  } catch (err) { r = {error: err.message}; }
  parentPort.postMessage({type: "result", id: m.id, lived: brain.lived, chars: brain.chars, ...r}); });
