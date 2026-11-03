// V6: off-policy causal experience -> learned dynamics -> multi-step text-goal planning.
// Train, validation and test worlds are seed-disjoint; teacher rules never enter learner.
import {BASE,RNG,TOOLS,PROBES,INPUTS,createWorld,senseProbes,encodeContext,features,
 generateTask,parseGoal,shortestOracle} from './world.mjs';
import {CausalNet} from './model.mjs';
import {makeBelief,hybridPrediction,observeExtra,inferTrainingSamples} from './hybrid.mjs';
export const SPLITS={train:6000011,validation:6100013,test:6200017};
const seedOf=(base,i)=>((base>>>0)+i*7919)>>>0;
const key=s=>s[0]*BASE+s[1];
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
function baseline(state,tool,observations){
 const records=observations.filter(e=>e.tool===tool);
 const best=records.reduce((acc,e)=>{
  const d=Math.abs(state[0]-e.from[0])+Math.abs(state[1]-e.from[1]);
  return d<acc.d?{d,to:e.to}:acc;
 },{d:Infinity,to:[0,0]});
 return best.to.slice();
}
export function buildExperience(world,seed=77,extraPerTool=5){
 const events=senseProbes(world),context=encodeContext(events),rng=new RNG(seed);
 // Independent random interventions with their true *observed* outcomes.
 // No shortest-path teacher, laws, goal or future hidden state is supplied.
 const samples=[],additionalEvents=[];
 for(const tool of TOOLS){
  const chosen=new Set(PROBES.map(s=>key(s)));
  for(let j=0;j<extraPerTool;j++){
   let state;for(let attempts=0;attempts<100;attempts++){
     state=[rng.int(BASE),rng.int(BASE)];
     if(!chosen.has(key(state)))break;
   }
   chosen.add(key(state));
   const e=world.intervene(state,tool);
   additionalEvents.push(e);
   samples.push({input:features(e.from,e.tool,context),target:e.to,provenance:'measured'});
  }
 }
 return {events,context,samples,observedEvents:[...events,...additionalEvents]};
}
export function predictedPlan(start,goal,predict,maxDepth=5){
 if(![start,goal].every(s=>Array.isArray(s)&&s.length===2))throw Error('Invalid plan states');
 const queue=[{state:start.slice(),actions:[]}],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){
  const item=queue[i];if(same(item.state,goal))return {found:true,actions:item.actions,expanded:i+1};
  if(item.actions.length>=maxDepth)continue;
  for(const tool of TOOLS){
   const next=predict(item.state,tool),k=key(next);
   if(!seen.has(k)){seen.add(k);queue.push({state:next,actions:[...item.actions,tool]});}
  }
 }
 return {found:false,actions:[],expanded:queue.length};
}
export function testPlan(world,task,predict){
 const goal=parseGoal(task.text);
 if(!same(goal,task.goal))throw Error('Text parser changed task semantics');
 const plan=predictedPlan(task.start,goal,predict,task.maxSteps);
 let at=task.start.slice(),transitions=0;
 for(const action of plan.actions){at=world.intervene(at,action).to;transitions++;}
 return {...plan,actual:at,goal,success:plan.found&&same(at,goal),transitions};
}
function scoreModel(model,contexts,world,state,tool){
 if(model){
  const prediction=model.predict(state,tool,contexts.context);
  return {next:prediction.state,confidence:prediction.confidence};
 }
 return {next:baseline(state,tool,contexts.events),confidence:[1/BASE,1/BASE]};
}
export function evaluate(model,{seed=SPLITS.test,worlds=24,statesPerTool=7,goalsPerWorld=3,
 maxSteps=5,includePlans=true}={}){
 if(!Number.isInteger(worlds)||worlds<1||worlds>300||!Number.isInteger(goalsPerWorld)||goalsPerWorld<1||goalsPerWorld>10)
  throw Error('Invalid evaluation budget');
 const methods=['learned','untrained','nearest-probe'],untrained=new CausalNet(17);
 const totals=Object.fromEntries(methods.map(mode=>[mode,{components:0,correct:0,exact:0,transitions:0,
  attempted:0,solved:0,reachable:0,noPlan:0,averagePlanLength:0}]));
 for(let w=0;w<worlds;w++){
  const world=createWorld(seedOf(seed,w)),ctx=buildExperience(world,seedOf(seed^1009,w),0);
  const modes={'learned':model,'untrained':untrained,'nearest-probe':null};
  for(const method of methods){
   const counts=totals[method],predict=(state,tool)=>scoreModel(modes[method],ctx,world,state,tool).next;
   const rng=new RNG(seedOf(seed^0xbada55,w));
   for(let t=0;t<TOOLS.length;t++)for(let i=0;i<statesPerTool;i++){
    const state=[rng.int(BASE),rng.int(BASE)],tool=TOOLS[t],actual=world.intervene(state,tool).to,p=predict(state,tool);
    counts.components+=2;counts.correct+=Number(p[0]===actual[0])+Number(p[1]===actual[1]);
    counts.exact+=Number(same(p,actual));counts.transitions++;
   }
   if(includePlans)for(let t=0;t<goalsPerWorld;t++){
    const task=generateTask(world,seedOf(seed^0x45ca,w*10+t),{minSteps:2,maxSteps});
    if(!task.reachable)continue;
    counts.reachable++;counts.attempted++;
    const trial=testPlan(world,task,predict);
    counts.solved+=Number(trial.success);counts.noPlan+=Number(!trial.found);
    counts.averagePlanLength+=trial.transitions;
   }
  }
 }
 return {seed,worlds,statesPerTool,goalsPerWorld,maxSteps,modes:Object.fromEntries(methods.map(mode=>{
  const t=totals[mode];
  return [mode,{componentAccuracy:+(t.correct/Math.max(1,t.components)).toFixed(4),
   exactTransition:+(t.exact/Math.max(1,t.transitions)).toFixed(4),
   planningSuccess:+(t.solved/Math.max(1,t.attempted)).toFixed(4),
   solved:t.solved,attempted:t.attempted,unreachable:worlds*goalsPerWorld-t.attempted,
   noPlan:t.noPlan,meanExecutedActions:+(t.averagePlanLength/Math.max(1,t.attempted)).toFixed(3)}];
 }))};
}
export async function train(model,{
 episodes=500,seed=SPLITS.train,validationWorlds=12,
 validateEvery=50,onProgress=()=>{},cancel=()=>false
}={}){
 if(!Number.isInteger(episodes)||episodes<1||episodes>20000)throw Error('Training episodes must be 1..20000');
 const history=[],start=Date.now();let best=null,bestSnapshot=null,lastLoss=null;
 let measuredExamples=0,inferredExamples=0;
 // Do not consult test split during training or checkpoint selection.
 for(let ep=0;ep<episodes;ep++){
  if(cancel())break;
  const world=createWorld(seedOf(seed,ep)),experience=buildExperience(world,seedOf(seed^135,ep),5);
  // The causal organ distills only unanimous predictions from observed evidence.
  // Neural weights remain the mechanism being optimized; explicit hypotheses
  // are separately measured rather than falsely attributed to the NN.
  const synthetic=inferTrainingSamples(experience.observedEvents,experience.context,
   {perTool:18,seed:seedOf(seed^0x715371,ep)}).samples;
  lastLoss=model.trainBatch([...experience.samples,...synthetic]);model.episodes++;
  measuredExamples+=experience.samples.length;inferredExamples+=synthetic.length;
  if((ep+1)%validateEvery===0||ep===episodes-1){
   const evaluation=evaluate(model,{seed:SPLITS.validation,worlds:validationWorlds,
    statesPerTool:4,goalsPerWorld:2,includePlans:true});
   const a=evaluation.modes.learned;
   const quality=a.exactTransition+.3*a.planningSuccess;
   const rec={episode:ep+1,loss:+lastLoss.toFixed(5),measuredExamples,inferredExamples,
    validationExact:a.exactTransition,
    validationPlan:a.planningSuccess,untrainedExact:evaluation.modes.untrained.exactTransition,
    nearestExact:evaluation.modes['nearest-probe'].exactTransition,
    elapsedMs:Date.now()-start,quality:+quality.toFixed(5)};
   history.push(rec);
   if(!best||quality>best.quality){best=rec;bestSnapshot=model.snapshot();}
   onProgress({done:ep+1,total:episodes,latest:rec,best,history:history.slice()});
  }
  if(ep%2===0)await new Promise(resolve=>setImmediate(resolve));
 }
 return {history,best,bestSnapshot,episodesCompleted:model.episodes,elapsedMs:Date.now()-start,
  measuredExamples,inferredExamples,interrupted:cancel()};
}
