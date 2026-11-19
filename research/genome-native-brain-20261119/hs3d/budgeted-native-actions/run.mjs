// ORIGINAL MagicPerspective V42 Brain genuinely learns a limited-observation
// genome action policy. Only two real 4nt viewports are sensed at inference.
// Native ConstructedPathLearner is the ONLY learned policy. Brain.predict is
// the ONLY classifier. All real human acceptor labels are hidden until after
// the original Brain has chosen and predicted. No synthetic DNA, oracle view,
// external trained classifier, image demo, or changed original source.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const SOURCE_SHA="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const START=70, CANDIDATES=[58,62,64,66,74,78];
const POSITIONS=[START,...CANDIDATES];
const MODES={"native-zero":0,"native-200":200,"native-1000":1000};
const LABELS=["P","N"],hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const bytes=s=>Array.from(s,ch=>ch.charCodeAt(0));
const fail=s=>{throw Error(s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function readFasta(file,label) {
  const raw=fs.readFileSync(file),lines=raw.toString("utf8").split(/\r?\n/);
  const rows=[],rejected={length:0,bases:0};let seenSource=0;
  let header=null;
  for(const original of lines) {
    const line=original.trim();
    if(!line)continue;
    if(line.startsWith(">")){
      if(header!==null)fail("Incomplete FASTA pair "+file);
      header=line.slice(1).trim();continue;
    }
    if(header===null)fail("FASTA sequence without header "+file);
    seenSource++;const dna=line.toUpperCase();
    if(dna.length!==140)rejected.length++;
    else if(!/^[ACGT]{140}$/.test(dna))rejected.bases++;
    else rows.push({label,dna,id:label+":"+header+":"+seenSource});
    header=null;
  }
  if(header!==null)fail("Last FASTA header lacks sequence");
  if(rows.length<1300)fail("Source lacks 1300 authentic acceptor entries: "+file);
  return{rows,sha256:hash(raw),rejected,sourceCount:seenSource};
}
function sourceData(dir){
  const P=readFasta(path.join(dir,"Train/Acceptor_Train_Positive.txt"),"P");
  const N=readFasta(path.join(dir,"Train/Acceptor_Train_Negative.txt"),"N");
  const observed=new Map(),conflicting=new Set();
  for(const row of [...P.rows,...N.rows]){
    const prior=observed.get(row.dna);
    if(prior&&prior!==row.label)conflicting.add(row.dna);
    observed.set(row.dna,row.label);
  }
  const pool={};let duplicates=0;
  for(const [label,source] of [["P",P],["N",N]]){
    pool[label]=[];const seen=new Set();
    for(const row of source.rows){
      if(conflicting.has(row.dna)||seen.has(row.dna)){duplicates++;continue;}
      seen.add(row.dna);
      pool[label].push(row);
    }
    pool[label].sort((a,b)=>hash("hs3d-acceptor-transfer-v1:"+a.dna).localeCompare(hash("hs3d-acceptor-transfer-v1:"+b.dna)));
    if(pool[label].length<1300)fail("Not enough unique real acceptor DNA: "+label);
  }
  const interleave=(start,count)=>{
    const out=[];
    for(let i=start;i<start+count;i++)for(const label of LABELS)out.push(pool[label][i]);
    return out;
  };
  const train=interleave(0,600),calibration=interleave(600,500),dev=interleave(1100,200);
  const dnaBySplit=[train,calibration,dev].map(xs=>new Set(xs.map(r=>r.dna)));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)for(const dna of dnaBySplit[i])
    if(dnaBySplit[j].has(dna))fail("Training/calibration/dev DNA leakage");
  for(const r of [...train,...calibration,...dev])
    if(r.dna.slice(68,70)!=="AG")fail("Biological invariant failed: original human acceptor AG");
  return{train,calibration,dev,checksums:{P:P.sha256,N:N.sha256},duplicates,
    conflictDNA:conflicting.size,counts:{P:pool.P.length,N:pool.N.length},
    rejected:{P:P.rejected,N:N.rejected},sources:{P:P.sourceCount,N:N.sourceCount}};
}
function viewFor(row,position){
  const idx=POSITIONS.indexOf(position);
  if(idx<0)fail("Action is outside predeclared physical viewport world: "+position);
  const dna=row.dna.slice(position,position+4);
  if(dna.length!==4)fail("Viewport is not four actual observed bases");
  return{position,index:idx,observedDNA:dna,bytes:bytes(String.fromCharCode(97+idx)+dna)};
}
function nativePrediction(brain,w){
  const dist=brain.predict(w.bytes);
  if(!Array.isArray(dist)||dist.length<81||!Number.isFinite(dist[80])||!Number.isFinite(dist[78]))
    fail("Original native Brain failed to predict P/N");
  const P=Math.max(0,dist[80]),N=Math.max(0,dist[78]),mass=P+N;
  const q=mass?P/mass:0.5,margin=mass?Math.abs(P-N)/mass:0;
  return{classLabel:P>=N?"P":"N",q,margin,p:P,n:N};
}
function actionFeatures(initial,candidatePosition){
  // Features from ORIGINAL native Brain's actually observed first P/N belief
  // and physically known proposed destination. NO target bytes or class.
  const relative=(candidatePosition-70)/16;
  const interactive=clamp(.5+.5*relative*(2*initial.q-1),0,1);
  const knownGeometry=1-Math.min(1,Math.abs(candidatePosition-70)/18);
  return[1,relative,initial.margin,-(1-initial.margin),interactive,knownGeometry];
}
function offerActions(brain,initial){
  return CANDIDATES.map(position=>{
    const features=actionFeatures(initial,position);
    return{position,features,score:brain.constructedPaths.transferableScore(features)};
  });
}
function decide(brain,first,{explore=null}={}){
  // Only first genuine four bases and native belief are accessed before this.
  const initial=nativePrediction(brain,first);
  const available=offerActions(brain,initial);
  let best=available[0];
  for(const a of available)if(a.score>best.score+1e-14)best=a;
  const chosen=explore===null?best:available[explore];
  return{initial,available,chosen};
}
function randIndex(dna,phase){
  return Number.parseInt(hash(phase+":"+dna).slice(0,8),16)%CANDIDATES.length;
}
function score(rows){
  const C={P:{P:0,N:0},N:{P:0,N:0}};
  for(const row of rows){
    if(!LABELS.includes(row.label)||!LABELS.includes(row.prediction))
      fail("Invalid measured original-native class");
    C[row.label][row.prediction]++;
  }
  const perClass=LABELS.map(l=>{
    const other=l==="P"?"N":"P",tp=C[l][l],fn=C[l][other],fp=C[other][l];
    return{label:l,support:tp+fn,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),
      f1:2*tp/(2*tp+fp+fn||1)};
  });
  return{n:rows.length,correct:C.P.P+C.N.N,accuracy:(C.P.P+C.N.N)/rows.length,
    macroF1:perClass.reduce((a,x)=>a+x.f1,0)/2,
    balancedAccuracy:perClass.reduce((a,x)=>a+x.recall,0)/2,
    confusion:C,perClass};
}
const [dir,mode,...extra]=process.argv.slice(2);
if(!dir||!Object.hasOwn(MODES,mode)||extra.length)fail("Usage: run.mjs HS3D_FOLDER native-zero|native-200|native-1000");
const amount=MODES[mode],data=sourceData(dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},c:{cap:5},seed:20261119});
brain.liveWorld="text";
if(brain.CTX!==5)fail("Native original C5 was not constructed");
brain.body.genomeBudgetedWorld={
  task:"real-human-AG-acceptor-true-false",
  originalNativePolicy:true,
  observationBudget:2,
  allowedSecondaryPositions:CANDIDATES.slice(),
  learnedActions:0,
  physicalMovements:0
};
for(let i=0;i<data.train.length;i++){
  const r=data.train[i];
  // All physical viewports are ACTUALLY observed in supervised TRAIN,
  // but not at frozen inference; the only class predictor is Brain.predict.
  for(let k=0;k<POSITIONS.length;k++){
    const p=POSITIONS[(i+k)%POSITIONS.length];
    const w=viewFor(r,p);
    for(const y of [...w.bytes,r.label.charCodeAt(0),10])brain.live(y,false);
  }
}
const livedAfterTrain=brain.lived;
if(livedAfterTrain!==data.train.length*POSITIONS.length*7)
  fail("Original Brain learning count does not match physically observed real training windows");
