// Causal audit of original Braivour V42 Brain, not a replacement classifier.
// A: does its context answer depend on the ENTIRE genuine meow or only the last frame?
// B: can the SAME native Brain anticipate unseen sound transformations WITHOUT context labels?
// All predictions are produced by original Brain.align.write(); no labels enter evaluation.
import fs from 'node:fs';
import path from 'node:path';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const file='runtime/catmeows/sensory.json';
if (!fs.existsSync(file)) throw Error('Verified REAL Zenodo audio observations required; no synthetic fallback');
const rows=JSON.parse(fs.readFileSync(file,'utf8'));
if(rows.length!==440)throw Error('Expected 440 CatMeows recordings');
const classes=['B','F','I'], token={B:240,F:241,I:242};
const START=245,CUT=246,END=247;
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const variants=['audio_absolute','audio_change'];
function rand(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(a,seed){let b=a.slice(),r=rand(seed);for(let i=b.length-1;i>0;i--){let k=Math.floor(r()*(i+1));[b[i],b[k]]=[b[k],b[i]];}return b;}
const parents=new Map();
function root(x){if(!parents.has(x))parents.set(x,x);let p=parents.get(x);if(p!==x)parents.set(x,root(p));return parents.get(x);}
function union(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
rows.forEach(x=>union('cat:'+x.cat,'owner:'+x.owner));
const components=new Map();
rows.forEach(x=>{let k=root('cat:'+x.cat),v=components.get(k)||{owners:new Set(),n:0};v.owners.add(x.owner);v.n++;components.set(k,v);});
const groups=[...components.values()].sort((a,b)=>b.n-a.n);
const folds=[new Set(),new Set(),new Set()],sizes=[0,0,0];
for(let g of groups){let j=sizes.indexOf(Math.min(...sizes));for(let o of g.owners)folds[j].add(o);sizes[j]+=g.n;}
const reports=[],raw=[];
const encode=(r,variant)=>r[variant].map(x=>{
 if(!Number.isInteger(x)||x<20||x>127)throw Error('Invalid audio-only token');return x+108;});
function makeBrain(seed){return new Brain({rules,seed});}
function train(brain,trainRows,variant,withContext=true){
 for(let r of shuffle(trainRows,6551)){
   brain.live(START);
   for(const e of encode(r,variant))brain.live(e);
   if(withContext){brain.live(CUT);brain.live(token[r.context]);}
   brain.live(END);
 }
}
function classify(brain,a,debug=false){
 const before=brain.lived,ptrace={nClassProposals:0,maxClassDepth:0,
 maxObservedMemDepth:0,distributionHasLabel:false,nProposals:0};
 let result=brain.align.write([START,...a,CUT],{max:1,T:0,
    ...(debug?{onStep:step=>{
      ptrace.nProposals=step.proposals.length;
      for(let p of step.proposals){
        if(p.src==='mem'||p.src==='form')ptrace.maxObservedMemDepth=Math.max(ptrace.maxObservedMemDepth,p.d||0);
        if([...Object.values(token)].some(k=>p.dist.has(k))){
          ptrace.nClassProposals++;ptrace.maxClassDepth=Math.max(ptrace.maxClassDepth,p.d||0);}
      }
      ptrace.distributionHasLabel=[...Object.values(token)].some(k=>step.distribution.has(k));
    }}:{})});
 if(brain.lived!==before)throw Error('A test recording changed original Brain training state');
 return {symbol:result[0],context:classes.find(k=>token[k]===result[0])||'?',...(debug?ptrace:{})};
}
const accuracy=(t,p)=>t.reduce((s,v,i)=>s+(v===p[i]),0)/t.length;
const balanced=(t,p)=>classes.reduce((s,k)=>{let idx=t.flatMap((x,i)=>x===k?[i]:[]);return s+(idx.length?idx.filter(i=>p[i]===k).length/idx.length:0);},0)/3;
const changed=(a,b)=>a.filter((x,i)=>x!==b[i]).length/a.length;
for(let variant of variants){
 for(let fold=0;fold<3;fold++){
  let held=rows.filter(x=>folds[fold].has(x.owner)),trainRows=rows.filter(x=>!folds[fold].has(x.owner));
  if(held.some(r=>trainRows.some(t=>r.owner===t.owner||r.cat===t.cat)))throw Error('OWNER OR CAT LEAKAGE');
  const brain=makeBrain(1200+fold);
  train(brain,trainRows,variant,true);
  const t=[],p=[],prefix=[],suffix=[],middle=[],constant=[],noAudio=[],partnerPrediction=[],partnerTruth=[],metainfo=[];
  const byClass=new Map(classes.map(k=>[k,held.filter(r=>r.context===k)]));
  let arr=held.map(r=>encode(r,variant));
  const n=arr[0].length;
  if(n!==72)throw Error('This causal audit requires full 8 frames x 9 features');
  // Null sensory stream keeps every feature column position, replacing acoustic values with TRAINING per-column modal values.
  const modes=Array.from({length:9},(_,col)=>{
    let freq=new Map();for(let r of trainRows)for(let i=col;i<72;i+=9){
      let v=encode(r,variant)[i];freq.set(v,(freq.get(v)||0)+1);}
    return [...freq].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
  });
  for(let index=0;index<held.length;index++){
    let r=held[index],a=arr[index],others=held.filter(s=>s.context!==r.context&&s.cat!==r.cat);
    if(!others.length)throw Error('No real opposite-context control recordings in fold');
    let other=others[(index*17+fold)%others.length],o=encode(other,variant);
    let prediction=classify(brain,a,true);
    t.push(r.context);p.push(prediction.context);
    prefix.push(classify(brain,[...o.slice(0,63),...a.slice(63)]).context);
    suffix.push(classify(brain,[...a.slice(0,63),...o.slice(63)]).context);
    middle.push(classify(brain,[...a.slice(0,9),...o.slice(9,63),...a.slice(63)]).context);
    constant.push(classify(brain,Array.from({length:72},(_,i)=>modes[i%9])).context);
    noAudio.push(classify(brain,[]).context);
    partnerPrediction.push(classify(brain,o).context);partnerTruth.push(other.context);
    metainfo.push({nClassProposals:prediction.nClassProposals,maxClassDepth:prediction.maxClassDepth,
      maxObservedMemDepth:prediction.maxObservedMemDepth,nProposals:prediction.nProposals,
      distributionHasLabel:prediction.distributionHasLabel});
    raw.push({variant,fold,recording:r.recording,truth:r.context,prediction:prediction.context,
      partnerContext:other.context,partnerPrediction:partnerPrediction.at(-1),
      prefixReplaced:prefix.at(-1),suffixReplaced:suffix.at(-1),middleReplaced:middle.at(-1),
      constant:constant.at(-1),noAudio:noAudio.at(-1),...metainfo.at(-1)});
  }
  const mean=key=>metainfo.reduce((s,r)=>s+r[key],0)/metainfo.length;
  const c={variant,fold,heldoutN:t.length,trainingN:trainRows.length,
    accuracy:accuracy(t,p),balancedAccuracy:balanced(t,p),
    acousticCausalChangeRates:{
      prefix7Of8FramesChanged:changed(p,prefix),
      last1Of8FramesChanged:changed(p,suffix),
      middle6FramesChanged:changed(p,middle),
      replacedByOtherRealMeow:changed(p,partnerPrediction),
      replacedAllByColumnModalAudio:changed(p,constant),
      allAcousticEventsRemoved:changed(p,noAudio)},
    meanClassSupportingProposals:mean('nClassProposals'),
    meanMaxClassSupportingDepth:mean('maxClassDepth'),meanMaxMemoryDepth:mean('maxObservedMemDepth'),
    classInNativeDistributionRate:metainfo.filter(x=>x.distributionHasLabel).length/metainfo.length,
    controls:{partnerTruthAccuracy:accuracy(partnerTruth,partnerPrediction),
      nullSoundAccuracy:accuracy(t,constant),
      noAudioAccuracy:accuracy(t,noAudio)}};
  reports.push(c);
  console.log('CATMEOWS_CAUSAL_CONTEXT '+JSON.stringify(c));
 }
}
// A second experiment: sound-to-sound anticipation, WITHOUT ANY context or label in native learning.
const anchors=[9,18,27,36,45,54,63];
for(let variant of variants){
 for(let fold=0;fold<3;fold++){
  let held=rows.filter(x=>folds[fold].has(x.owner)),trainRows=rows.filter(x=>!folds[fold].has(x.owner));
  const brain=makeBrain(4410+fold);
  train(brain,trainRows,variant,false);
  let correct=0,modeCorrect=0,continuityCorrect=0,total=0,wrongColumn=0;
  let bins=Array.from({length:9},()=>new Map());
  for(const r of trainRows){const x=encode(r,variant);for(let i=0;i<x.length;i++){const f=i%9,m=bins[f];m.set(x[i],(m.get(x[i])||0)+1);}}
  const most=bins.map(m=>[...m].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0]);
  let changes=0,aligned=0;
  for(let r of held){
    const x=encode(r,variant);
    for(let i of anchors){
      const prediction=brain.align.write([START,...x.slice(0,i)],{max:1,T:0})[0];
      const target=x[i],slot=Math.floor((target-128)/12);
      correct+=prediction===target;
      modeCorrect+=most[slot]===target;
      continuityCorrect+=x[i-9]===target;
      if(!Number.isInteger(prediction)||prediction<128||Math.floor((prediction-128)/12)!==slot)wrongColumn++;
      total++;
    }
  }
  const audit={variant,fold,heldoutN:held.length,eventsTested:total,trainedOnLabels:false,
    nativeNextAudioExact:correct/total,
    staticPerColumnModalAudioExact:modeCorrect/total,
    sameFeaturePreviousFrameExact:continuityCorrect/total,
    nativeWrongFeatureColumnRate:wrongColumn/total};
  reports.push(audit);
  console.log('CATMEOWS_AUDIO_ONLY_CONTINUATION '+JSON.stringify(audit));
 }
}
const output={schema:'native-brain-causal-diagnostic/v1',
  realAudio:true,method:'original Brain.live and Brain.align.write; no external classifier',
  formalScope:'assess sensitivity to acoustic information and acoustic continuation, NOT semantic message decoding',
  datasetCount:rows.length,catCount:new Set(rows.map(x=>x.cat)).size,
  ownerCount:new Set(rows.map(x=>x.owner)).size,components:groups.length,
  expectedNativeMemoryMatchCap:6,expectedNativeFormMatchCap:4,
  diagnostics:reports};
fs.mkdirSync('runtime/catmeows',{recursive:true});
fs.writeFileSync('runtime/catmeows/causal_audit.json',JSON.stringify(output,null,2));
fs.writeFileSync('runtime/catmeows/causal_holdout.jsonl',raw.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log('CATMEOWS_CAUSAL_AUDIT_COMPLETE '+JSON.stringify({tested:raw.length,reports:reports.length}));
