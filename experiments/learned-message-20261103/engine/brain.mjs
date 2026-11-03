// MagicPerspective — learned local message aggregation (research, not a general intelligence claim).
// No oracle or global route is available to exchange(), features(), or optimizeMessages().
import {RNG,localView,publicInfo,traversal} from './world.mjs';
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=x=>1/(1+Math.exp(-cap(x,-25,25)));
export const PAIR=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export class CostRule {
 constructor(seed=23){const rng=new RNG(seed);this.seed=seed;
  this.w=[1,1.05,.05,0].map(v=>v+(rng.next()-.5)*.15);this.updates=0;this.loss=0;
  // The actual message transformation AND aggregation have trainable parameters.
  this.messageW=Array.from({length:12},()=> (rng.next()-.5)*.035);
  this.messageUpdates=0;this.messageLoss=0;
 }
 features(sensor){const x=Math.min(sensor,15)/10;return [1,x,x*x,Math.sin(x*2)];}
 predict(sensor){const x=this.features(sensor);return cap(this.w.reduce((s,v,i)=>s+v*x[i],0),.5,20);}
 learn(sensor,actual,rate=.05){const x=this.features(sensor),pred=this.predict(sensor),err=pred-actual;
  for(let i=0;i<this.w.length;i++)this.w[i]-=rate*cap(err,-10,10)*x[i];
  this.loss+=Math.abs(err);this.updates++;return Math.abs(err);
 }
 // The local neighbor's value is a MESSAGE, not a global shortest-path label.
 localFeatures(node,neighbor,link,received,info){
  const source=info.positions[node.id],target=info.positions[info.goal],p=info.positions[neighbor.id];
  const dst=Math.hypot(source.x-target.x,source.y-target.y),nextDst=Math.hypot(p.x-target.x,p.y-target.y);
  const x=Math.min(15,link.sensor)/10;
  const sensorMean=node.links.reduce((sum,l)=>sum+l.sensor,0)/Math.max(1,node.links.length);
  return [1,x,x*x,cap(received/30,0,2),node.links.length/14,neighbor.links.length/14,
   cap((nextDst-dst)*3,-1,1),cap(link.sensor/Math.max(.01,sensorMean)-1,-2,2)];
 }
 correction(features){let z=0;for(let i=0;i<8;i++)z+=this.messageW[i]*features[i];return 2.2*Math.tanh(z);}
 attention(features){return this.messageW[8]*features[1]+this.messageW[9]*features[6];}
 temperature(){return cap(.28+1.5*sigmoid(this.messageW[10]),.15,2);}
 damping(){return cap(.3+.69*sigmoid(this.messageW[11]+2),.3,.99);}
 snapshot(){return {schema:2,seed:this.seed,w:[...this.w],messageW:[...this.messageW],updates:this.updates,
  loss:this.loss,messageUpdates:this.messageUpdates,messageLoss:this.messageLoss};}
 static restore(v){if(v?.schema!==2||!Array.isArray(v.w)||v.w.length!==4||!v.w.every(Number.isFinite)
  ||!Array.isArray(v.messageW)||v.messageW.length!==12||!v.messageW.every(Number.isFinite))throw Error('Invalid V2 learned-message checkpoint');
  const model=new CostRule(v.seed);model.w=v.w.slice();model.messageW=v.messageW.slice();
  model.updates=v.updates||0;model.loss=v.loss||0;model.messageUpdates=v.messageUpdates||0;model.messageLoss=v.messageLoss||0;return model;
 }
}
export class Collective {
 constructor(world,rule=new CostRule(),{mode='learned',messageRounds=null}={}){
  if(!['learned','bellman','off','shuffled','untrained'].includes(mode))throw Error('Invalid communication mode');
  this.info=publicInfo(world);this.rule=rule;this.mode=mode;this.round=0;this.history=[];
  this.nodes=Array.from({length:world.n},(_,id)=>{
   const view=localView(world,id);return {id,links:view.links,value:id===world.goal?0:Infinity,
    theta:((id*2.399963)%(2*Math.PI))-Math.PI,signal:id===world.goal?1:0,
    received:0,parent:-1,confidence:0};
  });
  this.messageRounds=messageRounds??Math.max(16,world.n*3);
  this.current=world.start;this.steps=0;this.effort=0;this.visits=Array(world.n).fill(0);
  this.visits[this.current]=1;this.walked=[this.current];this.finished=this.current===world.goal;
  this.actualWorld=world; // Only step() may pass this to traversal().
  this.actualSteps=[];this.lastFeedback=null;this.sample('initial');
 }
 exchange(){
  const old=this.nodes.map(n=>n.value),next=old.slice(),parents=Array(this.info.n).fill(-1),confidence=Array(this.info.n).fill(0);
  const order=this.nodes.map(n=>n.id);
  if(this.mode==='shuffled')order.sort((a,b)=>((a*17+this.round*11)%this.info.n)-((b*17+this.round*11)%this.info.n));
  for(const n of this.nodes){
   if(n.id===this.info.goal){next[n.id]=0;continue;}
   const candidates=[];
   if(this.mode!=='off')for(const link of n.links){
    const j=link.to,received=this.mode==='shuffled'?old[order[(order.indexOf(j)+1)%order.length]]:old[j];
    if(!Number.isFinite(received))continue;
    const features=this.rule.localFeatures(n,this.nodes[j],link,received,this.info);
    const candidate=cap(this.rule.predict(link.sensor)+received+
      (this.mode==='learned'?this.rule.correction(features):0),.1,1e6);
    const attention=this.mode==='learned'?this.rule.attention(features):0;
    candidates.push({candidate,attention,j});
   }
   if(!candidates.length)continue;
   if(this.mode!=='learned'){
    candidates.sort((a,b)=>a.candidate-b.candidate||a.j-b.j);
    next[n.id]=candidates[0].candidate;parents[n.id]=candidates[0].j;confidence[n.id]=1;
   }else{
    // Learned soft-min aggregation with learned message corrections, attention and damping.
    const tau=this.rule.temperature(),min=Math.min(...candidates.map(c=>c.candidate));
    const weights=candidates.map(c=>Math.exp(-cap((c.candidate-min)/tau-c.attention,-30,30)));
    const denominator=weights.reduce((a,b)=>a+b,0);
    const newValue=candidates.reduce((sum,c,k)=>sum+c.candidate*weights[k],0)/denominator;
    const winner=weights.indexOf(Math.max(...weights)),damping=this.rule.damping();
    next[n.id]=Number.isFinite(old[n.id])?damping*newValue+(1-damping)*old[n.id]:newValue;
    parents[n.id]=candidates[winner].j;confidence[n.id]=weights[winner]/denominator;
   }
  }
  for(const n of this.nodes){n.value=next[n.id];n.parent=parents[n.id];n.confidence=confidence[n.id];n.received=this.mode==='off'?0:n.links.length;}
  this.round++;
  for(const n of this.nodes){if(!Number.isFinite(n.value))continue;
   const target=Math.atan2(Math.sin(n.value*.33),Math.cos(n.value*.33));
   n.theta=Math.atan2(Math.sin(.65*n.theta+.35*target),Math.cos(.65*n.theta+.35*target));n.signal=1/(1+n.value);
  }
  if(this.round%2===0)this.sample('dance');return this.shape();
 }
 shape(from=this.current){const nodes=[from],seen=new Set(nodes);let at=from;
  for(let k=0;k<this.info.n;k++){
   if(at===this.info.goal)break;const parent=this.nodes[at].parent;
   if(parent<0||seen.has(parent))break;nodes.push(parent);seen.add(parent);at=parent;
  }
  return {nodes,connected:at===this.info.goal,complete:at===this.info.goal,steps:nodes.length-1};
 }
 choose(){const n=this.nodes[this.current],target=this.info.positions[this.info.goal];
  if(!n.links.length)return null;
  const dist=p=>Math.hypot(p.x-target.x,p.y-target.y);
  const options=n.links.map(e=>{
    const neighbour=this.nodes[e.to],known=Number.isFinite(neighbour.value);
    const h=known?neighbour.value:dist(this.info.positions[e.to])*15;
    const f=this.rule.localFeatures(n,neighbour,e,h,this.info);
    const correction=this.mode==='learned'?this.rule.correction(f):0;
    const score=this.rule.predict(e.sensor)+h+correction+this.visits[e.to]*1.6;
    return {...e,score,geometric:dist(this.info.positions[e.to]),known};
  });
  if(this.mode==='off')options.forEach(e=>e.score=e.geometric*15+this.rule.predict(e.sensor)+this.visits[e.to]*1.6);
  options.sort((a,b)=>a.score-b.score||a.to-b.to);return options[0];
 }
 step({learn=false}={}){
  if(this.finished)return {type:'goal'};
  const chosen=this.choose();if(!chosen)return {type:'stuck'};
  const result=traversal(this.actualWorld,this.current,chosen.to);
  if(!result.ok)throw Error('Agent tried an edge outside its local view');
  const from=this.current,predicted=this.rule.predict(chosen.sensor);
  this.current=result.to;this.walked.push(this.current);this.visits[this.current]++;
  this.steps++;this.effort+=result.cost;this.finished=this.current===this.info.goal;
  this.actualSteps.push({from,to:result.to,cost:result.cost,sensor:chosen.sensor});
  const err=learn?this.rule.learn(chosen.sensor,result.cost):Math.abs(predicted-result.cost);
  this.lastFeedback={from,to:this.current,cost:result.cost,predicted,error:err,learned:learn};
  this.sample('move');return {type:this.finished?'goal':'move',...this.lastFeedback};
 }
 run(maxMoves=this.info.n*6,{learn=false,rounds=this.messageRounds}={}){
  for(let i=0;i<rounds;i++)this.exchange();this.sample('ready');
  while(!this.finished&&this.steps<maxMoves){const event=this.step({learn});if(event.type==='stuck')break;
   if(learn&&this.steps%4===0){this.resetField();for(let i=0;i<rounds;i++)this.exchange();}
  }return this;
 }
 resetField(){for(const n of this.nodes){n.value=n.id===this.info.goal?0:Infinity;n.parent=-1;}}
 // Trajectory-only learning: these targets come from actual executed moves, NOT oracle paths.
 observedReturns(){
  if(!this.finished)return new Map();
  const observed=new Map([[this.info.goal,0]]);let remaining=0;
  for(let i=this.actualSteps.length-1;i>=0;i--){const s=this.actualSteps[i];remaining+=s.cost;
   observed.set(s.from,Math.min(observed.get(s.from)??Infinity,remaining));}
  return observed;
 }
 coherence(){let residual=0,finite=0;
  for(const n of this.nodes){if(n.id===this.info.goal||!Number.isFinite(n.value))continue;
   let best=Infinity;for(const l of n.links){const v=this.nodes[l.to].value;if(Number.isFinite(v))best=Math.min(best,this.rule.predict(l.sensor)+v);}
   if(Number.isFinite(best)){residual+=Math.abs(n.value-best);finite++;}
  }return finite/Math.max(1,this.info.n-1)*Math.exp(-residual/Math.max(1,finite)/6);
 }
 phaseCoherence(){let sum=0,k=0;for(const n of this.nodes)for(const e of n.links)if(e.to>n.id){sum+=Math.cos(n.theta-this.nodes[e.to].theta);k++;}return k?sum/k:0;}
 sample(type){this.history.push({type,round:this.round,step:this.steps,current:this.current,
  value:this.nodes.map(n=>Number.isFinite(n.value)?+n.value.toFixed(3):null),
  phase:this.nodes.map(n=>+n.theta.toFixed(3)),parents:this.nodes.map(n=>n.parent),
  shape:this.shape().nodes,coherence:this.coherence(),phaseCoherence:this.phaseCoherence(),walked:this.walked.slice(),effort:this.effort});
  if(this.history.length>450)this.history.splice(0,this.history.length-450);
 }
 payload({truth=false}={}){const info={...this.info},nodes=this.nodes.map(n=>({id:n.id,links:n.links.map(l=>({to:l.to,sensor:l.sensor})),
  value:Number.isFinite(n.value)?+n.value.toFixed(3):null,phase:+n.theta.toFixed(3),signal:+n.signal.toFixed(3),
  parent:n.parent,received:n.received,confidence:+n.confidence.toFixed(4)}));
  const data={mode:this.mode,info,nodes,round:this.round,current:this.current,steps:this.steps,effort:this.effort,solved:this.finished,
   walked:this.walked,shape:this.shape(),coherence:+this.coherence().toFixed(4),phaseCoherence:+this.phaseCoherence().toFixed(4),
   history:this.history.slice(-450),lastFeedback:this.lastFeedback};
  if(truth)data.evaluator={edges:this.actualWorld.links.map(l=>({a:l.a,b:l.b,cost:l.cost})),oracle:null};
  return data;
 }
}
