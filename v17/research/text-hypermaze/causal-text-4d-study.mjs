// Isolated falsifiable research experiment. NO repository modifications until verified.
// A learned 4D transition model navigates long synthetic factual documents.
// This is NOT arbitrary natural-language comprehension or the production V17 Brain.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

const SIDE=4, DIM=4, N=SIDE**DIM, DIRS=8;
const ACTIONS=['fold','echo','lift','drift','phase','curl','arc','sweep'];
const SOURCES=['ledger','dream','rumor'];
const enc=p=>p.reduce((v,x)=>v*SIDE+x,0);
const dec=n=>{const x=Array(DIM);for(let d=DIM-1;d>=0;--d){x[d]=n%SIDE;n=Math.floor(n/SIDE)}return x};
const move=(s,delta)=>enc(dec(s).map((v,d)=>(v+delta[d]+SIDE)%SIDE));
const RNG=seed=>{let a=seed>>>0;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return (a>>>0)/4294967296}};
const choice=(r,n)=>Math.floor(r()*n);
const shuffle=(a,r)=>{let b=a.slice();for(let i=b.length-1;i>0;i--){let j=choice(r,i+1);[b[i],b[j]]=[b[j],b[i]]}return b};
const shift=(i,sign)=>Array.from({length:DIM},(_,d)=>d===i?sign:0);
const groundTruth=shuffle(Array.from({length:DIM},(_,d)=>[shift(d,1),shift(d,-1)]).flat(),RNG(7017));
const modelKey=xs=>xs.join(',');
class Learner{
 constructor(){this.effects=new Map();this.sources=new Map();this.experienced=0;this.trustObservations=0}
 transition(s,a,n){const x=dec(s),y=dec(n);const delta=y.map((v,i)=>(v-x[i]+SIDE)%SIDE);const key=modelKey(delta);
  if(!this.effects.has(a))this.effects.set(a,new Map());let m=this.effects.get(a);m.set(key,(m.get(key)||0)+1);this.experienced++}
 reliable(source,predicted,actual){const v=this.sources.get(source)||[0,0];v[+!!predicted===+!!actual?0:1]++;this.sources.set(source,v);this.trustObservations++}
 getDelta(a){let m=this.effects.get(a);if(!m) return null;let [best]=[...m].sort((x,y)=>y[1]-x[1]);return best[0].split(',').map(Number)}
 getTrust(s){const [right,wrong]=this.sources.get(s)||[0,0];return (right+1)/(right+wrong+2)}
 }
