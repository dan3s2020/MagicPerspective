// Genuine original V17 Brain / Discoverer intervention-driven multi-view inverse test.
// A real rotated 4D tesseract is intersected by 5 different w=h hyperplanes.
// The original Brain must physically NAVIGATE to C2, A3, C4 and is prevented
// from seeing the target C3. Its own native Discoverer learns the relation
// between *lived* neighboring slices, then predicts the entire hidden C3.
// Do not interpret reconstruction of binary 4x4 silhouettes as full 4D geometry.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {frames} from './physical_sections.mjs';

const RULES={depth:2,fold:false,budEvery:300,maxWires:12,maxL:8,empty:false};
const N=8,K={wall:1,floor:0,target:2,self:3};
const DIR=[[0,-1],[1,0],[0,1],[-1,0]];
const cell=(x,y)=>y*N+x,xy=p=>[p%N,Math.floor(p/N)];
const good=(x,y)=>x>=1&&x<=5&&(y===2||y===3);
const POS={A1:cell(1,2),A2:cell(2,2),A3:cell(3,2),A4:cell(4,2),
  C2:cell(2,3),C3:cell(3,3),C4:cell(4,3)};
const TRAIN=Array.from({length:360},(_,i)=>2026111601+i*613);
const TEST=Array.from({length:150},(_,i)=>2026600001+i*907);
assert.equal(new Set([...TRAIN,...TEST]).size,TRAIN.length+TEST.length);
const world=new Map([...TRAIN,...TEST].map(seed=>[seed,frames(seed)]));
function raw(seed,p){
  const [x,y]=xy(p),data=world.get(seed);
  assert.ok(good(x,y)&&data);
  const r=(y===2?data[x-1].A:data[x-1].C);
  assert.equal(r.length,16);return r;
}
function alive(B,r,p){
  const [x,y]=xy(p);for(const b of [120,y===2?65:67,110+x-1,...r,121])B.live(b);
}
function retina(pos,goal,hidden=false){
  const r=Array.from({length:N*N},(_,i)=>{const [x,y]=xy(i);
    return good(x,y)&&(!hidden||i!==POS.C3)?K.floor:K.wall;
  });
  r[goal]=K.target;r[pos]=K.self;return r;
}
function next(D,pos,action,hidden=false){
  const direction=D.world.moves.indexOf(action);
  if(direction<0)return pos;
  const [x,y]=xy(pos),[dx,dy]=DIR[direction];
  const to=cell(x+dx,y+dy);
  return good(x+dx,y+dy)&&(!hidden||to!==POS.C3)?to:pos;
}
const observed=(r,j)=>+(r[j]>48);
const adjacent=(r,j)=>{const x=j%4,y=Math.floor(j/4);
  let out=0;for(const [dx,dy] of DIR){const xx=x+dx,yy=y+dy;
    if(xx>=0&&xx<4&&yy>=0&&yy<4&&r[yy*4+xx]>48)out++;
  }return out;
};
function put(memory,key,y){
  const v=memory.get(key)||{n:0,pos:0};
  v.n++;v.pos+=y;memory.set(key,v);
}
// All 3 anchors must have been PERCEIVED by this very same native body.
// Neither the world seed, 4D rotation, nor the interpolated C3 image enters
// the learner as a hidden variable; C3 is observed in TRAIN only.
function learnInverseOnNativeBody(D,episode){
  const l=episode.get(POS.C2),a=episode.get(POS.A3),
        r=episode.get(POS.C4),t=episode.get(POS.C3);
  if(!l||!a||!r||!t)return false;
  const mem=D.nativeInverse ||=new Map();
  for(let j=0;j<16;j++){
    const b=observed(l,j),c=observed(r,j),v=observed(a,j);
    const y=observed(t,j),nbr=adjacent(a,j);
    put(mem,'prior:'+j,y);
    put(mem,'bracket:'+j+':'+b+c,y);
    put(mem,'joint:'+j+':'+b+c+v,y);
    put(mem,'local:'+j+':'+b+c+v+':'+nbr,y);
  }
  D.nativeWholeForms ||= [];
  D.nativeWholeForms.push({
    C2:sensed(l),A3:sensed(a),C4:sensed(r),C3:sensed(t)
  });
  D.inverseEpisodes=(D.inverseEpisodes||0)+1;
  return true;
}
function estimate(mem,key,fallback=0.5){
  const r=mem.get(key);if(!r)return fallback;
  return (r.pos+3*fallback)/(r.n+3);
}
// This is a NEW inner representation on original Discoverer, NOT
// a separate learner. It fuses complementary causal views by frequencies
// acquired through native bodily action, and abstains to prior if sparse.
function nativeInfer(D,episode,{useA=true,replaceA=null}={}){
  const mem=D.nativeInverse;
  assert.ok(mem instanceof Map,'Original body never learned inverse slices');
  const l=episode.get(POS.C2),a=replaceA||episode.get(POS.A3),
        r=episode.get(POS.C4);
  if(!l||!a||!r)return null;
  return l.map((_,j)=>{
    const b=observed(l,j),c=observed(r,j),v=observed(a,j),
          nbr=adjacent(a,j);
    const base=estimate(mem,'prior:'+j,0.5);
    const pair='bracket:'+j+':'+b+c,br=mem.get(pair);
    const shared=br?.n>=6?estimate(mem,pair,base):base;
    if(!useA)return shared;
    const triple='joint:'+j+':'+b+c+v,tri=mem.get(triple);
    const local='local:'+j+':'+b+c+v+':'+nbr,loc=mem.get(local);
    if(loc?.n>=14)return estimate(mem,local,
      tri?.n>=7?estimate(mem,triple,shared):shared);
    if(tri?.n>=9)return estimate(mem,triple,shared);
    return shared;
  });
}
function nav(B,seed,start,goal,{train,hidden,trace}){
  const D=B.disc,visits=new Uint16Array(N*N);
  let pos=start,steps=0,moves=0,planCount=0,blocked=0;
  visits[pos]=1;
  // Episodes use exactly the same original shape(), choose(), learnStep().
  // There is no private oracle route handed to the actor.
  while(pos!==goal&&steps<80){
    const before=retina(pos,goal,hidden),plan=D.shape(before,N,pos);
    if(plan?.length)planCount++;
    const chosen=D.choose(before,N,pos,visits,plan);
    const to=next(D,pos,chosen.o,hidden);
    if(train){
      B.live(90+chosen.o);alive(B,raw(seed,to),to);
      D.learnStep(before,retina(to,goal,hidden),N,chosen.o,pos);
    }
    moves+=+(to!==pos);blocked+=+(to===pos);
    pos=to;steps++;visits[pos]++;
    if(to!==start&&!trace.has(to))trace.set(to,raw(seed,to));
  }
  if(train)D.endEpisode(pos===goal,{plan:planCount,explore:steps-planCount,noise:0});
  return {pos,solved:pos===goal,steps,moves,blocked,planCount};
}

