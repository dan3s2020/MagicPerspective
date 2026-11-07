// V17 experimental local-axis graph: observations are real state/action outcomes.
// Reuses original ConstructedTransitionGraph as the evidence store.
// Signed axis permutations are a restricted, testable subgroup of O(D);
// no claim of learned continuous rotations, semantic text goals or quantum effects.
import {ConstructedTransitionGraph} from "../../transcend/torus-aether/worlds/constructed-paths.mjs";

export function identity(D){return Array.from({length:D},(_,i)=>i+1);}
export function compose(a,b) {
  // apply b first, then a: a ∘ b
  if(a.length!==b.length)throw Error("Dimension mismatch");
  return b.map(x=>Math.sign(x)*a[Math.abs(x)-1]);
}
export function inverse(frame){
  const out=Array(frame.length).fill(0);
  frame.forEach((x,i)=>{if(!x||Math.abs(x)>frame.length||out[Math.abs(x)-1])throw Error("Invalid frame");out[Math.abs(x)-1]=Math.sign(x)*(i+1);});
  return out;
}
export const apply=(frame,signedAxis)=>Math.sign(signedAxis)*frame[Math.abs(signedAxis)-1];
export const same=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
export function seeded(seed=1){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function randomFrame(D,rand){
  const indices=identity(D);
  for(let i=D-1;i>0;i--){const j=Math.floor(rand()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
  return indices.map(x=>rand()<.5?x:-x);
}
export function world({D=3,side=3,seed=11}={}){
  if(D<2||D>11||side<2||side>4||side**D>2500)throw Error("Unsupported research-world size");
  const rng=seeded(seed),size=side**D,powers=Array.from({length:D},(_,i)=>side**i);
  const coords=Array.from({length:size},(_,index)=>powers.map(p=>Math.floor(index/p)%side));
  const links=[];
  for(let u=0;u<size;u++)for(let axis=0;axis<D;axis++)if(coords[u][axis]<side-1){
    const v=u+powers[axis];links.push({u,v,axis});
  }
  const frames=coords.map((_,i)=>i===0?identity(D):randomFrame(D,rng));
  const adj=Array.from({length:size},()=>[]);
  for(const l of links){adj[l.u].push(l.v);adj[l.v].push(l.u);}
  // Root-connected spanning tree = observed sensors, all other edges HELD OUT.
  const queue=[0],seen=new Set([0]),tree=[],treeKeys=new Set();
  for(let p=0;p<queue.length;p++)for(const v of adj[queue[p]]){
    if(seen.has(v))continue;
    seen.add(v);queue.push(v);
    const u=queue[p],k=[Math.min(u,v),Math.max(u,v)].join(":");
    tree.push({u:Math.min(u,v),v:Math.max(u,v)});treeKeys.add(k);
  }
  const withheld=links.filter(({u,v})=>!treeKeys.has(u+":"+v));
  return {D,side,size,seed,coords,links,tree,withheld,frames,powers,adj};
}
export const stateView=world=>({
  D:world.D,side:world.side,size:world.size,
  coords:world.coords,links:world.links,tree:world.tree,adj:world.adj
});
export const physicalTransport=(w,u,v)=>compose(inverse(w.frames[v]),w.frames[u]);
export function physicalProbe(w,u,v,localAxis,{rng=null,error=0}={}){
  const trueResponse=apply(physicalTransport(w,u,v),localAxis);
  if(!rng||!(rng()<error))return trueResponse;
  const choices=Array.from({length:2*w.D},(_,i)=>i<w.D?i+1:-(i-w.D+1));
  return choices[Math.floor(rng()*choices.length)];
}
export class LocalAxisLearner{
  constructor(observation){
    this.w=observation;this.D=observation.D;
    this.graph=new ConstructedTransitionGraph({maxStates:observation.size*this.D*3});
    this.observed=new Map();
    this.inferred=null;
  }
  observe(u,v,axis,response){
    if(!(axis>=1&&axis<=this.D)||Math.abs(response)>this.D||!response)throw Error("Invalid measured direction");
    const key=u+":"+v;
    if(!this.observed.has(key))this.observed.set(key,{u,v});
    this.graph.observe("edge:"+key,"axis:"+axis,"response:"+response);
  }
  recover(u,v){
    const choices=this.graph.choices("edge:"+u+":"+v);
    if(choices.length!==this.D)return null;
    const result=[];
    for(let i=0;i<this.D;i++){
      const evidence=choices.find(x=>x.action==="axis:"+(i+1));
      const answer=evidence?.successors[0]?.to;
      if(!answer?.startsWith("response:"))return null;
      result.push(+answer.slice(9));
    }
    if(new Set(result.map(Math.abs)).size!==this.D)return null;
    return result;
  }
  infer(){
    const adj=Array.from({length:this.w.size},()=>[]);
    for(const {u,v} of this.observed.values()){
      const transport=this.recover(u,v);if(!transport)continue;
      adj[u].push({to:v,T:transport});adj[v].push({to:u,T:inverse(transport)});
    }
    const frames=Array(this.w.size).fill(null),queue=[0];
    frames[0]=identity(this.D);let conflicts=0;
    for(let i=0;i<queue.length;i++){
      const u=queue[i];
      for(const {to,T} of adj[u]){
        const predicted=compose(frames[u],inverse(T));
        if(frames[to]===null){frames[to]=predicted;queue.push(to);}
        else if(!same(frames[to],predicted))conflicts++;
      }
    }
    this.inferred=frames;
    return {covered:queue.length,total:frames.length,conflicts,observations:this.graph.observations};
  }
  // Full graph connectivity/coordinates are perceived overhead, exactly as
  // the V17 2D maze planner receives the maze's coordinate system.
  // Hidden world frames are never accessed here.
  predictShape(start,goal,{ablation="none"}={}){
    if(!this.inferred)this.infer();
    const parent=Array(this.w.size).fill(-1),queue=[start];parent[start]=start;
    for(let i=0;i<queue.length&&parent[goal]===-1;i++)
      for(const v of this.w.adj[queue[i]])if(parent[v]===-1){parent[v]=queue[i];queue.push(v);}
    if(parent[goal]===-1)return {ready:false,path:[],actions:[],reason:"disconnected"};
    const backwards=[goal];while(backwards.at(-1)!==start)backwards.push(parent[backwards.at(-1)]);
    const nodes=backwards.reverse(),actions=[];
    for(let i=0;i<nodes.length-1;i++){
      const u=nodes[i],v=nodes[i+1],diff=this.w.coords[u].map((q,j)=>this.w.coords[v][j]-q);
      const axis=diff.findIndex(q=>q!==0),globalDirection=Math.sign(diff[axis])*(axis+1);
      const F=ablation==="global-only"?identity(this.D):this.inferred[u];
      actions.push(F?apply(inverse(F),globalDirection):null);
    }
    return {ready:true,start,goal,nodes,actions,optimal:actions.length,
      framesKnown:actions.filter(x=>x!==null).length,
      shapePredictedBeforeFirstAction:true,
      actionGeneration:"learned-local-to-global-frame-inversion",
      graphEvidence:this.graph.observations};
  }
}
export function execute(world,plan,{record=false}={}){
  if(!plan.ready)return {solved:false,actions:0};
  let node=plan.start,correct=0;
  const trace=[];
  for(let step=0;step<plan.actions.length;step++){
    const localAction=plan.actions[step],before=node,expected=plan.nodes[step+1];
    let actualDirection=null,next=node;
    if(localAction!==null){
      actualDirection=apply(world.frames[node],localAction);
      const axis=Math.abs(actualDirection)-1,delta=Math.sign(actualDirection)*world.powers[axis];
      const coordinate=world.coords[node][axis]+Math.sign(actualDirection),candidate=node+delta;
      if(coordinate>=0&&coordinate<world.side&&world.adj[node].includes(candidate))next=candidate;
    }
    const matches=next===expected;
    correct+=+matches;node=next;
    if(record)trace.push({step,before,expected,localAction,actualDirection,after:node,matches});
    // Do not silently teleport/replan: an incorrect move can ruin the shape.
  }
  return {solved:node===plan.goal&&correct===plan.actions.length,
    exactPredictedTrajectory:correct===plan.actions.length,
    actions:plan.actions.length,correct,finalNode:node,trace:record?trace:undefined};
}
export function calibrate(world,model,{repeat=1,noise=0,seed=9123,shuffle=false}={}){
  const rng=seeded(seed);
  for(const {u,v} of world.tree){
    for(let k=1;k<=world.D;k++)for(let r=0;r<repeat;r++){
      const reading=shuffle?randomFrame(world.D,rng)[k-1]:
        physicalProbe(world,u,v,k,{rng,error:noise});
      model.observe(u,v,k,reading);
    }
  }
  return model.infer();
}
