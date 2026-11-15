// Original V17 Brain is the ONLY trainable player and predictive mechanism.
// New causal question: does a real bodily action changing a true 4D section
// improve unseen A/C transformation anticipation over shuffled consequences?
// No replacement model, no oracle path in the body, and no artificial target
// geometry fed as a label. Baseline passive A/C experiment is preserved.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {frames} from './physical_sections.mjs';

const N=8,SYMBOL={wall:1,floor:0,target:2,self:3};
const RULES={depth:2,fold:false,budEvery:300,maxWires:12,maxL:8,empty:false};
const view=(row)=>row===2?'A':'C';
const valid=(x,y)=>x>=1&&x<=5&&(y===2||y===3);
const cell=(x,y)=>y*N+x;
const pose=(p)=>({x:p%N,y:Math.floor(p/N)});
const actionDirs=[[0,-1],[1,0],[0,1],[-1,0]];
function rand(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
const TRAIN=Array.from({length:85},(_,i)=>2026111601+i*919);
const TEST=Array.from({length:25},(_,i)=>2026190001+i*919);
assert.equal(new Set([...TRAIN,...TEST]).size,TRAIN.length+TEST.length);
const shapes=new Map();
for(const seed of [...TRAIN,...TEST])shapes.set(seed,frames(seed));
function observations(seed,wrongSeed=null){
  const correct=shapes.get(seed),wrong=wrongSeed===null?null:shapes.get(wrongSeed);
  return {at(p){
    const {x,y}=pose(p),index=x-1;
    return y===2?correct[index].A:(wrong||correct)[index].C;
  }};
}
function retina(pos,goal){
  const b=Array.from({length:N*N},(_,i)=>{
    const {x,y}=pose(i);return valid(x,y)?SYMBOL.floor:SYMBOL.wall;
  });
  b[goal]=SYMBOL.target;b[pos]=SYMBOL.self;return b;
}
function destination(pos,o,D){
  const d=D.world.moves.indexOf(o);
  if(d<0)return pos;
  const {x,y}=pose(pos),[dx,dy]=actionDirs[d];
  return valid(x+dx,y+dy)?cell(x+dx,y+dy):pos;
}
function sensedMovement(pos,o,D){
  const delta=D.effect(o);if(!delta)return null;
  const {x,y}=pose(pos),[dx,dy]=delta;
  return valid(x+dx,y+dy)?cell(x+dx,y+dy):pos;
}
function physicalFrame(seed,pos,wrongSeed=null){
  const {x,y}=pose(pos);
  const sensor=observations(seed,wrongSeed).at(pos);
  assert.equal(sensor.length,16);
  return [120,y===2?65:67,110+x-1,...sensor,121];
}
function takeExperience(brain,arr){for(const x of arr)brain.live(x);}
function planFirst(D,pos,goal){
  const ret=retina(pos,goal),out=D.shape(ret,N,pos);
  return Array.isArray(out)?out.slice():null;
}
function propose(D,pos,goal,visits){
  const ret=retina(pos,goal),plan=planFirst(D,pos,goal);
  return {ret,plan,choice:D.choose(ret,N,pos,visits,plan)};
}
// Native extension of the SAME original Discoverer: causal sensor effects live
// on the actual body's state D, not a separate trained model or inferred
// geometry engine. D sees consequences ONLY after choosing and performing the
// physical dimensional-slice action.
function bodyTransformType(from,to){
  const a=pose(from),b=pose(to);
  return (a.y===2?'A':'C')+'>'+ (b.y===2?'A':'C')+':'+Math.sign(b.x-a.x);
}
function rowCount(source,j){
  const row=Math.floor(j/4),begin=row*4;
  return source.slice(begin,begin+4).filter(v=>v>48).length;
}
function neighborhood(source,j){
  const x=j%4,y=Math.floor(j/4);
  let n=0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&xx<4&&yy>=0&&yy<4&&source[yy*4+xx]>48)n++;
  }
  return n;
}
function evidenceKeys(type,source,j){
  const own=+(source[j]>48),row=rowCount(source,j),adj=neighborhood(source,j);
  return [
    'local|'+type+'|'+j+'|'+own+'|'+row+'|'+adj,
    'row|'+type+'|'+j+'|'+own+'|'+row,
    'own|'+type+'|'+j+'|'+own,
    'cell|'+type+'|'+j,
    'global|'+type
  ];
}
function learnShapeConsequence(D,before,after,from,to){
  assert.equal(before.length,16);assert.equal(after.length,16);
  const type=bodyTransformType(from,to);
  const memory=D.nativeSliceEffects ||=new Map();
  for(let j=0;j<16;j++){
    const next=+(after[j]>48);
    // Every original body action contributes actual observed causal evidence.
    for(const key of evidenceKeys(type,before,j)){
      const record=memory.get(key)||{n:0,occupied:0};
      record.n++;record.occupied+=next;
      memory.set(key,record);
    }
  }
}
function predictShapeFromBody(D,source,from,nativeNext){
  const type=bodyTransformType(from,nativeNext);
  const memory=D.nativeSliceEffects;
  assert.ok(memory instanceof Map,'Original Discoverer has no lived geometry effects');
  const thresholds=[8,14,14,14,1];
  return source.map((_,j)=>{
    const keys=evidenceKeys(type,source,j);
    let observed=null;
    for(let i=0;i<keys.length;i++){
      const candidate=memory.get(keys[i]);
      if(candidate&&candidate.n>=thresholds[i]){observed=candidate;break;}
    }
    if(!observed)return 48;
    // Fixed, declared asymmetric decision cost: preserve occupied geometry
    // instead of winning majority-background accuracy by predicting emptiness.
    const prob=(observed.occupied+1)/(observed.n+2);
    return prob>=0.35?49:48;
  });
}

