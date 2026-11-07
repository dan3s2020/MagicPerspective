#!/usr/bin/env node
// MagicPerspective V17: ACTUAL corpus training, frozen held-out axis-gating evaluation.
// Uses the ORIGINAL Brain.liveLanguage(), Brain.learnObservedTransformations(),
// optional Brain.learnConstructedText() and ORIGINAL openTextDataset() Parquet reader.
// Never edits the user's existing Brain save or the V17 UI/trainer.
// See the README in this research folder for the scope and limitations.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {openTextDataset} from "../../transcend/torus-aether/data/text-dataset.mjs";
import {evaluateFrozenAxes,selectAxisGate} from "./real-text-gate.mjs";

const args=process.argv.slice(2);
function flag(name,fallback=null) {
 const index=args.indexOf("--"+name);
 return index>=0?args[index+1]??"true":fallback;
}
const has=name=>args.includes("--"+name);
const maxRows=Math.max(0,Number(flag("max-rows","0")));
const evalChars=Math.max(1000,Number(flag("eval-chars","100000")));
const every=Math.max(1,Number(flag("save-every","5000")));
const maxChars=Math.max(64,Number(flag("row-chars","20000")));
const seed=Number(flag("seed","17"));
const output=flag("out");
const datasetPath=flag("data"),txtPath=flag("text"),importBrain=flag("import-brain");
if(!output||!!datasetPath===!!txtPath||
  ![maxRows,evalChars,every,maxChars,seed].every(Number.isFinite)){
 console.error("Usage: node v17/research/learned-axes/train-real-text.mjs --data D:\\training\\OpenThoughts3-1.2M --out D:\\MagicPerspective-Real-Gating --max-rows 50000 --resume");
 console.error("Or: --text D:\\corpus.txt --out D:\\MagicPerspective-Real-Gating --max-rows 50000");
 process.exit(2);
}
const out=path.resolve(output);
const input={kind:datasetPath?"parquet":"text",path:path.resolve(datasetPath||txtPath)};
const saveFile=path.join(out,"brain-real-text.v8"),manifestFile=path.join(out,"progress.json");
const resultFile=path.join(out,"heldout-results.json"),eventsFile=path.join(out,"train-events.jsonl");
const resume=has("resume"),evalOnly=has("eval-only");
if(resume&&importBrain)throw Error("Choose either --resume or --import-brain, not both.");
if(importBrain&&!fs.existsSync(path.resolve(importBrain)))throw Error("Imported Brain checkpoint not found: "+importBrain);
if(!resume&&fs.existsSync(out)&&fs.readdirSync(out).length)
 throw Error("Output folder is not empty; refusing overwrite. Specify --resume to continue an existing isolated run.");
fs.mkdirSync(out,{recursive:true});
if(resume&&(!fs.existsSync(saveFile)||!fs.existsSync(manifestFile)))
 throw Error("Resume requires both the exact saved Brain and progress.json.");
let manifest=resume?JSON.parse(fs.readFileSync(manifestFile,"utf8")):
 {version:1,input,seed,cursor:-1,trained:0,chars:0,created:new Date().toISOString(),complete:false,
   importedCheckpoint:importBrain?path.resolve(importBrain):null};
if(manifest.version!==1||JSON.stringify(manifest.input)!==JSON.stringify(input)||manifest.seed!==seed)
 throw Error("Resume input/seed mismatch. Refusing to combine unrelated training.");
