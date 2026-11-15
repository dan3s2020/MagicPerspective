// THE ORIGINAL DISCOVERER.shapeGraph() on REAL acoustic state trajectories.
// Goal = physically observed end-of-vocalization (silence), NOT "what cat said".
// Learn observed state transitions as the SAME original Brain.constructedPaths.links.
// The original Brain.disc propagates observed terminal attraction over the
// actual experienced transition graph and predicts a route BEFORE further audio.
// Heldout source: official extras.zip uncut vocalizations, unseen owners/cats.
// Controls: original native 1-step graph, original chronological vs shuffled
// experience, and graph route before the second frame is revealed.
import fs from "node:fs";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";
const main=JSON.parse(fs.readFileSync("runtime/catmeows/sensory.json","utf8"));
const extra=JSON.parse(fs.readFileSync("runtime/catmeows/real_sequences.json","utf8"));
if(main.length!==440||extra.length!==30)throw Error("Real checksum-verified CatMeows data missing");
const RULES={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const ACTION="actually-observed-next-acoustic-state";
const modes=["chronological","reversed","permuted"];
const granularity=["coarse-three-dimensional","fine-energy-centroid"];
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);const p=parents.get(k);if(p!==k)parents.set(k,root(p));return parents.get(k);}
function join(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of [...main,...extra])join("cat:"+r.cat,"owner:"+r.owner);
const groups=new Map();
for(const e of extra){
 const k=root("cat:"+e.cat),v=groups.get(k)||{root:k,owners:new Set(),n:0};v.owners.add(e.owner);v.n++;groups.set(k,v);
}
const g=[...groups.values()].sort((a,b)=>b.n-a.n);
const foldOwners=[new Set(),new Set(),new Set()],counts=[0,0,0];
for(const group of g){const i=counts.indexOf(Math.min(...counts));
 const all=[...main,...extra].filter(r=>root("cat:"+r.cat)===group.root);
 for(const r of all)foldOwners[i].add(r.owner);
 counts[i]+=group.n;
}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(a,seed){let x=a.slice(),rand=rng(seed);for(let i=x.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function signalFrames(s){
 const raw=s.audio_absolute;if(!Array.isArray(raw)||raw.length!==72)throw Error("Invalid real CatMeows physical audio");
 const frames=[];
 for(let t=0;t<8;t++){let f=[];for(let j=0;j<9;j++){
  const v=raw[t*9+j],start=20+j*12;if(!Number.isInteger(v)||v<start||v>start+11)throw Error("Corrupted real channel");
  f.push(v-start);
 }frames.push(f);}
 return frames;
}
function modelFor(gran){
 if(gran===granularity[0])return {
  n:64,terminal:64,
  project:f=>Math.floor(f[6]/3)*16+Math.floor(f[7]/3)*4+Math.floor(f[8]/3)
 };
 return {n:144,terminal:144,project:f=>f[6]*12+f[7]};
}
function soundStates(r,model){return signalFrames(r).map(model.project);}
function pathAndScores(brain,model,current){
 const graph=brain.constructedPaths.links;
 const number=model.n+1;
 const kinds=Array.from({length:number},(_,j)=>j===model.terminal?2:0);
 kinds[current]=3; // original retina's "self": present observed acoustic state
 const neighbors=Array.from({length:number},()=>[]);
 for(let from=0;from<model.n;from++){
  const options=graph.choices("acoustic:"+from).find(x=>x.action===ACTION);
  if(options)for(const e of options.successors){
   const mm=/^acoustic:(\d+)$/.exec(e.to);
   if(!mm)throw Error("Native graph successor malformed: "+e.to);
   const to=Number(mm[1]);if(to<0||to>=number)throw Error("Native graph points outside actual sensed world");
   neighbors[from].push({to,action:to,count:e.seen,probability:e.probability});
  }
 }
 // The only goal is physical cessation of sound, learned as a real experience.
 // Original Discoverer.shapeGraph decides every route; not a new BFS oracle.
 let native=brain.disc.shapeGraph(kinds,neighbors,current,{details:true});
 const route=native?.path?.map(x=>x.to)||[];
 const oneStep=graph.choices("acoustic:"+current).find(x=>x.action===ACTION);
 const local=oneStep?.successors?.find(e=>e.to!=="acoustic:"+current)?.to||null;
 const localValue=local===null?null:Number(local.split(":")[1]);
 return {route,localValue,
  routeTargetReached:native?.targetReached===true,
  routeBeforeAct:native?.firstPredictionBeforeAction===true,
  observedNeighbors:neighbors[current].length};
}
function train(brain,training,model,mode,seed){
 let n=0,terminations=0;
 for(const r of shuffle(training,seed)){
  let frames=signalFrames(r);
  if(mode==="reversed")frames=frames.reverse();
  if(mode==="permuted")frames=shuffle(frames,seed+19+n);
  let states=frames.map(model.project);
  brain.live(245);
  for(let t=0;t<states.length;t++){
   brain.live(246);
   for(let j=0;j<9;j++)brain.live(20+j*12+frames[t][j]);
   brain.live(247);
   if(t>0){brain.constructedPaths.links.observe("acoustic:"+states[t-1],ACTION,"acoustic:"+states[t]);n++;}
  }
  // Termination is observed from the signal ending, never a hidden label.
  brain.constructedPaths.links.observe("acoustic:"+states.at(-1),ACTION,"acoustic:"+model.terminal);
  brain.disc.enter[2]++;brain.disc.endIn[2]++;terminations++;
  brain.disc.enter[0]+=states.length;brain.disc.pass[0]+=states.length; 
  brain.live(248);n++;
 }
 return {transitions:n,terminations};
}
function distinctTrajectory(states,terminal){
 const a=[states[0]];for(let j=1;j<states.length;j++)if(states[j]!==a.at(-1))a.push(states[j]);
 a.push(terminal);return a;
}
const report=[],raw=[];
for(let gran of granularity){
 const model=modelFor(gran);
 for(let fold=0;fold<3;fold++){
  const test=extra.filter(e=>foldOwners[fold].has(e.owner)),
   train=main.filter(r=>!foldOwners[fold].has(r.owner)&&!new Set(test.map(x=>x.cat)).has(r.cat));
  if(!test.length||train.length<40)throw Error("Insufficient source real audio for cat-disjoint test");
  if(test.some(r=>train.some(t=>t.cat===r.cat||t.owner===r.owner)))throw Error("Identity leakage");
  for(const mode of modes){
   const brain=new Brain({rules:RULES,seed:2206+fold});
   const trained=trainBrainInvariant();
   function trainBrainInvariant(){return trainAndCheck();}
   function trainAndCheck(){return trainNative();}
   function trainNative(){return trainAudio();}
   function trainAudio(){return train(brain,train,model,mode,2206+fold);}
   const old=brain.constructedPaths.links.observations;
   let correctFirst=0,localFirst=0,routeNeeded=0,planFound=0,routeReached=0,routeLength=0,exactNext=0,pathPrefix=0,fullyExactRoute=0;
   for(const record of test)for(let burstIndex=0;burstIndex<record.bursts.length;burstIndex++){
    const burst=record.bursts[burstIndex],states=soundStates(burst,model),
       routeTruth=distinctTrajectory(states,model.terminal);
    const current=routeTruth[0],actualNext=routeTruth[1];
    if(actualNext==null)throw Error("No physical successor in verified WAV");
    const planned=pathAndScores(brain,model,current);
    const predictedFirst=planned.route[0]??null;
    const local=planned.localValue;
    routeNeeded++;
    correctFirst+=Number(predictedFirst===actualNext);
    localFirst+=Number(local===actualNext);
    planFound+=Number(planned.route.length>0);
    routeReached+=Number(planned.routeTargetReached);
    routeLength+=planned.route.length;
    if(planned.route.length>0){
     let k=0;while(k<planned.route.length&&k<routeTruth.length-1&&planned.route[k]===routeTruth[k+1])k++;
     pathPrefix+=k;fullyExactRoute+=Number(k===routeTruth.length-1&&planned.route.length===k);
    }
    if(mode==="chronological")raw.push({gran,fold,recording:record.recording,cat:record.cat,owner:record.owner,
      burstIndex,heardState:current,actualFutureState:actualNext,nativeShapeFirst:predictedFirst,
      originalGraphOneStep:local,nativeRoute:planned.route,actualRoute:routeTruth.slice(1),
      correctNativeFirst:predictedFirst===actualNext});
   }
   if(brain.constructedPaths.links.observations!==old)throw Error("Heldout audio changed original Brain graph");
   const r={gran,fold,mode,trainedEpisodes:train.length,trainedTransitions:trained.transitions,
    heldoutRecordings:test.length,heldoutPhysicalBursts:routeNeeded,
    nativeShapeFirstChangeAccuracy:correctFirst/routeNeeded,
    originalGraphLocalFirstChangeAccuracy:localFirst/routeNeeded,
    shapeRouteExistsRate:planFound/routeNeeded,
    shapeToSilenceRate:routeReached/routeNeeded,
    meanPredictedPathLength:routeLength/routeNeeded,
    nativeExactFullTrajectoryRate:fullyExactRoute/routeNeeded,
    meanMatchedRoutePrefix:pathPrefix/routeNeeded,
    actualDiscovererShapeGraphUsed:true,goal:"observed cessation of sound, NOT animal intent",
    testBeforeSecondFrame:true};
   report.push(r);
   console.log("CATMEOWS_NATIVE_SHAPE_WORLD "+JSON.stringify(r));
  }
 }
}
fs.mkdirSync("runtime/catmeows",{recursive:true});
fs.writeFileSync("runtime/catmeows/native_acoustic_shape_world.json",JSON.stringify({project:"physically observed acoustic trajectory from exact original Brain.shapeGraph",results:report},null,2));
fs.writeFileSync("runtime/catmeows/native_acoustic_shape_world_predictions.jsonl",raw.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log("CATMEOWS_NATIVE_SHAPE_WORLD_COMPLETE "+JSON.stringify({configs:report.length,predictions:raw.length}));
