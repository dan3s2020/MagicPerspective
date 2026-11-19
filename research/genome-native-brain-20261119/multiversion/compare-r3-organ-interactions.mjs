// ADDITIVE FACTORIAL INTERACTION: original R3-native ablation with actual A organs.
// Real DNA; same original Brain code; no added learned classifier.
// Real original-native-organism comparison. No classifier replaces Brain.live()
// or Brain.predict(). Each source branch is checked out and imported as actual
// code. Every evaluation label is held only by this external scoring harness.
// This experiment is separate from the original user's running Brain.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"../../..");
const LABELS=["EI","IE","N"];
const SYMBOLS=LABELS.map(x=>x.charCodeAt(0));
const VERSIONS={
  "v42-c4":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"chain"},
  "v42-c1":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:1,readout:"chain"},
  "v42-c2":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:2,readout:"chain"},
  "v42-c3":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:3,readout:"chain"},
  "v42-c-only":{tree:ROOT,rules:{depth:0,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"chain"},
  "v42-deep-a":{tree:ROOT,rules:{depth:4,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"chain"},
  "v42-blend":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"blend"},cap:4,readout:"chain"},
  "v42-log":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"log"},cap:4,readout:"chain"},
  "v42-concept":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"concept"},cap:4,readout:"chain"},
  "v42-no-bud":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R5"]},cap:4,readout:"chain"},
  "v42-no-trust":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R3"]},cap:4,readout:"chain"},
  "v42-resistance-ablation":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2"]},cap:4,readout:"chain"},
  "v42-align":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"alignment"},
  "r3off-baseline":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R3"]},cap:4,readout:"chain"},
  "r3off-depth1":{tree:ROOT,rules:{depth:1,seeker:"C",budEvery:400,maxWires:16,off:["R3"]},cap:4,readout:"chain"},
  "r3off-depth4":{tree:ROOT,rules:{depth:4,seeker:"C",budEvery:400,maxWires:16,off:["R3"]},cap:4,readout:"chain"},
  "r3off-blend":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"blend",off:["R3"]},cap:4,readout:"chain"},
  "r3off-log":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"log",off:["R3"]},cap:4,readout:"chain"},
  "r3off-concept":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"concept",off:["R3"]},cap:4,readout:"chain"},
  "r3off-event":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,fold:"event",off:["R3"]},cap:4,readout:"chain"},
  "r3off-no-bud":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R3","R5"]},cap:4,readout:"chain"},
  "r3off-no-resistance":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R3","R2"]},cap:4,readout:"chain"},
  "r3off-precedent":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,weigh:"precedent",off:["R3"]},cap:4,readout:"chain"},
  "r3off-deepweight":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,weigh:"deep",off:["R3"]},cap:4,readout:"chain"},
  "r3off-c3":{tree:ROOT,rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R3"]},cap:3,readout:"chain"},
  "v43-native":{tree:path.join(ROOT,"comparison-checkouts/v43"),rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"chain"},
  "v42-3sat":{tree:path.join(ROOT,"comparison-checkouts/v42-3sat"),rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},cap:4,readout:"chain"}
};

