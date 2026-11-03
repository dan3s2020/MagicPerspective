// V5 organs. Everything here receives ONLY the public scaffold (spec), the organism's belief and its position.
// Hidden walls, true costs and the teacher path never enter these functions.
//
//  belief B_t (memory of every revealed relation)
//      │
//      ├─ PASS ORGAN (learned, self-supervised): p(relation is passable | local context)        → fills unknown parts of the map
//      ├─ PERSPECTIVE FIELD: internal distances from self and from goal under 3 attitudes λ
//      │      (optimistic λ=0, balanced λ=1.5, cautious λ=4 toward unknown relations)            → internal geometry
//      ├─ SHAPE ORGAN (learned, teacher-trained offline): q(relation ∈ solution | perspective)   → probability cloud of the whole solution
//      └─ DECODER: most probable connected route through the cloud (Dijkstra on −log q)          → the predicted line
import {MLP} from './nn.mjs';
export const LAMBDAS=[0,1.5,4];
export const PASS_INPUTS=17,SHAPE_INPUTS=16;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const adjCache=new WeakMap();
export function scaffoldAdjacency(spec){let a=adjCache.get(spec);if(a)return a;
  a=Array.from({length:spec.nodes},()=>[]);for(const e of spec.links){a[e.a].push({to:e.b,id:e.id});a[e.b].push({to:e.a,id:e.id});}
  adjCache.set(spec,a);return a;}
class Heap{constructor(){this.k=[];this.v=[];}
  push(key,val){const k=this.k,v=this.v;let i=k.length;k.push(key);v.push(val);while(i>0){const p=(i-1)>>1;if(k[p]<=key)break;k[i]=k[p];v[i]=v[p];i=p;}k[i]=key;v[i]=val;}
  pop(){const k=this.k,v=this.v,topK=k[0],topV=v[0],lk=k.pop(),lv=v.pop();if(k.length){let i=0;const n=k.length;
    while(true){let c=2*i+1;if(c>=n)break;if(c+1<n&&k[c+1]<k[c])c++;if(k[c]>=lk)break;k[i]=k[c];v[i]=v[c];i=c;}k[i]=lk;v[i]=lv;}return [topK,topV];}
  get size(){return this.k.length;}}
// Dijkstra over non-closed relations with a caller-supplied cost per relation.
export function dijkstra(spec,belief,from,edgeCost,target=-1){
  const adj=scaffoldAdjacency(spec),n=spec.nodes,dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),prevEdge=new Int32Array(n).fill(-1),h=new Heap();
  dist[from]=0;h.push(0,from);
  while(h.size){const [d,u]=h.pop();if(d>dist[u])continue;if(u===target)break;
    for(const {to,id} of adj[u]){if(belief.status[id]===0)continue;const c=edgeCost[id];if(!Number.isFinite(c))continue;const nd=d+c;if(nd<dist[to]){dist[to]=nd;prev[to]=u;prevEdge[to]=id;h.push(nd,to);}}}
  return {dist,prev,prevEdge};
}
export function tracePath(res,from,to){if(!Number.isFinite(res.dist[to]))return null;const nodes=[to],edges=[];let at=to;
  while(at!==from){edges.push(res.prevEdge[at]);at=res.prev[at];if(at<0)return null;nodes.push(at);}return {nodes:nodes.reverse(),edges:edges.reverse()};}
function hopsFromObserved(spec,belief){const adj=scaffoldAdjacency(spec),hop=new Int32Array(spec.nodes).fill(99),q=[];
  for(let i=0;i<spec.nodes;i++)if(belief.observed[i]){hop[i]=0;q.push(i);}
  for(let k=0;k<q.length;k++)for(const {to} of adj[q[k]])if(hop[to]===99){hop[to]=hop[q[k]]+1;q.push(to);}return hop;}
