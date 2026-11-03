// V8 network organism: memory of what it has seen, the DANCE (phases + the goal's internal wave through confirmed links,
// as in the Graph Dance experiment), and the NETWORK ORGAN that imagines every unseen link (open? how costly? how sure?).
// It learns ONLY when a visited node reveals its links: the guess made before is compared with what is really there.
import {MLP} from './nn.mjs';
import {RNG} from './world.mjs';
import {adjacency,bandsBeyond,netShortest,NET_BANDS} from './net.mjs';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export const NET_FEATURES=24;
export function netMemory(spec){const L=spec.links.length,adj=adjacency(spec.n,spec.links);
  return {spec,adj,status:new Int8Array(L).fill(-1),cost:new Float64Array(L),visits:new Uint16Array(spec.n),seen:new Uint8Array(spec.n),
    cover:Array.from({length:L},()=>[]),views:[],
    theta:Float64Array.from({length:spec.n},(_,i)=>i===spec.goal?0:((i*2.399963+spec.start*.39)%(2*Math.PI))),amp:new Float64Array(spec.n)};}
// What the node shows: its links exactly, and its horizon per direction (attached to the links in each band).
export function netRemember(mem,obs){const revealed=[];mem.seen[obs.position]=1;mem.visits[obs.position]++;
  for(const w of obs.window){if(mem.status[w.id]===-1)revealed.push(w.id);mem.status[w.id]=w.open;mem.cost[w.id]=w.cost??0;}
  for(const dir of obs.horizon){const bands=bandsBeyond(mem.adj,obs.position,dir.to);bands.forEach((ids,k)=>{const r=dir.bands[k];for(const id of ids)mem.cover[id].push([k,...r]);});}
  mem.views.push(obs.position);return revealed;}
// The dance: every node holds a phase and an amplitude. The goal is phase 0. Amplitude starts from the goal's wave as the node
// perceived it on its horizon, then the whole network dances: neighbours pull each other's phases and pass the wave on,
// through links SEEN open (weight 1) and through links it only IMAGINES open (weight = its own belief). A collective vote of the
// nodes on where the goal really lies — computed inside the organism, never read from the world.
export function dance(mem,iters=8,belief=null){const {spec,adj,status,theta,amp,cover}=mem;const seed=new Float64Array(spec.n);
  for(let i=0;i<spec.n;i++){let s=0;for(const {id} of adj[i])for(const c of cover[id])s=Math.max(s,c[4]*(1-.15*c[0]));seed[i]=s;}seed[spec.goal]=1;
  const w=id=>status[id]===1?1:status[id]===0?0:belief?belief[id]:.5;
  for(let t=0;t<iters;t++){const next=Float64Array.from(theta),na=Float64Array.from(amp);
    for(let i=0;i<spec.n;i++){if(i===spec.goal)continue;let s=0,ws=0,best=0;
      for(const {to,id} of adj[i]){const k=w(id);if(!k)continue;s+=k*Math.sin(theta[to]-theta[i]);ws+=k;best=Math.max(best,k*amp[to]);}
      if(ws)next[i]=theta[i]+.35*s/ws;na[i]=Math.max(seed[i],.85*best,amp[i]*.9);}
    theta.set(next);amp.set(na);theta[spec.goal]=0;amp[spec.goal]=1;}
  let c=0,k=0;for(let id=0;id<status.length;id++)if(status[id]===1){const l=spec.links[id];c+=Math.cos(theta[l.a]-theta[l.b]);k++;}return k?c/k:0;}
export function netFeatures(mem,id,ctx,useDance=true){const {spec,status,cover,adj,theta,amp}=mem,l=spec.links[id],n=spec.n,pa=spec.pos[l.a],pb=spec.pos[l.b],g=spec.pos[spec.goal];
  let best=null,minMax=1,sumBl=0,maxSig=0;for(const c of cover[id]){if(!best||c[0]<best[0])best=c;minMax=Math.min(minMax,c[1]);sumBl+=c[2];maxSig=Math.max(maxSig,c[4]);}
  const near=x=>{let o=0,cl=0;for(const {id:j} of adj[x]){if(status[j]===1)o++;else if(status[j]===0)cl++;}return [o/adj[x].length,cl/adj[x].length];};
  const [oa,ca]=near(l.a),[ob,cb]=near(l.b),k=cover[id].length;
  return [1,k?1:0,best?best[0]/NET_BANDS:1,best?best[1]:.5,best?best[2]:.5,best?best[4]:0,best?best[3]:.5,k?minMax:.5,k?sumBl/k:.5,maxSig,
    clip(Math.hypot(pa.x-pb.x,pa.y-pb.y)*3,0,1),clip(Math.hypot((pa.x+pb.x)/2-g.x,(pa.y+pb.y)/2-g.y)*1.5,0,1),Math.min((adj[l.a].length+adj[l.b].length)/16,1),
    oa,ob,ca,cb,Math.abs(l.a-l.b)/n,Math.min(l.a,l.b)/n,
    useDance?(1+Math.cos(theta[l.a]))/2:0,useDance?(1+Math.cos(theta[l.b]))/2:0,useDance?Math.max(amp[l.a],amp[l.b]):0,ctx[0],ctx[1]];}