function fail(message){throw Error(message);}
function sha(buf){return crypto.createHash("sha256").update(buf).digest("hex");}
function hash32(s){return parseInt(sha(s).slice(0,8),16);}
function counts(rows){return Object.fromEntries(LABELS.map(y=>[y,rows.filter(r=>r.label===y).length]));}
function reading(file){
  const buffer=fs.readFileSync(file);
  const lines=buffer.toString("utf8").split(/\r?\n/).filter(Boolean);
  if(lines.length!==3190)fail("Require real UCI 3190 rows, not synthetic or partial: "+lines.length);
  const out=lines.map((line,i)=>{
    const cols=line.split(",");
    const label=cols[0]?.trim().toUpperCase();
    const name=cols[1]?.trim();
    const dna=cols.slice(2).join(",").replace(/\s/g,"").toUpperCase();
    if(!LABELS.includes(label)||!name||dna.length!==60||!/^[A-Z]{60}$/.test(dna))
      fail("Invalid authentic UCI record at line "+(i+1));
    return {name,label,dna,group:name.split("-")[0]};
  });
  return {out,sha256:sha(buffer)};
}
function makeSplit(rows){
  const groups=new Map();
  for(const r of rows){
    if(!groups.has(r.group))groups.set(r.group,[]);
    groups.get(r.group).push(r);
  }
  const train=[],test=[];
  for(const [group,records] of groups){
    const target=(hash32("blind-gene-v1:"+group)%5)===0?test:train;
    target.push(...records);
  }
  train.sort((a,b)=>hash32("train:"+a.name)-hash32("train:"+b.name));
  test.sort((a,b)=>hash32("test:"+a.name)-hash32("test:"+b.name));
  const seenTrain=new Set(),uniqueTrain=[];
  for(const r of train)if(!seenTrain.has(r.dna)){seenTrain.add(r.dna);uniqueTrain.push(r);}
  const seenTest=new Set(),uniqueTest=[];
  let cross=0;
  for(const r of test){
    if(seenTrain.has(r.dna)){cross++;continue;}
    if(!seenTest.has(r.dna)){seenTest.add(r.dna);uniqueTest.push(r);}
  }
  const training=uniqueTrain.slice(0,900);
  const usedGroups=new Set(training.map(x=>x.group));
  const usedDNA=new Set(training.map(x=>x.dna));
  const freshSeen=new Set(),final=[];
  for(const r of uniqueTrain.slice(900)){
    if(usedGroups.has(r.group)||usedDNA.has(r.dna)||freshSeen.has(r.dna))continue;
    final.push(r);freshSeen.add(r.dna);
  }
  if(uniqueTest.some(r=>usedGroups.has(r.group)))fail("Dev group leakage");
  if(final.some(r=>usedGroups.has(r.group)||usedDNA.has(r.dna)))fail("New final group/DNA leakage");
  return {training,dev:uniqueTest.slice(0,400),freshFinal:final,
    availableTrain:uniqueTrain.length,availableTest:uniqueTest.length,crossDuplicates:cross,
    trainGroupCount:usedGroups.size,devGroups:new Set(uniqueTest.slice(0,400).map(x=>x.group)).size,
    freshFinalGroups:new Set(final.map(x=>x.group)).size};
}
function presentation(dna){
  if(dna.length!==60)fail("Expected exact 60nt");
  return "DNA "+dna.slice(0,28)+dna.slice(32,60)+dna.slice(28,32);
}
function byteValues(text){return Array.from(text,x=>x.charCodeAt(0));}
function canonical(r){
  if(r.dna.slice(30,32)==="GT")return "EI";
  if(r.dna.slice(28,30)==="AG")return "IE";
  return "N";
}
function evaluate(rows,predict,{storePredictions=false}={}){
  const confusion=LABELS.map(()=>[0,0,0,0]);
  const predicted=[];let invalid=0;
  for(const row of rows){
    const p=predict(row);
    const yi=LABELS.indexOf(row.label);
    const pi=LABELS.indexOf(p);
    confusion[yi][pi>=0?pi:3]++;
    if(pi<0)invalid++;
    if(storePredictions)predicted.push({name:row.name,truth:row.label,prediction:p});
  }
  const n=rows.length;
  const correct=confusion.reduce((s,r,i)=>s+r[i],0);
  const perClass=LABELS.map((label,i)=>{
    const TP=confusion[i][i],support=confusion[i].reduce((a,b)=>a+b,0);
    const FP=confusion.reduce((s,r)=>s+r[i],0)-TP,FN=support-TP;
    return {label,support,recall:TP/(support||1),precision:TP/(TP+FP||1),
      f1:(2*TP)/(2*TP+FP+FN||1)};
  });
  return {n,correct,accuracy:n?correct/n:null,
    macroF1:perClass.reduce((s,x)=>s+x.f1,0)/3,
    balancedAccuracy:perClass.reduce((s,x)=>s+x.recall,0)/3,
    invalidReadout:invalid,perClass,confusion,
    ...(storePredictions?{predictions:predicted}:{})};
}
function classifier(brain,dna,kind){
  const prompt=byteValues(presentation(dna));
  if(kind==="chain"){
    const dist=brain.predict(prompt);
    if(!Array.isArray(dist)||dist.length<79||SYMBOLS.some(c=>!Number.isFinite(dist[c])))
      fail("Native Brain.predict invalid output");
    let best=0;
    for(let i=1;i<3;i++)if(dist[SYMBOLS[i]]>dist[SYMBOLS[best]])best=i;
    return LABELS[best];
  }
  if(kind==="alignment"){
    // Actual AligningGraph.write from the SAME native Brain. Native output is
    // unrestricted: an emitted nucleotide/space is OTHER and penalised.
    if(!brain.align?.write)fail("No original native AligningGraph.write");
    const generated=brain.align.write(prompt,{max:1,T:0});
    if(!Array.isArray(generated)||generated.length!==1)fail("Invalid native alignment output");
    const i=SYMBOLS.indexOf(generated[0]);
    return i>=0?LABELS[i]:"OTHER";
  }
  fail("Unsupported readout");
}