// Local context of each node as currently believed: known open, known closed, unknown incident relations.
export function contextOf(spec,belief){const adj=scaffoldAdjacency(spec),stats=adj.map(list=>{let ko=0,kc=0,ku=0;
    for(const {id} of list){const s=belief.status[id];if(s===1)ko++;else if(s===0)kc++;else ku++;}return {ko,kc,ku,deg:Math.max(1,list.length)};});
  let open=0,known=0,costSum=0,costN=0;for(let i=0;i<belief.status.length;i++){if(belief.status[i]!==-1){known++;if(belief.status[i]===1){open++;if(belief.cost[i]>0){costSum+=belief.cost[i];costN++;}}}}
  return {stats,twins:twinsOf(spec),hop:hopsFromObserved(spec,belief),baseRate:(open+1)/(known+2),meanCost:costN?costSum/costN:2};}
// Analogy between slices: relations of the same orientation translated by 1 or 2 layout steps.
// On a regular lattice the organism can learn "relations that look like this one, elsewhere, were open/closed".
// On an irregular network nothing matches and the features stay empty (count 0); nothing is world-specific.
const twinCache=new WeakMap();
export function twinsOf(spec){let t=twinCache.get(spec);if(t)return t;const n=spec.size,key=new Map(),mid=spec.links.map(e=>{
    const a=spec.layout[e.a],b=spec.layout[e.b],x=(a.x+b.x)*n,y=(a.y+b.y)*n;
    return Math.abs(x-Math.round(x))<1e-6&&Math.abs(y-Math.round(y))<1e-6?[Math.round(x),Math.round(y)]:null;});
  spec.links.forEach((e,i)=>{if(mid[i])key.set(mid[i].join(','),i);});
  const pick=offs=>spec.links.map((e,i)=>!mid[i]?[]:offs.map(([dx,dy])=>key.get((mid[i][0]+2*dx)+','+(mid[i][1]+2*dy))).filter(j=>j!==undefined&&j!==i));
  t={ring1:pick([[1,0],[-1,0],[0,1],[0,-1]]),ring2:pick([[2,0],[-2,0],[0,2],[0,-2]])};twinCache.set(spec,t);return t;}
function twinRate(list,belief){let o=0,k=0;for(const j of list){const s=belief.status[j];if(s!==-1){k++;o+=s;}}return [k?o/k:.5,k/4];}
export function passFeatures(spec,belief,ctx,link){
  let A=ctx.stats[link.a],B=ctx.stats[link.b],oa=belief.observed[link.a]?1:0,ob=belief.observed[link.b]?1:0;
  if(B.kc/B.deg>A.kc/A.deg){[A,B]=[B,A];[oa,ob]=[ob,oa];}
  return [1,A.ko/A.deg,A.kc/A.deg,A.ku/A.deg,oa,B.ko/B.deg,B.kc/B.deg,B.ku/B.deg,ob,
    Math.min(ctx.hop[link.a],ctx.hop[link.b],6)/6,ctx.baseRate,Math.min(A.deg,8)/8,Math.min(B.deg,8)/8,
    ...twinRate(ctx.twins.ring1[link.id],belief),...twinRate(ctx.twins.ring2[link.id],belief)];}
