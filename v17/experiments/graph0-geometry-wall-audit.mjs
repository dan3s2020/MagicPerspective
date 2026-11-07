// Investigate whether native V17 text prediction can actually move on its learned 5D axes.
// READ-ONLY checkpoint copy; no training and no Brain.save().
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const questions=[
  "so","What is E[v] when S_v is empty?",
  "Describe your own graph and available paths.","What is two plus two?"
];
const argv=process.argv.slice(2);
const options={};
for(let i=0;i<argv.length;i+=2){
  if(!argv[i]?.startsWith("--")||!argv[i+1])throw Error("Expected --option value pairs");
  options[argv[i].slice(2)]=argv[i+1];
}
for(const k of Object.keys(options)){
  if(!["checkpoint","out","max","seed"].includes(k))throw Error("Unknown option: "+k);
}
if(!options.checkpoint||!options.out)throw Error("Required: --checkpoint COPIED.v8 --out DIR");
const file=path.resolve(options.checkpoint),out=path.resolve(options.out);
const max=options.max==null?240:Number(options.max),seed=options.seed==null?20261107:Number(options.seed);
if(!file.endsWith(".v8")||!Number.isInteger(max)||max<20||max>2000||!Number.isInteger(seed)||seed<0||seed>4294967295)
  throw Error("Invalid checkpoint, max, or seed");
if(!fs.statSync(file).isFile())throw Error("Checkpoint missing");
fs.mkdirSync(out,{recursive:true});
const sha=()=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const beforeSha=sha();
const brain=Brain.load(file);
if(!brain.align||!brain.trace?.geo?.U)throw Error("Not a native V17 checkpoint with AligningGraph + geometry");
const a=brain.align,g=brain.trace.geo;
const model=()=>JSON.stringify({
  chars:brain.chars,exercises:brain.exercises,lived:brain.lived,
  memBytes:a.mem?.n,formMemBytes:a.fmem?.n,
  trusts:a.trust?.size,geometricSamples:g.n,knownCoordinates:g.U.size
});
const before=model();
const chat=q=>brain.chat([["you",q]],{
  T:0.6,max,seed,learn:false,observePath:true,stopBlank:false
});
const baseline=questions.map(question=>({question,...chat(question)}));
const originals=[...g.U.entries()].map(([k,vec])=>[k,Array.isArray(vec)?vec.slice():vec]);
if(originals.length){
  // Counterfactual collapse of all trained 5D symbol coordinates in RAM.
  // This is not a proposed improvement; it measures causal dependence.
  for(const [key] of originals)g.U.set(key,Array.from({length:5},()=>0.5));
}
let intervention;
try{
  intervention=questions.map(question=>({question,...chat(question)}));
}finally{
  for(const [key,vec] of originals)g.U.set(key,vec);
}
const rows=baseline.map((before,i)=>{
  const after=intervention[i];
  return {
    question:before.question,
    sameGeneratedText:before.text===after.text,
    sameSelectedBytes:JSON.stringify(before.pathTrace.steps.map(s=>s.byte))===
      JSON.stringify(after.pathTrace.steps.map(s=>s.byte)),
    originalOutput:before.text,
    geometryCollapsedOutput:after.text,
    geometryPositionsMeasuredBefore:before.pathTrace.summary.known5DTransitions,
    geometryPositionsMeasuredAfter:after.pathTrace.summary.known5DTransitions,
    positionPathsSame:JSON.stringify(before.pathTrace.steps.map(s=>s.to5D))===
      JSON.stringify(after.pathTrace.steps.map(s=>s.to5D)),
    meanOriginalEntropyBits:before.pathTrace.steps.reduce((n,s)=>n+(Number(s.entropyBits)||0),0)/before.pathTrace.steps.length,
    repeatedContextSteps:before.pathTrace.summary.repeatedContextStates
  };
});
const structural={
  geometryDimensions:g.D??null,
  geometryKnownSymbols:g.U.size,
  geometryObservedSteps:g.n,
  align:{g:a.g,formW:a.formW,depth:a.depth,formDepth:a.formDepth,cap:a.cap,
    selfWindow:a.window,memoryChars:a.mem?.n,formMemoryChars:a.fmem?.n,
    maxIndexContextChars:256},
  gpuCodeDefaults:{maxContextCharacters:64,maxMemoryCharacters:65536,
    note:"These are constructor DEFAULTS in gpu/text_gpu.py, NOT necessarily the runtime configuration. Actual CUDA text window must be read from the running GPU info or logs."},
  nativeChatUsesGeometryAsPolicy:false,
  evidence:"brain.chat -> align.write(prompt); align.proposals sources mem/self/form/fself; geometric coordinates only passed to read-only TextPathObserver"
};
if(model()!==before)throw Error("Observed learning-state counters or coordinates changed unexpectedly");
if(sha()!==beforeSha)throw Error("Checkpoint copy was modified");
const report={
  experiment:"V17-frozen-5D-policy-wall-causal-audit",
  sha256:beforeSha, frozen:true,training:false,
  note:"Counterfactual geometry collapse tests ONLY the native chat generator, not the 5D LivedField or the combined unseen evaluator. A changed map with identical text proves the chat route does not use this geometry.",
  structural,rows,
  invariantTextAllPrompts:rows.every(r=>r.sameGeneratedText),
  invariantSelectedBytesAllPrompts:rows.every(r=>r.sameSelectedBytes),
  geometryChangeVisible:rows.some(r=>!r.positionPathsSame)
};
const target=path.join(out,"graph0-geometry-policy-wall-audit.json");
fs.writeFileSync(target,JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify({
  audit:"V17 5D policy wall",memoryChars:a.mem?.n,g:a.g,depth:a.depth,
  geometrySymbols:g.U.size,allOutputUnchanged:report.invariantTextAllPrompts,
  allSelectedPathsUnchanged:report.invariantSelectedBytesAllPrompts,
  coordinateMapChanged:report.geometryChangeVisible,sha256:beforeSha
}));
console.log("SAVED: "+target);