const alignAfterTrain=brain.align?.lived??null;
const initialPolicy=brain.constructedPaths.pathPolicy.slice();
const calibStats={rows:amount,feedback:0,chosenPositions:{},rewardCorrect:0,exploration:0};
for(const row of data.calibration.slice(0,amount)){
  const initialView=viewFor(row,START);
  const before=decide(brain,initialView);
  const isExplore=(Number.parseInt(hash("bounded-explore:"+row.dna).slice(0,8),16)%5)===0;
  const explorationChoice=isExplore?randIndex(row.dna,"bounded-explore-pos"):null;
  const action=decide(brain,initialView,{explore:explorationChoice}).chosen;
  const actual=viewFor(row,action.position);
  const originalAnswer=nativePrediction(brain,actual);
  const reward=originalAnswer.classLabel===row.label;
  // Class truth revealed ONLY now, AFTER one move and native prediction.
  brain.constructedPaths.learnTransferable(action.features,reward,.04);
  brain.body.genomeBudgetedWorld.learnedActions++;
  brain.body.genomeBudgetedWorld.physicalMovements++;
  calibStats.feedback++;calibStats.exploration+=Number(isExplore);
  calibStats.rewardCorrect+=Number(reward);
  calibStats.chosenPositions[action.position]=(calibStats.chosenPositions[action.position]||0)+1;
}
if(brain.lived!==livedAfterTrain||(brain.align?.lived??null)!==alignAfterTrain)
  fail("Native Brain was altered while learning only action policy");
