// ACTUAL original MagicPerspective V42 Brain, imported from pinned source; no proxy
// learning head, no handcrafted class-score function and no synthetic audio.
// The same Brain.live() absorbs all acoustic events and the three observed
// recording contexts on TRAINING cats only; original Brain.align.write() then
// emits its own next event on completely unseen owners/cats.
// Context prediction is NOT a translation of cat language.
import fs from 'node:fs';
import path from 'node:path';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const DATA='runtime/catmeows/sensory.json';
if(!fs.existsSync(DATA))throw Error('REAL CatMeows sensory.json missing. No synthetic substitute.');
const rows=JSON.parse(fs.readFileSync(DATA,'utf8'));
if(rows.length!==440)throw Error('Expected all 440 CatMeows recordings');
const CLASSES=['B','F','I'];
const tokenMode=process.env.CATMEOWS_TOKEN_MODE||'original';
const sampling=process.env.CATMEOWS_SAMPLING||'all';
const audioFormBin=Number(process.env.BRAIVOUR_AUDIO_FORM_BIN||0);
const priorAlpha=Number(process.env.CATMEOWS_PRIOR_ALPHA||0);
const perspectiveCount=Number(process.env.CATMEOWS_PERSPECTIVES||1);
if(![1,3,9].includes(perspectiveCount))throw Error('Only fixed native sensory perspective counts 1/3/9');
const shifts=perspectiveCount===1?[0]:perspectiveCount===3?[0,3,6]:[0,1,2,3,4,5,6,7,8];
if(![0,0.5,1].includes(priorAlpha))throw Error('Only preregistered prior corrections permitted');
const TOKENS=tokenMode==='high'?{B:240,F:241,I:242}:{B:4,F:5,I:6};
const REVERSE=Object.fromEntries(Object.entries(TOKENS).map(([k,v])=>[v,k]));
const START=tokenMode==='high'?245:15, CUT=tokenMode==='high'?246:16, END=tokenMode==='high'?247:17;
const BASE={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const OUT='runtime/catmeows';
const variants=process.env.CATMEOWS_VARIANTS?process.env.CATMEOWS_VARIANTS.split(','):['audio_absolute','audio_change'];
const FULL_RUN=process.env.CATMEOWS_FULL!=='0';
const shamModes=FULL_RUN?['true','shuffled_labels']:['true'];
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(arr,seed){const a=arr.slice(),r=rng(seed);for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const owners=[...new Set(rows.map(r=>r.owner))].sort();
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);const p=parents.get(k);if(p!==k)parents.set(k,root(p));return parents.get(k);}
function join(a,b){const x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of rows)join('cat:'+r.cat,'owner:'+r.owner);
const groupMap=new Map();
for(const r of rows){const k=root('cat:'+r.cat);if(!groupMap.has(k))groupMap.set(k,{owners:new Set(),cats:new Set(),count:0});const g=groupMap.get(k);g.owners.add(r.owner);g.cats.add(r.cat);g.count++;}
const components=[...groupMap.values()].sort((a,b)=>b.count-a.count || [...a.owners][0].localeCompare([...b.owners][0]));
if(components.length<2)throw Error('Cannot form genuinely unseen-cat and unseen-owner partitions');
const foldCount=Math.min(3,components.length);
const selectedFolds=process.env.CATMEOWS_FOLDS?process.env.CATMEOWS_FOLDS.split(',').map(Number):Array.from({length:foldCount},(_,i)=>i);
const foldedOwners=Array.from({length:foldCount},()=>[]);
const foldSizes=Array(foldCount).fill(0);
for(const group of components){
  let ix=foldSizes.indexOf(Math.min(...foldSizes));
  foldedOwners[ix].push(...group.owners);
  foldSizes[ix]+=group.count;
}
console.log('CATMEOWS_GROUPING '+JSON.stringify({components:components.map(g=>({owners:[...g.owners],cats:[...g.cats],clips:g.count})),foldSizes}));
const ownerSplit=foldedOwners.map(group=>{
  const test=rows.filter(r=>group.includes(r.owner));
  const train=rows.filter(r=>!group.includes(r.owner));
  const trainCats=new Set(train.map(r=>r.cat)),testCats=new Set(test.map(r=>r.cat));
  if([...testCats].some(cat=>trainCats.has(cat)))throw Error('CAT ID LEAKAGE across heldout groups');
  if(train.some(x=>test.some(y=>x.owner===y.owner)))throw Error('OWNER ID LEAKAGE');
  if(new Set(train.map(r=>r.context)).size!==3)throw Error('Missing training class in fold');
  if(test.length===0)throw Error('Empty heldout partition');
  return {group,train,test};
});
const summary=[];
const predictionRows=[];
function foldMetrics(truth,pred){
  const per={};
  for(const label of CLASSES){
    const indices=truth.map((y,i)=>y===label?i:-1).filter(i=>i>=0);
    const count=indices.length;
    per[label]={n:count,correct:indices.filter(i=>pred[i]===label).length,
      recall:count?indices.filter(i=>pred[i]===label).length/count:null};
  }
  const accuracy=truth.filter((t,i)=>t===pred[i]).length/Math.max(1,truth.length);
  const recalls=Object.values(per).map(v=>v.recall).filter(x=>x!==null);
  const balancedAccuracy=recalls.reduce((a,b)=>a+b,0)/Math.max(1,recalls.length);
  return {accuracy,balancedAccuracy,per};
}
function interpret(value){return REVERSE[value]||'?';}
function sense(record,variant,reverseFrames=false){
  const audio=record[variant];
  if(!Array.isArray(audio)||!([9,18,72,81].includes(audio.length))||audio.some(x=>!Number.isInteger(x)||x<20||x>127))
    throw Error('Invalid label-free audio sensory stream');
  if(!reverseFrames)return tokenMode==='high'?audio.map(y=>y+108):audio;
  const frames=[];
  for(let i=0;i<audio.length;i+=9)frames.push(audio.slice(i,i+9));
  const flipped=frames.reverse().flat();return tokenMode==='high'?flipped.map(y=>y+108):flipped;
}
function rotateSensed(sound,shift){
  if(!shift)return sound;
  if(sound.length!==9)throw Error('Perceptual angle rotation only for one global acoustic frame');
  return sound.slice(shift).concat(sound.slice(0,shift));
}
function choosePerspective(votes){
  const valid=votes.filter(x=>CLASSES.includes(x));
  if(!valid.length)return '?';
  const counts=Object.fromEntries(CLASSES.map(x=>[x,valid.filter(z=>z===x).length]));
  const max=Math.max(...Object.values(counts));
  // Agreement of repeated original-Brain perspectives, no external learned head.
  return valid.find(x=>counts[x]===max);
}
function majority(train){
  const c=Object.fromEntries(CLASSES.map(k=>[k,train.filter(x=>x.context===k).length]));
  return CLASSES.slice().sort((a,b)=>c[b]-c[a]||a.localeCompare(b))[0];
}
function trainBrain(brain,trainingRows,variant,labelMode,seed){
  const all=shuffle(trainingRows,seed);
  let seen=all;
  if(sampling==='undersample'){
    const counts=Object.fromEntries(CLASSES.map(k=>[k,all.filter(r=>r.context===k).length]));
    const minimum=Math.min(...Object.values(counts));
    seen=shuffle(CLASSES.flatMap(k=>all.filter(r=>r.context===k).slice(0,minimum)),seed+101);
  }
  if(sampling!=='all'&&sampling!=='undersample')throw Error('Unknown sampling');
  const originalLabels=seen.map(r=>r.context);
  const labels=labelMode==='shuffled_labels'?shuffle(originalLabels,seed+9001):originalLabels;
  for(let i=0;i<seen.length;i++){
    brain.live(START);
    for(const acousticEvent of sense(seen[i],variant))brain.live(acousticEvent);
    brain.live(CUT);                  // this is the boundary before a TRAINING context
    brain.live(TOKENS[labels[i]]);   // only training recordings reveal this context
    brain.live(END);
  }
  return {lived:brain.lived,trainingRecords:seen.length,trainedPerspectives:seen.length*shifts.length,
    preservedTrainingClassCounts:Object.fromEntries(CLASSES.map(k=>[k,labels.filter(y=>y===k).length]))};
}
function predict(brain,record,variant,reverseFrames=false,priorCounts=null,shift=0){
  // Exact ORIGINAL Brain/AligningGraph provides BOTH the full trained symbolic
  // distribution and the native greedy selection; no external learned head.
  const input=[START,...rotateSensed(sense(record,variant,reverseFrames),shift),CUT];
  const before=brain.lived;
  let nativeDistribution=null;
  const result=brain.align.write(input,{
    max:1,T:0,
    ...(priorAlpha>0?{onStep:step=>{nativeDistribution=step.distribution;}}:{})
  });
  if(brain.lived!==before)throw Error('Heldout prediction learned from a test recording');
  const raw=result[0]??null;
  if(priorAlpha===0)return {nativeNextEvent:raw,context:interpret(raw)};
  if(!nativeDistribution||!priorCounts)throw Error('Original Brain distribution unavailable');
  const total=Object.values(priorCounts).reduce((n,k)=>n+k,0);
  // Native sequence score readout corrected only using TRAINING class priors.
  // Known calibration intervention, NOT a new learned classifier / language translation.
  const ranked=CLASSES.map(k=>{
    const p=priorCounts[k]/total;
    return {k,score:(nativeDistribution.get(TOKENS[k])||0)/Math.pow(Math.max(1e-12,p),priorAlpha)};
  }).sort((a,b)=>b.score-a.score||a.k.localeCompare(b.k));
  return {nativeNextEvent:raw,context:ranked[0].k,
    nativeClassScores:Object.fromEntries(ranked.map(x=>[x.k,x.score]))};
}
let completed=0;
for(const variant of variants)for(const labelMode of shamModes){
  for(const fold of selectedFolds){
    const {group,train,test}=ownerSplit[fold];
    const seed=7100+fold*137+(variant==='audio_change'?11:0)+(labelMode==='shuffled_labels'?200:0);
    const brain=new Brain({rules:BASE,seed});
    const started=Date.now();
    const info=trainBrain(brain,train,variant,labelMode,seed);
    const truth=[],pred=[],reversed=[],major=[];
    const majorityLabel=majority(train);
    for(const record of test){
      const perspectives=shifts.map(shift=>predict(brain,record,variant,false,info.preservedTrainingClassCounts,shift));
      const reversePerspectives=shifts.map(shift=>predict(brain,record,variant,true,info.preservedTrainingClassCounts,shift));
      const p={nativeNextEvent:perspectives[0].nativeNextEvent,context:choosePerspective(perspectives.map(x=>x.context))};
      const r={context:choosePerspective(reversePerspectives.map(x=>x.context))};
      truth.push(record.context);
      pred.push(p.context);reversed.push(r.context);major.push(majorityLabel);
      predictionRows.push({variant,labelMode,tokenMode,sampling,audioFormBin,fold,owner:record.owner,cat:record.cat,
        recording:record.recording,truth:record.context,prediction:p.context,
        nativeEvent:p.nativeNextEvent,viewVotes:perspectives.map(x=>x.context),reversePrediction:r.context});
    }
    const metrics=foldMetrics(truth,pred);
    const baseline=foldMetrics(truth,major);
    const reverseMetrics=foldMetrics(truth,reversed);
    const record={variant,labelMode,tokenMode,sampling,audioFormBin,priorAlpha,perspectiveCount,perspectiveCount,fold,ownersHeldout:group,trainN:train.length,testN:test.length,
      trainCats:new Set(train.map(x=>x.cat)).size,testCats:new Set(test.map(x=>x.cat)).size,
      ...info,majorityClass:majorityLabel,
      abstainRate:pred.filter(x=>x==='?').length/Math.max(1,test.length),
      metrics,majorityBaseline:baseline,reverseTimeControl:reverseMetrics,
      elapsedSeconds:(Date.now()-started)/1000};
    summary.push(record);
    console.log('CATMEOWS_FOLD '+JSON.stringify(record));
    completed++;
  }
}
function aggregate(variant,labelMode){
  const selected=predictionRows.filter(r=>r.variant===variant&&r.labelMode===labelMode);
  const metrics=foldMetrics(selected.map(r=>r.truth),selected.map(r=>r.prediction));
  const reverse=foldMetrics(selected.map(r=>r.truth),selected.map(r=>r.reversePrediction));
  return {variant,labelMode,n:selected.length,metrics,reverse,
    abstainRate:selected.filter(x=>x.prediction==='?').length/selected.length,
    folds:summary.filter(x=>x.variant===variant&&x.labelMode===labelMode).map(r=>({
      fold:r.fold,trainN:r.trainN,testN:r.testN,accuracy:r.metrics.accuracy,
      balancedAccuracy:r.metrics.balancedAccuracy,majority:r.majorityBaseline.accuracy}))};
}
const report={status:'EXECUTED_REAL_AUDIO_IF_DATA_PRESENT',timestamp:new Date().toISOString(),tokenMode,sampling,audioFormBin,priorAlpha,
  source:'Zenodo 4008297, 440 official WAV files; MD5 checked by prepare.py',
  sourceBrain:'MagicPerspective V42 ac205b5bc561274b957584a7dee058a1110ab6f8/v17/transcend/torus-aether/devour/brain.mjs',
  originalBrainOwnsLearning:true,trainLabelsOnly:true,heldoutSameOwner:false,heldoutSameCat:false,
  task:'recording context classification, NOT cat language translation',
  splits:foldedOwners,ownerCount:owners.length,clips:rows.length,
  runs:variants.flatMap(variant=>shamModes.map(mode=>aggregate(variant,mode))),
  foldMetrics:summary};
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'results-'+tokenMode+'-'+sampling+'-bin'+audioFormBin+'-alpha'+priorAlpha+'-views'+perspectiveCount+'.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(OUT,'heldout_predictions-'+tokenMode+'-'+sampling+'-bin'+audioFormBin+'-alpha'+priorAlpha+'-views'+perspectiveCount+'.jsonl'),predictionRows.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log('CATMEOWS_SUMMARY '+JSON.stringify(report.runs));
console.log('CATMEOWS_ORIGINAL_BRAIN_TRIAL_COMPLETED '+completed);