export class NetOrgan{
  constructor(seed=17){this.seed=seed;this.kind='net';this.pass=new MLP(NET_FEATURES,24,seed*11+1,{lr:.004});this.cost=new MLP(NET_FEATURES,16,seed*11+2,{lr:.004});
    this.doubt=new MLP(NET_FEATURES,12,seed*11+3,{lr:.004});this.episodes=0;this.samples=0;}
  // mode 'organ' | 'classic' (no organ: every unseen link assumed open, average seen cost, one hard line)
  perceive(mem,position,{mode='organ',imagine=10,step=0,useDance=true}={}){
    const {spec,status,cost}=mem,L=spec.links.length,p=new Float64Array(L),c=new Float64Array(L),doubt=new Float64Array(L),X=new Array(L);
    let k=0,o=0,cs=0,cn=0;for(let i=0;i<L;i++)if(status[i]!==-1){k++;if(status[i]===1){o++;cs+=cost[i];cn++;}}
    const ctx=[(o+1)/(k+2),cn?cs/cn/9:.3],avgCost=cn?cs/cn:3,coherence=mode==='classic'||!useDance?0:dance(mem,8,mem.belief);
    for(let i=0;i<L;i++){if(status[i]===1){p[i]=1;c[i]=cost[i];continue;}if(status[i]===0){p[i]=0;c[i]=Infinity;continue;}
      if(mode==='classic'){p[i]=1;c[i]=avgCost;continue;}
      X[i]=netFeatures(mem,i,ctx,useDance);p[i]=clip(this.pass.forward(X[i]),.02,.995);c[i]=1+8*this.cost.forward(X[i]);doubt[i]=this.doubt.forward(X[i]);}
    mem.belief=p;
    const plan=id=>status[id]===0?Infinity:status[id]===1?cost[id]:mode==='classic'?avgCost:c[id]+3*(-Math.log(p[id]));
    const main=netShortest(spec.n,mem.adj,position,spec.goal,plan),cloud=new Float64Array(spec.n);
    if(mode==='classic'||imagine<1)for(const x of main.nodes)cloud[x]=1;
    else{const rng=new RNG((this.seed*7919+step*131+position)>>>0);
      for(let s=0;s<imagine;s++){const open=new Uint8Array(L);for(let i=0;i<L;i++)open[i]=status[i]!==-1?status[i]:rng.next()<p[i]?1:0;
        const r=netShortest(spec.n,mem.adj,position,spec.goal,id=>open[id]?(status[id]===1?cost[id]:c[id]):Infinity);
        for(const x of r.nodes)cloud[x]+=1/imagine;}}
    return {p,c,doubt,X,route:main.nodes,imaginedCost:main.cost,cloud,coherence,mode};}
  learn(prior,mem,revealed){const a=[],b=[],d=[];for(const id of revealed){const x=prior.X[id];if(!x)continue;const y=mem.status[id];
      a.push({x,y});d.push({x,y:clip(Math.abs(prior.p[id]-y),0,1)});if(y===1)b.push({x,y:clip((mem.cost[id]-1)/8,0,1)});}
    if(!a.length)return null;this.samples+=a.length;const out={pass:this.pass.trainBatch(a),doubt:this.doubt.trainBatch(d)};if(b.length)out.cost=this.cost.trainBatch(b);return out;}
  snapshot(){return {schema:'net8',seed:this.seed,episodes:this.episodes,samples:this.samples,pass:this.pass.snapshot(),cost:this.cost.snapshot(),doubt:this.doubt.snapshot()};}
  static restore(s){if(!s||s.schema!=='net8')throw Error('Incompatible V8 network organ');const o=new NetOrgan(s.seed);o.pass=MLP.restore(s.pass);o.cost=MLP.restore(s.cost);o.doubt=MLP.restore(s.doubt);
    if(o.pass.I!==NET_FEATURES)throw Error('Network organ feature mismatch');o.episodes=s.episodes||0;o.samples=s.samples||0;return o;}
}
