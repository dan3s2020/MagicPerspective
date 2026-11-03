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
import {CausalNet} from '../../causal-text/engine/model.mjs';
import {buildExperience} from '../../causal-text/engine/training.mjs';
import {createWorld as makeSymbolic,generateTask,TOOLS,senseProbes,encodeContext} from '../../causal-text/engine/world.mjs';
import {MLP} from '../../../v7/engine/nn.mjs';

export const KINDS=['universal','v7','v6','graph','dynamic','causal'];
export const DOMAINS=['maze','network','text'];
export const INPUT=16;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seedOf=(seed,n)=>((seed>>>0)+Math.imul(n>>>0,7919))>>>0;
const RNG=s=>{let v=(s>>>0)||1;return ()=>{v^=v<<13;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296}};
const mean=a=>a.length?a.reduce((p,c)=>p+c,0)/a.length:0;
export function makeBrain(kind='universal',seed=19){
 switch(kind){
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
  updates:kind==='universal'?brain.net.updates:kind==='v7'?brain.experts.reduce((n,e)=>n+e.recon.updates+e.doubt.updates,0):
   kind==='v6'?brain.recon.updates+brain.doubt.updates:
   kind==='graph'?brain.updates:kind==='dynamic'?brain.costUpdates+brain.ruleUpdates:brain.steps,
  samples:kind==='universal'?brain.samples:brain.samples??brain.costUpdates??0,
  weights:kind==='universal'?{W1:s.net.W1,b1:s.net.b1,W2:s.net.W2,b2:s.net.b2}:kind==='v7'?
   {W1:s.experts[0].recon.W1,b1:s.experts[0].recon.b1,W2:s.experts[0].recon.W2,b2:s.experts[0].recon.b2}:
   kind==='v6'?{W1:s.recon.W1,b1:s.recon.b1,W2:s.recon.W2,b2:s.recon.b2}:
   kind==='graph'?{W1:s.w,b1:[],W2:[],b2:[]}:kind==='dynamic'?
   {W1:s.cost,b1:s.score,W2:s.gate,b2:[s.bias,s.temperature]}:
   {W1:s.w1,b1:s.b1,W2:s.w2,b2:s.b2},
  architecture:kind==='universal'?'16 → 24 → 1 • shared across domains':
   kind==='v7'?'3 specialists × 13 → {24,16} → 1':kind==='v6'?'13 → {24,16} → 1':
   kind==='graph'?'9 learned edge associations':
   kind==='dynamic'?'4 cost + 3 attention + 3 gate + 2':
   '23 → 64 → 14 (two 7-way heads)'};
}
export class SharedBrain{
 constructor(seed=19){this.schema=1;this.seed=seed;this.net=new MLP(INPUT,24,seed,{lr:.003});
  this.episodes=0;this.samples=0;this.domainCounts={maze:0,network:0,text:0};}
 predict(x){return this.net.forward(x)}
 hidden(x){return Array.from(this.net.hiddenOf(x))}
 learn(trajectory,solved){
  // Monte-Carlo return targets from ACTUAL executed actions, never a teacher's plan.
  const samples=[];for(let i=0;i<trajectory.length;i++){
   const future=trajectory.length-i-1;
   const positive=solved?.9*Math.pow(.94,future):.05;
   samples.push({x:trajectory[i].features,y:positive,w:1});
  }
  this.samples+=samples.length;return samples.length?this.net.trainBatch(samples):null;
 }
 snapshot(){return {schema:1,seed:this.seed,episodes:this.episodes,samples:this.samples,
  domainCounts:{...this.domainCounts},net:this.net.snapshot()}}
 static restore(s){if(s?.schema!==1||!s.net||s.net.I!==INPUT||s.net.H!==24)
   throw Error('Incompatible SharedBrain checkpoint');
  const b=new SharedBrain(s.seed);b.net=MLP.restore(s.net);b.episodes=s.episodes||0;
  b.samples=s.samples||0;b.domainCounts={...b.domainCounts,...s.domainCounts};return b}
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
   truth,visited:Array(n*n).fill(0),walked:[w.start],observed:new Map(),world:w,
   activeState:()=>w.start,limit:n*n};
 }
 if(domain==='network'){
  const w=makeGraph(seed,Math.max(13,Math.min(65,size*2+3)),['local','hierarchical','mixed'][seed%3]);
  return {domain,seed,start:w.start,goal:w.goal,current:w.start,positions:w.positions,
   truth:w.edges.filter(e=>e.open).map(e=>({a:e.a,b:e.b})),visited:Array(w.n).fill(0),
   walked:[w.start],observed:new Map(),world:w,limit:w.n*4};
 }
 if(domain==='text'){
  const w=makeSymbolic(seed),task=generateTask(w,seed+77,{minSteps:2,maxSteps:5});
  const start=symbolicNode(task.start),goal=symbolicNode(task.goal);
  return {domain,seed,start,goal,current:start,positions:positionsForSymbolic(),
   truth:[],visited:Array(49).fill(0),walked:[start],observed:new Map(),world:w,
   text:task.text,limit:15};
 }
 throw Error('Unknown domain');
}
function options(ep){
 if(ep.domain==='maze'){
  const p=ep.current,n=ep.world.n;
  const s=terrainSense(ep.world,p); // 3×3 local window is the ONLY maze terrain input.
  const heights=new Map(s.window.map(x=>[x.i,x.h]));
  const next=[p%n>0?p-1:-1,p%n<n-1?p+1:-1,p>=n?p-n:-1,p<n*(n-1)?p+n:-1];
  return next.map((to,action)=>({to,action,cost:heights.has(to)?1+8*heights.get(to):2}))
   .filter(x=>x.to>=0&&heights.get(x.to)<=.82);
 }
 if(ep.domain==='network'){
  const sensed=graphSense(ep.world,ep.current);
  return sensed.links.filter(x=>x.open).map((x,i)=>({to:x.to,action:i%5,cost:x.cost}));
 }
 return TOOLS.map((tool,action)=>({tool,to:null,action,cost:2}));
}
function observedList(ep){return [...ep.observed.entries()].map(([key,e])=>({a:e.a,b:e.b,open:true}))}
export function runSharedEpisode(brain,{domain='maze',seed=123,size=11,learn=true,explore=.18}={}){
 if(!(brain instanceof SharedBrain))throw Error('Expected SharedBrain');
 const ep=createEpisode(domain,seed,size),rand=RNG(seed^brain.seed^0x1ca1);
 const trajectory=[],frames=[],scorePath=[];
 let cost=0,solved=ep.current===ep.goal,blocked=0;
 const capture=({action=null,activation=null,score=null}={})=>{
  const last=ep.walked.slice(-40);
  frames.push({step:trajectory.length,current:ep.current,walked:last,
   learnedEdges:observedList(ep).slice(-250),action,activation,score,cost,solved});
 };
 ep.visited[ep.current]++;capture();
 for(let t=0;t<ep.limit&&!solved;t++){
  const candidates=options(ep);if(!candidates.length)break;
  const rated=candidates.map(c=>{
   const x=features(domain,ep.positions,ep.current,ep.goal,c.action,c.to,c.cost,ep.visited,c.to==null);
   const neural=brain.predict(x);
   const h=ep.domain==='text'?0:clamp((posDistance(ep.positions[ep.current],ep.positions[ep.goal])-
        posDistance(ep.positions[c.to],ep.positions[ep.goal])), -1,1);
   const revisit=ep.visited[c.to??ep.current]||0;
   return {...c,features:x,neural,utility:neural+.15*h-.025*revisit-.012*c.cost};
  });
  rated.sort((a,b)=>b.utility-a.utility||a.action-b.action);
  const select=learn&&rand()<explore?rated[Math.floor(rand()*rated.length)]:rated[0];
  let to,stepCost=select.cost;
  if(domain==='text'){
   const previous=[Math.floor(ep.current/7),ep.current%7],event=ep.world.intervene(previous,select.tool);
   to=symbolicNode(event.to);stepCost=1;
  }else if(domain==='network'){
   const outcome=graphAct(ep.world,ep.current,select.to);to=outcome.position;stepCost=outcome.cost;
  }else to=select.to;
  if(to===ep.current)blocked++;
  const previous=ep.current;ep.current=to;
  ep.visited[to]++;ep.walked.push(to);cost+=stepCost;
  ep.observed.set(previous+':'+to,{a:previous,b:to});
  trajectory.push({features:select.features,score:select.neural,action:select.tool??select.action,
   from:previous,to,domain});
  solved=ep.current===ep.goal;
  capture({action:select.tool??select.action,activation:brain.hidden(select.features),
   score:select.neural});
 }
 const loss=learn?brain.learn(trajectory,solved):null;
 if(learn){brain.episodes++;brain.domainCounts[domain]++;}
 const trimmed=frames.length<=96?frames:frames.filter((_,i)=>i%Math.ceil(frames.length/96)===0||i===frames.length-1);
 return {
  meta:{domain,seed,kind:'universal',text:ep.text||null,start:ep.start,goal:ep.goal,
   positions:ep.positions,truth:ep.truth,learnerInput:'Only local observations and known goal'},
  outcome:{solved,steps:trajectory.length,cost,blocked,loss,domain,
   observedEdges:ep.observed.size},frames:trimmed,trajectory,
  lastInput:trajectory.at(-1)?.features||Array(INPUT).fill(0)
 };
}
export function runNativeEpisode(kind,brain,{seed=1,size=11,learn=true}={}){
 if(kind==='v7'||kind==='v6'){
  const domain=(seed%2===0?'maze':'relief'),w=makeTerrain(seed,domain,size%2?size:11);
  const ep=new TerrainEpisode(w,brain,{mode:'organ',online:learn,record:true,imagine:4});
  ep.run();if(learn)brain.episodes++;
  const summary=ep.summary();
  return {meta:{domain,kind,seed,text:null,start:w.start,goal:w.goal,
   positions:positionsForMaze(w.n),truth:Array.from(w.h,(h,i)=>({i,h}))},
   outcome:{solved:summary.solved,steps:summary.steps,cost:summary.effort,
    loss:null,match:summary.match0},frames:ep.frames.slice(-70),lastInput:null};
 }
 if(kind==='graph'){
  const w=makeGraph(seed,Math.max(13,Math.min(65,size*2+3)),['local','hierarchical','mixed'][seed%3]);
  const ep=new GraphEpisode(w,brain,{online:learn,dance:true});ep.run();
  if(learn)brain.episodes++;
  const summary=ep.summary();
  return {meta:{kind,domain:'network',seed,start:w.start,goal:w.goal,positions:w.positions,
   truth:w.edges.filter(e=>e.open).map(x=>({a:x.a,b:x.b}))},
   outcome:{solved:summary.solved,steps:summary.steps,cost:summary.cost,
    loss:ep.collective.lastError,match:summary.initialF1},
   frames:ep.history.slice(-70),lastInput:null};
 }
 if(kind==='dynamic'){
  const r=trainMessages(brain,brain.episodes,{n:Math.max(16,Math.min(60,size*2+3)),seed,trace:true});
  if(!learn)throw Error('Dynamic native evaluation requires a frozen snapshot');
  return {meta:{kind,domain:'network',seed:r.live.seed,start:r.live.info.start,goal:r.live.info.goal,
   positions:r.live.info.positions,truth:r.live.initialTruth.links,
   text:null},outcome:{solved:r.solved,steps:r.live.outcome.steps,cost:r.cost,
   loss:r.ruleMAE,match:r.live.initialF1},frames:r.live.frames,lastInput:null};
 }
 if(kind==='causal'){
  const w=makeSymbolic(seed),data=buildExperience(w,seed^0x1919,5);
  const before=data.samples.map(sample=>brain.forward(sample.input).p);
  const loss=learn?brain.trainBatch(data.samples):null;
  if(learn)brain.episodes++;
  const task=generateTask(w,seed+77,{minSteps:2,maxSteps:5});
  let current=task.start.slice(),cost=0;const frames=[],visited=[],known=[];
  for(const action of TOOLS){
   const event=w.intervene(current,action);
   const from=symbolicNode(current),to=symbolicNode(event.to);
   visited.push(from,to);known.push({a:from,b:to});
   frames.push({step:frames.length+1,current:to,walked:visited.slice(),learnedEdges:known.slice(),
    score:brain.predict(current,action,data.context)?.confidence?.[0]??null});
   current=event.to;cost++;
  }
  return {meta:{kind,domain:'text',seed,text:task.text,start:symbolicNode(task.start),
   goal:symbolicNode(task.goal),positions:positionsForSymbolic(),truth:[]},
   outcome:{solved:current[0]===task.goal[0]&&current[1]===task.goal[1],steps:cost,cost,loss,
    observed:data.samples.length},frames,lastInput:null};
 }
 throw Error('Invalid native brain kind');
}
export function oneEpisode(kind,brain,args){
 return kind==='universal'?runSharedEpisode(brain,args):runNativeEpisode(kind,brain,args);
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
 const applicable=kind==='universal'?domains:
  kind==='v7'||kind==='v6'?['maze','relief']:kind==='causal'?['text']:['network'];
 for(const domain of applicable){
  let wins=0,baseWins=0,cost=0,baseCost=0,attempts=0;
  for(let i=0;i<count;i++){
   const n=seedOf(seed,1000*i+DOMAINS.indexOf(domain)+2);
   // Native V7 alternates maze/relief deterministically; require a seed parity matching domain.
   const actualSeed=(kind==='v7'||kind==='v6')?((n&~1)+(domain==='relief'?1:0)):n;
   const a=kind==='universal'?runSharedEpisode(trained,{domain,seed:actualSeed,size,learn:false,explore:0}):
     nativeTrial(kind,trained,{seed:actualSeed,size});
   const b=kind==='universal'?runSharedEpisode(base,{domain,seed:actualSeed,size,learn:false,explore:0}):
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
