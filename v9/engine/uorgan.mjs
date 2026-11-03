// V9 universal organism. One brain for every network of states.
//   PERCEPTION   — each visited state: its own actions exactly + its horizon on EACH action (3 bands × 4 readings)
//   PARLIAMENT   — K small organs ("voters") that learned from different slices of experience. Each one imagines every
//                  unseen action: does it work? what does it cost? They disagree — the disagreement IS the doubt.
//   DANCE        — phases + the goal's wave, pushed through seen actions and through imagined ones by belief.
//   DREAMS       — instead of one statistical average, the organism HALLUCINATES whole possible worlds: in each dream a
//                  random voter speaks, chaos noise (a "mood" for the whole dream + local currents that flow along the network)
//                  bends its beliefs, every unseen action is decided open/closed. It plans in each dream.
//                  The dreamed worlds then judge the proposed routes (the one best on average across dreams is taken).
//                  Temperature (how wild the dreams are) rises after surprises, falls after confirmations.
//   DEMOCRACY    — the OctopusV2 A11 temporal democracy, ported unchanged (see ./democracy/): voter i owns horizon i,
//                  the i-th unseen action ahead on the route; all commit simultaneously, choose solo/invite themselves,
//                  coalitions need bilateral consent, and the world pays each one for its own horizon (convex team bonus).
// Learning: only from what a visited state reveals. No teacher, no map.
import {MLP} from './nn.mjs';
import {RNG} from './world.mjs';
import {adjacency,bandsBeyond,shortestPath,UBANDS} from './graphs.mjs';
import {HorizonDemocracy} from './democracy/horizon.mjs';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x)),logit=p=>Math.log(p/(1-p)),sig=x=>1/(1+Math.exp(-x));
export const U_FEATURES=20,VOTERS=5;
export function uMemory(spec){const L=spec.links.length;
  return {spec,adj:adjacency(spec.n,spec.links),status:new Int8Array(L).fill(-1),cost:new Float64Array(L),visits:new Uint16Array(spec.n),seen:new Uint8Array(spec.n),
    cover:Array.from({length:L},()=>[]),theta:Float64Array.from({length:spec.n},(_,i)=>i===spec.goal?0:((i*2.399963+spec.start*.39)%(2*Math.PI))),amp:new Float64Array(spec.n),belief:null};}
export function uRemember(mem,obs){const revealed=[];mem.seen[obs.position]=1;mem.visits[obs.position]++;
  for(const w of obs.window){if(mem.status[w.id]===-1)revealed.push(w.id);mem.status[w.id]=w.open;mem.cost[w.id]=w.cost??0;}
  for(const dir of obs.horizon)bandsBeyond(mem.adj,obs.position,dir.to).forEach((ids,k)=>{for(const id of ids)mem.cover[id].push([k,...dir.bands[k]]);});
  return revealed;}
export function uDance(mem,iters=8){const {spec,adj,status,theta,amp,cover}=mem,belief=mem.belief,seed=new Float64Array(spec.n);
  for(let i=0;i<spec.n;i++){let s=0;for(const {id} of adj[i])for(const c of cover[id])s=Math.max(s,c[4]*(1-.15*c[0]));seed[i]=s;}seed[spec.goal]=1;
  const w=id=>status[id]===1?1:status[id]===0?0:belief?belief[id]:.5;
  for(let t=0;t<iters;t++){const nt=Float64Array.from(theta),na=Float64Array.from(amp);
    for(let i=0;i<spec.n;i++){if(i===spec.goal)continue;let s=0,ws=0,best=0;
      for(const {to,id} of adj[i]){const k=w(id);if(!k)continue;s+=k*Math.sin(theta[to]-theta[i]);ws+=k;best=Math.max(best,k*amp[to]);}
      if(ws)nt[i]=theta[i]+.35*s/ws;na[i]=Math.max(seed[i],.85*best,amp[i]*.9);}
    theta.set(nt);amp.set(na);theta[spec.goal]=0;amp[spec.goal]=1;}
  let c=0,k=0;for(let id=0;id<status.length;id++)if(status[id]===1){const l=spec.links[id];c+=Math.cos(theta[l.a]-theta[l.b]);k++;}return k?c/k:0;}
