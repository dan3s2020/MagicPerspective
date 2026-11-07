// STOPSHIP: semantic acceptance of the ORIGINAL native V17 maze→text motor.
// Green component tests and 5D graphs are NOT evidence of exact goal-aware
// first-try LONG unseen answers, causal geometry/noise, or real RTX throughput.
// A release needs a separately reproducible evidence artifact verified against
// genuine heldout data and the actual original user hardware.
// DO NOT weaken acceptance thresholds to greenlight an incomplete research path.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const evidencePath=path.join(here,"PRODUCTION_ACCEPTANCE_EVIDENCE.json");
const problems=[];
let evidence=null;
if(fs.existsSync(evidencePath)){
 try{evidence=JSON.parse(fs.readFileSync(evidencePath,"utf8"));}
 catch(err){problems.push("Invalid actual acceptance evidence JSON: "+err.message);}
}else problems.push("No full-scale independent semantic and hardware acceptance evidence has been recorded");
const must=(condition,label)=>{if(!condition)problems.push(label);};
if(evidence){
 const a=evidence;
 must(a.contract==="original-V17-Discoverer.shape-extended-without-replacement",
  "Actual original Discoverer.shape algorithm identity must be proven");
 must(a.onePersistentOriginalBrain===true,
  "ONE original Brain must actually own text, maze, goal planning and NoiseAgency");
 must(a.referenceAnswerNeverProvidedBeforeFirstAction===true,
  "Heldout answer must be inaccessible until global solution shape is frozen");
 must(a.sharedNativeCausalTextMaze===true&&a.goalConditioned===true,
  "Original native pre-action goal-conditioned learned hypermaze must control text actions");
 must(a.predictionBeforeFirstOutput===true&&a.executionCompareReplan===true,
  "Global shape, stepwise execution and observed-effect corrections must be captured");
 const h=a.longUnseenExactAnswer;
 must(h?.sourceKind==="real-heldout-independent"&&
      typeof h?.datasetSHA256==="string"&&/^[a-f0-9]{64}$/i.test(h.datasetSHA256),
  "Real heldout source content SHA-256 and independent provenance required");
 must(Number.isSafeInteger(h?.tested)&&h.tested>=100,
  "At least 100 disjoint unseen long-answer tasks required; no cherry-picked test");
 must(Number.isSafeInteger(h?.minimumReferenceUTF8Bytes)&&
      h.minimumReferenceUTF8Bytes>=1024,
  "Long test answers must all be at least 1024 UTF-8 bytes");
 must(Number.isSafeInteger(h?.exactFirstTry)&&h.exactFirstTry===h.tested,
  "User's requested 100% exact first-try final-answer correctness was not established");
 must(h?.fullAnswerCompared===true&&h?.noAnswerLeakageAudit===true,
  "Exact final output comparison and independent leak audit required");
 const g=a.geometryAblation;
 must(g?.actualOriginal5DTorusUsedInPolicy===true&&
      Number.isFinite(g?.goalSuccessFull)&&
      Number.isFinite(g?.goalSuccessCoordinatesShuffled)&&
      g.goalSuccessFull>g.goalSuccessCoordinatesShuffled,
  "Actual causal learned 5D geometry benefit in heldout goal SUCCESS (not UI) not proved");
 const noise=a.noiseAblation;
 must(noise?.originalSavedNoiseAgency===true&&
      Number.isFinite(noise?.goalSuccessWithLearnedNoise)&&
      Number.isFinite(noise?.goalSuccessWithoutNoise)&&
      noise.goalSuccessWithLearnedNoise>noise.goalSuccessWithoutNoise,
  "Endogenous noise learning causal improvement in heldout GOAL success not proved");
 const gpu=a.actualGPU;
 must(gpu?.device==="cuda:0"&&gpu?.verifiedNvidiaHardware===true&&
      gpu?.trainingOnGPUOriginalNativeMotor===true,
  "REAL original native hypermaze learner must have actual CUDA hardware proof; NumPy parity is insufficient");
 must(Number.isFinite(gpu?.measuredMBPerSecond)&&gpu.measuredMBPerSecond>=1 &&
      Number.isFinite(gpu?.measuredExercisesPerSecond)&&gpu.measuredExercisesPerSecond>=100,
  "Target >=1 MB/s and >=100 complete original-hypermaze exercises/s not measured");
 must(a.originalUIControlsPreserved===true&&a.originalBrainCheckpointBytePreservation===true,
  "Original V17 UI and all historic checkpoint bytes require independently tested preservation");
 must(a.originalMAZEFirstShapeParity?.unseen>=40 &&
      a.originalMAZEFirstShapeParity.exactRate===1,
  "Original 2D native shape route parity must remain exact");
 must(typeof a.reproducibleTestRunUrl==="string"&&
      a.reproducibleTestRunUrl.startsWith("https://github.com/"),
  "A real complete acceptance run URL and independent audit record required");
}
const report={
 project:"MagicPerspective",
 feature:"native hyperdimensional text maze using original Discoverer.shape",
 status:problems.length?"BLOCKED":"ACCEPTANCE_EVIDENCE_REQUIRES_HUMAN_REVIEW",
 accepted:false,
 checkedAt:"source-version-not-wallclock",
 why:"Component and structured composition tests cannot establish 100% exact long natural-language answers",
 unsatisfied:problems,
 recordedEvidence:!!evidence
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes("--gate")||process.argv.includes("--accept"))
 process.exitCode=1; // Even ALL fields completed need independent human review and explicit user acceptance.
