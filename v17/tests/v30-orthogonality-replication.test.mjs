// V30 follow-up on existing REAL V17 Geometry and original learned-action
// transition motor. The only new code is independent read-only measurement.
// A rotated / whitened score here is a PROBE, not a replacement deployed writer.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Discoverer,KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
import {ACTIONS,rng,shuffle,uniquePermutations,LearnedAxisNavigator,k} from "../research/learned-axes/axis-navigator.mjs";
import {mkWorld} from "../research/learned-axes/hidden-world.mjs";
const wrap=x=>x-Math.round(x);
const numericMean=a=>a.reduce((p,c)=>p+c,0)/a.length;
function invert(A){
 const n=A.length,a=A.map((r,i)=>r.concat(Array.from({length:n},(_,j)=>+(i===j))));
 for(let j=0;j<n;j++){
  let p=j;for(let i=j+1;i<n;i++)if(Math.abs(a[i][j])>Math.abs(a[p][j]))p=i;
  assert.ok(Math.abs(a[p][j])>1e-12);
  [a[p],a[j]]=[a[j],a[p]];
  const z=a[j][j];for(let c=0;c<2*n;c++)a[j][c]/=z;
  for(let i=0;i<n;i++)if(i!==j){
   const x=a[i][j];for(let c=0;c<2*n;c++)a[i][c]-=x*a[j][c];
  }
 }
 return a.map(r=>r.slice(n));
}
function qf(x,M){
 let r=0;for(let i=0;i<x.length;i++)for(let j=0;j<x.length;j++)r+=x[i]*M[i][j]*x[j];
 return r;
}
const corpus=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
  .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
const symbols=Array.from(corpus,c=>c.charCodeAt(0));
function nativeGeometry(seed){
 const G=new Geometry({D:5,lr:.03,neg:3,repel:.3,every:1e9,seed});
 for(let t=1;t<35000;t++)G.learn(symbols[t-1],symbols[t]);
 const observed=[];
 for(let t=10000;t<35000;t++){
  const before=G.V.get(symbols[t-1]),after=G.U.get(symbols[t]);
  if(before&&after)observed.push(after.map((v,i)=>wrap(v-before[i])));
 }
 const mean=Array.from({length:5},(_,i)=>numericMean(observed.map(v=>v[i])));
 const C=Array.from({length:5},()=>Array(5).fill(0));
 for(const delta of observed)for(let i=0;i<5;i++)for(let j=0;j<5;j++)
  C[i][j]+=(delta[i]-mean[i])*(delta[j]-mean[j])/observed.length;
 const ridge=.003,F=invert(C.map((row,i)=>row.map((v,j)=>v+(i===j?ridge:0))));
 const D=Array.from({length:5},(_,i)=>1/(C[i][i]+ridge));
 let correlations=[],maxCorr=0;
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
  const rho=C[i][j]/Math.sqrt(C[i][i]*C[j][j]);
  correlations.push(rho);maxCorr=Math.max(maxCorr,Math.abs(rho));
 }
 return {G,mean,F,D,maxCorr,correlations,observedCount:observed.length};
}
test("Five independent initializations: native 5D periodic cosine vs exact torus L2, centering, diagonal scaling and covariance orthogonalization on frozen heldout text",()=>{
 assert.ok(symbols.length>=45000);
 const results=[],seeds=[7,17,29,43,61];
 for(const seed of seeds){
  const {G,mean,F,D,maxCorr,observedCount}=nativeGeometry(seed),beforeN=G.n;
  const abc=[...G.U.keys()].sort((a,b)=>a-b);
  let N=0,correct=[0,0,0,0,0],wOnly=0,nOnly=0;
  // [original native periodic, raw torus Euclidean, centered raw,
  //  centered diagonal covariance, centered full covariance].
  for(let t=35000;t<symbols.length;t++){
   const from=G.V.get(symbols[t-1]),actual=symbols[t];
   if(!from||!G.U.has(actual))continue;
   const best=[[-Infinity,null],[Infinity,null],[Infinity,null],[Infinity,null],[Infinity,null]];
   for(const candidate of abc){
    const to=G.U.get(candidate),d=to.map((v,i)=>wrap(v-from[i])),dc=d.map((v,i)=>v-mean[i]);
    let cos=0,L2=0,C2=0,Diag=0;
    for(let i=0;i<5;i++){
     cos+=Math.cos(2*Math.PI*d[i]);L2+=d[i]**2;C2+=dc[i]**2;Diag+=dc[i]**2*D[i];
    }
    const Full=qf(dc,F),scores=[cos,L2,C2,Diag,Full];
    for(let a=0;a<scores.length;a++)
     if((a===0&&scores[a]>best[a][0])||(a>0&&scores[a]<best[a][0]))
      best[a]=[scores[a],candidate];
   }
   const hits=best.map(x=>+(x[1]===actual));
   for(let i=0;i<5;i++)correct[i]+=hits[i];
   if(hits[4]&&!hits[0])wOnly++;if(hits[0]&&!hits[4])nOnly++;
   N++;
  }
  assert.equal(G.n,beforeN,"Heldout scoring must not train native geometry");
  assert.ok(N>11000&&correct[0]>0);
  results.push({seed,heldout:N,trainingPairs:observedCount,maxAbsAxisCorrelation:maxCorr,
    accuracy:correct.map(x=>x/N),fullMinusNative:(correct[4]-correct[0])/N,
    fullMinusDiagonal:(correct[4]-correct[3])/N,
    fullOnlyCorrect:wOnly,nativeOnlyCorrect:nOnly});
 }
 const deltas=results.map(x=>x.fullMinusNative),wins=deltas.filter(d=>d>0).length;
 console.log("V30_NATIVE_TEXT_FIVE_SEED_METRIC_REPLICATION",JSON.stringify({
   conditions:["nativePeriodicCosine","rawTorusEuclidean","meanCenteredEuclidean","meanCenteredDiagonalCovariance","meanCenteredFullCovariance"],
   repeats:results.length,results,
   winsOfFullWhiteningAgainstNative:wins,
   acrossSeedDelta: {mean:numericMean(deltas),min:Math.min(...deltas),max:Math.max(...deltas)},
   accuracyIsHeldoutNextSymbolNotSemanticQA:true,
   limitation:"Repeated characters are autocorrelated; seed replication is not independent corpus replication."
 }));
});

