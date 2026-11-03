import {publicInfo,sense,act,oracle,key} from './world.mjs';
import {AssociationRule,Collective} from './dance.mjs';
const f1=(pred,truth)=>{const a=new Set(pred.slice(1).map((v,i)=>key(pred[i],v))),b=new Set(truth.slice(1).map((v,i)=>key(truth[i],v)));let hits=0;for(const e of a)if(b.has(e))hits++;return a.size+b.size?2*hits/(a.size+b.size):1;};
export class Episode {
 constructor(world,rule=new AssociationRule(),options={}){
  this.world=world;this.info=publicInfo(world);this.position=world.start;
  this.collective=new Collective(this.info,rule,options);this.steps=0;this.effort=0;this.resistance=0;this.solved=this.position===this.info.goal;
  this.history=[];this.journal=[];this.used=[this.position];this.limit=world.n*6;
  this.collective.observe(sense(world,this.position));this.collective.tick(15);
  this.collective.hypothesis=this.collective.plan(this.position);
  this.initial=structuredClone(this.collective.hypothesis);
  this.initialF1=f1(this.initial.nodes,oracle(world).nodes);
  this.capture('initial');
 }
 capture(kind){const c=this.collective;
  const h=c.plan(this.position);c.hypothesis=h;
  const frame={kind,step:this.steps,position:this.position,effort:this.effort,resistance:this.resistance,
   route:h.nodes,verified:h.verified,order:+c.order.toFixed(4),localCoherence:+c.localCoherence.toFixed(4),
   phase:c.theta.map(x=>+x.toFixed(4)),signal:c.signal.map(x=>+x.toFixed(3)),known:[...c.known],
   walked:this.used.slice(),f1:+f1(h.nodes,oracle(this.world,this.position).nodes).toFixed(4)};
  this.history.push(frame);if(this.history.length>300)this.history.shift();return frame;
 }
 step(){if(this.solved)return {type:'goal'};
  if(this.steps>=this.limit)return {type:'limit'};
  const before=this.position,choice=this.collective.choose(before);
  if(!choice)return {type:'stuck'};
  const outcome=act(this.world,before,choice.to);
  if(outcome.type==='blocked')this.resistance++;
  else{this.position=outcome.position;this.effort+=outcome.cost;this.used.push(this.position);}
  const observed=this.collective.observe(sense(this.world,this.position));
  this.collective.tick(12);this.steps++;this.solved=this.position===this.info.goal;
  const frame=this.capture('action');
  const event={step:this.steps,from:before,to:this.position,type:this.solved?'goal':outcome.type,
   cost:outcome.cost,newAssociations:observed.newLinks,updates:observed.updates,
   surprise:+observed.surprise.toFixed(4),synchrony:frame.localCoherence};
  this.journal.push(event);if(this.journal.length>150)this.journal.shift();return event;
 }
 run(limit=this.limit){for(let t=0;t<limit&&!this.solved;t++){const r=this.step();if(r.type==='stuck'||r.type==='limit')break;}return this;}
 summary(){const opt=oracle(this.world);return {solved:this.solved,steps:this.steps,cost:this.effort,
  penalizedCost:this.effort+(this.solved?0:opt.cost+this.world.n*3),optimalCost:opt.cost,
  efficiency:this.solved?opt.cost/Math.max(1,this.effort):0,initialF1:this.initialF1,
  initialValid:this.initial.verified,order:this.collective.order,
  localCoherence:this.collective.localCoherence,discovered:this.collective.known.size,
  associations:this.collective.rule.updates};}
 payload({includeTruth=true}={}){const c=this.collective;
  const base={info:this.info,position:this.position,steps:this.steps,effort:this.effort,solved:this.solved,
   resistance:this.resistance,initial:this.initial,initialF1:this.initialF1,
   current:c.hypothesis,known:[...c.known],visitCount:c.visitCount,
   phase:c.theta,signal:c.signal,order:c.order,localCoherence:c.localCoherence,
   updates:c.rule.updates,history:this.history,journal:this.journal.slice(-30),summary:this.summary(),
   hypotheses:Array.from({length:this.info.n},(_,a)=>Array.from({length:this.info.n-a-1},(_,k)=>{
    const b=a+k+1,p=c.probability(a,b);return {a,b,p:+p.toFixed(3)};}).filter(e=>!c.known.has(key(e.a,e.b))&&e.p>.055)).flat()
    .sort((a,b)=>b.p-a.p).slice(0,Math.min(100,this.info.n*4))};
  if(includeTruth)base.evaluator={edges:this.world.edges.map(e=>({a:e.a,b:e.b,open:e.open,cost:e.cost})),oracle:oracle(this.world).nodes};
  return base;
 }
}