const finalPolicy=brain.constructedPaths.pathPolicy.slice();
if(brain.constructedPaths.pathPolicyUpdates!==amount)
  fail("The original native ConstructedPathLearner failed to record all real actions");
const records={native:[],fixedInitial70:[],fixed64:[],fixed66:[],randomSecond:[],confidenceAllSix:[]};
const selectedPositions={},traces=[];
for(const row of data.dev){
  const first=viewFor(row,START);
  const action=decide(brain,first); // initial observation only
  const w=viewFor(row,action.chosen.position);
  const answer=nativePrediction(brain,w); // exactly ONE additional observed view
  brain.body.genomeBudgetedWorld.physicalMovements++;
  const selected=answer.classLabel;
  selectedPositions[action.chosen.position]=(selectedPositions[action.chosen.position]||0)+1;
  records.native.push({label:row.label,prediction:selected});
  // Read-only, independent EVALUATOR controls; not seen by the native agent
  // during its selected movement/decision. No Brain.live() or policy updates.
  const fixed=(position)=>nativePrediction(brain,viewFor(row,position)).classLabel;
  records.fixedInitial70.push({label:row.label,prediction:action.initial.classLabel});
  records.fixed64.push({label:row.label,prediction:fixed(64)});
  records.fixed66.push({label:row.label,prediction:fixed(66)});
  records.randomSecond.push({label:row.label,prediction:fixed(CANDIDATES[randIndex(row.dna,"blind-random-action")])});
  let winner=null;
  for(const p of CANDIDATES){
    const a=nativePrediction(brain,viewFor(row,p));
    if(!winner||a.margin>winner.margin)winner=a;
  }
  records.confidenceAllSix.push({label:row.label,prediction:winner.classLabel});
  if(traces.length<400)traces.push({
    id:row.id,truth:row.label,initialBases:first.observedDNA,
    initialPredicted:action.initial.classLabel,
    initialQ:action.initial.q,initialMargin:action.initial.margin,
    chosenPosition:action.chosen.position,chosenFourBases:w.observedDNA,
    chosenScore:action.chosen.score,nativePredicted:selected,
    rewardHiddenUntilAfterPrediction:true,
    offersBeforeAction:action.available.map(a=>({position:a.position,score:a.score}))
  });
}
if(brain.lived!==livedAfterTrain||(brain.align?.lived??null)!==alignAfterTrain)
 fail("Evaluation trained the original native Brain");
if(brain.constructedPaths.pathPolicyUpdates!==amount)
 fail("Evaluation illegally changed original action-learning policy");
const measured=Object.fromEntries(Object.entries(records).map(([key,rows])=>[key,score(rows)]));
const result={
  status:"ACTUAL_ORIGINAL_BRAIN_BUDGETED_ACTIVE_GENOME_ACTION",
  source:"Real human HS3D AG true-vs-false 140nt, EnsembleSplice upstream TRAIN only",
  sourceCommit:SOURCE_SHA,
  phase:"TRAIN_ONLY_EXPLORATORY_DEVELOPMENT_NEVER_OFFICIAL_TEST",
  mode,originalAlgorithms:["Brain.live","Brain.predict","ConstructedPathLearner.transferableScore","ConstructedPathLearner.learnTransferable"],
  nativeBrainUnmodified:true,
  sourceChecksums:data.checksums,sourceCounts:data.sources,validUnique:data.counts,
  exclusions:{duplicates:data.duplicates,conflicts:data.conflictDNA,rejected:data.rejected},
  training:{examples:data.train.length,realViewsPerTrainingExample:7,livedSymbols:livedAfterTrain,
    biologicalCenter:"AG bases68:70",worldIdentity:"human-acceptor"},
  calibration:{...calibStats,weightsBefore:initialPolicy,weightsAfter:finalPolicy,
    policyUpdates:brain.constructedPaths.pathPolicyUpdates},
  evaluation:{
    actualNativeViewBudget:2,
    initialViewPosition:START,
    actualNativeAdditionalActions:1,
    candidates:CANDIDATES,
    devExamples:data.dev.length,
    nativeSelectionHistogram:selectedPositions,
    metrics:measured,
    confidenceAllSixIsOutsideBudget:true,
    allCandidateDNAHiddenDuringNativeActionSelection:true,
    originalBrainFrozenDuringEval:true
  },
  comparisonToAlphaGenome2:"NOT_RUN_OR_COMPARABLE",
  originalBiologicalConditioning:"none",
  automaticNovelViewportDiscovery:false
};
if(process.env.HS3D_BUDGETED_ACTIONS_RESULT_FILE)
  fs.writeFileSync(process.env.HS3D_BUDGETED_ACTIONS_RESULT_FILE,
    JSON.stringify({...result,perExampleNativeTraces:traces},null,2)+"\n");
console.log("HS3D_BUDGETED_NATIVE_RESULT "+JSON.stringify(result));