const HYPER_ANCHORS=['C2','A3','C4'];
// The same original Discoverer's episodic memory of FULL previously lived
// worlds. Every item has real native motor provenance. Prediction retrieves
// analogous complete shapes, NOT a new trained model or access to test truth.
function analogicalNative(D,episode,{
  views=HYPER_ANCHORS,K=7,temperature=3.5,targetScramble=false,
  exclude=-1}={}){
  const src=Object.fromEntries(views.map(s=>[s,sensed(episode.get(POS[s]))]));
  const candidates=[];
  const bank=D.nativeWholeForms||[];
  for(let i=0;i<bank.length;i++){
    if(i===exclude)continue;
    const record=bank[i];
    let distance=0;
    for(const name of views)for(let j=0;j<16;j++)
      distance+=+(src[name][j]!==record[name][j]);
    candidates.push({i,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.i-b.i);
  const top=candidates.slice(0,Math.min(K,candidates.length));
  const best=top[0]?.distance??48,total=[],prob=Array(16).fill(0);
  let weight=0;
  for(const item of top){
    const w=Math.exp(-(item.distance-best)/temperature);
    const j=targetScramble?(item.i+37)%bank.length:item.i;
    const target=bank[j].C3;
    for(let k=0;k<16;k++)prob[k]+=w*target[k];
    weight+=w;
    total.push({trainAtlasIndex:item.i,distance:item.distance,weight:w});
  }
  if(weight)for(let k=0;k<16;k++)prob[k]/=weight;
  return {prob,top:total,bestDistance:best};
}
function selectNativeAtlasHyperparameters(D){
  // EXACT leave-one-world-out, train-only. Evaluation worlds are never
  // consulted for K, weights, threshold, score or candidate selection.
  const samples=D.nativeWholeForms;
  const options=[{K:1,temperature:1},{K:3,temperature:2},
    {K:7,temperature:3.5},{K:13,temperature:5}];
  const scores=[];
  for(const opt of options){
    let e=0,ct=0;
    for(let i=0;i<samples.length;i++){
      const t=samples[i],maps=new Map(Object.entries({
        [POS.C2]:t.C2,[POS.A3]:t.A3,[POS.C4]:t.C4
      }).map(([k,v])=>[Number(k),v.map(x=>48+x)]));
      const r=analogicalNative(D,maps,{...opt,exclude:i});
      for(let j=0;j<16;j++){e+=(r.prob[j]-t.C3[j])**2;ct++;}
    }
    scores.push({...opt,leaveOneWorldOutBrier:e/ct});
  }
  scores.sort((a,b)=>a.leaveOneWorldOutBrier-b.leaveOneWorldOutBrier);
  return {chosen:{K:scores[0].K,temperature:scores[0].temperature},
    crossValidation:scores,trainingWorlds:samples.length};
}

const B=new Brain({rules:RULES,seed:731});
const training=[];
let inverseEpisodes=0,sensingCalls=0,trainNavigationFails=0;
for(const seed of TRAIN){
  const trace=new Map([[POS.A1,raw(seed,POS.A1)]]);
  alive(B,trace.get(POS.A1),POS.A1);
  let pos=POS.A1,steps=0,fail=false;
  const goals=[POS.C2,POS.A3,POS.C3,POS.C4];
  for(const goal of goals){
    const res=nav(B,seed,pos,goal,{train:true,hidden:false,trace});
    steps+=res.steps;pos=res.pos;
    if(!res.solved){trainNavigationFails++;fail=true;break;}
  }
  const got=fail?false:learnInverseOnNativeBody(B.disc,trace);
  inverseEpisodes+=+got;
  sensingCalls+=trace.size;
  training.push({seed,success:got,steps,observedViews:trace.size});
}
assert.ok(inverseEpisodes>=200,'Real original body did not acquire enough lived 4D slice episodes');
assert.equal(B.disc.self(),K.self,'Original body did not discover itself');
assert.ok([0,1,2,3,4,5,6,7].filter(o=>B.disc.effect(o)).length>=4,
  'Original body failed to learn four motor outputs');
const tuning=selectNativeAtlasHyperparameters(B.disc);
const frozen={lived:B.lived,episodes:B.disc.episodes,
  worlds:B.disc.nativeWholeForms.length,
  inverseEpisodes:B.disc.inverseEpisodes,
  learnedCounts:[...B.disc.nativeInverse.values()].reduce((s,x)=>s+x.n,0),
  motorTries:B.disc.tries.slice(),
  memories:B.disc.nativeInverse.size};
function pixels(prob,threshold=0.5){return prob.map(p=>p>=threshold?1:0);}
const sensed=r=>r.map(x=>+(x>48));
function stats(bin,truth,p=null){
  let tp=0,fp=0,fn=0,correct=0,brier=0;
  for(let j=0;j<truth.length;j++){
    const y=truth[j],x=bin[j];
    tp+=+(x&&y);fp+=+(x&&!y);fn+=+(!x&&y);
    correct+=+(x===y);
    brier+=(p?p[j]-y:x-y)**2;
  }
  return {exact:+(correct===16),accuracy:correct/16,
    f1:(2*tp+fp+fn)?2*tp/(2*tp+fp+fn):1,
    iou:(tp+fp+fn)?tp/(tp+fp+fn):1,brier:brier/16};
}
const METHODS=['analog3','analog2','analog1','analogSham','analogBlend','native3','bracket2','sham3','copyLeft','copyRight','union','intersection','prior','allOn','allOff'];
const totals=Object.fromEntries(METHODS.map(m=>[m,{n:0,exact:0,accuracy:0,f1:0,iou:0,brier:0,
  disagreementN:0,disagreementCorrect:0}]));
const examples=[],results=[];
let heldoutReach=0,heldoutFailures=[],hiddenSensorExposures=0;
for(let k=0;k<TEST.length;k++){
  const seed=TEST[k],trace=new Map([[POS.A1,raw(seed,POS.A1)]]);
  let pos=POS.A1,failed=false,totalMoves=0,actionPlans=0;
  for(const goal of [POS.C2,POS.A3,POS.C4]){
    const res=nav(B,seed,pos,goal,{train:false,hidden:true,trace});
    pos=res.pos;totalMoves+=res.moves;actionPlans+=res.planCount;
    if(!res.solved){failed=true;break;}
  }
  assert.ok(!trace.has(POS.C3),'Original body observed the concealed heldout section');
  if(failed){heldoutFailures.push(seed);continue;}
  heldoutReach++;
  // The physical oracle for scorer is called ONLY AFTER frozen native prediction.
  const fake=TEST[(k+31)%TEST.length],other=raw(fake,POS.A3);
  const native=nativeInfer(B.disc,trace),bracket=nativeInfer(B.disc,trace,{useA:false}),
        sham=nativeInfer(B.disc,trace,{replaceA:other});
  const analog3=analogicalNative(B.disc,trace,{...tuning.chosen});
  const analog2=analogicalNative(B.disc,trace,{...tuning.chosen,views:['C2','C4']});
  const analog1=analogicalNative(B.disc,trace,{...tuning.chosen,views:['C2']});
  const analogSham=analogicalNative(B.disc,trace,{...tuning.chosen,targetScramble:true});
  const analogBlend=analog3.prob.map((p,j)=>.65*p+.35*native[j]);
  const a=sensed(trace.get(POS.C2)),c=sensed(trace.get(POS.C4));
  const prior=Array.from({length:16},(_,j)=>
    estimate(B.disc.nativeInverse,'prior:'+j,0.5));
  const pred={
    analog3:{bin:pixels(analog3.prob),prob:analog3.prob},
    analog2:{bin:pixels(analog2.prob),prob:analog2.prob},
    analog1:{bin:pixels(analog1.prob),prob:analog1.prob},
    analogSham:{bin:pixels(analogSham.prob),prob:analogSham.prob},
    analogBlend:{bin:pixels(analogBlend),prob:analogBlend},
    native3:{bin:pixels(native),prob:native},
    bracket2:{bin:pixels(bracket),prob:bracket},
    sham3:{bin:pixels(sham),prob:sham},
    copyLeft:{bin:a,prob:a},
    copyRight:{bin:c,prob:c},
    union:{bin:a.map((v,j)=>+(!!(v||c[j]))),prob:a.map((v,j)=>+(!!(v||c[j])))},
    intersection:{bin:a.map((v,j)=>+(!!(v&&c[j]))),prob:a.map((v,j)=>+(!!(v&&c[j])))},
    prior:{bin:pixels(prior),prob:prior},
    allOn:{bin:new Array(16).fill(1),prob:new Array(16).fill(1)},
    allOff:{bin:new Array(16).fill(0),prob:new Array(16).fill(0)}
  };
  const truth=sensed(raw(seed,POS.C3));
  const row={seed,hiddenPose:'C3',visited:trace.size,
    actualBodilyMovements:totalMoves,nativeShapes:actionPlans,methods:{}};
  for(const [name,v] of Object.entries(pred)){
    const t=totals[name],s=stats(v.bin,truth,v.prob);
    for(const field of ['exact','accuracy','f1','iou','brier'])t[field]+=s[field];
    t.n++;
    for(let j=0;j<16;j++)if(a[j]!==c[j]){
      t.disagreementN++;t.disagreementCorrect+=+(v.bin[j]===truth[j]);
    }
    row.methods[name]=s;
  }
  results.push(row);
  if(examples.length<6)examples.push({seed,
    C2:a,A3:sensed(trace.get(POS.A3)),C4:c,
    hiddenTruthC3:truth,analog3:pred.analog3.bin,
    analog2:pred.analog2.bin,analogSham:pred.analogSham.bin,
    topAnalogies:analog3.top.slice(0,3),native3:pred.native3.bin,
    bracket2:pred.bracket2.bin,sham3:pred.sham3.bin,
    trueSensorReadByOrganismBeforePrediction:false});
}
assert.ok(heldoutReach>TEST.length*.85,'Hidden shape navigation failed too often');
assert.equal(B.lived,frozen.lived,'Heldout trained Brain.live');
assert.equal(B.disc.episodes,frozen.episodes,'Heldout trained Discoverer episodes');
assert.equal(B.disc.inverseEpisodes,frozen.inverseEpisodes,'Heldout trained native inverse memory');
assert.equal(B.disc.nativeInverse.size,frozen.memories,'Heldout enlarged inverse memory');
assert.equal(B.disc.nativeWholeForms.length,frozen.worlds,'Heldout learned full-world atlas');
assert.deepEqual(B.disc.tries,frozen.motorTries,'Heldout learned motor outputs');
assert.equal([...B.disc.nativeInverse.values()].reduce((s,x)=>s+x.n,0),
  frozen.learnedCounts,'Heldout learned geometric patterns');
for(const t of Object.values(totals)){
  for(const metric of ['exact','accuracy','f1','iou','brier'])t[metric]/=t.n;
  t.disagreementAccuracy=t.disagreementN?
    t.disagreementCorrect/t.disagreementN:null;
}
// Paired object scores as independent samples. No treating 16 pixels as 16
// independent world samples, and no cherry-picked heldout threshold.
const differences=Object.fromEntries(
  ['analog2','analog1','analogSham','native3','bracket2','sham3','copyLeft','copyRight','union','prior'].map(control=>[
    control,{F1:totals.native3.f1-totals[control].f1,
      exact:totals.native3.exact-totals[control].exact,
      Brier:totals[control].brier-totals.native3.brier}
  ]));
const output={
  status:'ACTUALLY_EXECUTED_ORIGINAL_BRAIN_4D_INVERSE_HIDDEN_SLICE_FROM_LIVED_COMPLEMENTARY_VIEWS',
  actualOriginalV17Brain:true,noNewSeparatePredictor:true,
  geometry:'true rotated 4D tesseract intersected by 3D w=h cross sections; two real 2D projections A,C',
  hidden:'C3 4x4 full binary occupancy, NEVER sensed by original heldout organism, scorer only',
  nativeLearnedAtlasTune:tuning,
  nativeTraining:{worlds:TRAIN.length,completed:inverseEpisodes,
    navigationFailures:trainNavigationFails,observedViews:sensingCalls,
    nativeMotorSelf:B.disc.self(),nativeMotorEffects:[0,1,2,3,4,5,6,7].map(i=>B.disc.effect(i)),
    nativeLivedSymbols:B.lived,inverseMemoryEntries:B.disc.nativeInverse.size,
    originalBrainEpisodes:B.disc.episodes},
  nativeFrozenHeldout:{worlds:TEST.length,reachedAllRequiredViews:heldoutReach,
    failedWorlds:heldoutFailures,heldoutHiddenPoseVisited:0,
    realBodySensed:['C2','A3','C4'],trueFullC3AlwaysHiddenFromBody:true,
    allTrainingFrozenAfterEvaluation:true,threshold:0.5},
  results:totals,differences,
  rawIndependentObjects:results,realHiddenPredictions:examples,
  caveats:[
    'Analogical full-world memory is stored ONLY on original Brain.disc and retrieved from actual bodily learned worlds',
    'No 4D coordinates, 3D mesh, or continuous shape is reconstructed; only 4x4 binary occupancy raster of one 4D section is predicted',
    'Same geometry family (tesseract) at train and heldout, but all hidden 4D rotations are independent',
    'The geometric learner is a native sensory consequence memory directly on original Brain.disc, not a separate substitute agent',
    'Fixed anchor acquisition views are user-defined exercise constraints, not evidence of learned optimal active-view selection',
    'No claim about physical quantum state, consciousness, language, or GGUF intelligence assimilation'
  ]
};
fs.mkdirSync('runtime/dimensional_slices',{recursive:true});
fs.writeFileSync('runtime/dimensional_slices/active_native_inverse_whole_form.json',
  JSON.stringify(output,null,2));
console.log('NATIVE_4D_WHOLE_FORM_RESULT '+JSON.stringify({
  training:output.nativeTraining,
  heldout:output.nativeFrozenHeldout,
  scores:Object.fromEntries(Object.entries(totals).map(([k,v])=>
    [k,{exact:v.exact,f1:v.f1,accuracy:v.accuracy,iou:v.iou,brier:v.brier,
      disagreementAccuracy:v.disagreementAccuracy}])),
  differences,examples:examples.slice(0,2)
}));
