// Distributed Graph Dance: learned pair-association rule and local Kuramoto messages.
// No method in this module accepts the hidden world or the evaluator's optimal route.
import {RNG,key} from './world.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=x=>1/(1+Math.exp(-clamp(x,-30,30)));
const wrap=t=>Math.atan2(Math.sin(t),Math.cos(t));
const distance=(p,a,b)=>Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y);
export function pairFeatures(info,a,b){const n=info.n,d=distance(info.positions,a,b),span=Math.abs(a-b)/n;
 return [1,d,d*d,span,span*span,Math.min(a,b)/n,Math.max(a,b)/n,Math.abs(Math.log((a+1)/(b+1))),d*span];}
export class AssociationRule {
 constructor(seed=19){const rng=new RNG(seed);this.seed=seed;this.w=[-1.8,-3,.3,-1.0,.1,0,0,.1,-.3].map(v=>v+(rng.next()-.5)*.12);this.updates=0;this.samples=0;this.episodes=0;}
 probability(info,a,b){const x=pairFeatures(info,a,b);return clamp(sigmoid(this.w.reduce((s,w,i)=>s+w*x[i],0)),.005,.995);}
 observe(info,a,b,target,rate=.012){const x=pairFeatures(info,a,b),p=this.probability(info,a,b),err=p-(target?1:0);
  // Weighted SGD uses local pair labels only. No global graph supervision.
  const scale=target?2.5:1;for(let i=0;i<this.w.length;i++)this.w[i]-=rate*scale*err*x[i];
  this.updates++;this.samples++;return Math.abs(p-(target?1:0));}
 snapshot(){return {schema:7,seed:this.seed,w:[...this.w],updates:this.updates,samples:this.samples,episodes:this.episodes};}
 static restore(v){if(v?.schema!==7||!Array.isArray(v.w)||v.w.length!==9||!v.w.every(Number.isFinite))throw Error('Invalid V7 rule checkpoint');
  const a=new AssociationRule(v.seed);a.w=v.w.slice();a.updates=v.updates||0;a.samples=v.samples||0;a.episodes=v.episodes||0;return a;}
}
export class Collective {
 constructor(info,rule=new AssociationRule(),{dance=true,online=true}={}){
  this.info=info;this.rule=rule;this.dance=dance;this.online=online;
  this.known=new Map(); // -2 absent, 0 blocked, 1 usable; only revealed by local visits.
  this.cost=new Map();this.visited=new Set();this.visitCount=Array(info.n).fill(0);
  this.theta=Array.from({length:info.n},(_,i)=>wrap((i*2.399963+info.start*.39)% (Math.PI*2)));
  this.theta[info.goal]=0;this.signal=Array(info.n).fill(0);this.order=0;this.localCoherence=0;
  this.tickCount=0;this.hypothesis={nodes:[info.start],score:0,verified:false};this.lastError=0;this.lastDelta=0;
 }
 observe(observation){const node=observation.node,links=new Map(observation.links.map(l=>[l.to,l]));
  this.visited.add(node);this.visitCount[node]++;
  let surprise=0,updates=0,newLinks=0;
  for(let b=0;b<this.info.n;b++)if(b!==node){const k=key(node,b),link=links.get(b),target=link?.open?1:0;
   if(!this.known.has(k)){
    const guess=this.rule.probability(this.info,node,b);surprise+=Math.abs(guess-target);
    if(this.online){this.rule.observe(this.info,node,b,target);updates++;}
    this.known.set(k,link?link.open?1:0:-2);
    if(link?.open)this.cost.set(k,link.cost);
    newLinks++;
   }
  }
  this.lastError=newLinks?surprise/newLinks:0;this.lastDelta=updates;return {node,newLinks,surprise:this.lastError,updates};
 }
 probability(a,b){const observed=this.known.get(key(a,b));return observed===1?1:observed!==undefined?0:this.rule.probability(this.info,a,b);}
 edgeCost(a,b){const p=this.probability(a,b);if(p<=0)return Infinity;
  const actual=this.cost.get(key(a,b));const base=actual??2;
  // Penalize uncertain invented links; phases influence the imagined path, not physical truth.
  const phase=this.dance?(.8*(1-Math.cos(this.theta[a]-this.theta[b]))):0;
  return base+2.4*(-Math.log(Math.max(.005,p)))+phase;
 }
 tick(steps=1){const n=this.info.n;
  for(let t=0;t<steps;t++){
   const next=this.theta.slice(),nextSignal=this.signal.slice();this.signal[this.info.goal]=1;nextSignal[this.info.goal]=1;
   for(let i=0;i<n;i++)if(i!==this.info.goal){let sum=0,weight=0,signal=0;
    // Actual message passing happens ONLY on discovered open links.
    for(let j=0;j<n;j++)if(j!==i&&this.known.get(key(i,j))===1){
     const w=1/Math.max(1,this.cost.get(key(i,j))??1);
     sum+=w*Math.sin(this.theta[j]-this.theta[i]);weight+=w;
     signal=Math.max(signal,this.signal[j]*.9);
    }
    if(this.dance&&weight>0)next[i]=wrap(this.theta[i]+.22*sum/weight);
    nextSignal[i]=Math.max(this.signal[i]*.96,signal);
   }
   next[this.info.goal]=0;if(this.dance)this.theta=next;this.signal=nextSignal;
   this.tickCount++;
  }
  const sin=this.theta.reduce((s,v)=>s+Math.sin(v),0)/n,cos=this.theta.reduce((s,v)=>s+Math.cos(v),0)/n;
  this.order=Math.hypot(sin,cos);
  let links=0,sum=0;for(const [k,v] of this.known)if(v===1){const [a,b]=k.split(':').map(Number);sum+=Math.cos(this.theta[a]-this.theta[b]);links++;}
  this.localCoherence=links?sum/links:0;
  return this.order;
 }
 // Potential is a learned, imaginary graph. It is NOT a broadcast from unknown physical links.
 plan(from){const n=this.info.n,dist=Array(n).fill(Infinity),prev=Array(n).fill(-1),used=Array(n).fill(false);dist[from]=0;
  for(let t=0;t<n;t++){let u=-1;for(let i=0;i<n;i++)if(!used[i]&&(u<0||dist[i]<dist[u]))u=i;
   if(u<0||!Number.isFinite(dist[u])||u===this.info.goal)break;used[u]=true;
   for(let j=0;j<n;j++)if(j!==u){const p=this.probability(u,j);if(p<.015)continue;
    const cost=this.edgeCost(u,j)+.25*distance(this.info.positions,u,j);
    if(dist[j]>dist[u]+cost){dist[j]=dist[u]+cost;prev[j]=u;}}
  }
  const nodes=[this.info.goal];if(!Number.isFinite(dist[this.info.goal]))return {nodes:[from],score:Infinity,verified:false};
  for(let node=this.info.goal;node!==from;){node=prev[node];if(node<0)return {nodes:[from],score:Infinity,verified:false};nodes.push(node);}
  nodes.reverse();return {nodes,score:dist[this.info.goal],verified:nodes.every((x,i)=>i===0||this.known.get(key(nodes[i-1],x))===1)};
 }
 // Every actual action is a discovered local edge, never a speculative teleport.
 choose(from){const neighbors=[];
  for(let j=0;j<this.info.n;j++)if(j!==from&&this.known.get(key(from,j))===1){
   const plan=this.plan(j),progress=distance(this.info.positions,from,this.info.goal)-distance(this.info.positions,j,this.info.goal);
   const explored=this.visitCount[j],h=plan.score;
   const future=Number.isFinite(h)?h:1000;
   const score=(this.cost.get(key(from,j))??2)+future+.9*explored+.4*(1-progress)-.25*this.signal[j];
   neighbors.push({to:j,score,plan:plan.nodes});
  }
  neighbors.sort((a,b)=>a.score-b.score||a.to-b.to);
  return neighbors.length?neighbors[0]:null;
 }
 snapshot(){return {info:this.info,known:[...this.known],cost:[...this.cost],visited:[...this.visited],visitCount:[...this.visitCount],theta:[...this.theta],signal:[...this.signal],order:this.order,localCoherence:this.localCoherence,tickCount:this.tickCount,hypothesis:this.hypothesis};}
}