let brain=resume?Brain.load(saveFile):importBrain?Brain.load(path.resolve(importBrain)):new Brain({seed,rules:"winner"});
const begun=Date.now();
const trim=row=>String(row??"").slice(0,maxChars);
function consume(raw,position){
 const text=trim(raw),before=brain.language.seen;
 if(!text.trim())return;
 brain.liveLanguage(text);
 const ops=brain.learnObservedTransformations(text);
 if(has("train-constructed")){
  const m=/^\s*Q:\s*([\s\S]+?)\nA:\s*([\s\S]+)$/iu.exec(text);
  if(m&&m[1].trim()&&m[2].trim())brain.learnConstructedText(m[1].trim(),m[2].trim());
 }
 manifest.cursor=position;manifest.trained++;manifest.chars+=text.length;
 if(manifest.trained%Math.min(every,250)===0){
  const line=JSON.stringify({time:new Date().toISOString(),rows:manifest.trained,chars:manifest.chars,
   observedTokens:brain.language.seen,scaleStates:brain.language.stateCount,
   observedTransformations:brain.observedTransformations.operators.size,
   learnedDifferences:ops.newOperators,seconds:(Date.now()-begun)/1000});
  fs.appendFileSync(eventsFile,line+"\n");
  process.stdout.write(line+"\n");
 }
}
function persist(){
 brain.save(saveFile);
 const temp=manifestFile+".tmp";
 fs.writeFileSync(temp,JSON.stringify({...manifest,updated:new Date().toISOString()},null,2));
 fs.renameSync(temp,manifestFile);
}
const tokenBudget=(items,max)=>{
 let sum=0,done=[];
 for(const item of items){if(sum>=max)break;const v=trim(item);if(!v.trim())continue;
  const cut=v.slice(0,max-sum);done.push(cut);sum+=cut.length;}
 return done;
};
async function* paragraphs(file){
 const stream=fs.createReadStream(file,{encoding:"utf8"});
 const lines=readline.createInterface({input:stream,crlfDelay:Infinity}),buf=[];
 try {
  for await(const line of lines){
   if(!line.trim()){
    if(buf.length){yield buf.join("\n");buf.length=0;}
   }else buf.push(line);
  }
  if(buf.length)yield buf.join("\n");
 }finally{lines.close();stream.destroy();}
}
const splitOf=paragraph=>parseInt(createHash("sha256").update(paragraph.trim()).digest("hex").slice(0,8),16)%1000;
let validation=[],test=[],progress=0,trainMax=0,evalSource=null;
if(input.kind==="parquet"){
 const dataset=await openTextDataset(input.path);
 const valRows=Math.max(1,Math.min(256,Math.floor(dataset.trainRows/12)));
 trainMax=dataset.trainRows-valRows;
 const take=maxRows?Math.min(maxRows,trainMax):trainMax;
 const get=async index=>{
  const row=await dataset.exercise(index);
  return "Q: "+row.prompt+"\nA: "+row.answer;
 };
 if(!evalOnly)for(let i=0;i<take;i++){
  if(i<=manifest.cursor)continue;
  consume(await get(i),i);progress++;
  if(progress%every===0)persist();
 }
 for(let i=trainMax;i<dataset.trainRows;i++)validation.push(await get(i));
 for(let i=0;i<dataset.held;i++){
  const row=await dataset.heldOut(i);
  test.push("Q: "+row.prompt+"\nA: "+row.answer);
 }
 evalSource={kind:"parquet",trainingRowsAvailable:trainMax,heldoutRows:dataset.held,validationRows:valRows,
  snapshotTrainRows:take,trainingRowsProcessed:manifest.trained,
  note:"Native dataset's final held-out rows are excluded from training and validation."};
 manifest.complete=take===trainMax;
}else{
 if(!fs.existsSync(input.path))throw Error("No TXT input at "+input.path);
 let row=0,training=0;
 for await(const p of paragraphs(input.path)){
  const split=splitOf(p);
  if(split>=900){if(test.reduce((s,x)=>s+x.length,0)<evalChars)test.push(p);}
  else if(split>=800){if(validation.reduce((s,x)=>s+x.length,0)<evalChars)validation.push(p);}
  else if(!evalOnly&&(!maxRows||training<maxRows)){
   // Split by content hash; exact repeats have the same partition.
   if(row>manifest.cursor){consume(p,row);progress++;if(progress%every===0)persist();}
   training++;
  }
  row++;
 }
 trainMax=training;
 manifest.complete=!maxRows||training<maxRows;
 evalSource={kind:"txt",partition:"SHA256 paragraph hash, 80% train / 10% validation / 10% test",
  paragraphsObserved:row,trainingRowsProcessed:manifest.trained,
  trainRowsLimit:maxRows||null,
  note:"The same paragraph cannot occur in both train and heldout if its bytes are identical."};
}
validation=tokenBudget(validation,evalChars);test=tokenBudget(test,evalChars);
persist();
if(!validation.length||!test.length)throw Error("No usable validation/test passages; provide more real corpus data.");
// Freeze the original Brain state here. Both passes are read-only. No text, target
// or next token from the final test is ever used to select the gate.
const pre=brain.language.seen,model=brain.language;
const gate=selectAxisGate(model,validation);
const selectedVal=evaluateFrozenAxes(model,validation,{gating:gate,maxTrace:0});
const baseline=evaluateFrozenAxes(model,test,{maxTrace:24});
const selectedTest=evaluateFrozenAxes(model,test,{gating:gate,maxTrace:24});
if(brain.language.seen!==pre)throw Error("Held-out evaluation changed the trained native V17 model.");
const chosen=selectedVal.gated.accuracy>selectedVal.native.accuracy?"learned":"native";
const deployedAccuracy=chosen==="learned"?selectedTest.gated.accuracy:baseline.native.accuracy;
const kinds={replace:0,insert:0,delete:0};
const observedActionExamples=[];
for(const operator of brain.observedTransformations.operators.values()){
 if(Object.hasOwn(kinds,operator.kind))kinds[operator.kind]++;
 if(observedActionExamples.length<12&&operator.evidence?.length)
  observedActionExamples.push({kind:operator.kind,from:operator.from,to:operator.to,
    contextLeft:operator.left,contextRight:operator.right,
    evidence:operator.evidence[0],support:operator.sourceObservations});
}
const report={
 schema:1,time:new Date().toISOString(),trainingSource:input,evalSource,
 nativeBrain:true,importedCheckpoint:manifest.importedCheckpoint||null,
 trainingRows:manifest.trained,trainingChars:manifest.chars,
 actualObservedTextTokens:pre,observedEditOperators:brain.observedTransformations.operators.size,
 observedEditKinds:kinds,observedEditExamples:observedActionExamples,
 causalAxes:"context-history lengths learned from corpus; no claim of discovered physical axes",
 gate,validation:{native:selectedVal.native,learned:selectedVal.gated,
  gatingChoiceBeforeTest:chosen},
 finalTest:{tokens:baseline.count,unigram:baseline.unigram,bigram:baseline.bigram,
  originalNative:baseline.native,ungatedNative:baseline.native,
  learnedGate:selectedTest.gated,preselectedPolicy:chosen,
  preselectedPolicyAccuracy:deployedAccuracy,axes:selectedTest.axes,
  predictedVsObservedTrace:selectedTest.trace},
 status:deployedAccuracy>(baseline.native.accuracy??0)+.01&&
  deployedAccuracy>(baseline.bigram.accuracy??0)+.01?"PASS_MORE_THAN_NATIVE_AND_BIGRAM":
  "NOT_YET_DEMONSTRATED",
 conclusion:"Real heldout next-token prediction only. No proof of semantic reasoning or hyperdimensional solution-path navigation.",
 frozenEvaluation:true,modelMutationsDuringTest:0};
fs.writeFileSync(resultFile+".tmp",JSON.stringify(report,null,2));
fs.renameSync(resultFile+".tmp",resultFile);
console.log("REAL_CORPUS_FROZEN_RESULTS "+JSON.stringify({rows:manifest.trained,tokens:baseline.count,
 native:baseline.native.accuracy,bigram:baseline.bigram.accuracy,
 discoveredGate:selectedTest.gated.accuracy,chosen,status:report.status,
 savedTo:resultFile}));
