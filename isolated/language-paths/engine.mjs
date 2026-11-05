// MagicPerspective isolated research: language utterances as observable interventions.
// This module does not import, rewrite, or train the existing V17 Brain.
// The simulated physics is the evaluator's private world, not the agent's knowledge.
export const UTTERANCES=Object.freeze(['say:elo','say:ryn','say:ava','say:tos','say:umi','say:vek']);
const PHYSICS=['left','right','reverse','swapFront','swapBack','swapEnds'];
export const TRAIN_WORDS=Object.freeze(['amber','brook','copper','delta','ember','fern','glade','harbor','ivory','jade','kite','larch','moss','north','opal','pebble','quartz','reed','stone','thistle','umber','violet','willow','xylem','yellow','zephyr']);
export const TEST_WORDS=Object.freeze(['aster','birch','cedar','dawn','elm','flint','garnet','heather','iris','juniper','kelp','lagoon','maple','nectar','onyx','pine','raven','saffron','tulip','upland','valley','winter','yarrow','zircon']);
export function rng(seed){let s=seed>>>0;return ()=>((s=Math.imul(1664525,s)+1013904223>>>0),s/4294967296);}
function shuffle(a,r){const v=[...a];for(let i=v.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;}
export const key=s=>s.join('\u0001');
export function same(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i]);}
function moveTrue(s,kind){const v=s.slice(),n=v.length;
  switch(kind){
   case 'left':return v.slice(1).concat(v[0]);
   case 'right':return [v[n-1],...v.slice(0,n-1)];
   case 'reverse':return v.reverse();
   case 'swapFront':[v[0],v[1]]=[v[1],v[0]];return v;
   case 'swapBack':[v[n-2],v[n-1]]=[v[n-1],v[n-2]];return v;
   case 'swapEnds':[v[0],v[n-1]]=[v[n-1],v[0]];return v;
   default:throw Error('Physics mismatch');
  }
}
export class SpeechWorld {
  #physics;
  constructor(seed=11){this.#physics=shuffle(PHYSICS,rng(seed));this.initial=[];this.goal=[];this.state=[];this.steps=0;}
  reset(state,goal){if(!Array.isArray(state)||state.length<4||new Set(state).size!==state.length)throw Error('World requires 4+ distinct symbols');
    if(!Array.isArray(goal)||goal.length!==state.length||new Set(goal).size!==goal.length||!goal.every(x=>state.includes(x)))throw Error('Goal must be a permutation of the state');
    this.initial=[...state];this.goal=[...goal];this.state=[...state];this.steps=0;return this.observe();}
  observe(){return {words:[...this.state],goal:[...this.goal],solved:same(this.state,this.goal),steps:this.steps,utterances:[...UTTERANCES]};}
  step(utterance){const index=UTTERANCES.indexOf(utterance);if(index<0)throw Error('Unknown utterance');
    const before=[...this.state];this.state=moveTrue(before,this.#physics[index]);this.steps++;
    return {utterance,before,after:[...this.state],solved:same(this.state,this.goal)};}
  // Used ONLY by independent benchmark challenge generation; never supplied to the agent.
  makeChallenge(seed,n=7,hops=7,words=TEST_WORDS){const r=rng(seed),start=shuffle(words,r).slice(0,n);let goal=start.slice();
    for(let i=0;i<hops;i++)goal=moveTrue(goal,this.#physics[Math.floor(r()*UTTERANCES.length)]);
    if(same(start,goal))goal=moveTrue(goal,this.#physics[0]);
    return {start,goal};}
}

// The learner is given a hypothesis language of *generic index transformations*,
// NOT the mapping from utterance to transformation. This is an explicit inductive bias.
// Learn action effects by comparing actual (before, action, after) interventions.
const candidateSpecs=[
 ['identity',n=>Array.from({length:n},(_,i)=>i)],
 ['shift+1',n=>Array.from({length:n},(_,i)=>(i+1)%n)],
 ['shift-1',n=>Array.from({length:n},(_,i)=>(i+n-1)%n)],
 ['shift+2',n=>Array.from({length:n},(_,i)=>(i+2)%n)],
 ['shift-2',n=>Array.from({length:n},(_,i)=>(i+n-2)%n)],
 ['reverse',n=>Array.from({length:n},(_,i)=>n-1-i)],
 ['front-transposition',n=>Array.from({length:n},(_,i)=>i===0?1:i===1?0:i)],
 ['back-transposition',n=>Array.from({length:n},(_,i)=>i===n-1?n-2:i===n-2?n-1:i)],
 ['endpoint-transposition',n=>Array.from({length:n},(_,i)=>i===0?n-1:i===n-1?0:i)]
];
export const RULES=Object.freeze(candidateSpecs.map(x=>x[0]));
const permutation=(rule,n)=>{const spec=candidateSpecs.find(x=>x[0]===rule);if(!spec)throw Error('Unknown hypothesis');return spec[1](n);};
const applyMap=(words,p)=>p.map(i=>words[i]);
const invertMap=(words,p)=>{const v=new Array(words.length);for(let i=0;i<p.length;i++)v[p[i]]=words[i];return v;};
export class DiscoveredEffects {
  constructor(){this.experience=Object.fromEntries(UTTERANCES.map(u=>[u,[]]));this._cache=new Map();}
  observe(sample){const {utterance,before,after}=sample;if(!UTTERANCES.includes(utterance))throw Error('Invalid action');
    if(before.length!==after.length||new Set(before).size!==before.length||!after.every(w=>before.includes(w)))throw Error('Invalid observed transition');
    this.experience[utterance].push({before:[...before],after:[...after]});this._cache.delete(utterance);}
  hypothesis(utterance){if(this._cache.has(utterance))return this._cache.get(utterance);const samples=this.experience[utterance]||[];
    if(!samples.length)return {rule:null,confidence:0,seen:0,alternatives:[]};
    const ranked=candidateSpecs.map(([name,fn])=>({rule:name,hits:samples.filter(x=>same(applyMap(x.before,fn(x.before.length)),x.after)).length})).sort((a,b)=>b.hits-a.hits);
    const best=ranked[0],margin=best.hits-(ranked[1]?.hits||0);
    const viable=best.hits===samples.length&&margin>0&&samples.length>=2;
    const result={rule:viable?best.rule:null,confidence:viable?best.hits/samples.length:0,
      seen:samples.length,alternatives:ranked.slice(0,3),margin};this._cache.set(utterance,result);return result;}
  ready(){return UTTERANCES.every(u=>this.hypothesis(u).rule);}
  predict(words,utterance){const h=this.hypothesis(utterance);return h.rule?applyMap(words,permutation(h.rule,words.length)):null;}
  predecessor(words,utterance){const h=this.hypothesis(utterance);return h.rule?invertMap(words,permutation(h.rule,words.length)):null;}
  report(){return UTTERANCES.map(utterance=>({utterance,...this.hypothesis(utterance)}));}
  export(){return structuredClone(this.experience);}
  static restore(data){const m=new DiscoveredEffects();for(const u of UTTERANCES){for(const s of data[u]||[])m.observe({utterance:u,...s});}return m;}
}
export function explore(world,model,{seed=123,rounds=4,lengths=[4,5]}={}){
 const r=rng(seed),events=[];
 for(const n of lengths)for(let round=0;round<rounds;round++){
   const words=shuffle(TRAIN_WORDS,r).slice(0,n);
   for(const utterance of shuffle(UTTERANCES,r)){
     world.reset(words,words);
     const before=world.observe().words;
     const prediction=model.predict(before,utterance);
     const change=world.step(utterance);
     model.observe(change);
     events.push({n,utterance,before,after:change.after,predictedBefore:prediction,
       correctBefore:prediction?same(prediction,change.after):null,
       hypothesisAfter:model.hypothesis(utterance)});
   }
 }
 return events;
}
export function valueField(goal,model,{limit=60000}={}){
 if(!model.ready())return {ok:false,reason:'Action effects not identified'};
 const queue=[goal],dist=new Map([[key(goal),0]]),byKey=new Map([[key(goal),goal]]),hist=[1];
 let head=0;
 for(;head<queue.length&&queue.length<limit;head++){
   const state=queue[head],d=dist.get(key(state));
   for(const utterance of UTTERANCES){const previous=model.predecessor(state,utterance);if(!previous)continue;
     const k=key(previous);if(dist.has(k))continue;
     dist.set(k,d+1);byKey.set(k,previous);queue.push(previous);hist[d+1]=(hist[d+1]||0)+1;
     if(queue.length>=limit)break;
   }
 }
 return {ok:true,dist,byKey,frontier:queue.length,complete:head===queue.length,hist};
}
export function plan(start,goal,model,{limit=60000,maxSteps=32}={}){
 if(same(start,goal))return {found:true,steps:[],distance:0,expanded:0,fieldSize:1,hist:[1],complete:true,branches:[]};
 const field=valueField(goal,model,{limit});if(!field.ok)return {found:false,reason:field.reason,steps:[],branches:[]};
 const {dist,byKey,hist}=field;let cur=[...start],d=dist.get(key(cur));
 if(d===undefined)return {found:false,reason:'Start not reachable in learned graph',steps:[],branches:[],fieldSize:dist.size,hist,complete:field.complete};
 const steps=[],branches=[];
 while(d>0&&steps.length<maxSteps){const variants=UTTERANCES.map(utterance=>{const after=model.predict(cur,utterance);return {utterance,after,distance:after?dist.get(key(after))??null:null,confidence:model.hypothesis(utterance).confidence};});
   const chosen=variants.find(v=>v.distance===d-1);
   if(!chosen)return {found:false,reason:'No descending edge in learned value field',steps,branches,fieldSize:dist.size,hist};
   branches.push({state:[...cur],distance:d,options:variants});
   steps.push({from:[...cur],utterance:chosen.utterance,predicted:[...chosen.after],distanceBefore:d,distanceAfter:d-1,confidence:chosen.confidence});
   cur=chosen.after;d--;
 }
 return {found:same(cur,goal),reason:same(cur,goal)?null:'Step budget exhausted',steps,branches,distance:steps.length,
   expanded:field.frontier,fieldSize:dist.size,hist,complete:field.complete,goal:[...goal],start:[...start],latentInfo:'Exact learned transition graph; display projection is a non-trained 12D sketch'};
}
export function execute(world,start,goal,p){world.reset(start,goal);const observations=[];
 for(const predicted of p.steps||[]){const observed=world.step(predicted.utterance);
   observations.push({...predicted,actual:observed.after,predictionCorrect:same(predicted.predicted,observed.after)});
   if(!same(predicted.predicted,observed.after))break;
 }
 return {solved:world.observe().solved,observations,final:world.observe().words,
   steps:observations.length,modelMatches:observations.every(x=>x.predictionCorrect)};
}
export function randomBaseline(world,start,goal,seed=11,budget=16){const r=rng(seed);world.reset(start,goal);
 for(let i=0;i<budget&&!world.observe().solved;i++)world.step(UTTERANCES[Math.floor(r()*UTTERANCES.length)]);
 return world.observe().solved;}
export function greedyBaseline(world,start,goal,model,seed=11,budget=16){const r=rng(seed),visits=new Map();world.reset(start,goal);
 const mismatch=x=>x.reduce((n,v,i)=>n+(v!==goal[i]),0);
 for(let i=0;i<budget&&!world.observe().solved;i++){
  const current=world.observe().words,options=UTTERANCES.map(u=>({u,after:model.predict(current,u)}));
  const scored=options.map(v=>({...v,cost:mismatch(v.after)+(.75*(visits.get(key(v.after))||0))+.02*r()})).sort((a,b)=>a.cost-b.cost);
  const choice=scored[0];world.step(choice.u);visits.set(key(choice.after),(visits.get(key(choice.after))||0)+1);
 }
 return world.observe().solved;
}
export function oracleDistance(world,start,goal){ // Physically explore every world state; benchmark only.
 const queue=[[...start]],seen=new Set([key(start)]),distance=new Map([[key(start),0]]);let head=0;
 if(same(start,goal))return 0;
 for(;head<queue.length;head++){const state=queue[head],d=distance.get(key(state));
   for(const utterance of UTTERANCES){world.reset(state,goal);const next=world.step(utterance).after,k=key(next);
     if(seen.has(k))continue;if(same(next,goal))return d+1;
     seen.add(k);distance.set(k,d+1);queue.push(next);
   }
 }
 return null;
}
export function latentSketch(words){ // Visualization only: fixed deterministic 12D embedding; NOT learned semantics.
 const v=new Float64Array(12);for(let pos=0;pos<words.length;pos++){let h=2166136261;
   for(const ch of words[pos])h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
   for(let d=0;d<12;d++){const n=(Math.sin((h%65521+1)*(d+3)*.000071+(pos+1)*1.37)*43758.5453)%1;
     v[d]+=(n-Math.trunc(n))*Math.cos((pos+1)*(d+1)*.49);
   }
 }const scale=Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1;return Array.from(v,x=>x/scale);
}
export function trajectoryGraph(p,cap=120){
 const states=new Map(),edges=[];const put=(s,{d=null,path=false}={})=>{const id=key(s);if(!states.has(id)&&states.size<cap)states.set(id,{id,words:[...s],distance:d,onPath:path,coords:latentSketch(s)});else if(path&&states.has(id))states.get(id).onPath=true;return id;};
 for(const step of p.steps||[]){put(step.from,{d:step.distanceBefore,path:true});put(step.predicted,{d:step.distanceAfter,path:true});edges.push({from:key(step.from),to:key(step.predicted),utterance:step.utterance,path:true});}
 for(const br of p.branches||[]){for(const o of br.options){if(!o.after||states.size>=cap)continue;const from=put(br.state,{d:br.distance}),to=put(o.after,{d:o.distance});edges.push({from,to,utterance:o.utterance,path:false});}}
 return {nodes:[...states.values()],edges:edges.filter(e=>states.has(e.from)&&states.has(e.to)),dimensions:12,embedding:'fixed random features of positional word tokens; not a learned semantic geometry'};
}