test("How much do orthogonal coordinates change the native original shape: 480 unseen goal paths, length preserved but path choices measured",()=>{
 const world=mkWorld({D:256,seed:47,noise:.19}),r=rng(4048);
 const all=shuffle(uniquePermutations(),r),train=all.slice(0,460),testSet=all.slice(460),events=[];
 for(const action of ACTIONS)for(let i=0;i<230;i++){
  const c=train[Math.floor(r()*train.length)],before=world.create(c,r);
  events.push({before,action,after:world.transition(before,action,r)});
 }
 const learner=new LearnedAxisNavigator({D:256}).learn(events);
 const states=uniquePermutations(),ids=new Map(states.map((s,i)=>[k(s),i]));
 const neighbors=states.map(s=>ACTIONS.map(action=>({action,to:ids.get(k(learner.move(s,action)))})));
 const coords6=states.map(s=>s.map(v=>v/6));
 const coords5=states.map(s=>{
  const v=s.map(x=>(x-2.5)/6),out=[];
  for(let j=1;j<=5;j++){
   const div=Math.sqrt(j*(j+1));
   let z=-j*v[j]/div;for(let i=0;i<j;i++)z+=v[i]/div;
   out.push(.5+z/2);
  }
  return out;
 });
 const shuffled=shuffle(coords6,rng(992));
 const disc=new Discoverer(11);
 for(let i=0;i<140;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);playExercise(w,disc);
  if(i>=25&&disc.self()>=0&&disc.attract(KIND.target)>.2&&disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(disc.attract(KIND.target)>.2);
 const counts={sixD:{changed:0,firstChanged:0,longer:0,failed:0},
  orthogonal5D:{changed:0,firstChanged:0,longer:0,failed:0},
  scrambled:{changed:0,firstChanged:0,longer:0,failed:0},
  strongOrthogonal:{changed:0,firstChanged:0,longer:0,failed:0}};
 const paths=480,q=rng(9913);
 for(let t=0;t<paths;t++){
  const a=testSet[Math.floor(q()*testSet.length)],b=testSet[Math.floor(q()*testSet.length)];
  if(k(a)===k(b)){t--;continue;}
  const start=ids.get(k(a)),goal=ids.get(k(b)),kinds=Array(states.length).fill(KIND.floor);
  kinds[start]=KIND.self;kinds[goal]=KIND.target;
  const original=disc.shapeGraph(kinds,neighbors,start,{details:true});
  assert.ok(original&&original.targetReached);
  const originalPath=original.path.map(x=>x.action).join("");
  for(const [label,geo,weight] of [
    ["sixD",coords6,.04],["orthogonal5D",coords5,.04],
    ["scrambled",shuffled,.04],["strongOrthogonal",coords5,.25]
  ]){
    const variant=disc.shapeGraph(kinds,neighbors,start,{details:true,geometry:geo,geometryWeight:weight});
    if(!variant||!variant.targetReached){counts[label].failed++;continue;}
    const p=variant.path.map(x=>x.action).join("");
    counts[label].changed+=+(p!==originalPath);
    counts[label].firstChanged+=+(p[0]!==originalPath[0]);
    counts[label].longer+=+(variant.path.length>original.path.length);
  }
 }
 console.log("V30_NATIVE_PATH_GEOMETRIC_TIEBREAK_AUDIT",JSON.stringify({
  stateCount:states.length,unseenPathQueries:paths,baselineOptimalByPreviouslyVerifiedProof:true,
  counts,interpretation:"Geometry is an optional tie preference on already uphill native-field edges; pathway variety is not solution quality."
 }));
});