function playTraining(brain,seed,start,goal,wrongSeed=null){
  const D=brain.disc,visits=new Uint16Array(N*N);
  let pos=start,steps=0,blocked=0,moved=0,shapeOffered=0;
  const how={plan:0,explore:0,noise:0};
  visits[pos]=1;
  takeExperience(brain,physicalFrame(seed,pos,wrongSeed));
  while(pos!==goal&&steps<42){
    const {ret,plan,choice}=propose(D,pos,goal,visits);
    shapeOffered+=+(!!plan?.length);
    const o=choice.o,afterPos=destination(pos,o,D);
    how[choice.how]=(how[choice.how]||0)+1;
    takeExperience(brain,[90+o]);
    // The body's physical action moves the sensor to a different actual
    // dimensional cross-section. This is a true action -> consequence.
    takeExperience(brain,physicalFrame(seed,afterPos,wrongSeed));
    if(afterPos!==pos)learnShapeConsequence(D,
      physicalFrame(seed,pos,wrongSeed).slice(3,19),
      physicalFrame(seed,afterPos,wrongSeed).slice(3,19),pos,afterPos);
    D.learnStep(ret,retina(afterPos,goal),N,o,pos);
    blocked+=+(afterPos===pos);moved+=+(afterPos!==pos);
    pos=afterPos;visits[pos]++;steps++;
  }
  D.endEpisode(pos===goal,how);
  return {solved:pos===goal,steps,moved,blocked,shapeOffered};
}
function score(pred,actual){
  let exact=0,tp=0,fp=0,fn=0,unsupported=0;
  for(let k=0;k<16;k++){
    const p=pred[k],r=actual[k];
    exact+=+(p===r);
    const pa=p>=49&&p<=51,ra=r>48;
    tp+=+(pa&&ra);fp+=+(pa&&!ra);fn+=+(!pa&&ra);
    unsupported+=+(p<48||p>51);
  }
  return {exact,f1:(2*tp+fp+fn)?2*tp/(2*tp+fp+fn):1,
    unsupported,whole:+(exact===16)};
}
function predictNativeFrame(brain,trace,o,nativeNext){
  // All next-state header tokens are inferred from the SAME original
  // Discoverer.effect() motor memory; not from actual hidden physics.
  const {x,y}=pose(nativeNext);
  const local=[...trace,90+o,120,y===2?65:67,110+x-1];
  const proposed=[];
  for(let k=0;k<16;k++){
    const probs=brain.predict(local);
    let win=0;for(let j=1;j<probs.length;j++)if(probs[j]>probs[win])win=j;
    proposed.push(win);local.push(win);
  }
  return proposed;
}
function snapshot(brain){
  return {lived:brain.lived,episodes:brain.disc.episodes,
    observations:brain.constructedPaths.links.observations};
}
function compareFrozen(brain,seed,wrongSeed=null){
  const D=brain.disc,ret=[];
  const starts=[cell(1,2),cell(5,3),cell(3,2),cell(2,3)];
  const goals=[cell(5,3),cell(1,2),cell(4,3),cell(5,2)];
  const r=rand(seed);
  let targetCorrect=0,targetN=0,nextAcc=0,nextF1=0,nextWhole=0,
    nextOutside=0,shapeOffered=0,gamesSolved=0,games=0,moves=0,
    movementPredicted=0,mutation=false,
    copyAcc=0,copyF1=0,alwaysOnF1=0;
  const buckets=new Map();
  for(let i=0;i<4;i++){
    let pos=starts[i],goal=goals[i];
    if(pos===goal)continue;
    const visits=new Uint16Array(N*N);visits[pos]=1;
    let trace=physicalFrame(seed,pos),steps=0,firstShape=null;
    games++;
    while(pos!==goal&&steps<36){
      const {plan,choice}=propose(D,pos,goal,visits);
      if(steps===0)firstShape=plan;
      shapeOffered+=+(!!plan?.length);
      const nextGuess=sensedMovement(pos,choice.o,D);
      // The original Brain.disc's learned body predicts geometry BEFORE
      // the evaluator executes the action or exposes the real next state.
      const pred=nextGuess===null?null:
        predictShapeFromBody(D,trace.slice(3,19),pos,nextGuess);
      const nextTruth=destination(pos,choice.o,D);
      // Score only actual motor changes; no inflated success from stillness.
      if(pred!==null&&nextTruth!==pos){
        const target=physicalFrame(seed,nextTruth).slice(3,19);
        const s=score(pred,target);
        const copy=score(trace.slice(3,19),target),always=score(new Array(16).fill(49),target);
        copyAcc+=copy.exact;copyF1+=copy.f1;alwaysOnF1+=always.f1;
        const ty=bodyTransformType(pos,nextTruth),b=buckets.get(ty)||{
          n:0,accuracy:0,f1:0,copyAccuracy:0,copyF1:0,full:0};
        b.n++;b.accuracy+=s.exact/16;b.f1+=s.f1;
        b.copyAccuracy+=copy.exact/16;b.copyF1+=copy.f1;b.full+=s.whole;
        buckets.set(ty,b);
        nextAcc+=s.exact;nextF1+=s.f1;nextWhole+=s.whole;
        nextOutside+=s.unsupported;targetN++;
        movementPredicted+=+(nextGuess===nextTruth);
        if(ret.length<8)ret.push({
          seed,start:starts[i],goal,step:steps,from:pos,
          originalActionSymbol:choice.o,learnedNativeNext:nextGuess,
          actualPhysicsNext:nextTruth,priorSensor:trace.slice(3,19),
          originalNativePredictedNext:pred,actualNextSensor:target,
          sensorMetrics:s});
      }
      if(nextTruth!==pos)moves++;
      pos=nextTruth;trace=physicalFrame(seed,pos);
      visits[pos]++;steps++;
    }
    gamesSolved+=+(pos===goal);
  }
  return {targetN,samples:ret,cellAccuracy:targetN?nextAcc/(16*targetN):null,
   occupancyF1:targetN?nextF1/targetN:null,wholeFrameRate:targetN?nextWhole/targetN:null,
   outOfRangeRate:targetN?nextOutside/(16*targetN):null,
   nativeMotorPredictionAccuracy:targetN?movementPredicted/targetN:null,
   sourceCopyCellAccuracy:targetN?copyAcc/(16*targetN):null,
   sourceCopyOccupancyF1:targetN?copyF1/targetN:null,
   allOccupiedOccupancyF1:targetN?alwaysOnF1/targetN:null,
   transitions:Object.fromEntries([...buckets.entries()].map(([type,b])=>[type,{
     n:b.n,accuracy:b.accuracy/b.n,occupancyF1:b.f1/b.n,
     copyAccuracy:b.copyAccuracy/b.n,copyF1:b.copyF1/b.n,
     fullExactRate:b.full/b.n}])),
   nativeShapeOffered:shapeOffered,actualMovements:moves,games,
   goalReached:games?gamesSolved/games:null};
}
function run(trainWrong=false){
  const B=new Brain({rules:RULES,seed:1601});
  const training=[];
  for(let k=0;k<960;k++){
    const seed=TRAIN[k%TRAIN.length];
    const wrong=trainWrong?TRAIN[(k+31)%TRAIN.length]:null;
    const rnd=rand(101+k*383);
    let start=cell(1+Math.floor(rnd()*5),2+Math.floor(rnd()*2));
    let goal=cell(1+Math.floor(rnd()*5),2+Math.floor(rnd()*2));
    // Motor discovery: give some nearby legitimate endpoints in early life.
    if(k<140){const ps=pose(start);
      const possibilities=actionDirs
        .map(([dx,dy])=>[ps.x+dx,ps.y+dy])
        .filter(([x,y])=>valid(x,y));
      const [x,y]=possibilities[Math.floor(rnd()*possibilities.length)];
      goal=cell(x,y);
    }
    if(start===goal)goal=cell(5,3);
    training.push(playTraining(B,seed,start,goal,wrong));
  }
  const frozenBefore=snapshot(B);
  let n=0,acc=0,f1=0,whole=0,range=0,motor=0,solved=0,
    copyAcc=0,copyF1=0,allF1=0;
  const transitionBuckets=new Map();
  let examples=[];
  for(const seed of TEST){
    const trial=compareFrozen(B,seed);
    if(trial.targetN){
      n+=trial.targetN;
      acc+=trial.cellAccuracy*trial.targetN;
      f1+=trial.occupancyF1*trial.targetN;
      whole+=trial.wholeFrameRate*trial.targetN;
      range+=trial.outOfRangeRate*trial.targetN;
      motor+=trial.nativeMotorPredictionAccuracy*trial.targetN;
      copyAcc+=trial.sourceCopyCellAccuracy*trial.targetN;
      copyF1+=trial.sourceCopyOccupancyF1*trial.targetN;
      allF1+=trial.allOccupiedOccupancyF1*trial.targetN;
      for(const [type,s] of Object.entries(trial.transitions)){
        const b=transitionBuckets.get(type)||{n:0,acc:0,f1:0,copyF1:0};
        b.n+=s.n;b.acc+=s.accuracy*s.n;b.f1+=s.occupancyF1*s.n;
        b.copyF1+=s.copyF1*s.n;transitionBuckets.set(type,b);
      }
    }
    solved+=trial.goalReached;
    examples.push(...trial.samples.slice(0,Math.max(0,10-examples.length)));
  }
  const frozenAfter=snapshot(B);
  assert.deepEqual(frozenAfter,frozenBefore,'Heldout evaluation mutated original Brain training memory');
  return {
    train:{episodes:training.length,nativeBrainLived:B.lived,
      solved:training.filter(x=>x.solved).length,
      last80Solve:training.slice(-80).filter(x=>x.solved).length/80,
      discoveredSelf:D_SELF(B),nativeEffects:Array.from({length:8},(_,i)=>B.disc.effect(i)),
      meanTrueMoved:training.reduce((s,x)=>s+x.moved,0)/training.length},
    heldout:{latentObjects:TEST.length,totalPredictedRealActionConsequences:n,
      cellAccuracy:n?acc/n:null,occupancyF1:n?f1/n:null,
      wholeFrameRate:n?whole/n:null,
      outOfRangeRate:n?range/n:null,
      nativeMotorPredictionAccuracy:n?motor/n:null,
      sourceCopyCellAccuracy:n?copyAcc/n:null,
      sourceCopyOccupancyF1:n?copyF1/n:null,
      alwaysOnOccupancyF1:n?allF1/n:null,
      byTransform:Object.fromEntries([...transitionBuckets.entries()].map(([ty,b])=>[ty,{
        n:b.n,accuracy:b.acc/b.n,occupancyF1:b.f1/b.n,copyF1:b.copyF1/b.n}])),
      goalReachedRate:solved/(TEST.length*1),examples}
  };
}
function D_SELF(B){return B.disc.self();}
const matched=run(false);
const shuffled=run(true);
const result={
 status:'ORIGINAL_V17_NATIVE_CAUSAL_GEOMETRIC_METAMORPHOSIS_FROM_LIVED_ACTIONS',
 executedBody:true,
 originalBrainUnmodified:true,
 nativeActions:'Brain.disc.choose -> real world section motion -> Brain.disc.learnStep and Brain.live',
 beforeActionPrediction:'Original Brain.disc learned causal visual consequence memory predicts full 16-cell next section from current section and ORIGINAL learned motor-inferred next position; no oracle real next section',
 physicalWorld:'4D rotated tesseract; actual 3D w=h sections projected into 4x4 complementary 2D sensor views on 5 depths',
 observationalBaseline:'Original native Braivour A/C passive heldout test 63.0% paired vs 63.0% shuffled, 0% exact, F1=0',
 matched,shuffled,
 differences:{cellAccuracy:(matched.heldout.cellAccuracy??0)-(shuffled.heldout.cellAccuracy??0),
   occupancyF1:(matched.heldout.occupancyF1??0)-(shuffled.heldout.occupancyF1??0),
   nativeMotorAccuracy:(matched.heldout.nativeMotorPredictionAccuracy??0)-
     (shuffled.heldout.nativeMotorPredictionAccuracy??0)},
 caveats:[
  'Original Discoverer navigation is a 2D body moving among 4D section samples, not proof it internally inferred 4D coordinates',
  'Goal cells are marked as in its original maze, and scoring uses physical truth only after prediction',
  'Controls share body and motor physics, but one original Brain stores C geometric consequences mismatched across hidden objects',
  'Original Brain.disc native causal shape-effect extension is the new mechanism, not exact 4D inverse geometry; it must beat shuffled consequences AND copied A to claim effect',
  'No quantum physical experiment, no donor GGUF or language assimilation'
 ]
};
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/real_4d_native_body_action.json',JSON.stringify(result,null,2));
console.log('REAL_4D_NATIVE_BODY_ACTION_RESULT '+JSON.stringify({
 matched:{train:matched.train,heldout:{...matched.heldout,examples:undefined}},
 shuffled:{train:shuffled.train,heldout:{...shuffled.heldout,examples:undefined}},
 differences:result.differences}));
