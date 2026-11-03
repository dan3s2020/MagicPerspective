// V6 Perspective Escape: explicit causal *hypothesis* induction from interventions.
// This is program synthesis over a declared finite rule grammar (not open-ended concept invention).
// It is intentionally compared separately with the neural world model.
import {BASE,TOOLS,RNG,createWorld,generateTask,shortestOracle} from './world.mjs';
import {predictedPlan,testPlan} from './training.mjs';
const mod=v=>(v%BASE+BASE)%BASE,valid=s=>Array.isArray(s)&&s.length===2&&s.every(v=>Number.isInteger(v)&&v>=0&&v<BASE);
const KINDS=['add-red','add-blue','swap','rotate','conditional'];
export const HYPOTHESES=[
 ...[1,2,3].flatMap(a=>KINDS.filter(x=>x!=='swap').map(kind=>({kind,amount:a}))),
 {kind:'swap',amount:0}
];
export function predictLaw(law,state){
 if(!valid(state)||!law)throw Error('Invalid candidate');
 const [r,b]=state,a=law.amount;
 switch(law.kind){
 case 'add-red':return [mod(r+a),b];
 case 'add-blue':return [r,mod(b+a)];
 case 'swap':return [b,r];
 case 'rotate':return [b,mod(r+a)];
 case 'conditional':return b>=3?[mod(r+a),b]:[r,mod(b+a)];
 default:throw Error('Unknown candidate');
 }
}
const stateKey=s=>s[0]+','+s[1];
export class HypothesisLearner{
 constructor(){
  this.events=Object.fromEntries(TOOLS.map(tool=>[tool,[]]));
 }
 observe(event){
  if(!TOOLS.includes(event?.tool)||!valid(event.from)||!valid(event.to))throw Error('Invalid causal observation');
  this.events[event.tool].push({tool:event.tool,from:event.from.slice(),to:event.to.slice()});
 }
 candidates(tool){
  if(!TOOLS.includes(tool))throw Error('Unknown tool');
  const scored=HYPOTHESES.map(law=>{
   const mismatch=this.events[tool].reduce((s,e)=>{
    const p=predictLaw(law,e.from);
    return s+(p[0]===e.to[0]&&p[1]===e.to[1]?0:1);
   },0);
   return {law,mismatch};
  });
  const minimum=Math.min(...scored.map(x=>x.mismatch));
  return scored.filter(x=>x.mismatch===minimum);
 }
 predict(state,tool){
  if(!valid(state))throw Error('Invalid state');
  const c=this.candidates(tool),votes=new Map();
  for(const entry of c){
   const p=predictLaw(entry.law,state),k=stateKey(p);
   const old=votes.get(k)||{count:0,state:p};
   old.count++;votes.set(k,old);
  }
  const sorted=[...votes.values()].sort((a,b)=>b.count-a.count||stateKey(a.state).localeCompare(stateKey(b.state)));
  const winner=sorted[0];
  return {state:winner.state.slice(),confidence:winner.count/c.length,
   alternatives:c.length,unresolved:sorted.length>1};
 }
 chooseIntervention(){
  const scores=[];
  for(const tool of TOOLS){
   const candidates=this.candidates(tool),already=new Set(this.events[tool].map(e=>stateKey(e.from)));
   for(let r=0;r<BASE;r++)for(let b=0;b<BASE;b++){
    const state=[r,b],k=stateKey(state);
    if(already.has(k))continue;
    const counts=new Map();
    for(const c of candidates){
     const p=stateKey(predictLaw(c.law,state));counts.set(p,(counts.get(p)||0)+1);
    }
    const n=candidates.length,entropy=1-[...counts.values()].reduce((a,v)=>a+(v/n)**2,0);
    scores.push({tool,state,informationGain:entropy,alternatives:n});
   }
  }
  return scores.sort((a,b)=>b.informationGain-a.informationGain||
   b.alternatives-a.alternatives||TOOLS.indexOf(a.tool)-TOOLS.indexOf(b.tool)||
   stateKey(a.state).localeCompare(stateKey(b.state)))[0]||null;
 }
 summary(){return {counts:Object.fromEntries(TOOLS.map(tool=>[tool,this.candidates(tool).length])),
  observed:Object.fromEntries(TOOLS.map(tool=>[tool,this.events[tool].length])),
  next:this.chooseIntervention()};
 }
}
function makeExperience(world,extra,mode,seed){
 const learner=new HypothesisLearner(),rng=new RNG(seed);
 // Each tool gets the same first observed action at state [0,0].
 for(const tool of TOOLS)learner.observe(world.intervene([0,0],tool));
 for(let i=0;i<extra;i++){
  let chosen;
  if(mode==='active')chosen=learner.chooseIntervention();
  else{
   const options=TOOLS.flatMap(tool=>{
    const seen=new Set(learner.events[tool].map(e=>stateKey(e.from)));
    const out=[];for(let r=0;r<BASE;r++)for(let b=0;b<BASE;b++)
     if(!seen.has(stateKey([r,b])))out.push({tool,state:[r,b]});
    return out;
   });
   chosen=options[rng.int(options.length)];
  }
  if(!chosen)break;
  learner.observe(world.intervene(chosen.state,chosen.tool));
 }
 return learner;
}
export function evaluateHypotheses({worlds=36,seed=6300019,extra=6,goalsPerWorld=3}={}){
 if(!Number.isInteger(worlds)||worlds<1||worlds>200||!Number.isInteger(extra)||extra<0||extra>24)throw Error('Invalid budget');
 const out={};
 for(const mode of ['active','random']){
  let correct=0,total=0,solved=0,attempted=0,ambiguous=0,oracleSolvable=0;
  for(let i=0;i<worlds;i++){
   const world=createWorld((seed+i*7919)>>>0);
   const learner=makeExperience(world,extra,mode,(seed^0x77111)+i*1039);
   for(const tool of TOOLS){
    ambiguous+=learner.candidates(tool).length>1?1:0;
    for(let r=0;r<BASE;r++)for(let b=0;b<BASE;b++){
     const state=[r,b];
     if(learner.events[tool].some(e=>stateKey(e.from)===stateKey(state)))continue;
     const a=world.intervene(state,tool).to,p=learner.predict(state,tool).state;
     correct+=Number(stateKey(a)===stateKey(p));total++;
    }
   }
   for(let k=0;k<goalsPerWorld;k++){
    const task=generateTask(world,seed+i*13+k*777,{minSteps:2,maxSteps:5});
    if(!task.reachable)continue;
    oracleSolvable++;attempted++;
    const trial=testPlan(world,task,(s,t)=>learner.predict(s,t).state);
    solved+=Number(trial.success);
   }
  }
  out[mode]={exactTransition:+(correct/Math.max(1,total)).toFixed(4),
   planningSuccess:+(solved/Math.max(1,attempted)).toFixed(4),
   solved,attempted,ambiguousToolModels:ambiguous,
   observationsPerWorld:TOOLS.length+extra};
 }
 return {worlds,seed,extra,goalsPerWorld,modes:out};
}
