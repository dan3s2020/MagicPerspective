// MagicPerspective Noise Space — isolated observable experiment. Node 20+, no dependencies.
// No V17 imports or writes. Synthetic modes are labelled, cross-world correspondence is never inferred silently.
import fs from 'node:fs';
const PI=Math.PI;
export function rng(seed=1){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function gaussian(r){return Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*PI*r());}
export function henon(n,seed,burn=800){const r=rng(seed);let x=.06+(r()-.5)*.07,y=.04+(r()-.5)*.05;const out=[];
  for(let t=0;t<n+burn;t++){const nx=1-1.4*x*x+y,ny=.3*x;x=nx;y=ny;if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('unstable dynamics');if(t>=burn)out.push([x,y]);}return out;}
export function observe(z,seed,noise=0.035){const r=rng(seed);return {text:z.map(([x,y])=>x+.25*Math.sin(3*y)+noise*gaussian(r)),
 maze:z.map(([x,y])=>.7*y+.5*x*x+noise*gaussian(r)),
 transform:z.map(([x,y])=>.5*x+.35*Math.sin(2*y)+.25*x*y+noise*gaussian(r))};}
export function embedding(a,t,lag=5){const v=[];for(let i=0;i<lag;i++)v.push(a[t-i]);return v;}
export function wedge(a,b){const p=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)p.push(a[i]*b[j]-a[j]*b[i]);return p;}
export function features(a,t,lag=5,geo=false){const v=embedding(a,t,lag);if(!geo)return v;
 const before=embedding(a,t-1,lag),older=embedding(a,t-2,lag);
 const u=v.map((x,i)=>x-before[i]),w=before.map((x,i)=>x-older[i]);return [...v,...wedge(u,w)];}
export function corr(y,p){const n=y.length,ay=y.reduce((a,b)=>a+b,0)/n,ap=p.reduce((a,b)=>a+b,0)/n;let cov=0,sy=0,sp=0;
 for(let i=0;i<n;i++){const a=y[i]-ay,b=p[i]-ap;cov+=a*b;sy+=a*a;sp+=b*b;}return cov/Math.max(1e-12,Math.sqrt(sy*sp));}
export function metrics(y,p){if(!y.length||y.length!==p.length)throw Error('Invalid evaluation arrays');let s=0;for(let i=0;i<y.length;i++)s+=(y[i]-p[i])**2;
 const mean=y.reduce((a,b)=>a+b,0)/y.length,varY=y.reduce((a,b)=>a+(b-mean)**2,0)/y.length;return {rmse:Math.sqrt(s/y.length),r:corr(y,p),r2:varY?1-s/y.length/varY:null,n:y.length};}
export function fitScale(xs){const m=xs[0].map((_,j)=>xs.reduce((s,x)=>s+x[j],0)/xs.length),sd=m.map((v,j)=>Math.sqrt(xs.reduce((s,x)=>s+(x[j]-v)**2,0)/xs.length)+1e-5);return {mean:m,sd};}
export const applyScale=(xs,s)=>xs.map(x=>x.map((v,i)=>(v-s.mean[i])/s.sd[i]));
// Inverse-distance KNN, implemented without any dataset-specific target logic.
export function knn(trainX,trainY,queryX,{k=12,weights=null}={}){if(!trainX.length||trainX.length!==trainY.length)throw Error('Invalid training');
 const ww=weights||trainX[0].map(()=>1),pred=[];for(const x of queryX){const near=[];for(let i=0;i<trainX.length;i++){const a=trainX[i];let d=0;for(let j=0;j<x.length;j++)d+=ww[j]*(x[j]-a[j])**2;
   if(near.length<k){near.push([d,i]);near.sort((u,v)=>u[0]-v[0]);}else if(d<near[near.length-1][0]){near.pop();near.push([d,i]);near.sort((u,v)=>u[0]-v[0]);}}
 let sum=0,tot=0;for(const [d,i] of near){const w=1/(Math.sqrt(d)+1e-6);sum+=w*trainY[i];tot+=w;}pred.push(sum/tot);}return pred;}
