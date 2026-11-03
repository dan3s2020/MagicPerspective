import {RNG,dist,localView,publicInfo,traversal,evolve,intervene,oracle} from './world.mjs';
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=x=>1/(1+Math.exp(-cap(x,-25,25)));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
export class MessageBrain {
 constructor(seed=33){const r=new RNG(seed);this.seed=seed;
  const noise=()=>.03*(r.next()-.5);
  // These parameters change HOW received messages are weighted and updated.
  this.cost=[1.2,.95,.4,0].map(x=>x+noise());
  this.score=[.1,-.9,-.3].map(x=>x+noise()); // trust, volatility, disagreement
  this.gate=[.1,.4,-.2].map(x=>x+noise()); // local update confidence, disagreement
  this.temperature=2.2;this.bias=0;this.costUpdates=0;this.ruleUpdates=0;
  this.costLoss=0;this.ruleLoss=0;this.episodes=0;
 }
 costFeatures(link){const s=cap(link.sensor,0,30)/10;return [1,s,link.vol,s*link.vol];}
 predictCost(link){return cap(dot(this.cost,this.costFeatures(link))*4,1,35);}
 learnCost(link,actual,rate=.012){const x=this.costFeatures(link),prediction=this.predictCost(link),error=prediction-actual;
  const clipped=cap(error,-15,15);for(let i=0;i<this.cost.length;i++)this.cost[i]-=rate*clipped*x[i];
  this.costLoss+=Math.abs(error);this.costUpdates++;return Math.abs(error);
 }
 // A shared differentiable attention-and-gate node message operation.
 aggregate(node,oldValues,mode='learned',permutation=null){
  const candidates=[];
  for(const edge of node.links){if(!edge.open)continue;
   const destination=mode==='shuffled'&&permutation?permutation[edge.to]:edge.to;
   const value=oldValues[destination];if(!Number.isFinite(value))continue;
   const q=this.predictCost(edge)+value;
   const feature=[1,edge.vol,cap(Math.abs(node.value-value)/30,0,3)];
   candidates.push({q,to:edge.to,feature});
  }
  if(!candidates.length)return {value:Infinity,parent:-1,details:null};
  if(mode==='bellman'){
   candidates.sort((a,b)=>a.q-b.q||a.to-b.to);
   return {value:candidates[0].q,parent:candidates[0].to,details:null};
  }
  const temp=cap(this.temperature,.2,15),scores=candidates.map(c=>-c.q/temp+dot(this.score,c.feature));
  const high=Math.max(...scores),probs=scores.map(s=>Math.exp(cap(s-high,-35,0))),den=probs.reduce((a,b)=>a+b,0);
  const weights=probs.map(p=>p/den),aggregate=candidates.reduce((s,c,i)=>s+weights[i]*c.q,0);
  const old=Number.isFinite(node.value)?node.value:aggregate;
  const disagreement=cap(Math.abs(old-aggregate)/30,0,3),conf=1/(1+disagreement);
  const gateFeatures=[1,conf,disagreement];const gate=sigmoid(dot(this.gate,gateFeatures));
  const value=cap((gate*aggregate+(1-gate)*old)+this.bias,0,10000);
  const ordered=candidates.map((c,i)=>({...c,w:weights[i]})).sort((a,b)=>b.w-a.w||a.q-b.q);
  return {value,parent:ordered[0].to,details:{gate,gateFeatures,old,aggregate,weights,entries:candidates,raw:value}};
 }
 // Supervision is realized cost-to-go from a path physically traversed, NOT the evaluator oracle.
 learnReturn(details,target,rate=.0008){if(!details||!Number.isFinite(target))return 0;
  const pred=details.raw,error=cap(pred-target,-100,100);const {gate,gateFeatures,old,aggregate,weights,entries}=details;
  const dGate=error*(aggregate-old)*gate*(1-gate);
  for(let i=0;i<this.gate.length;i++)this.gate[i]=cap(this.gate[i]-rate*dGate*gateFeatures[i],-5,5);
  // Derivative of softmax-weighted expected neighbour proposal wrt score parameters.
  for(let j=0;j<this.score.length;j++){
   let derivative=0;for(let k=0;k<entries.length;k++)derivative+=weights[k]*(entries[k].q-aggregate)*entries[k].feature[j];
   this.score[j]=cap(this.score[j]-rate*error*gate*derivative,-5,5);
  }
  this.bias=cap(this.bias-rate*error,-10,10);
  // Temperature learned using a differentiable finite-difference probe of same local input.
  const t=this.temperature,delta=.03;
  const outcome=T=>{const z=entries.map(c=>-c.q/T+dot(this.score,c.feature));const peak=Math.max(...z);
   const exp=z.map(s=>Math.exp(cap(s-peak,-35,0))),sum=exp.reduce((a,b)=>a+b,0);
   return exp.reduce((s,v,i)=>s+(v/sum)*entries[i].q,0);};
  const derivative=(outcome(cap(t+delta,.2,15))-outcome(cap(t-delta,.2,15)))/(2*delta);
  this.temperature=cap(t-rate*error*gate*derivative,.25,12);
  this.ruleLoss+=Math.abs(error);this.ruleUpdates++;return Math.abs(error);
 }
 snapshot(){return {schema:2,seed:this.seed,cost:[...this.cost],score:[...this.score],gate:[...this.gate],temperature:this.temperature,bias:this.bias,
  costUpdates:this.costUpdates,ruleUpdates:this.ruleUpdates,costLoss:this.costLoss,ruleLoss:this.ruleLoss,episodes:this.episodes};}
 static restore(o){if(o?.schema!==2||!Array.isArray(o.cost)||o.cost.length!==4||!Array.isArray(o.score)||o.score.length!==3||!Array.isArray(o.gate)||o.gate.length!==3)throw Error('Invalid brain snapshot');
  const all=[...o.cost,...o.score,...o.gate,o.temperature,o.bias];if(!all.every(Number.isFinite))throw Error('Non-finite brain weights');
  const b=new MessageBrain(o.seed);for(const k of ['cost','score','gate'])b[k]=o[k].slice();
  for(const k of ['temperature','bias','costUpdates','ruleUpdates','costLoss','ruleLoss','episodes'])b[k]=o[k]??b[k];return b;}
}
export class Collective {
 constructor(world,brain=new MessageBrain(),{mode='learned',online=false}={}){
  if(!['learned','bellman','off','shuffled'].includes(mode))throw Error('Invalid mode');
  this.environment=world;this.info=publicInfo(world);this.brain=brain;this.mode=mode;this.online=online;
  this.nodes=Array.from({length:world.n},(_,id)=>{const view=localView(world,id);
   return {id,links:view.links,value:id===world.goal?0:Infinity,parent:-1,phase:0,signal:0,received:0,details:null,age:0};});
  this.current=world.start;this.steps=0;this.effort=0;this.solved=world.start===world.goal;
  this.round=0;this.changes=0;this.surprise=0;this.visits=Array(world.n).fill(0);this.visits[this.current]++;
  this.walked=[this.current];this.events=[];this.frames=[];this.choices=[];
  this.snapshot('initial');
 }
 // No access to this.environment in exchange or shape. Each node reads only its local neighbours.
 exchange(rounds=1){for(let step=0;step<rounds;step++){
  const old=this.nodes.map(n=>n.value),newValues=old.slice();
  // A real deterministic permutation (without duplicate recipients), used only for the negative control.
  const permutation=this.mode==='shuffled'?this.nodes.map(n=>n.id):null;
  if(permutation){const rng=new RNG((this.round*8191+this.info.n*53+17)>>>0);
   for(let i=permutation.length-1;i>0;i--){const j=rng.int(i+1);[permutation[i],permutation[j]]=[permutation[j],permutation[i]];}}
  for(const node of this.nodes){if(node.id===this.info.goal){node.parent=-1;node.value=0;continue;}
   if(this.mode==='off')continue;
   const p=this.brain.aggregate(node,old,this.mode,permutation);newValues[node.id]=p.value;node.parent=p.parent;node.details=p.details;node.received++;
  }
  for(const node of this.nodes){node.value=newValues[node.id];const v=node.value;
   node.phase=Number.isFinite(v)?Math.atan2(Math.sin(v*.13),Math.cos(v*.13)):0;
   node.signal=Number.isFinite(v)?1/(1+v):0;
  }
  this.round++;
 }this.snapshot('message');return this.shape();}
 shape(from=this.current){const path=[from],seen=new Set(path);let cursor=from;
  for(let i=0;i<this.info.n;i++){
   if(cursor===this.info.goal)break;
   const parent=this.nodes[cursor].parent;
   if(parent<0||seen.has(parent)||!this.nodes[cursor].links.some(e=>e.to===parent&&e.open))break;
   path.push(parent);seen.add(parent);cursor=parent;
  }
  return {nodes:path,connected:cursor===this.info.goal,steps:path.length-1,confidence:Number.isFinite(this.nodes[from].value)?1/(1+this.nodes[from].value):0};
 }
 choose(){const node=this.nodes[this.current];const options=node.links.filter(e=>e.open);
  if(!options.length)return null;
  const goalPos=this.info.positions[this.info.goal];
  const scored=options.map(edge=>{
   const neighbour=this.nodes[edge.to],p=this.info.positions[edge.to],distance=dist(p,goalPos);
   const value=Number.isFinite(neighbour.value)?neighbour.value:distance*100;
   const heuristic=this.mode==='off'?distance*100:value;
   return {edge,score:this.brain.predictCost(edge)+heuristic+this.visits[edge.to]*2.2};
  });scored.sort((a,b)=>a.score-b.score||a.edge.to-b.edge.to);return scored[0].edge;
 }
 // Endpoint-only update after physical changes; other nodes learn through messages, not a broadcast.
 refreshEndpoints(endpoints){for(const id of endpoints){const view=localView(this.environment,id),node=this.nodes[id];
    node.links=view.links;node.age=0;
   }this.changes+=endpoints.length;
 }
 intervention(){
  const before=this.shape(),result=intervene(this.environment,before.nodes);
  this.refreshEndpoints(result.endpoints);
  this.nodes.forEach(node=>{node.value=node.id===this.info.goal?0:Infinity;node.parent=-1;});
  this.exchange(this.info.n*2);
  const after=this.shape();const event={type:'intervention',step:this.steps,edge:result.edge,change:result.type,oldRoute:before.nodes,newRoute:after.nodes};
  this.events.push(event);if(this.events.length>120)this.events.shift();this.snapshot('intervention');
  return event;
 }
 action({evolveEvery=4}={}){
  if(this.solved||this.steps>=this.info.n*5)return {type:this.solved?'goal':'limit'};
  // The network changes BEFORE the next decision. Only touched endpoints get updated sensors.
  let mutation=null;
  if(evolveEvery>0&&this.steps>0&&this.steps%evolveEvery===0){mutation=evolve(this.environment,this.steps);this.refreshEndpoints(mutation.endpoints);this.exchange(2*this.info.n);}
  const from=this.current,choice=this.choose();if(!choice)return {type:'stuck'};
  const predicted=this.brain.predictCost(choice),result=traversal(this.environment,from,choice.to);
  if(!result.ok){this.refreshEndpoints([from]);this.surprise++;this.steps++;this.exchange(this.info.n);this.events.push({type:'blocked',from,to:choice.to,step:this.steps,change:mutation});this.snapshot('blocked');return {type:'blocked'};}
  this.current=result.to;this.steps++;this.visits[this.current]++;this.walked.push(this.current);this.effort+=result.cost;
  this.choices.push({from,to:result.to,cost:result.cost,sensor:choice.sensor,vol:choice.vol,details:this.nodes[from].details});
  const discrepancy=Math.abs(predicted-result.cost);this.surprise+=discrepancy;
  if(this.online)this.brain.learnCost(choice,result.cost);
  this.solved=this.current===this.info.goal;
  if(this.online)this.exchange(this.info.n);else if(mutation)this.exchange(this.info.n);
  const record={type:this.solved?'goal':'move',step:this.steps,from,to:this.current,cost:result.cost,predicted:+predicted.toFixed(2),surprise:+discrepancy.toFixed(2),changed:mutation?.changed||0};
  this.events.push(record);if(this.events.length>120)this.events.shift();this.snapshot('action');return record;
 }
 // Credit assignment exclusively to the physically experienced trajectory.
 learnTrajectory(){if(!this.solved||!this.choices.length)return 0;
  let remaining=0,loss=0;for(let i=this.choices.length-1;i>=0;i--){const c=this.choices[i];remaining+=c.cost;
   // Read-only local message inputs saved at decision time; no oracle knowledge.
   if(c.details)loss+=this.brain.learnReturn(c.details,remaining);
  }return loss;
 }
 run({dynamic=true,maxMoves=this.info.n*5,learn=this.online}={}){
  this.exchange(this.info.n*2);this.initialShape=this.shape();
  while(!this.solved&&this.steps<maxMoves){const result=this.action({evolveEvery:dynamic?1:0});if(['stuck','limit'].includes(result.type))break;}
  if(learn)this.learnTrajectory();return this;
 }
 snapshot(type){const f={type,round:this.round,step:this.steps,current:this.current,effort:+this.effort.toFixed(2),
  shape:this.shape().nodes,connected:this.shape().connected,values:this.nodes.map(n=>Number.isFinite(n.value)?+n.value.toFixed(2):null),
  phase:this.nodes.map(n=>+n.phase.toFixed(2)),parents:this.nodes.map(n=>n.parent),walked:this.walked.slice(),changes:this.changes};
  this.frames.push(f);if(this.frames.length>180)this.frames.shift();return f;
 }
 payload({truth=true}={}){const out={info:this.info,mode:this.mode,position:this.current,steps:this.steps,effort:this.effort,solved:this.solved,
  round:this.round,changes:this.changes,surprise:+this.surprise.toFixed(3),shape:this.shape(),initialShape:this.initialShape||null,
  nodes:this.nodes.map(n=>({id:n.id,links:n.links.map(l=>({to:l.to,open:l.open,sensor:l.sensor,vol:l.vol})),
    value:Number.isFinite(n.value)?+n.value.toFixed(2):null,parent:n.parent,phase:+n.phase.toFixed(2),signal:+n.signal.toFixed(3)})),
  frames:this.frames.slice(-110),events:this.events.slice(-25),walked:this.walked};
  if(truth)out.evaluator={links:this.environment.links.map(e=>({a:e.a,b:e.b,open:e.open,cost:e.actual})),oracle:oracle(this.environment).route};
  return out;
 }
}
