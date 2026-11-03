// Magic Perspective Brain Studio.
// Native adapters continue each checkpoint using its ACTUAL model architecture.
// The new SharedBrain is one trainable parameter set over maze, graph and symbolic tasks.
// Evaluator truth is serialized separately; no oracle route enters a learner feature.
import {Organism7,Organism} from '../../../v7/engine/organ.mjs';
import {makeWorld as makeTerrain,sense as terrainSense} from '../../../v7/engine/world.mjs';
import {Episode as TerrainEpisode} from '../../../v7/engine/agent.mjs';
import {AssociationRule} from '../../graph-dance-20261103/engine/dance.mjs';
import {makeWorld as makeGraph,sense as graphSense,act as graphAct} from '../../graph-dance-20261103/engine/world.mjs';
import {Episode as GraphEpisode} from '../../graph-dance-20261103/engine/agent.mjs';
import {MessageBrain} from '../../dynamic-perspective-20261103/engine/brain.mjs';
import {trainEpisode as trainMessages,costMAE} from '../../dynamic-perspective-20261103/engine/experiment.mjs';
import {predictedPlan} from '../../causal-text/engine/training.mjs';
import {CausalNet} from '../../causal-text/engine/model.mjs';
import {buildExperience} from '../../causal-text/engine/training.mjs';
import {createWorld as makeSymbolic,generateTask,TOOLS,senseProbes,encodeContext,features as causalFeatures} from '../../causal-text/engine/world.mjs';
import {MLP} from '../../../v7/engine/nn.mjs';
import {attachAbstractGraph} from './abstract-graph.mjs';
import {GraphCellsBrain} from './cells.mjs';

export const KINDS=['cells','universal','v7','v6','graph','dynamic','causal'];
export const DOMAINS=['maze','network','text'];
export const INPUT=16;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seedOf=(seed,n)=>((seed>>>0)+Math.imul(n>>>0,7919))>>>0;
const RNG=s=>{let v=(s>>>0)||1;return ()=>{v^=v<<13;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296}};
const mean=a=>a.length?a.reduce((p,c)=>p+c,0)/a.length:0;
export function makeBrain(kind='universal',seed=19){
 switch(kind){
  case 'cells':return new GraphCellsBrain(seed);
  case 'universal':return new SharedBrain(seed);
  case 'v7':return new Organism7(seed);
  case 'v6':return new Organism(seed);
  case 'graph':return new AssociationRule(seed);
  case 'dynamic':return new MessageBrain(seed);
  case 'causal':return new CausalNet(seed);
  default:throw Error('Unknown brain type');
 }
}
export function restoreBrain(kind,snapshot){
 switch(kind){
  case 'cells':return GraphCellsBrain.restore(snapshot);
  case 'universal':return SharedBrain.restore(snapshot);
  case 'v7':return Organism7.restore(snapshot);
  case 'v6':return Organism.restore(snapshot);
  case 'graph':return AssociationRule.restore(snapshot);
  case 'dynamic':return MessageBrain.restore(snapshot);
  case 'causal':return CausalNet.restore(snapshot);
  default:throw Error('Unsupported brain type');
 }
}
const kindOf=(brain)=>brain instanceof SharedBrain?'universal':
 brain instanceof Organism7?'v7':brain instanceof AssociationRule?'graph':
 brain instanceof MessageBrain?'dynamic':brain instanceof CausalNet?'causal':null;