export function validate(opts={}){const n=Number(opts.n??1900),noise=Number(opts.noise??.035),seed=Number(opts.seed??11),lag=Number(opts.lag??5),draws=Number(opts.draws??25);
 if(!Number.isInteger(seed)||!Number.isInteger(n)||n<900||n>12000||!Number.isFinite(noise)||noise<0||noise>.7||!Number.isInteger(lag)||lag<3||lag>8||!Number.isInteger(draws)||draws<0||draws>150)throw Error('Need integer seed, n 900..12000, noise 0..0.7, lag 3..8, draws 0..150');return {seed,n,noise,lag,draws};}
export function experiment(opts={}){const {seed,n,noise,lag,draws}=validate(opts);const A=observe(henon(n,seed*2+1),seed*19+1,noise),B=observe(henon(n,seed*2+100001),seed*19+7,noise);
 const a=A.text,b=A.maze,a2=B.text,b2=B.maze,start=lag+2,cut=Math.floor(n*.54),valStart=cut+22,valEnd=Math.floor(n*.7),testStart=valEnd+22;
 const idx=(lo,hi)=>Array.from({length:hi-lo},(_,i)=>i+lo);
 const tr=idx(start,cut),va=idx(valStart,valEnd),te=idx(testStart,n-1);
 const f=(stream,indices,geo)=>indices.map(t=>features(stream,t,lag,geo));
 const tx=f(a,tr,false),vx=f(a,va,false),qx=f(a,te,false),y=tr.map(t=>b[t+1]),yv=va.map(t=>b[t+1]),yt=te.map(t=>b[t+1]);
 const s=fitScale(tx),sTr=applyScale(tx,s),sTe=applyScale(qx,s),bare=knn(sTr,y,sTe),baseline=knn(sTr.map(v=>v.slice(0,1)),y,sTe.map(v=>v.slice(0,1)));
 const geot=f(a,tr,true),geov=f(a,va,true),geoq=f(a,te,true),sg=fitScale(geot),gTr=applyScale(geot,sg),gVa=applyScale(geov,sg),gTe=applyScale(geoq,sg);
 const geoBare=knn(gTr,y,gTe),geoWeights=Array.from({length:gTr[0].length},(_,i)=>i<lag?1:0.25);
 // Derivative-free activation/feature metric perturbations. Inspired by forward-only methods, NOT full DUST.
 const R=rng(seed*923+5),subset=Math.min(90,va.length),select=Array.from({length:subset},(_,i)=>Math.floor(i*(va.length-1)/Math.max(1,subset-1))),vSubset=select.map(i=>gVa[i]),ySubset=select.map(i=>yv[i]);
 const fitLoss=w=>metrics(ySubset,knn(gTr,y,vSubset,{weights:w})).rmse;
 let best=geoWeights,loss=fitLoss(best),history=[{trial:0,validation_rmse:loss}];
 for(let step=0;step<draws;step++){const sigma=.33*(1-step/Math.max(1,draws)),candidate=best.map(w=>Math.max(.015,Math.min(5,w*Math.exp(sigma*gaussian(R)))));const l=fitLoss(candidate);
   if(l<loss){loss=l;best=candidate;}history.push({trial:step+1,validation_rmse:loss});}
 const enhanced=knn(gTr,y,gTe,{weights:best}),transfer=knn(sTr,y,applyScale(f(a2,te,false),s)),incorrect=knn(sTr,tr.map(t=>b2[t+1]),sTe);
 const shuffledY=tr.map(t=>b[(start+(t*37)%(cut-start))+1]);const shuffled=knn(sTr,shuffledY,sTe);
 const zeroR=rng(seed+301),random=te.map(()=>gaussian(zeroR));const randomFit=knn(sTr,tr.map(()=>gaussian(zeroR)),sTe);
 const records={instant:metrics(yt,baseline),delay:metrics(yt,bare),plucker:metrics(yt,geoBare),learned_metric:metrics(yt,enhanced),transfer_same_law:metrics(te.map(t=>b2[t+1]),transfer),unpaired_same_law:metrics(te.map(t=>b2[t+1]),incorrect),shuffled:metrics(yt,shuffled),independent_noise:metrics(random,randomFit)};
 // Each graph point derives from the observed stream only. 5th axis is actual time, not decorative geometry.
 const graph=[],strides=Math.max(1,Math.floor(n/350)),chosen=[['text',a],['maze',b],['transform',A.transform]];
 for(const [world,src] of chosen){for(let t=start;t<n;t+=strides){const z=embedding(src,t,Math.max(4,lag));const p=[z[0],z[1],z[2],z[3],(t/n)*2-1];graph.push({id:`${world}:${t}`,world,exercise:`synthetic-${seed}`,step:t,p,measured:src[t],kind:'observed'});}}
 const traces=te.slice(0,260).map((t,i)=>({t,visible:a[t],target:b[t+1],visibleOnly:baseline[i],delay:bare[i],grassmann:geoBare[i],learned:enhanced[i],different:b2[t+1],transferred:transfer[i]}));
 return {kind:'synthetic-controlled',description:'Cross-world projections share hidden Hénon dynamics by construction; not MagicPerspective V17 evidence.',config:{seed,n,noise,lag,draws,cut,valStart,valEnd,testStart},scores:records,history,feature_weights:best,graph,traces};}
