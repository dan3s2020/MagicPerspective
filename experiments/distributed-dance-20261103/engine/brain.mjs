import {RNG,localView,publicInfo,traversal} from './world.mjs';
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
export const PAIR=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
// Trainable model of sensor -> action cost. It never receives the full world or oracle.
export class CostRule {
 constructor(seed=23){const rng=new RNG(seed);this.seed=seed;this.w=[1,1.05,.05,0].map(v=>v+(rng.next()-.5)*.15);this.updates=0;this.loss=0;}
 features(sensor){const x=Math.min(sensor,15)/10;return [1,x,x*x,Math.sin(x*2)];}
 predict(sensor){const x=this.features(sensor);return cap(this.w.reduce((s,v,i)=>s+v*x[i],0),.5,20);}
 learn(sensor,actual,rate=.05){const x=this.features(sensor),pred=this.predict(sensor),error=pred-actual;
  const gradient=cap(error,-10,10);for(let i=0;i<this.w.length;i++)this.w[i]-=rate*gradient*x[i];
  this.loss+=Math.abs(error);this.updates++;return Math.abs(error);
 }
 snapshot(){return {schema:1,seed:this.seed,w:[...this.w],updates:this.updates,loss:this.loss};}
 static restore(x){if(x?.schema!==1||!Array.isArray(x.w)||x.w.length!==4||!x.w.every(Number.isFinite))throw Error('Invalid cost rule');const r=new CostRule(x.seed);r.w=x.w.slice();r.updates=x.updates||0;r.loss=x.loss||0;return r;}
}
// Each node stores only its adjacent local links and messages it has actually received.
// The central Collective object schedules synchronous rounds for reproducibility; it does not use a global shortest-path graph.
export class Collective {
 constructor(world,rule=new CostRule(),{mode='real',messageRounds=null}={}){
  if(!['real','off','shuffled'].includes(mode))throw Error('Invalid communication mode');
  this.info=publicInfo(world);this.rule=rule;this.mode=mode;this.round=0;this.history=[];
  this.nodes=Array.from({length:world.n},(_,id)=>{
    const view=localView(world,id);return {id,links:view.links,value:id===world.goal?0:Infinity,
      theta:((id*2.399963)%(2*Math.PI))-Math.PI,signal:id===world.goal?1:0,
      received:0,parent:-1,confidence:0};
  });
  this.messageRounds=messageRounds??Math.max(12,world.n*2);
  this.current=world.start;this.steps=0;this.effort=0;this.visits=Array(world.n).fill(0);
  this.visits[this.current]=1;this.walked=[this.current];this.finished=this.current===world.goal;
  this.actualWorld=world; // Only the environment/act() uses this, never think()/exchange()/shape().
  this.lastFeedback=null;this.sample('initial');
 }
 // Messages can travel ONLY along locally known, real physical connections.
 // The negative shuffled control permutes the labels on messages, not the underlying physical topology.
 exchange(){
  const old=this.nodes.map(n=>n.value),next=old.slice(),parents=Array(this.info.n).fill(-1),confidence=Array(this.info.n).fill(0);
  const order=this.nodes.map(n=>n.id);
  // Deterministic permutation by round ensures exact reproducible negative controls.
  if(this.mode==='shuffled')order.sort((a,b)=>((a*17+this.round*11)%this.info.n)-((b*17+this.round*11)%this.info.n));
  for(const n of this.nodes){
    if(n.id===this.info.goal){next[n.id]=0;continue;}
    let best=Infinity,winner=-1;
    if(this.mode!=='off')for(const link of n.links){
      const j=link.to,received=this.mode==='shuffled'?old[order[(order.indexOf(j)+1)%order.length]]:old[j];
      if(!Number.isFinite(received))continue;
      const candidate=this.rule.predict(link.sensor)+received;
      if(candidate<best){best=candidate;winner=j;}
    }
    next[n.id]=best;parents[n.id]=winner;confidence[n.id]=Number.isFinite(best)?1:0;
  }
  for(const n of this.nodes){n.value=next[n.id];n.parent=parents[n.id];n.confidence=confidence[n.id];n.received=this.mode==='off'?0:n.links.length;}
  this.round++;
  for(const n of this.nodes){if(!Number.isFinite(n.value))continue;
    const target=Math.atan2(Math.sin(n.value*.33),Math.cos(n.value*.33));
    n.theta=Math.atan2(Math.sin(.65*n.theta+.35*target),Math.cos(.65*n.theta+.35*target));
    n.signal=1/(1+n.value);
  }
  if(this.round%2===0)this.sample('dance');
  return this.shape();
 }
 shape(from=this.current){const nodes=[from],seen=new Set(nodes);let at=from;
  for(let k=0;k<this.info.n;k++){
   if(at===this.info.goal)break;
   const parent=this.nodes[at].parent;
   if(parent<0||seen.has(parent))break;
   nodes.push(parent);seen.add(parent);at=parent;
  }
  return {nodes,connected:at===this.info.goal,complete:at===this.info.goal,steps:nodes.length-1};
 }
 // A node chooses using the value received from its neighbours; off control uses only its own geometry.
 choose(){const n=this.nodes[this.current],target=this.info.positions[this.info.goal];
   if(!n.links.length)return null;
   const dist=p=>Math.hypot(p.x-target.x,p.y-target.y);
   const options=n.links.map(e=>{
     const neighbour=this.nodes[e.to],known=Number.isFinite(neighbour.value),signalCost=known?neighbour.value:dist(this.info.positions[e.to])*15;
     const bounce=this.visits[e.to]*1.6;
     return {...e,score:this.rule.predict(e.sensor)+signalCost+bounce,
       geometric:dist(this.info.positions[e.to]),known};
   });
   if(this.mode==='off')options.forEach(e=>e.score=e.geometric*15+this.rule.predict(e.sensor)+this.visits[e.to]*1.6);
   options.sort((a,b)=>a.score-b.score||a.to-b.to);return options[0];
 }
 step({learn=false}={}){
   if(this.finished)return {type:'goal'};
   const decision=this.choose();if(!decision)return {type:'stuck'};
   const effect=traversal(this.actualWorld,this.current,decision.to);
   if(!effect.ok)throw Error('Node attempted edge outside its local view');
   const from=this.current;this.current=effect.to;this.walked.push(this.current);this.visits[this.current]++;
   this.steps++;this.effort+=effect.cost;this.finished=this.current===this.info.goal;
   const error=learn?this.rule.learn(decision.sensor,effect.cost):Math.abs(this.rule.predict(decision.sensor)-effect.cost);
   const feedback={from,to:this.current,cost:effect.cost,predicted:this.rule.predict(decision.sensor),error,learned:learn};
   this.lastFeedback=feedback;
   this.sample('move');
   return {type:this.finished?'goal':'move',...feedback};
 }
 run(maxMoves=this.info.n*6,{learn=false,rounds=this.messageRounds}={}){
   for(let i=0;i<rounds;i++)this.exchange();
   while(!this.finished&&this.steps<maxMoves){const event=this.step({learn});if(event.type==='stuck')break;
     // Re-compute messages after learned costs change.
     if(learn&&this.steps%4===0){this.nodes.forEach(n=>{n.value=n.id===this.info.goal?0:Infinity;n.parent=-1});for(let i=0;i<rounds;i++)this.exchange();}
   }
   return this;
 }
 coherence(){
   // Bellman consistency is tested against each node's OWN local neighbours, not its phase target.
   // This avoids reporting artificially perfect synchronization for shuffled messages.
   let residual=0,finite=0;
   for(const node of this.nodes){
     if(node.id===this.info.goal)continue;
     if(!Number.isFinite(node.value))continue;
     let best=Infinity;
     for(const link of node.links){const v=this.nodes[link.to].value;
       if(Number.isFinite(v))best=Math.min(best,this.rule.predict(link.sensor)+v);}
     if(Number.isFinite(best)){residual+=Math.abs(node.value-best);finite++;}
   }
   const coverage=finite/Math.max(1,this.info.n-1);
   return coverage*Math.exp(-residual/Math.max(1,finite)/6);
 }
 phaseCoherence(){
   let sum=0,count=0;for(const n of this.nodes)for(const e of n.links)if(e.to>n.id){
     const peer=this.nodes[e.to];sum+=Math.cos(n.theta-peer.theta);count++;}
   return count?sum/count:0;
 }
 sample(type){this.history.push({type,round:this.round,step:this.steps,current:this.current,
    value:this.nodes.map(n=>Number.isFinite(n.value)?+n.value.toFixed(3):null),
    phase:this.nodes.map(n=>+n.theta.toFixed(3)),parents:this.nodes.map(n=>n.parent),
    shape:this.shape().nodes,coherence:this.coherence(),phaseCoherence:this.phaseCoherence(),walked:this.walked.slice(),effort:this.effort});
   if(this.history.length>450)this.history.splice(0,this.history.length-450);
 }
 payload({truth=false}={}){const info={...this.info},nodes=this.nodes.map(n=>({id:n.id,links:n.links.map(l=>({to:l.to,sensor:l.sensor})),value:Number.isFinite(n.value)?+n.value.toFixed(3):null,
  phase:+n.theta.toFixed(3),signal:+n.signal.toFixed(3),parent:n.parent,received:n.received}));
   const data={info,nodes,round:this.round,current:this.current,steps:this.steps,effort:this.effort,solved:this.finished,
      walked:this.walked,shape:this.shape(),coherence:+this.coherence().toFixed(4),phaseCoherence:+this.phaseCoherence().toFixed(4),history:this.history.slice(-450),lastFeedback:this.lastFeedback};
   if(truth)data.evaluator={edges:this.actualWorld.links.map(l=>({a:l.a,b:l.b,cost:l.cost})),oracle:null};
   return data;
 }
}