const graphNeighbors=(s,map,deltas,limit=8)=>{
 let out=[];for(let a=0;a<Math.min(limit,ACTIONS.length);a++){const v=deltas[a];if(!v)continue;const to=move(s,v);if(map[to])out.push({to,action:ACTIONS[a]})}return out
};
function shortest(start,goal,map,deltas,limit=8,randomizer=null){
 const queue=[start],prev=new Int32Array(N).fill(-1),used=new Uint8Array(N);used[start]=1;
 for(let head=0;head<queue.length;head++){
  const s=queue[head];if(s===goal)break;
  let options=graphNeighbors(s,map,deltas,limit);
  if(randomizer)options=shuffle(options,randomizer);
  for(const x of options){if(used[x.to])continue;used[x.to]=1;prev[x.to]=s;queue.push(x.to)}
 }
 if(!used[goal])return null;
 let path=[];for(let s=goal;s!==start;s=prev[s]){
  const from=prev[s],a=graphNeighbors(from,map,deltas,limit).find(x=>x.to===s)?.action;
  if(!a)throw Error('Internal path reconstruction failed');path.push({from,to:s,action:a})
 }return path.reverse()
}
const parseState=s=>s.split(',').map(Number);
function learnTraining(seed){const rng=RNG(seed),agent=new Learner();let corrupted=0;
 for(let i=0;i<60;i++)for(let a=0;a<8;a++){
  const start=choice(rng,N),valid=move(start,groundTruth[a]);let next=valid;
  if(rng()<0.16){next=move(start,groundTruth[choice(rng,8)]);corrupted++}
  agent.transition(start,ACTIONS[a],next);
 }
 // Learn which *perspective/channel* is faithful to observed world states.
 for(let i=0;i<5000;i++){
  const truth=rng()<.72;
  for(const source of SOURCES){let statement=truth;
   if(source==='dream'&&rng()<.34)statement=!statement;
   if(source==='rumor'&&rng()<.52)statement=!statement;
   agent.reliable(source,statement,truth)
  }
 }
 return {agent,corrupted}
}
function buildWorld(seed,{sourceShift=false}={}){const rng=RNG(seed),passable=new Uint8Array(N);
 for(let n=0;n<N;n++)passable[n]=+(rng()>.22);
 let start=null,goal=null,oracle=null;
 for(let t=0;t<500;t++){
  const a=choice(rng,N),b=choice(rng,N);
  if(!passable[a]||!passable[b]||a===b)continue;
  const o=shortest(a,b,passable,groundTruth);
  if(o&&o.length>=5){start=a;goal=b;oracle=o;break}
 }
 if(start===null)throw Error('Could not generate reachable unseen world');
 const lines=[];
 for(let n=0;n<N;n++){
  let coord=dec(n).join(','),truth=!!passable[n];
  for(const source of SOURCES){let statement=truth;
   if(sourceShift&&source==='ledger'&&rng()<.35)statement=!statement;
   if(source==='dream'&&rng()<.34)statement=!statement;
   if(source==='rumor'&&rng()<.52)statement=!statement;
   lines.push(`The ${source} record for four-axis location (${coord}) says the chamber is ${statement?'passable':'sealed'} in this world.`)
  }
 }
 for(let i=0;i<200;i++)lines.push(`Archive field note ${i.toString().padStart(4,'0')}: The observer recorded a curious luminous field beyond the polar torus and a soundless passage through recursive perspective. This note is contextual noise, not a claim about traversable chambers.`);
 const document=shuffle(lines,rng).join('\n');
 return {passable,start,goal,oracle,document}
}
function extractMap(document,agent){
 const facts=new Map();const re=/The (ledger|dream|rumor) record for four-axis location \((\d),(\d),(\d),(\d)\) says the chamber is (passable|sealed) in this world\./g;
 let match,claimed=0;
 while((match=re.exec(document))!==null){
  const source=match[1],idx=enc(match.slice(2,6).map(Number)),state=match[6]==='passable';
  if(!facts.has(idx))facts.set(idx,[]);facts.get(idx).push({source,state,trust:agent.getTrust(source)});claimed++
 }
 const map=new Uint8Array(N);let uncertain=0;
 for(let n=0;n<N;n++){
  const entries=facts.get(n)||[];if(entries.length!==3)throw Error(`A missing or repeated world observation at ${n}: ${entries.length}`);
  const best=entries.slice().sort((a,b)=>b.trust-a.trust)[0];map[n]=+best.state;
  if(entries.some(x=>x.state!==best.state))uncertain++
 }
 return {map,claimed,uncertain}
}
function beforeActPlan(agent,document,start,goal,{dimensions=4,noise=0,seed=11,corruptMapping=false}={}){
 const {map,claimed,uncertain}=extractMap(document,agent);
 const original=ACTIONS.map(a=>agent.getDelta(a));
 if(original.some(x=>!x))throw Error('Untrained action');
 const deltas=original.map(v=>v.slice());
 if(dimensions===2)for(let a=0;a<8;a++)if(deltas[a][2]||deltas[a][3])deltas[a]=null;
 if(corruptMapping)deltas.unshift(deltas.pop());
 const planned=shortest(start,goal,map,deltas,8,noise?RNG(seed):null);
 return {planned,decodedMap:map,deltas,claimed,uncertain,solutionShape:planned?.map(x=>x.action)||[]}
}
function execute(world,plan){if(!plan)return {success:false,valid:false,steps:0};let loc=world.start;
 for(const step of plan){const a=ACTIONS.indexOf(step.action);loc=move(loc,groundTruth[a]);
  if(!world.passable[loc])return {success:false,valid:false,steps:0};}
 return {success:loc===world.goal,valid:true,steps:plan.length}
}
// Chance outcomes are NOT visible when the initial shape is planned.
// A blocked step stays in place (observable) with probability `slipRate`.
// Closed-loop control can replan only AFTER observing the failed step.
function executeWithChance(world,agent,initial,seed,{slipRate=.25,replan=false}={}){
 const r=RNG(seed),map=extractMap(world.document,agent).map,
   deltas=ACTIONS.map(a=>agent.getDelta(a));
 let current=world.start,plan=initial?.planned?.slice()||[],slips=0,repairs=0;
 const limit=replan?80:plan.length;
 for(let t=0;t<limit;t++){
  if(current===world.goal)return {success:true,slips,repairs};
  if(!plan.length)return {success:false,slips,repairs};
  const action=plan.shift(),idx=ACTIONS.indexOf(action.action);
  const next=move(current,groundTruth[idx]);
  const blockedByChance=r()<slipRate;
  const actual=blockedByChance||!world.passable[next]?current:next;
  if(actual!==next)slips++;
  current=actual;
  if(replan&&current!==world.goal){
   // This new plan is NOT the initial pre-action prediction;
   // it is a corrected route after real feedback.
   plan=shortest(current,world.goal,map,deltas)||[];repairs++;
  }
 }
 return {success:current===world.goal,slips,repairs};
}
export function evaluate({seed=17,count=64}){
 const t=performance.now(),{agent,corrupted}=learnTraining(seed);const guessed=ACTIONS.map((a,i)=>modelKey(agent.getDelta(a))===modelKey(groundTruth[i].map(v=>(v+SIDE)%SIDE)));
 assert.ok(guessed.every(Boolean),'Learned directions must be inferred from noisy causal experiences before tests');
 assert.ok(agent.getTrust('ledger')>agent.getTrust('dream'));
 assert.ok(agent.getTrust('ledger')>agent.getTrust('rumor'));
 const modelBefore=JSON.stringify({effects:[...agent.effects].map(([k,v])=>[k,[...v]]),sources:[...agent.sources]});
 const results={seed,count,trainingTransitions:agent.experienced,corruptedTrainingTransitions:corrupted,trainingReliabilityObservations:agent.trustObservations,learnedDirectionsCorrect:guessed.filter(Boolean).length,
 sourceTrust:Object.fromEntries(SOURCES.map(s=>[s,agent.getTrust(s)])),full:{correct:0,firstRouteOptimal:0,parsedFacts:0,longDocumentCharacters:0,contradictedChambers:0},ablate2D:{correct:0},shuffledActions:{correct:0},withoutLearnedTrust:{correct:0},stochasticFixedPlan:{correct:0},stochasticFeedbackRepair:{correct:0,repairs:0},adversarialReliabilityShift:{correct:0}};
 for(let i=0;i<count;i++){
  const world=buildWorld(seed*1000003+309+i*17),proposed=beforeActPlan(agent,world.document,world.start,world.goal,{noise:.2,seed:seed+i});
  const executed=execute(world,proposed.planned);results.full.correct+=+executed.success;results.full.firstRouteOptimal+=+(executed.success&&executed.steps===world.oracle.length);
  results.full.parsedFacts+=proposed.claimed;results.full.longDocumentCharacters+=world.document.length;results.full.contradictedChambers+=proposed.uncertain;
  const ablated=beforeActPlan(agent,world.document,world.start,world.goal,{dimensions:2});results.ablate2D.correct+=+execute(world,ablated.planned).success;
  const shuffled=beforeActPlan(agent,world.document,world.start,world.goal,{corruptMapping:true});results.shuffledActions.correct+=+execute(world,shuffled.planned).success;
  // Ablation: instead of learned trust, wrongly choose rumor (most unreliable).
  const rumorAgent={...agent,getDelta:a=>agent.getDelta(a),getTrust:s=>s==='rumor'?1:0};
  const untrusted=beforeActPlan(rumorAgent,world.document,world.start,world.goal);results.withoutLearnedTrust.correct+=+execute(world,untrusted.planned).success;
  const chanceSeed=seed*99991+i*97;
  const fixedChance=executeWithChance(world,agent,proposed, chanceSeed, {replan:false});
  const repairingChance=executeWithChance(world,agent,proposed, chanceSeed, {replan:true});
  results.stochasticFixedPlan.correct+=+fixedChance.success;
  results.stochasticFeedbackRepair.correct+=+repairingChance.success;
  results.stochasticFeedbackRepair.repairs+=repairingChance.repairs;
  // Deliberately shift a once reliable source at test time: this MUST
  // be reported as out-of-distribution failure, not hidden or re-trained.
  const shifted=buildWorld(seed*1000003+309+i*17,{sourceShift:true});
  const shiftedPlan=beforeActPlan(agent,shifted.document,shifted.start,shifted.goal);
  results.adversarialReliabilityShift.correct+=+execute(shifted,shiftedPlan.planned).success;
  if(i===0)results.firstExample={worldSeed:seed*1000003+309,documentChars:world.document.length,start:dec(world.start),goal:dec(world.goal),pathBeforeAction:proposed.solutionShape,pathLength:proposed.solutionShape.length,executedCorrect:executed.success};
 }
 const modelAfter=JSON.stringify({effects:[...agent.effects].map(([k,v])=>[k,[...v]]),sources:[...agent.sources]});
 results.frozenTestNeverTrains=(modelBefore===modelAfter);
 assert.ok(results.frozenTestNeverTrains,"Unseen tests must NOT modify trained evidence");
 results.seconds=+( (performance.now()-t)/1000 ).toFixed(4);
 return results;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split(/[\\/]/).at(-1))){
 const runs=[17,29,47].map(seed=>evaluate({seed,count:64}));
 console.log(JSON.stringify({benchmark:'LEARNED-4D-TEXT-WORLD-PREACT-SOLUTION-SHAPE',notGeneralLanguage:true,runs,aggregate:{
 worlds:runs.reduce((a,r)=>a+r.count,0),
 full:runs.reduce((a,r)=>a+r.full.correct,0),
 optimal:runs.reduce((a,r)=>a+r.full.firstRouteOptimal,0),
 ablate2D:runs.reduce((a,r)=>a+r.ablate2D.correct,0),
 shuffledActions:runs.reduce((a,r)=>a+r.shuffledActions.correct,0),
 withoutLearnedTrust:runs.reduce((a,r)=>a+r.withoutLearnedTrust.correct,0),
 stochasticFixedPlan:runs.reduce((a,r)=>a+r.stochasticFixedPlan.correct,0),
 stochasticFeedbackRepair:runs.reduce((a,r)=>a+r.stochasticFeedbackRepair.correct,0),
 adversarialReliabilityShift:runs.reduce((a,r)=>a+r.adversarialReliabilityShift.correct,0),
 totalDocumentCharacters:runs.reduce((a,r)=>a+r.full.longDocumentCharacters,0),
 averageDocumentCharacters:runs.reduce((a,r)=>a+r.full.longDocumentCharacters,0)/runs.reduce((a,r)=>a+r.count,0)
 }},null,2));
}