// Only graph facts: no coordinates, no indices, no world names.
export function uFeatures(mem,id,ctx,useDance=true){const {spec,status,cover,adj,theta,amp}=mem,l=spec.links[id];
  let best=null,minMax=1,sumBl=0,maxSig=0,sumDeg=0;for(const c of cover[id]){if(!best||c[0]<best[0])best=c;minMax=Math.min(minMax,c[1]);sumBl+=c[2];maxSig=Math.max(maxSig,c[4]);sumDeg+=c[3];}
  const near=x=>{let o=0,cl=0;for(const {id:j} of adj[x]){if(status[j]===1)o++;else if(status[j]===0)cl++;}return [o/adj[x].length,cl/adj[x].length];};
  const [oa,ca]=near(l.a),[ob,cb]=near(l.b),k=cover[id].length;
  return [1,k?1:0,best?best[0]/(UBANDS.length-1):1,best?best[1]:.5,best?best[2]:.5,best?best[4]:0,k?minMax:.5,k?sumBl/k:.5,k?sumDeg/k:.5,maxSig,
    Math.min((adj[l.a].length+adj[l.b].length)/16,1),oa,ob,ca,cb,
    useDance?(1+Math.cos(theta[l.a]))/2:0,useDance?(1+Math.cos(theta[l.b]))/2:0,useDance?Math.max(amp[l.a],amp[l.b]):0,ctx[0],ctx[1]];}
// Chaos field: a mood for the whole dream plus currents that spread along the network (correlated, not white noise).
function chaosField(mem,rng,T){const {spec,adj}=mem,v=Float64Array.from({length:spec.n},()=>(rng.next()*2-1));
  for(let t=0;t<3;t++){const nv=Float64Array.from(v);for(let i=0;i<spec.n;i++){let s=v[i],c=1;for(const {to} of adj[i]){s+=v[to];c++;}nv[i]=s/c;}v.set(nv);}
  const mood=(rng.next()*2-1)*T*.8;return id=>{const l=spec.links[id];return mood+T*2.2*(v[l.a]+v[l.b]);};}
