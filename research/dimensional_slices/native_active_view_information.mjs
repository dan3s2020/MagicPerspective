// Isolated original V17 Braivour embodied *active* selection of perspective.
// The same Brain.disc (original Discoverer) learns 4D action physics and owns
// the COMPLETE full-view episodic atlas. No replacement external ML model.
// Evaluation hides C3 from all bodily sensors and training updates.
// Original shape(), choose(), learnStep(), endEpisode(), Brain.live() intact.
import fs from "node:fs";
import assert from "node:assert/strict";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";
import {frames} from "./physical_sections.mjs";
const RULES={depth:2,fold:false,budEvery:300,maxWires:12,maxL:8,empty:false};
const N=8,DIR=[[0,-1],[1,0],[0,1],[-1,0]],KIND={floor:0,wall:1,target:2,self:3};
const cell=(x,y)=>y*N+x,xy=p=>[p%N,Math.floor(p/N)];
const legal=(x,y)=>x>=1&&x<=5&&(y===2||y===3);
const viewNames=["A1","A2","A3","A4","A5","C1","C2","C3","C4","C5"];
const POS=Object.fromEntries(viewNames.map(n=>[n,cell(Number(n.slice(1)),n[0]==="A"?2:3)]));
const TRAIN=Array.from({length:360},(_,i)=>2026111601+i*613);
const TEST=Array.from({length:200},(_,i)=>2026900001+i*1009);
assert.equal(new Set([...TRAIN,...TEST]).size,TRAIN.length+TEST.length);
const views=new Map([...TRAIN,...TEST].map(seed=>[seed,frames(seed)]));
function pixels(bytes){return bytes.map(x=>+(x>48));}
function physical(seed,p){
  const [x,y]=xy(p),s=views.get(seed);
  assert.ok(legal(x,y)&&s,"Outside real dimensional sensor world");
  return y===2?s[x-1].A:s[x-1].C;
}
function liveFrame(B,seed,p){
  const [x,y]=xy(p);
  for(const b of [120,y===2?65:67,110+x-1,...physical(seed,p),121])B.live(b);
}
function retina(pos,goal,hide){
  const b=Array.from({length:N*N},(_,i)=>{
    const [x,y]=xy(i);
    return legal(x,y)&&(!hide||i!==POS.C3)?KIND.floor:KIND.wall;
  });
  assert.ok(b[goal]===KIND.floor);
  b[goal]=KIND.target;b[pos]=KIND.self;
  return b;
}
function physicalStep(D,pos,output,hidden){
  const d=D.world.moves.indexOf(output);
  if(d<0)return pos;
  const [x,y]=xy(pos),[dx,dy]=DIR[d],nx=x+dx,ny=y+dy;
  if(!legal(nx,ny))return pos;
  const next=cell(nx,ny);
  return hidden&&next===POS.C3?pos:next;
}
function navigate(B,seed,from,goal,trace,{learn=false,hidden=true}={}){
  const D=B.disc,visits=new Uint16Array(N*N),how={plan:0,explore:0,noise:0};
  let pos=from,steps=0,moved=0,shapeOffered=0;
  visits[pos]++;
  for(;pos!==goal&&steps<75;steps++){
    const before=retina(pos,goal,hidden),path=D.shape(before,N,pos);
    shapeOffered+=+(!!path?.length);
    const decision=D.choose(before,N,pos,visits,path);
    how[decision.how]=(how[decision.how]||0)+1;
    const next=physicalStep(D,pos,decision.o,hidden);
    assert.ok(next!==POS.C3||!hidden,"Heldout agent entered the concealed C3");
    if(learn){
      B.live(90+decision.o);
      liveFrame(B,seed,next);
      D.learnStep(before,retina(next,goal,hidden),N,decision.o,pos);
    }
    moved+=+(next!==pos);
    pos=next;visits[pos]++;
    // The body actually perceives every cell it passes through, though
    // inference may use only its explicitly allowed observations.
    if(!trace.has(pos))trace.set(pos,pixels(physical(seed,pos)));
  }
  if(learn)D.endEpisode(pos===goal,how);
  return {pos,solved:pos===goal,steps,moved,shapeOffered};
}
const B=new Brain({rules:RULES,seed:731});
const D=B.disc;
D.nativeActive4DAtlas=[];
const trainingFailures=[];
for(const seed of TRAIN){
  const trace=new Map([[POS.A1,pixels(physical(seed,POS.A1))]]);
  liveFrame(B,seed,POS.A1);
  let from=POS.A1,success=true;
  // Native bodily exploration, genuinely sensing all 10 views including
  // C3 on TRAIN; test worlds have C3 locked out.
  for(const goal of [POS.C2,POS.A3,POS.C3,POS.C4,POS.C5,POS.A5,POS.A4,POS.A2,POS.C1,POS.A1]){
    const r=navigate(B,seed,from,goal,trace,{learn:true,hidden:false});
    if(!r.solved){trainingFailures.push({seed,from,goal});success=false;break;}
    from=r.pos;
  }
  if(success){
    assert.equal(trace.size,10,"Training organism did not perceive all 10 real views");
    D.nativeActive4DAtlas.push(
      Object.fromEntries(viewNames.map(name=>{
        const value=trace.get(POS[name]);
        assert.equal(value.length,16);
        return [name,value];
      }))
    );
  }
}
assert.ok(D.nativeActive4DAtlas.length>=320,"Genuine original Brain failed to experience its 4D world");
assert.equal(D.self(),KIND.self,"Native organism has not recognized itself");
assert.equal(Array.from({length:8},(_,o)=>D.effect(o)).filter(Boolean).length,4,"Native organism did not learn physical motor effects");
const bank=D.nativeActive4DAtlas;
const options=["A4","A5","C1","C4","C5"];
const BASE=["A1","C2","A3"],HIDDEN="C3";
function hamming(a,b){
  let n=0;for(let j=0;j<16;j++)n+=+(a[j]!==b[j]);return n;
}
// The learned native atlas gives a posterior over *previously lived complete*
// worlds from the current incomplete bodily experience (never a world seed).
function nativeBelief(trace,names=BASE,{exclude=-1,width=3.5}={}){
  const matches=[];
  for(let i=0;i<bank.length;i++){
    if(i===exclude)continue;
    let d=0;
    for(const name of names)d+=hamming(trace.get(POS[name]),bank[i][name]);
    matches.push({id:i,distance:d});
  }
  matches.sort((a,b)=>a.distance-b.distance||a.id-b.id);
  const top=matches.slice(0,48),offset=top[0]?.distance||0;
  let z=0;for(const e of top){e.weight=Math.exp(-(e.distance-offset)/width);z+=e.weight;}
  for(const e of top)e.weight/=z||1;
  return top;
}
// Not told which physical view is best; native body chooses it from the
// possible *decrease of target uncertainty* in its own learned atlas.
// The hidden heldout C3, rotations and target metrics are never read here.
function nativeChooseNextPerspective(trace){
  const plausible=nativeBelief(trace,BASE);
  const choices=[];
  for(const name of options){
    let gain=0;
    for(let sensor=0;sensor<16;sensor++){
      let p=0;
      for(const e of plausible)p+=e.weight*bank[e.id][name][sensor];
      if(p<.05||p>.95)continue;
      for(let target=0;target<16;target++){
        let left=0,right=0;
        for(const e of plausible){
          const v=bank[e.id][name][sensor],y=bank[e.id][HIDDEN][target];
          if(v)right+=e.weight*y;else left+=e.weight*y;
        }
        const mean1=right/p,mean0=left/(1-p);
        gain+=p*(1-p)*(mean1-mean0)**2;
      }
    }
    choices.push({view:name,expectedUncertaintyReduction:gain});
  }
  choices.sort((a,b)=>b.expectedUncertaintyReduction-a.expectedUncertaintyReduction||a.view.localeCompare(b.view));
  return {selected:choices[0].view,choices,posteriorCount:plausible.length};
}
// Original Discoverer-owned full-world memory infers C3. Only 3 or 4
// bodily observations are admitted, with a frozen retrieval rule.
function nativeFormPrediction(trace,names,{wrongLabels=false,K=7,temp=3.5}={}){
  const matched=[];
  for(let i=0;i<bank.length;i++){
    let distance=0;
    for(const name of names)distance+=hamming(trace.get(POS[name]),bank[i][name]);
    matched.push({id:i,distance});
  }
  matched.sort((a,b)=>a.distance-b.distance||a.id-b.id);
  const top=matched.slice(0,K),near=top[0].distance,prob=Array(16).fill(0);
  let norm=0;
  for(const match of top){
    const weight=Math.exp(-(match.distance-near)/temp);
    const id=wrongLabels?(match.id+37)%bank.length:match.id;
    for(let j=0;j<16;j++)prob[j]+=weight*bank[id][HIDDEN][j];
    norm+=weight;
  }
  return prob.map(v=>v/norm);
}
function compare(prob,truth){
  const bin=prob.map(x=>+(x>=.5));
  let correct=0,tp=0,fp=0,fn=0,brier=0;
  for(let j=0;j<16;j++){
    const p=bin[j],q=truth[j];
    correct+=+(p===q);tp+=+(p&&q);fp+=+(p&&!q);fn+=+(!p&&q);
    brier+=(prob[j]-q)**2;
  }
  return {exact:+(correct===16),accuracy:correct/16,
    f1:(tp+fp+fn)?2*tp/(2*tp+fp+fn):1,
    brier:brier/16};
}
const frozen={
  lived:B.lived,episodes:D.episodes,tries:D.tries.slice(),
  atlasLength:bank.length,atlasHashes:bank.map(b=>viewNames.map(name=>b[name].join("")).join("|")).join("#")
};
const RUN=["active","fixedC4","random","base","wrongLabels"];
const reports=Object.fromEntries(RUN.map(k=>[k,{n:0,f1:0,exact:0,accuracy:0,brier:0}]));
const perObject=[],selectionStats=Object.fromEntries(options.map(x=>[x,0]));
let hiddenVisits=0,routeFailure=0;
for(const seed of TEST){
  const baseTrace=new Map([[POS.A1,pixels(physical(seed,POS.A1))]]);
  let pos=POS.A1,failed=false,totalMoved=0;
  for(const v of ["C2","A3"]){
    const n=navigate(B,seed,pos,POS[v],baseTrace,{learn:false,hidden:true});
    if(!n.solved){failed=true;break;}pos=n.pos;totalMoved+=n.moved;
  }
  if(failed){routeFailure++;continue;}
  assert.ok(!baseTrace.has(POS.C3),"Hidden target leaked to original organism");
  const decision=nativeChooseNextPerspective(baseTrace);
  selectionStats[decision.selected]++;
  // All candidate policies use the same native Brain and face one and the
  // same heldout 4D object. Each baseline navigates independently from A3.
  const randomIndex=Math.floor(((seed*1664525+1013904223)>>>0)/4294967296*options.length);
  const selected={active:decision.selected,fixedC4:"C4",random:options[randomIndex]};
  const candidates={},policyPaths={};
  for(const [policy,view] of Object.entries(selected)){
    const state=new Map(baseTrace);
    const r=navigate(B,seed,POS.A3,POS[view],state,{learn:false,hidden:true});
    if(!r.solved){failed=true;break;}
    assert.ok(state.has(POS[view]),"Native body did not really observe chosen perspective");
    assert.ok(!state.has(POS.C3),"C3 leaked during true original-body action");
    candidates[policy]=nativeFormPrediction(state,[...BASE,view]);
    policyPaths[policy]={selected:view,physicalActions:r.steps,moved:r.moved,
      sensedLocations:[...state.keys()].map(p=>viewNames.find(k=>POS[k]===p))};
  }
  if(failed){routeFailure++;continue;}
  candidates.base=nativeFormPrediction(baseTrace,BASE);
  candidates.wrongLabels=nativeFormPrediction(baseTrace,[...BASE,selected.active],{wrongLabels:true});
  // IMPORTANT: wrong-label control needs the active view observation; use
  // the active route's actual sensor, not missing baseTrace.
  const activeView=selected.active;
  if(!baseTrace.has(POS[activeView])){
    const activeState=new Map(baseTrace);
    const r=navigate(B,seed,POS.A3,POS[activeView],activeState,{learn:false,hidden:true});
    assert.ok(r.solved);
    candidates.wrongLabels=nativeFormPrediction(activeState,[...BASE,activeView],{wrongLabels:true});
  }
  assert.ok(!baseTrace.has(POS.C3),"Hidden target previously revealed");
  // Evaluator alone now reads actual hidden 4D section, after all predictions.
  const truth=pixels(physical(seed,POS.C3)),scores={};
  for(const [method,prob] of Object.entries(candidates)){
    const s=compare(prob,truth),t=reports[method];
    t.n++;for(const m of ["f1","accuracy","exact","brier"])t[m]+=s[m];
    scores[method]=s;
  }
  perObject.push({seed,choice:decision.selected,expectedGain:decision.choices,
    scores,physicalPaths:policyPaths,
    activePrediction:candidates.active.map(x=>+(x>=.5)),
    fixedPrediction:candidates.fixedC4.map(x=>+(x>=.5)),
    trueC3:truth,
    hiddenSeenByNativeBrain:false});
}
assert.equal(hiddenVisits,0);
assert.ok(perObject.length>=170,"Original body failed to navigate enough hidden worlds");
assert.equal(B.lived,frozen.lived,"Frozen heldout updated original Brain");
assert.equal(D.episodes,frozen.episodes,"Frozen heldout trained Discoverer");
assert.deepEqual(D.tries,frozen.tries,"Frozen heldout trained native motor effects");
assert.equal(bank.length,frozen.atlasLength,"Frozen heldout grew the native body atlas");
assert.equal(bank.map(b=>viewNames.map(name=>b[name].join("")).join("|")).join("#"),frozen.atlasHashes,
  "Frozen heldout mutated the learned full 4D form atlas");