const [dataFile,mode,...flags]=process.argv.slice(2);
if(!dataFile||!VERSIONS[mode])fail("Usage: node compare-native-versions.mjs SPLICE_DATA VARIANT --phase=dev|final");
const phase=(flags.find(v=>v.startsWith("--phase="))||"--phase=dev").slice(8);
if(!["dev","final"].includes(phase))fail("Invalid experiment phase");
if(phase==="final" && process.env.ALPHAGENOME_FINAL_UNLOCK!=="FROZEN_SELECTED_WINNER")
  fail("Final is locked until frozen winner selected on dev; no accidental test leakage");
const cfg=VERSIONS[mode];
const modulePath=path.join(cfg.tree,"v17/transcend/torus-aether/devour/brain.mjs");
if(!fs.existsSync(modulePath))fail("Actual original Brain branch checkout missing: "+modulePath);
const {Brain}=await import(pathToFileURL(modulePath).href);
if(typeof Brain!=="function")fail("Original branch does not export Brain");
const {out:rows,sha256}=reading(dataFile);
const split=makeSplit(rows);
if(split.training.length!==900||split.dev.length!==400)fail("Dataset split changed");
if(phase==="final" && split.freshFinal.length<50)fail("Fresh group-separated test insufficient");
const samples=phase==="dev"?split.dev:split.freshFinal;
const brain=new Brain({rules:cfg.rules,c:{cap:cfg.cap},seed:20261119});
brain.liveWorld="text";
const learnSymbolsBefore=brain.lived;
for(const row of split.training)
  for(const ch of byteValues(presentation(row.dna)+row.label[0]+"\n"))
    brain.live(ch,false);
const lived=brain.lived;
const aligningLived=brain.align?.lived??null;
if(lived-learnSymbolsBefore!==900*66)fail("Unexpected original Brain symbol count "+lived);
const observed=evaluate(samples,r=>classifier(brain,r.dna,cfg.readout),{storePredictions:true});
const majority=LABELS.reduce((a,b)=>counts(split.training)[a]>=counts(split.training)[b]?a:b);
const controlMajority=evaluate(samples,()=>majority);
const controlMotif=evaluate(samples,canonical);
if(brain.lived!==lived||(brain.align?.lived??null)!==aligningLived)
  fail("Frozen eval mutated original native Brain training counts");
const summary={
  status:"EXECUTED_ON_REAL_DNA_NATIVE_ORGANISM",
  scientificClaim:"HYPOTHESIS_TEST_ONLY_NOT_AG2_COMPARISON",
  mode,phase,originalBrainFile:modulePath.replace(ROOT,"<workspace>"),
  builtInReadout:cfg.readout,nativeRules:cfg.rules,nativeCcap:cfg.cap,
  rawDatasetSha256:sha256,trainingRows:split.training.length,trainingSymbols:lived,
  availableTrain:split.availableTrain,availableOriginalTest:split.availableTest,
  devRows:split.dev.length,availableFinal:split.freshFinal.length,
  usedTrainingGroups:split.trainGroupCount,
  finalGroups:split.freshFinalGroups,excludedCrossDuplicates:split.crossDuplicates,
  usedLabels:counts(split.training),testLabels:counts(samples),
  observed:{n:observed.n,correct:observed.correct,accuracy:observed.accuracy,
    macroF1:observed.macroF1,balancedAccuracy:observed.balancedAccuracy,
    invalidReadout:observed.invalidReadout,perClass:observed.perClass,confusion:observed.confusion},
  controls:{
    majority:{accuracy:controlMajority.accuracy,macroF1:controlMajority.macroF1},
    fixedGTAG:{accuracy:controlMotif.accuracy,macroF1:controlMotif.macroF1}
  },
  provenance:{
    originalBrainUnchanged:true,
    trainedOnActualUCI:true,
    testAnswerGivenToOriginalBrain:false,
    noSeparateTrainedClassifier:true,
    evalWithinHistoricalUCI:true,
    fullOriginalBraivourGGUFTest:false,
    alphagenome2Compared:false
  }
};
const dest=process.env.GENOME_RESULT_PATH;
if(dest)fs.writeFileSync(dest,JSON.stringify({...summary,perExample:observed.predictions},null,2)+"\n");
console.log("GENOME_MULTI_RESULTS "+JSON.stringify(summary));