export function verifyEvents(events){if(!Array.isArray(events)||!events.length)throw Error('Events must be a nonempty array');const cleaned=[];for(const [i,e] of events.entries()){
 if(typeof e.world!=='string'||!e.world.trim()||typeof e.exercise!=='string'||!Number.isInteger(e.step)||!Number.isFinite(e.observation))throw Error(`Event ${i}: require world, exercise, integer step, numerical observation`);
 const p=Array.isArray(e.coordinates)?e.coordinates.map(Number):null;if(p&& (p.length!==5||p.some(v=>!Number.isFinite(v))))throw Error(`Event ${i}: expected five finite coordinates`);
 cleaned.push({world:e.world,exercise:e.exercise,step:e.step,observation:e.observation,coordinates:p,shared_id:typeof e.shared_id==='string'?e.shared_id:null,action:e.action??null,prediction:Number.isFinite(e.prediction)?e.prediction:null});}
 return cleaned;}
export function analyzeEvents(events){const clean=verifyEvents(events),groups=new Map();for(const e of clean){const key=e.world+'|'+e.exercise;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 const arr=[...groups].map(([id,ev])=>({id,count:ev.length,events:ev.sort((a,b)=>a.step-b.step)}));let error=[];for(const e of clean)if(e.prediction!==null)error.push(e.observation-e.prediction);
 // Never silently pair different worlds: only explicit shared_id may authorize cross-world prediction tests.
 const shared=new Map();for(const e of clean){if(!e.shared_id)continue;const k=e.shared_id+'|'+e.step;if(!shared.has(k))shared.set(k,new Set());shared.get(k).add(e.world);}
 const pairs=[...shared.values()].filter(s=>s.size>1).length;
 return {kind:'external-observations',worlds:arr.map(x=>({id:x.id,count:x.count})),count:clean.length,explicit_shared_observations:pairs,
   predictiveRMSE:error.length?Math.sqrt(error.reduce((s,x)=>s+x*x,0)/error.length):null,
   cross_world_state:pairs?'PAIRED_OBSERVATIONS_AVAILABLE':'UNVERIFIED_NO_CORRESPONDENCE',
   graph:arr.flatMap(g=>g.events.slice(-400).map((e,i)=>({id:g.id+':'+e.step,world:e.world,exercise:e.exercise,step:e.step,p:e.coordinates||[e.observation, i>0?g.events[i-1].observation||0:0,0,0,e.step/Math.max(1,g.events.length)],kind:'observed'})))};}
export function readEvents(file){const lines=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(x=>x.trim());if(lines.length>100000)throw Error('Refusing more than 100000 events in one load');return analyzeEvents(lines.map(x=>JSON.parse(x)));}