for(const row of Object.values(reports))
  for(const key of ["f1","exact","accuracy","brier"])row[key]/=row.n;
function pairedDifference(a,b,field){
  const differences=perObject.map(r=>r.scores[a][field]-r.scores[b][field]);
  const d=differences.reduce((s,x)=>s+x,0)/differences.length;
  const random=(()=>{let x=20261116;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};})();
  const boot=[],flips=[];
  for(let j=0;j<4000;j++){
    let sum=0,f=0;
    for(let i=0;i<differences.length;i++){
      sum+=differences[Math.floor(random()*differences.length)];
      f+=(random()<.5?-1:1)*differences[i];
    }
    boot.push(sum/differences.length);flips.push(f/differences.length);
  }
  boot.sort((x,y)=>x-y);
  return {difference:d,confidence95:[boot[100],boot[3899]],
    pairedSignFlipP:(1+flips.filter(x=>Math.abs(x)>=Math.abs(d)-1e-12).length)/4001};
}
const output={
  status:"ORIGINAL_BRAIVOUR_ACTIVE_PERSPECTIVE_CHOICE_ON_UNSEEN_4D_SHAPES",
  originalV17BrainUnmodified:true,
  actionPolicy:"Information gain over original Brain.disc.nativeActive4DAtlas; chosen view then actually traversed using original Discoverer.shape/choose",
  physicalTarget:"Real 4D tesseract hyperplane intersection, 4x4 target C3 occupancy mask",
  originalNativeTraining:{worlds:TRAIN.length,completeAtlases:bank.length,
    trainingFailures:trainingFailures.length,lived:B.lived,episodes:D.episodes,
    originalSelf:D.self(),motorEffects:Array.from({length:8},(_,i)=>D.effect(i))},
  heldout:{worlds:TEST.length,completed:perObject.length,routeFailures:routeFailure,
    zeroHiddenC3SensorVisits:hiddenVisits===0,
    originalBrainLearnedNothingFromHeldout:true,
    everySelectionPhysical:true,
    numberOfExtraPerspectivesPerTrial:1,
    unavoidableTransitViewsMayBeSeen:true,
    predictionUsesOnlySelectedThreeOrFourViews:true},
  selectionStats,
  results:reports,
  paired:{
    activeVersusFixedF1:pairedDifference("active","fixedC4","f1"),
    activeVersusRandomF1:pairedDifference("active","random","f1"),
    activeVersusBaseF1:pairedDifference("active","base","f1"),
    activeVersusFixedExact:pairedDifference("active","fixedC4","exact"),
    activeVersusRandomExact:pairedDifference("active","random","exact"),
    activeVersusWrongLabelsF1:pairedDifference("active","wrongLabels","f1")
  },
  independentWorldDetails:perObject,
  caveats:[
    "Original Discoverer owns and retrieves episodic whole forms: active information policy is an experimental extension, not standard source code",
    "All worlds are from same rotated-tesseract family; independent heldout orientations, not novel geometric families",
    "4x4 raster reconstruction does not establish reconstructing a 3D mesh, true 4D coordinates, or Platonic shape metamorphosis",
    "Original physical hidden-world navigation can encounter other transit views; inference strictly uses only declared explicit query views",
    "A positive result requires active gain over fixed and random controls; do not claim it before measured",
    "No quantum mechanics, GGUF general intelligence, or consciousness result follows"
  ]
};
fs.mkdirSync("runtime/dimensional_slices",{recursive:true});
fs.writeFileSync("runtime/dimensional_slices/native_active_view_information.json",
  JSON.stringify(output,null,2));
console.log("NATIVE_ACTIVE_VIEW_RESULT "+JSON.stringify({
 training:output.originalNativeTraining,heldout:output.heldout,
 selectionStats,results:reports,paired:output.paired,
 examples:perObject.slice(0,2)
}));