export function brainStats(kind,brain){
 const s=brain.snapshot();return {kind,episodes:brain.episodes||0,
  updates:kind==='cells'?brain.steps:kind==='universal'?brain.net.updates:kind==='v7'?brain.experts.reduce((n,e)=>n+e.recon.updates+e.doubt.updates,0):
   kind==='v6'?brain.recon.updates+brain.doubt.updates:
   kind==='graph'?brain.updates:kind==='dynamic'?brain.costUpdates+brain.ruleUpdates:brain.steps,
  samples:kind==='cells'?brain.samples:kind==='universal'?brain.samples:brain.samples??brain.costUpdates??0,
  weights:kind==='cells'?{W1:s.parameters.in,b1:s.parameters.bias,
    W2:[...s.parameters.readCurrent,...s.parameters.readTarget],b2:s.parameters.action}:
   kind==='universal'?{W1:s.net.W1,b1:s.net.b1,W2:s.net.W2,b2:s.net.b2}:kind==='v7'?
   {W1:s.experts[0].recon.W1,b1:s.experts[0].recon.b1,W2:s.experts[0].recon.W2,b2:s.experts[0].recon.b2}:
   kind==='v6'?{W1:s.recon.W1,b1:s.recon.b1,W2:s.recon.W2,b2:s.recon.b2}:
   kind==='graph'?{W1:s.w,b1:[],W2:[],b2:[]}:kind==='dynamic'?
   {W1:s.cost,b1:s.score,W2:s.gate,b2:[s.bias,s.temperature]}:
   {W1:s.w1,b1:s.b1,W2:s.w2,b2:s.b2},
  architecture:kind==='cells'?'ONE GRAPH · observed state cells × 8 channels × 3 message rounds → real actions':
   kind==='universal'?'16 → 24 → 1 • shared across domains':
   kind==='v7'?'3 specialists × 13 → {24,16} → 1':kind==='v6'?'13 → {24,16} → 1':
   kind==='graph'?'9 learned edge associations':
   kind==='dynamic'?'4 cost + 3 attention + 3 gate + 2':
   '23 → 64 → 14 (two 7-way heads)'};
}
export class SharedBrain{
 constructor(seed=19){this.schema=1;this.seed=seed;this.net=new MLP(INPUT,24,seed,{lr:.003});
  this.episodes=0;this.samples=0;this.domainCounts={maze:0,network:0,text:0};
  this.replay=[];this.replayCursor=0;}
 predict(x){return this.net.forward(x)}
 hidden(x){return Array.from(this.net.hiddenOf(x))}
 learn(trajectory,solved){
  // Credit assignment uses only observed progress, experienced cost and actual
  // goal arrival. Even failed episodes can contain useful positive local evidence.
  let future=solved?1.2:0;const samples=[];
  for(let i=trajectory.length-1;i>=0;i--){
   const t=trajectory[i];
   future=clamp(t.reward+.9*future,-2.5,2.5);
   samples.push({x:t.features,y:clamp(.5+future/5,.025,.975),
    w:clamp(1+Math.abs(t.reward),1,2.5)});
  }
  this.samples+=samples.length;
  // Real inter-domain replay: all domains use the SAME synapses and memory buffer.
  for(const x of samples){
   if(this.replay.length<4096)this.replay.push(x);
   else{this.replay[this.replayCursor]=x;this.replayCursor=(this.replayCursor+1)%4096;}
  }
  if(!samples.length)return null;
  const replay=[];
  for(let k=0;k<Math.min(96,this.replay.length);k++){
   const index=(this.samples*53+k*157)%this.replay.length;
   replay.push(this.replay[index]);
  }
  return this.net.trainBatch([...samples,...replay]);
 }
 snapshot(){return {schema:1,seed:this.seed,episodes:this.episodes,samples:this.samples,
  domainCounts:{...this.domainCounts},replay:this.replay.slice(),replayCursor:this.replayCursor,
  net:this.net.snapshot()}}
 static restore(s){if(s?.schema!==1||!s.net||s.net.I!==INPUT||s.net.H!==24)
   throw Error('Incompatible SharedBrain checkpoint');
  const b=new SharedBrain(s.seed);b.net=MLP.restore(s.net);b.episodes=s.episodes||0;
  b.samples=s.samples||0;b.domainCounts={...b.domainCounts,...s.domainCounts};
  if(Array.isArray(s.replay))b.replay=s.replay.slice(-4096).filter(x=>Array.isArray(x.x)&&x.x.length===INPUT&&
   x.x.every(Number.isFinite)&&Number.isFinite(x.y)&&x.y>=0&&x.y<=1);
  b.replayCursor=Number.isInteger(s.replayCursor)&&s.replayCursor>=0?s.replayCursor%b.replay.length||0:0;
  return b}
}
function positionsForMaze(n){return Array.from({length:n*n},(_,i)=>({x:(i%n+.5)/n,y:(Math.floor(i/n)+.5)/n}))}
function positionsForSymbolic(){
 return Array.from({length:49},(_,i)=>({x:((i%7)+.5)/7,y:(Math.floor(i/7)+.5)/7}));
}
const symbolicNode=s=>s[0]*7+s[1];
const posDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function features(domain,positions,current,goal,action,to,cost,visits,unknown=false){
 const p=positions[current],g=positions[goal],next=to==null?p:positions[to];
 const dx=p.x-g.x,dy=p.y-g.y,d=posDistance(p,g);
 const delta=unknown?0:(d-posDistance(next,g));
 return [1,...DOMAINS.map(k=>+(domain===k)),p.x,p.y,g.x,g.y,dx,dy,
  clamp(d/1.414,0,1),clamp(cost/12,0,1),
  clamp((visits[to??current]||0)/10,0,1),
  clamp(delta,-1,1),clamp(action/4,0,1),unknown?1:0];
}
function createEpisode(domain,seed,size){
 if(domain==='maze'){
  const n=[9,11,13,15,17,19].includes(size)?size:11;
  const w=makeTerrain(seed,'maze',n),positions=positionsForMaze(n);
  const truth=[];for(let i=0;i<w.h.length;i++)if(w.h[i]<=.82){
   const x=i%n,y=Math.floor(i/n);
   for(const j of [x+1<n?i+1:-1,y+1<n?i+n:-1])if(j>=0&&w.h[j]<=.82)truth.push({a:i,b:j});
  }
  return {domain,seed,start:w.start,goal:w.goal,current:w.start,positions,
   truth,visited:Array(n*n).fill(0),walked:[w.start],observed:new Map(),observedCells:new Map(),observedLinks:new Map(),transitions:new Map(),world:w,
   activeState:()=>w.start,limit:n*n};
 }
 if(domain==='network'){
  const w=makeGraph(seed,Math.max(13,Math.min(65,size*2+3)),['local','hierarchical','mixed'][seed%3]);
  return {domain,seed,start:w.start,goal:w.goal,current:w.start,positions:w.positions,
   truth:w.edges.filter(e=>e.open).map(e=>({a:e.a,b:e.b})),visited:Array(w.n).fill(0),
   walked:[w.start],observed:new Map(),observedCells:new Map(),observedLinks:new Map(),transitions:new Map(),world:w,limit:w.n*4};
 }
 if(domain==='text'){
  const w=makeSymbolic(seed),task=generateTask(w,seed+77,{minSteps:2,maxSteps:5});
  const start=symbolicNode(task.start),goal=symbolicNode(task.goal);
  return {domain,seed,start,goal,current:start,positions:positionsForSymbolic(),
   truth:[],visited:Array(49).fill(0),walked:[start],observed:new Map(),observedCells:new Map(),observedLinks:new Map(),transitions:new Map(),world:w,
   text:task.text,limit:15};
 }
 throw Error('Unknown domain');
}
function options(ep){
 if(ep.domain==='maze'){
  const p=ep.current,n=ep.world.n;
  const s=terrainSense(ep.world,p); // 3×3 local window is the ONLY maze terrain input.
  const heights=new Map(s.window.map(x=>[x.i,x.h]));
  for(const [i,h] of heights)ep.observedCells.set(i,h);
  // Edges are inferred from LOCAL measured cells only; unobserved walls stay hidden.
  for(const [i,h] of ep.observedCells)if(h<=.82){
   const x=i%n,y=Math.floor(i/n);
   const adj=[x+1<n?i+1:-1,y+1<n?i+n:-1];
   for(const j of adj)if(j>=0&&ep.observedCells.get(j)<=.82){
    const key=i+':'+j;ep.observedLinks.set(key,{a:i,b:j,open:true,action:null});
   }
  }
  const next=[p%n>0?p-1:-1,p%n<n-1?p+1:-1,p>=n?p-n:-1,p<n*(n-1)?p+n:-1];
  return next.map((to,action)=>({to,action,cost:heights.has(to)?1+8*heights.get(to):2}))
   .filter(x=>x.to>=0&&heights.get(x.to)<=.82);
 }
 if(ep.domain==='network'){
  const sensed=graphSense(ep.world,ep.current);
  for(const link of sensed.links){
   const a=Math.min(ep.current,link.to),b=Math.max(ep.current,link.to);
   ep.observedLinks.set(a+':'+b,{a,b,open:link.open,cost:link.cost,action:null});
  }
  return sensed.links.filter(x=>x.open).map((x,i)=>({to:x.to,action:i%5,cost:x.cost}));
 }
 return TOOLS.map((tool,action)=>({tool,to:null,action,cost:2,
  expectedTo:ep.transitions.get(ep.current+':'+tool)??null}));
}
function observedList(ep){return [...ep.observedLinks.values()]}
function pathThroughObserved(ep,start,goal,preferred){
 // Explicit shortest-hop path over ONLY observed connections, not hidden truth.
 const adj=new Map();
 for(const edge of ep.observedLinks.values()){
  if(edge.open===false)continue;
  if(!adj.has(edge.a))adj.set(edge.a,[]);
  adj.get(edge.a).push(edge.b);
  if(ep.domain!=='text'){
   if(!adj.has(edge.b))adj.set(edge.b,[]);
   adj.get(edge.b).push(edge.a);
  }
 }
 const queue=[start],prev=new Map([[start,null]]);
 for(let k=0;k<queue.length;k++){
  const u=queue[k];if(u===goal)break;
  for(const v of adj.get(u)||[])if(!prev.has(v)){prev.set(v,u);queue.push(v);}
 }
 if(prev.has(goal)){
  const path=[];for(let u=goal;u!==null;u=prev.get(u))path.push(u);
  return {path:path.reverse(),source:'BFS only on observed links'};
 }
 return {path:Number.isInteger(preferred)?[start,preferred]:[start],
  source:'1-step neural candidate; unknown future'};
}
function graphFrame(ep){
 const observedNodes=ep.domain==='maze'?[...ep.observedCells.keys()]:
   [...new Set([ep.start,...ep.walked,...ep.observedLinks.values()].flatMap(x=>
    typeof x==='number'?[x]:[x?.a,x?.b]).filter(Number.isInteger))];
 return {observedNodes,observedEdges:observedList(ep).slice(-550),
   predictedPath:[ep.current],predictedNext:null,planSource:'No prediction evaluated yet',
   candidates:[],chosen:null,actual:null};
}
export function runSharedEpisode(brain,{domain='maze',seed=123,size=11,learn=true,explore=.18}={}){
 if(!(brain instanceof SharedBrain)&&!(brain instanceof GraphCellsBrain))throw Error('Expected shared/cellular graph brain');
 const cellular=brain instanceof GraphCellsBrain;
 const ep=createEpisode(domain,seed,size),rand=RNG(seed^brain.seed^0x1ca1);
 const trajectory=[],frames=[],scorePath=[];
 let cost=0,solved=ep.current===ep.goal,blocked=0;
 const capture=({action=null,activation=null,score=null}={})=>{
  const last=ep.walked.slice(-40);
  frames.push({step:trajectory.length,current:ep.current,walked:last,
   learnedEdges:observedList(ep).slice(-250),action,activation,score,cost,solved,
   graph:graphFrame(ep)});
 };
 ep.visited[ep.current]++;options(ep);capture();
 for(let t=0;t<ep.limit&&!solved;t++){
  const candidates=options(ep);if(!candidates.length)break;
  let rated=candidates.map(c=>{
   const x=features(domain,ep.positions,ep.current,ep.goal,c.action,c.to,c.cost,ep.visited,c.to==null);
   const neural=cellular?0:brain.predict(x);
   const h=ep.domain==='text'?0:clamp((posDistance(ep.positions[ep.current],ep.positions[ep.goal])-
        posDistance(ep.positions[c.to],ep.positions[ep.goal])), -1,1);
   const revisit=ep.visited[c.to??ep.current]||0;
   return {...c,features:x,neural,utility:neural+.15*h-.025*revisit-.012*c.cost};
  });
  let computation=null,cellTape=null;
  if(cellular){
   const analysis=brain.rank(ep,rated);
   rated=analysis.candidates;computation=analysis.trace;cellTape=analysis.tape;
  }else rated.sort((a,b)=>b.utility-a.utility||a.action-b.action);
  const select=learn&&rand()<explore?rated[Math.floor(rand()*rated.length)]:rated[0];
  // Snapshot the model's belief BEFORE execution. This is the actual score used
  // by the policy; next-state for unseen symbolic actions remains explicitly unknown.
  const priorFrame=frames.at(-1),nextPredicted=rated[0]?.expectedTo??rated[0]?.to??null;
  const knownPlan=pathThroughObserved(ep,ep.current,ep.goal,nextPredicted);
  priorFrame.graph={...graphFrame(ep),compute:computation,predictedPath:knownPlan.path,
   predictedNext:nextPredicted,planSource:knownPlan.source,
   candidates:rated.map(x=>({from:ep.current,to:x.expectedTo??x.to??null,
    action:x.tool??String(x.action),q:+(cellular?x.q:x.neural).toFixed(6),
    utility:+x.utility.toFixed(6),knownDestination:x.to!==null||x.expectedTo!=null})),
   chosen:{action:select.tool??String(select.action),from:ep.current,
    to:select.expectedTo??select.to??null,
    q:+(cellular?select.q:select.neural).toFixed(6),utility:+select.utility.toFixed(6),
    contribution:cellular?{logit:+select.logit.toFixed(6),votes:select.net.votes,
     action:select.net.action,cost:select.net.cost,revisit:select.net.revisit,
     unknown:select.net.unknown}:null},
   actual:null};
  let to,stepCost=select.cost;
  if(domain==='text'){
   const previous=[Math.floor(ep.current/7),ep.current%7],event=ep.world.intervene(previous,select.tool);
   to=symbolicNode(event.to);stepCost=1;
  }else if(domain==='network'){
   const outcome=graphAct(ep.world,ep.current,select.to);to=outcome.position;stepCost=outcome.cost;
  }else to=select.to;
  if(domain==='text')ep.transitions.set(ep.current+':'+select.tool,to);
  if(to===ep.current)blocked++;
  const previous=ep.current,oldDist=posDistance(ep.positions[previous],ep.positions[ep.goal]),
    newDist=posDistance(ep.positions[to],ep.positions[ep.goal]),repeat=ep.visited[to];
  ep.current=to;ep.visited[to]++;ep.walked.push(to);cost+=stepCost;
  ep.observed.set(previous+':'+to,{a:previous,b:to});
  if(domain==='text')ep.observedLinks.set(previous+':'+to+':'+select.tool,
   {a:previous,b:to,action:select.tool,open:true,cost:1});
  solved=ep.current===ep.goal;
  const reward=clamp(2*(oldDist-newDist)-.035*stepCost-.045*repeat+(solved?1.8:0),-2.5,2.5);
  trajectory.push({features:select.features,score:cellular?select.q:select.neural,
   action:select.tool??select.action,from:previous,to,domain,reward,
   cellDecision:cellular?{tape:cellTape,net:select.net,logit:select.logit}:null});
  priorFrame.graph.actual={from:previous,to,action:select.tool??String(select.action),
   reward:+reward.toFixed(5),cost:stepCost,
   predictionKnown:priorFrame.graph.predictedNext!==null,
   matched:priorFrame.graph.predictedNext===to};
  options(ep); // reveal only local observations at the NEW position
  capture({action:select.tool??select.action,
   activation:cellular?computation?.cells.find(x=>x.id===previous)?.activations.at(-1):brain.hidden(select.features),
   score:cellular?select.q:select.neural});
 }
 const learning=learn?brain.learn(trajectory,solved):null;
 const loss=cellular?learning?.loss??null:learning;
 if(cellular&&learning?.perStep){
  for(let i=0;i<trajectory.length;i++){
   const info=learning.perStep[i],trace=frames[i]?.graph?.compute;
   if(!trace||!info)continue;
   trace.learning={target:+info.target.toFixed(6),prediction:+info.prediction.toFixed(6),
    loss:+info.loss.toFixed(6),gradientNorm:+info.gradientNorm.toFixed(6),
    weightDelta:learning.weightDelta,updatedWeights:brain.steps};
   const gradients=new Map(info.cells.map(c=>[c.id,c.gradient]));
   for(const cell of trace.cells)cell.gradient=gradients.get(cell.id)||0;
  }
 }
 if(learn){brain.episodes++;brain.domainCounts[domain]++;}
 const trimmed=cellular?frames:(frames.length<=96?frames:frames.filter((_,i)=>i%Math.ceil(frames.length/96)===0||i===frames.length-1));
 return attachAbstractGraph({
  meta:{domain,seed,kind:'universal',text:ep.text||null,start:ep.start,goal:ep.goal,
   positions:ep.positions,truth:ep.truth,learnerInput:'Only local observations and known goal'},
  outcome:{solved,steps:trajectory.length,cost,blocked,loss,domain,
   learning:cellular?(learning?{...brain.lastLearning,steps:brain.steps}:null):null,
   observedEdges:ep.observed.size},frames:trimmed,trajectory,
  lastInput:trajectory.at(-1)?.features||Array(INPUT).fill(0)
 },ep.world,domain);
}
export function runNativeEpisode(kind,brain,{seed=1,size=11,learn=true}={}){
 if(kind==='v7'||kind==='v6'){
  const domain=(seed%2===0?'maze':'relief'),w=makeTerrain(seed,domain,size%2?size:11);
  const ep=new TerrainEpisode(w,brain,{mode:'organ',online:learn,record:true,imagine:4});
  ep.run();if(learn)brain.episodes++;
  const summary=ep.summary();
  return attachAbstractGraph({meta:{domain,kind,seed,text:null,start:w.start,goal:w.goal,
   positions:positionsForMaze(w.n),truth:Array.from(w.h,(h,i)=>({i,h}))},
   outcome:{solved:summary.solved,steps:summary.steps,cost:summary.effort,
    loss:null,match:summary.match0},frames:ep.frames.slice(-70),lastInput:null},w,domain);
 }
 if(kind==='graph'){
  const w=makeGraph(seed,Math.max(13,Math.min(65,size*2+3)),['local','hierarchical','mixed'][seed%3]);
  const ep=new GraphEpisode(w,brain,{online:learn,dance:true});ep.run();
  if(learn)brain.episodes++;
  const summary=ep.summary();
  return attachAbstractGraph({meta:{kind,domain:'network',seed,start:w.start,goal:w.goal,positions:w.positions,
   truth:w.edges.filter(e=>e.open).map(x=>({a:x.a,b:x.b}))},
   outcome:{solved:summary.solved,steps:summary.steps,cost:summary.cost,
    loss:ep.collective.lastError,match:summary.initialF1},
   frames:ep.history.slice(-70),lastInput:null},w,'network');
 }
 if(kind==='dynamic'){
  const r=trainMessages(brain,brain.episodes,{n:Math.max(16,Math.min(60,size*2+3)),seed,trace:true});
  if(!learn)throw Error('Dynamic native evaluation requires a frozen snapshot');
  return attachAbstractGraph({meta:{kind,domain:'network',seed:r.live.seed,start:r.live.info.start,goal:r.live.info.goal,
   positions:r.live.info.positions,truth:r.live.initialTruth.links,
   referencePath:r.live.initialTruth.optimal,text:null},outcome:{solved:r.solved,steps:r.live.outcome.steps,cost:r.cost,
   loss:r.ruleMAE,match:r.live.initialF1},frames:r.live.frames,lastInput:null},null,'network');
 }
 if(kind==='causal'){
  const w=makeSymbolic(seed),data=buildExperience(w,seed^0x1919,5);
  // A real update from measured interventions; candidate plans are then
  // generated by the NEURAL dynamics, not fixed arbitrary action demonstrations.
  const loss=learn?brain.trainBatch(data.samples):null;
  if(learn)brain.episodes++;
  const task=generateTask(w,seed+77,{minSteps:2,maxSteps:5});
  const predict=(state,action)=>brain.predict(state,action,data.context).state;
  const plan=predictedPlan(task.start,task.goal,predict,task.maxSteps);
  const frames=[],actual=[task.start[0]*7+task.start[1]],observed=data.events.map(e=>({
   a:symbolicNode(e.from),b:symbolicNode(e.to),action:e.tool,open:true}));
  let current=task.start.slice(),cost=0;
  const framesOf=(chosen=null,actualTransition=null)=>{
   const at=symbolicNode(current);
   const predictedCandidates=TOOLS.map(tool=>{
    const p=brain.predict(current,tool,data.context);
    return {from:at,to:symbolicNode(p.state),action:tool,
     q:+Math.min(...p.confidence).toFixed(5),source:'neural dynamics'};
   });
   const futurePath=[at];let look=current.slice();
   for(const tool of plan.actions.slice(cost)){
    look=predict(look,tool);futurePath.push(symbolicNode(look));
   }
   const neural=chosen?brain.forward(causalFeatures(current,chosen,data.context)).h:null;
   frames.push({step:cost,current:at,walked:actual.slice(),
    activation:neural?Array.from(neural).slice(0,32):null,
    learnedEdges:observed.slice(),score:chosen?Math.min(...brain.predict(current,chosen,data.context).confidence):null,
    graph:{observedNodes:[...new Set(observed.flatMap(e=>[e.a,e.b]))],
     observedEdges:observed.slice(),predictedPath:futurePath,
     predictedNext:futurePath[1]??null,planSource:'Neural predicted dynamics',
     candidates:predictedCandidates,chosen:chosen?{from:at,action:chosen,
      to:symbolicNode(predict(current,chosen))}:null,
     actual:actualTransition}
   });
  };
  framesOf();
  for(const action of plan.actions){
   const before=current.slice(),predicted=predict(before,action);
   const event=w.intervene(before,action);current=event.to;cost++;
   const from=symbolicNode(before),to=symbolicNode(event.to);
   observed.push({a:from,b:to,action,open:true});actual.push(to);
   frames.at(-1).graph.actual={from,to,action,matched:predicted[0]===current[0]&&predicted[1]===current[1],
    predictionKnown:true,cost:1,reward:to===symbolicNode(task.goal)?1:0};
   framesOf(action);
  }
  const solved=plan.found&&current[0]===task.goal[0]&&current[1]===task.goal[1];
  return attachAbstractGraph({meta:{kind,domain:'text',seed,text:task.text,
    start:symbolicNode(task.start),goal:symbolicNode(task.goal),
    positions:positionsForSymbolic(),truth:[],planFound:plan.found,
    expanded:plan.expanded},outcome:{solved,steps:cost,cost,loss,
    observed:data.samples.length,planFound:plan.found},frames,lastInput:null},w,'text');
 }
 throw Error('Invalid native brain kind');
}
export function oneEpisode(kind,brain,args){
 return (kind==='cells'||kind==='universal')?runSharedEpisode(brain,args):runNativeEpisode(kind,brain,args);
}
export function blindTest(kind,brain,{count=12,size=11,seed=918273,domains=DOMAINS}={}){
 if(!Number.isInteger(count)||count<3||count>120)throw Error('Invalid test count');
 // Domain-correct metrics: cost prediction for message operator, exact action transitions
 // for Causal Text. Never report these as "navigation goals solved".
 if(kind==='dynamic'){
  const trained=costMAE(MessageBrain.restore(brain.snapshot()),{seed,n:Math.max(16,Math.min(60,size*2+3)),count});
  const base=costMAE(new MessageBrain(brain.seed),{seed,n:Math.max(16,Math.min(60,size*2+3)),count});
  return {count,seed,domains:{network:{metric:'costMAE',count,
   meanCost:trained,baselineCost:base,success:null,baselineSuccess:null,
   solved:null,baselineSolved:null}}};
 }
 if(kind==='causal'){
  const clone=CausalNet.restore(brain.snapshot()),base=new CausalNet(brain.seed);
  let correct=0,baseCorrect=0,total=0;
  const probes=[[4,1],[5,4],[6,6]];
  for(let k=0;k<count;k++){
   const world=makeSymbolic(seedOf(seed,k)),context=encodeContext(senseProbes(world));
   for(const action of TOOLS)for(const state of probes){
    const actual=world.intervene(state,action).to,
     a=clone.predict(state,action,context).state,
     b=base.predict(state,action,context).state;
    correct+=+(a[0]===actual[0]&&a[1]===actual[1]);
    baseCorrect+=+(b[0]===actual[0]&&b[1]===actual[1]);total++;
   }
  }
  return {count,seed,domains:{text:{metric:'exactTransition',count:total,
   solved:correct,baselineSolved:baseCorrect,
   success:+(correct/total).toFixed(4),baselineSuccess:+(baseCorrect/total).toFixed(4),
   meanCost:+(1-correct/total).toFixed(4),baselineCost:+(1-baseCorrect/total).toFixed(4)}}};
 }
 const snapshot=brain.snapshot(),trained=restoreBrain(kind,snapshot),base=makeBrain(kind,brain.seed);
 const report={count,seed,domains:{},all:{trained:{solved:0,episodes:0,cost:0},untrained:{solved:0,episodes:0,cost:0}}};
 const applicable=(kind==='cells'||kind==='universal')?domains:
  kind==='v7'||kind==='v6'?['maze','relief']:kind==='causal'?['text']:['network'];
 for(const domain of applicable){
  let wins=0,baseWins=0,cost=0,baseCost=0,attempts=0;
  for(let i=0;i<count;i++){
   const n=seedOf(seed,1000*i+DOMAINS.indexOf(domain)+2);
   // Native V7 alternates maze/relief deterministically; require a seed parity matching domain.
   const actualSeed=(kind==='v7'||kind==='v6')?((n&~1)+(domain==='relief'?1:0)):n;
   const a=(kind==='cells'||kind==='universal')?runSharedEpisode(trained,{domain,seed:actualSeed,size,learn:false,explore:0}):
     nativeTrial(kind,trained,{seed:actualSeed,size});
   const b=(kind==='cells'||kind==='universal')?runSharedEpisode(base,{domain,seed:actualSeed,size,learn:false,explore:0}):
     nativeTrial(kind,base,{seed:actualSeed,size});
   wins+=Number(a.outcome.solved);baseWins+=Number(b.outcome.solved);
   cost+=a.outcome.cost;baseCost+=b.outcome.cost;attempts++;
  }
  report.domains[domain]={solved:wins,baselineSolved:baseWins,count:attempts,
   success:+(wins/attempts).toFixed(4),baselineSuccess:+(baseWins/attempts).toFixed(4),
   meanCost:+(cost/attempts).toFixed(3),baselineCost:+(baseCost/attempts).toFixed(3)};
  report.all.trained.solved+=wins;report.all.untrained.solved+=baseWins;
  report.all.trained.episodes+=attempts;report.all.untrained.episodes+=attempts;
  report.all.trained.cost+=cost;report.all.untrained.cost+=baseCost;
 }
 return report;
}
// Native evaluation is explicitly frozen. No checkpoint or selected working model is changed.
function nativeTrial(kind,brain,args){
 if(kind==='dynamic'){
  const clone=restoreBrain(kind,brain.snapshot());
  const r=trainMessages(clone,clone.episodes,{n:Math.max(16,Math.min(60,args.size*2+3)),seed:args.seed,trace:true});
  return {outcome:{solved:r.solved,cost:r.cost}}; // this assesses adaptation on a copy, not frozen zero-shot
 }
 return runNativeEpisode(kind,restoreBrain(kind,brain.snapshot()),{...args,learn:false});
}
export function functionSamples(kind,brain,{domain='maze'}={}){
 if(kind==='cells')return brain.curve(domain);
 if(kind==='universal'){
  const samples=[];for(let i=0;i<=40;i++){
   const d=i/20-1,x=[1,...DOMAINS.map(k=>+(k===domain)),.5,.5,.5,.5,d,0,
    Math.abs(d),.2,0,.15-d/2,0,0];
   samples.push({x:d,y:brain.predict(x)});
  }return samples;
 }
 if(kind==='graph')return Array.from({length:41},(_,i)=>{
  const z=i/40;return {x:z,y:1/(1+Math.exp(-brain.w.reduce((a,w,k)=>a+w*[1,z,z*z,.3,.09,.2,.8,.4,z*.3][k],0)))};
 });
 if(kind==='dynamic')return Array.from({length:41},(_,i)=>{
  const z=i/40;return {x:z,y:clamp(brain.cost[0]+brain.cost[1]*z+brain.cost[2]*.2+brain.cost[3]*z*.2,0,8)/8};
 });
 if(kind==='causal')return Array.from({length:41},(_,i)=>{
  const v=i/40,x=[v,.5,1,0,0,...Array(18).fill(.5)];return {x:v,y:brain.predict([Math.min(6,Math.floor(v*7)),3],'amber',Array(18).fill(.5)).distribution[0][0]};
 });
 return Array.from({length:41},(_,i)=>({x:i/40,y:(kind==='v6'?brain.recon:brain.experts[0].recon).forward(Array(13).fill(i/40))}));
}
