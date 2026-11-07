// The Evaluare tab: a copy of one graph, loaded from its save, examined on the CPU on what it never lived
// (unseen labyrinths from small to large, unseen text, unseen desired configurations). Training goes on untouched.
import {parentPort, workerData} from "node:worker_threads";
import {Brain} from "./brain.mjs";
import {CharacterHypermaze} from "../worlds/character-hypermaze.mjs";
import {LearnedCognitiveMap} from "../worlds/learned-cognitive-map.mjs";
import {explainOriginalV17AnswerShape} from "../worlds/original-v17-answer-forensics.mjs";
import {appendAtlasEvent,atlasPath} from "./atlas-journal.mjs";
const brain = Brain.load(workerData.saveFile);
parentPort.postMessage({type: "loaded", lived: brain.lived, chars: brain.chars});
parentPort.on("message", m => { let r;
  try {
    if (m.kind === "maze") r = brain.examMazes(m.opts.sizes, m.opts.per, m.opts.seed ?? undefined, {T: m.opts.T, noise: m.opts.noise});
    else if (m.kind === "transform") r = brain.evalTransforms(m.opts.count, m.opts.impossible, m.opts.seed ?? undefined, {noise: m.opts.noise});
    else if (m.kind === "text") {
      r = brain.evalTextExercises(m.opts.list, {T: m.opts.T, noise: m.opts.noise,
        strictFullAnswer: m.opts.verifiedUniqueHeldout === true,
        maxGeneratedChars: m.opts.maxOutput});
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
      if(m.opts.forensic === true){
        if(!r.heldoutAnswerComplete){
          r.forensicsError="Forensic answer comparison requires COMPLETE unique source-heldout Q/A; manual or cropped answers are prohibited";
        }else{
          const atlas=CharacterHypermaze.restore(brain.characterAtlas||null);
          if(!brain.characterAtlas&&brain.cognitiveMap)
            atlas.ingestLegacyRules(LearnedCognitiveMap.restore(brain.cognitiveMap).rules);
          const maxExplained=Math.max(1,Math.min(1000,Math.trunc(Number(m.opts.maxExplained)||80)));
          r.forensics=r.exercises.map((ex,i)=>{
            const exam=explainOriginalV17AnswerShape(ex,atlas,{maxExplained,maxNodes:96,maxDepth:6});
            // The frozen model has already generated every character before
            // the hidden answer is passed to this diagnostic function.
            // Save all mismatches in the APPEND-ONLY atlas, not a copy of the
            // original Brain checkpoint, and never claim post-hoc correction
            // was a correct first guess.
            appendAtlasEvent(atlasPath(workerData.saveFile),{
              type:"frozen-v17-answer-forensic",world:"original-v17-text-characters",
              heldoutTestIndex:i,trainingModelWasFrozen:true,
              originalWriter:"AligningGraph.write",postHoc:true,
              fullOriginalAnswerCharacterComparison:exam
            });
            return exam;
          });
          r.forensicSummary={
            exerciseCount:r.forensics.length,
            exactFirstTryFraction:r.firstAnswerExactRate,
            originalMeanShapeSame:r.forensics.reduce((s,e)=>s+(e.originalScore||0),0)/
              Math.max(1,r.forensics.length),
            totalMispositions:r.forensics.reduce((s,e)=>s+(e.totalAllMismatchedPositions||0),0),
            examinedPostHocOnly:r.forensics.reduce((s,e)=>s+(e.explainedPositions||0),0),
            characterAnswersNotAutoCorrected:true,
            referenceNeverUsedForOriginalWriting:true
          };
        }
      }
    }
    else r = {error: "unknown kind " + m.kind};
  } catch (err) { r = {error: err.message}; }
  parentPort.postMessage({type: "result", id: m.id, lived: brain.lived, chars: brain.chars, ...r}); });