export class UOrganism{
  constructor(seed=17,{voters=VOTERS}={}){this.seed=seed;this.kind='v9';this.voters=Array.from({length:voters},(_,k)=>({pass:new MLP(U_FEATURES,20,seed*101+k*7+1,{lr:.004}),cost:new MLP(U_FEATURES,12,seed*101+k*7+2,{lr:.004})}));
    this.rng=new RNG(seed*977+3);this.democracy=new HorizonDemocracy({organisms:voters,seed:seed*13+20261031});this.episodes=0;this.samples=0;}
  // opts: mode 'organ'|'classic'; dreams (0 = no hallucination: plan on the parliament's average); democracy (false = one voter only);
  // useDance; temperature
  perceive(mem,position,{mode='organ',dreams=12,parliament=true,democracy='learned',useDance=true,temperature=.6,step=0,record=false}={}){
    const {spec,status,cost}=mem,L=spec.links.length,V=parliament?this.voters.length:1;
    let k=0,o=0,cs=0,cn=0;for(let i=0;i<L;i++)if(status[i]!==-1){k++;if(status[i]===1){o++;cs+=cost[i];cn++;}}
    const ctx=[(o+1)/(k+2),cn?cs/cn/9:.3],avgCost=cn?cs/cn:3,known=id=>status[id]!==-1;
    if(mode==='classic'){const r=shortestPath(spec.n,mem.adj,position,spec.goal,id=>status[id]===0?Infinity:status[id]===1?cost[id]:avgCost),cloud=new Float64Array(spec.n);for(const x of r.nodes)cloud[x]=1;
      return {p:new Float64Array(L).fill(1),route:r.nodes,cloud,coherence:0,dreamRoutes:[],X:[],mode};}
    const coherence=useDance?uDance(mem,8):0;
    const X=new Array(L),P=Array.from({length:V},()=>new Float64Array(L)),C=Array.from({length:V},()=>new Float64Array(L)),p=new Float64Array(L),c=new Float64Array(L),spread=new Float64Array(L);
    for(let i=0;i<L;i++){if(known(i)){p[i]=status[i];c[i]=cost[i];continue;}X[i]=uFeatures(mem,i,ctx,useDance);let s=0,s2=0,sc=0;
      for(let v=0;v<V;v++){const pv=clip(this.voters[v].pass.forward(X[i]),.02,.98),cv=1+8*this.voters[v].cost.forward(X[i]);P[v][i]=pv;C[v][i]=cv;s+=pv;s2+=pv*pv;sc+=cv;}
      p[i]=s/V;c[i]=sc/V;spread[i]=Math.sqrt(Math.max(0,s2/V-p[i]*p[i]));}
    mem.belief=p;
    const plan=id=>status[id]===0?Infinity:known(id)?cost[id]:c[id]+3*(-Math.log(clip(p[id],.02,1)));
    let mean=shortestPath(spec.n,mem.adj,position,spec.goal,plan),block=null;
    // A11 democracy on the horizons of the shape: voter i commits for the i-th unseen action ahead.
    if(democracy&&democracy!=='off'&&V>1&&mean.nodes.length>1){const D=this.democracy;D.communication=democracy;
      const ahead=[];for(let i=1;i<mean.nodes.length&&ahead.length<V;i++){const e=mem.adj[mean.nodes[i-1]].find(x=>x.to===mean.nodes[i]);if(!known(e.id))ahead.push(e.id);}
      // A block already committed stays in force until the world has judged it (only on the episode that owns it).
      if(D.last&&D.last.owner===mem)block=D.last;else if(ahead.length){block=D.commit(ahead.map((id,i)=>({link:id,p:P[i][id],ask:j=>P[j][id]})));block.owner=mem;}
      if(block){
        for(const e of block.emitted){if(known(e.link))continue;for(let v=0;v<V;v++)P[v][e.link]=clip(e.p,.02,.98);p[e.link]=clip(e.p,.02,.98);}
        mean=shortestPath(spec.n,mem.adj,position,spec.goal,plan);}}
    if(!dreams)return {block,p,c,spread,X,P,route:mean.nodes,cloud:Float64Array.from({length:spec.n},(_,i)=>mean.nodes.includes(i)?1:0),coherence,dreamRoutes:[],mode,V};
    // ── Dreams: hallucinate whole worlds, plan in each, then vote ──
    const rng=new RNG((this.seed*7919+step*131+position*17+spec.n)>>>0),cloud=new Float64Array(spec.n),worlds=[],dreamRoutes=[];
    for(let d=0;d<dreams;d++){const v=rng.int(V),bend=chaosField(mem,rng,temperature);
      const open=new Uint8Array(L),cst=new Float64Array(L);for(let i=0;i<L;i++){if(known(i)){open[i]=status[i];cst[i]=cost[i];}else{open[i]=rng.next()<sig(logit(P[v][i])+bend(i))?1:0;cst[i]=C[v][i];}}
      worlds.push({open,cst});const r=shortestPath(spec.n,mem.adj,position,spec.goal,id=>open[id]?cst[id]:Infinity);
      if(!r.nodes.length)continue;dreamRoutes.push({nodes:r.nodes,voter:v,cost:r.cost});for(const x of r.nodes)cloud[x]+=1/dreams;}
    if(!dreamRoutes.length)return {block,p,c,spread,X,P,route:mean.nodes,cloud,coherence,dreamRoutes,mode,V};
    // Every dreamed world judges every proposed route (its own cost there; an action closed in that world costs a detour).
    // The route the dreams find best ON AVERAGE is taken.
    const edgesOf=nodes=>{const out=[];for(let i=1;i<nodes.length;i++){const e=mem.adj[nodes[i-1]].find(x=>x.to===nodes[i]);out.push(e.id);}return out;};
    const seenKey=new Set(),cands=[];for(const r of [{nodes:mean.nodes},...dreamRoutes]){const k=r.nodes.join(',');if(r.nodes.length&&!seenKey.has(k)){seenKey.add(k);cands.push({nodes:r.nodes,edges:edgesOf(r.nodes)});}}
    let best=null;for(const cd of cands){let tot=0;for(const w of worlds){let s=0;for(const id of cd.edges)s+=w.open[id]?w.cst[id]:w.cst[id]+avgCost*4;tot+=s;}cd.score=tot/worlds.length;if(!best||cd.score<best.score)best=cd;}
    const agree=dreamRoutes.filter(r=>r.nodes[1]===best.nodes[1]).length/dreamRoutes.length;
    return {block,p,c,spread,X,P,route:best.nodes,cloud,coherence,dreamRoutes:record?dreamRoutes.slice(0,12):[],votes:agree,mode,V};}
  // Each voter learns from its own random share of what the world revealed (so they stay different — a real parliament).
  learn(prior,mem,revealed){const sets=this.voters.map(()=>({a:[],b:[]}));let n=0;
    for(const id of revealed){const x=prior.X?.[id];if(!x)continue;n++;const y=mem.status[id];
      sets.forEach((s,v)=>{if(this.voters.length>1&&this.rng.next()>.7)return;s.a.push({x,y});if(y===1)s.b.push({x,y:clip((mem.cost[id]-1)/8,0,1)});});}
    if(!n)return null;this.samples+=n;sets.forEach((s,v)=>{if(s.a.length)this.voters[v].pass.trainBatch(s.a);if(s.b.length)this.voters[v].cost.trainBatch(s.b);});return n;}
  snapshot(){return {schema:9,seed:this.seed,episodes:this.episodes,samples:this.samples,democracy:this.democracy.snapshot(),voters:this.voters.map(v=>({pass:v.pass.snapshot(),cost:v.cost.snapshot()}))};}
  static restore(s){if(!s||s.schema!==9)throw Error('Incompatible V9 brain');const o=new UOrganism(s.seed,{voters:s.voters.length});
    o.voters=s.voters.map(v=>({pass:MLP.restore(v.pass),cost:MLP.restore(v.cost)}));if(s.democracy)o.democracy=HorizonDemocracy.restore(s.democracy);if(o.voters[0].pass.I!==U_FEATURES)throw Error('V9 feature mismatch');o.episodes=s.episodes||0;o.samples=s.samples||0;return o;}
}