export class Organ{
  constructor(seed=17){this.pass=new MLP(PASS_INPUTS,16,seed*31+1,{lr:.004});this.shape=new MLP(SHAPE_INPUTS,24,seed*31+2,{lr:.003});this.episodes=0;this.seed=seed;}
  // Complete perception → perspective → shape → route, before any action is taken.
  perceive(spec,belief,position,{mode='organ'}={}){
    const L=spec.links.length,ctx=contextOf(spec,belief),pass=new Float64Array(L),estCost=new Float64Array(L),passX=new Array(L);
    for(const link of spec.links){const s=belief.status[link.id];
      if(s===1){pass[link.id]=1;estCost[link.id]=belief.cost[link.id]>0?belief.cost[link.id]:ctx.meanCost;}
      else if(s===0){pass[link.id]=0;estCost[link.id]=Infinity;}
      else{passX[link.id]=passFeatures(spec,belief,ctx,link);pass[link.id]=mode==='classic'?1:clip(this.pass.forward(passX[link.id]),.01,.995);estCost[link.id]=ctx.meanCost;}}
    if(position===spec.goal)return {q:new Float64Array(L),pass,route:{nodes:[position],edges:[]},X:[],passX,ctx,views:[],mode};
    // Internal geometry under several attitudes toward the unknown.
    const views=(mode==='classic'?[0]:LAMBDAS).map(lambda=>{const c=new Float64Array(L);
      for(let i=0;i<L;i++)c[i]=belief.status[i]===-1?estCost[i]+lambda*(-Math.log(pass[i])):estCost[i];
      const fromSelf=dijkstra(spec,belief,position,c),fromGoal=dijkstra(spec,belief,spec.goal,c);
      return {lambda,cost:c,ds:fromSelf.dist,dg:fromGoal.dist,best:fromSelf.dist[spec.goal],fromSelf};});
    const q=new Float64Array(L),X=new Array(L);
    if(mode==='classic'){ // NO shape organ: free-space planner, a single hard line, no cloud.
      const path=tracePath(views[0].fromSelf,position,spec.goal);for(const id of path?.edges??[])q[id]=1;
      return {q,pass,route:path??{nodes:[position],edges:[]},X,passX,ctx,views:views.map(v=>({lambda:v.lambda,best:v.best})),mode};}
    const base=views[0];
    for(const link of spec.links){const id=link.id;if(belief.status[id]===0)continue;
      const f=[1,belief.status[id]===-1?1:0,pass[id],Math.min(estCost[id],4)/4];
      for(const v of views){const via=Math.min(v.ds[link.a]+v.cost[id]+v.dg[link.b],v.ds[link.b]+v.cost[id]+v.dg[link.a]);
        const s=Number.isFinite(via)&&Number.isFinite(v.best)?Math.max(0,via-v.best)/(v.best+1):3;f.push(Math.exp(-4*s),Math.min(s,2)/2);}
      const near=Math.min(base.dg[link.a],base.dg[link.b]),far=Math.min(base.ds[link.a],base.ds[link.b]);
      f.push(Math.min(near/(base.best+1),2)/2,Math.min(far/(base.best+1),2)/2,
        belief.visits[link.a]||belief.visits[link.b]?1:0,link.a===position||link.b===position?1:0,link.a===spec.goal||link.b===spec.goal?1:0,
        Math.min(ctx.hop[link.a],ctx.hop[link.b],6)/6);
      X[id]=f;q[id]=this.shape.forward(f);}
    // Decoder: the most probable connected route through the learned cloud.
    const dc=new Float64Array(L);for(let i=0;i<L;i++)dc[i]=-Math.log(clip(q[i],.002,.999))+.02*(Number.isFinite(estCost[i])?estCost[i]:0);
    const route=tracePath(dijkstra(spec,belief,position,dc,spec.goal),position,spec.goal)??{nodes:[position],edges:[]};
    return {q,pass,route,X,passX,ctx,views:views.map(v=>({lambda:v.lambda,best:+v.best.toFixed(3)})),mode};
  }
  // Self-supervised: relations revealed by the 3x3 window are the truth for the pass organ. No teacher.
  learnPass(samples){return samples.length?this.pass.trainBatch(samples):0;}
  // Teacher-supervised (offline training only): the evaluator's optimal route is the target cloud.
  learnShape(perception,targetEdges,posWeight=3){const target=new Set(targetEdges),batch=[];
    for(let i=0;i<perception.X.length;i++){const x=perception.X[i];if(!x)continue;const y=target.has(i)?1:0;batch.push({x,y,w:y?posWeight:1});}
    return this.shape.trainBatch(batch);}
  snapshot(){return {schema:5,seed:this.seed,episodes:this.episodes,pass:this.pass.snapshot(),shape:this.shape.snapshot()};}
  static restore(s){if(!s||s.schema!==5)throw Error('Incompatible V5 checkpoint');const o=new Organ(s.seed||17);
    o.pass=MLP.restore(s.pass);o.shape=MLP.restore(s.shape);if(o.pass.I!==PASS_INPUTS||o.shape.I!==SHAPE_INPUTS)throw Error('V5 checkpoint feature mismatch');o.episodes=s.episodes||0;return o;}
}
