// V6 organism. Three levels, as in the original specification (message 38):
//   1. CE VEDE         — 3x3 window (exact) + horizon (16 directions × near/mid/far highest relief)
//   2. CE RECONSTRUIEȘTE — the RECONSTRUCTION ORGAN (learned) imagines the height of every unseen cell,
//                          and the DOUBT ORGAN (learned) estimates how wrong that guess may be
//   3. CE PREZICE      — the organism looks "from above" at ITS OWN imagined map: the main shape is the best route there,
//                        and the cloud is the set of routes across many imagined variants of the map.
// Both organs learn ONLY from the world: every time the window reveals a cell, the guess made before is compared with
// what is actually there (resistance → correction). No teacher, no evaluator map, ever.
import {MLP} from './nn.mjs';
import {RNG,WALL,costOf,shortest,BANDS} from './world.mjs';
export const FEATURES=13;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export function emptyMemory(n,start,goal){return {n,start,goal,known:new Float64Array(n*n).fill(NaN),views:[],visits:new Uint16Array(n*n)};}
export function remember(mem,obs){const revealed=[];for(const {i,h} of obs.window){if(Number.isNaN(mem.known[i]))revealed.push(i);mem.known[i]=h;}
  mem.views.push({p:obs.position,hz:obs.horizon});mem.visits[obs.position]++;return revealed;}
const band=r=>r<3.5?0:r<6.5?1:2;
// What the horizon readings, collected from every place visited so far, say about cell u.
export function contextOfMemory(mem){let k=0,rock=0,sum=0;for(const h of mem.known){if(Number.isNaN(h))continue;k++;sum+=h;if(h>WALL)rock++;}return [k?rock/k:0,k?sum/k:0];}
export function featuresOf(mem,u,ctx=contextOfMemory(mem)){const n=mem.n,ux=u%n,uy=(u/n)|0;let minB=1,sumB=0,cnt=0,best=null;
  for(const v of mem.views){const px=v.p%n,py=(v.p/n)|0,dx=ux-px,dy=uy-py,r=Math.hypot(dx,dy);if(r<1.5)continue;
    const f=((Math.atan2(dy,dx)/(Math.PI/8))+16)%16,i0=Math.floor(f)%16,i1=(i0+1)%16,t=f-Math.floor(f),b=band(r);
    const read=bb=>{const a=v.hz[i0*3+bb],c=v.hz[i1*3+bb];if(a<0&&c<0)return 0;if(a<0)return c;if(c<0)return a;return (1-t)*a+t*c;};
    const val=read(b);minB=Math.min(minB,val);sumB+=val;cnt++;
    if(!best||r<best.r)best={r,val,prev:b>0?read(b-1):val,next:b<BANDS.length-1?read(b+1):val};}
  let ws=0,wh=0,kc=0,near=6;
  for(let yy=Math.max(0,uy-2);yy<=Math.min(n-1,uy+2);yy++)for(let xx=Math.max(0,ux-2);xx<=Math.min(n-1,ux+2);xx++){const h=mem.known[yy*n+xx];if(Number.isNaN(h))continue;
    const d=Math.max(Math.abs(xx-ux),Math.abs(yy-uy)),w=1/(d*d);ws+=w;wh+=w*h;kc++;near=Math.min(near,d);}
  return [1,cnt?minB:.5,cnt?sumB/cnt:.5,best?best.val:.5,best?best.prev:.5,best?best.next:.5,best?Math.min(best.r/n,1):1,ws?wh/ws:.5,kc/24,near/6,Math.min(cnt,20)/20,ctx[0],ctx[1]];}
function smoothNoise(rng,n){const z=new Float64Array(n*n),blobs=Array.from({length:4},()=>({x:rng.next()*n,y:rng.next()*n,r:n*(.12+.2*rng.next()),s:rng.next()*2-1}));
  for(let i=0;i<n*n;i++){const x=i%n,y=(i/n)|0;let v=0;for(const b of blobs)v+=b.s*Math.exp(-((x-b.x)**2+(y-b.y)**2)/(2*b.r*b.r));z[i]=clip(v,-1.2,1.2);}return z;}
export class Organism{
  constructor(seed=17){this.seed=seed;this.recon=new MLP(FEATURES,24,seed*7+1,{lr:.004});this.doubt=new MLP(FEATURES,16,seed*7+2,{lr:.004});this.episodes=0;this.samples=0;}
  // mode: 'organ' (learned perspective) | 'classic' (no organ: unseen = average of what was seen, single hard line)
  perceive(mem,position,{mode='organ',imagine=10,step=0}={}){
    const n=mem.n,N=n*n,mean=new Float64Array(N),doubt=new Float64Array(N),X=new Array(N);
    let kh=0,kn=0;for(let i=0;i<N;i++){const h=mem.known[i];if(!Number.isNaN(h)&&h<=WALL){kh+=h;kn++;}}const avg=kn?kh/kn:.2;
    const ctx=contextOfMemory(mem);
    for(let i=0;i<N;i++){const h=mem.known[i];if(!Number.isNaN(h)){mean[i]=h;continue;}
      if(mode==='classic'){mean[i]=avg;doubt[i]=0;continue;}
      X[i]=featuresOf(mem,i,ctx);mean[i]=this.recon.forward(X[i]);doubt[i]=this.doubt.forward(X[i])*.5;}
    // Unseen cells are never treated as certain walls: a cell guessed as rock is just very expensive.
    const cost=(h,i)=>Number.isNaN(mem.known[i])?1+8*Math.min(h,1)+(h>WALL?20:0):costOf(h);
    const main=shortest(n,mean,position,mem.goal,cost);
    const cloud=new Float64Array(N);
    if(mode==='classic'||imagine<1){for(const c of main.cells)cloud[c]=1;}
    else{const rng=new RNG((this.seed*9973+step*131+position*7)>>>0),alt=new Float64Array(N);
      for(let k=0;k<imagine;k++){const z=smoothNoise(rng,n);
        for(let i=0;i<N;i++)alt[i]=Number.isNaN(mem.known[i])?clip(mean[i]+2*doubt[i]*z[i],0,1):mean[i];
        for(const c of shortest(n,alt,position,mem.goal,cost).cells)cloud[c]+=1/imagine;}}
    return {mean,doubt,X,route:main.cells,imaginedCost:main.cost,cloud,mode};}
  // Resistance → correction: the guesses made BEFORE a cell was seen, against what the window now shows.
  learn(prior,mem,revealed){const a=[],b=[];for(const i of revealed){const x=prior.X[i];if(!x)continue;const y=mem.known[i],p=prior.mean[i];
      a.push({x,y});b.push({x,y:clip(Math.abs(p-y)*2,0,1)});}
    if(!a.length)return null;this.samples+=a.length;return {recon:this.recon.trainBatch(a),doubt:this.doubt.trainBatch(b)};}
  snapshot(){return {schema:6,seed:this.seed,episodes:this.episodes,samples:this.samples,recon:this.recon.snapshot(),doubt:this.doubt.snapshot()};}
  static restore(s){if(!s||s.schema!==6)throw Error('Incompatible V6 checkpoint');const o=new Organism(s.seed);o.recon=MLP.restore(s.recon);o.doubt=MLP.restore(s.doubt);
    if(o.recon.I!==FEATURES)throw Error('V6 checkpoint feature mismatch');o.episodes=s.episodes||0;o.samples=s.samples||0;return o;}
}
