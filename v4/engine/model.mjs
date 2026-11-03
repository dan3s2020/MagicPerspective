import {RNG} from './world.mjs';
const I=16,H=20;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sigmoid=x=>x>=0?1/(1+Math.exp(-Math.min(x,30))):Math.exp(Math.max(x,-30))/(1+Math.exp(Math.max(x,-30)));
export const N_INPUTS=I;
export function skeletonDistances(spec){const distances=Array(spec.nodes).fill(Infinity);distances[spec.goal]=0;const adj=Array.from({length:spec.nodes},()=>[]);
  for(const e of spec.links){adj[e.a].push(e.b);adj[e.b].push(e.a);}const queue=[spec.goal];for(let k=0;k<queue.length;k++)for(const j of adj[queue[k]])if(!Number.isFinite(distances[j])){distances[j]=distances[queue[k]]+1;queue.push(j);}return distances;
}
export function features(spec,belief,from,edge,distances,weights,step=0){
  const target=edge.a===from?edge.b:edge.a;
  if(edge.a!==from&&edge.b!==from)throw Error('Edge not incident to action origin');
  let degreeFrom=0,degreeTo=0;for(const e of spec.links){if(e.a===from||e.b===from)degreeFrom++;if(e.a===target||e.b===target)degreeTo++;}
  const dFrom=Number.isFinite(distances[from])?distances[from]:spec.nodes;
  const dTo=Number.isFinite(distances[target])?distances[target]:spec.nodes;
  const status=belief.status[edge.id],knownCost=belief.cost[edge.id];
  return [1,(dFrom-dTo)/3,Math.min(dFrom,20)/20,Math.min(dTo,20)/20,
    target===spec.goal?1:0,status===1?1:0,status===0?1:0,status===-1?1:0,
    knownCost>=0?knownCost/4:0,Math.min(degreeFrom,12)/12,Math.min(degreeTo,12)/12,
    Math.min(belief.visits[from],5)/5,Math.min(belief.visits[target],5)/5,
    weights[0],spec.kind==='graph'?1:0,Math.min(step,100)/100];
}
export class WorldNet {
  constructor(seed=17){const rng=new RNG(seed);this.hidden=H;this.input=I;this.w=new Float64Array(I*H);this.b=new Float64Array(H);
    this.head={pass:new Float64Array(H),cost:new Float64Array(H),policy:new Float64Array(H)};
    this.bias={pass:.7,cost:-.7,policy:-1};for(let k=0;k<H;k++){
      for(let j=0;j<I;j++)this.w[k*I+j]=(rng.next()*2-1)*Math.sqrt(2/I);
      for(const type of Object.keys(this.head))this.head[type][k]=(rng.next()*2-1)*.15;
    }
    this.episodes=0;this.updates=0;this.sensorUpdates=0;this.actionUpdates=0;this.teacherUpdates=0;
  }
  forward(x){if(x.length!==I||!x.every(Number.isFinite))throw Error('Bad frozen input');
    const h=new Float64Array(H);for(let k=0;k<H;k++){let v=this.b[k];for(let j=0;j<I;j++)v+=this.w[k*I+j]*x[j];h[k]=Math.tanh(v);}
    const out={h};for(const name of Object.keys(this.head)){let z=this.bias[name];for(let k=0;k<H;k++)z+=this.head[name][k]*h[k];out[name]=sigmoid(z);}
    return out;
  }
  update(x,name,target,rate=.025,origin='sensor'){
    if(!['pass','cost','policy'].includes(name)||!Number.isFinite(target)||target<0||target>1)throw Error('Bad training target');
    const res=this.forward(x),pred=res[name],delta=clamp(pred-target,-1,1),head=this.head[name],old=Float64Array.from(head);
    for(let k=0;k<H;k++)head[k]-=rate*delta*res.h[k];this.bias[name]-=rate*delta;
    for(let k=0;k<H;k++){const g=rate*delta*old[k]*(1-res.h[k]*res.h[k]);this.b[k]-=g;for(let j=0;j<I;j++)this.w[k*I+j]-=g*x[j];}
    this.updates++;if(origin==='teacher')this.teacherUpdates++;else if(origin==='action')this.actionUpdates++;else this.sensorUpdates++;
    return {before:pred,after:this.forward(x)[name],error:Math.abs(pred-target)};
  }
  // At inference an observed edge is a fact, not a probability.
  predict(spec,belief,from,edge,distances,weights,step=0){const v=this.forward(features(spec,belief,from,edge,distances,weights,step));
    return {pass:belief.status[edge.id]===-1?v.pass:belief.status[edge.id]===1?1:0,
      cost:belief.cost[edge.id]>=0?belief.cost[edge.id]:.6+3.3*v.cost,policy:v.policy,
      uncertain:belief.status[edge.id]===-1};
  }
  snapshot(){return {schema:4,seedless:true,input:I,hidden:H,w:Array.from(this.w),b:Array.from(this.b),head:Object.fromEntries(Object.entries(this.head).map(([k,v])=>[k,Array.from(v)])),bias:{...this.bias},episodes:this.episodes,updates:this.updates,sensorUpdates:this.sensorUpdates,actionUpdates:this.actionUpdates,teacherUpdates:this.teacherUpdates};}
  static restore(data){if(!data||data.schema!==4||data.input!==I||data.hidden!==H||data.w?.length!==I*H||data.b?.length!==H)throw Error('Incompatible V4 checkpoint');
    const m=new WorldNet();m.w=Float64Array.from(data.w);m.b=Float64Array.from(data.b);
    for(const k of Object.keys(m.head)){if(data.head?.[k]?.length!==H)throw Error('Invalid head');m.head[k]=Float64Array.from(data.head[k]);m.bias[k]=data.bias[k];}
    for(const key of ['episodes','updates','sensorUpdates','actionUpdates','teacherUpdates'])m[key]=data[key]||0;return m;}
}
