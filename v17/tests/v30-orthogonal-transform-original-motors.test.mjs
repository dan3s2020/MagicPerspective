// V30 read-only research acceptance on the EXISTING V29 native motors.
// Original Discoverer.shapeGraph(), original 5D Geometry.learn(), and the
// observed-transition LearnedAxisNavigator are imported verbatim.
// NO replacement Brain, no production UI or checkpoint edits.
// This test does not infer "physical dimensions" from numerical embeddings.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Discoverer,KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
import {ACTIONS,rng,shuffle,uniquePermutations,LearnedAxisNavigator,k} from "../research/learned-axes/axis-navigator.mjs";
import {mkWorld} from "../research/learned-axes/hidden-world.mjs";

function setupAxes() {
  const D=256,world=mkWorld({D,seed:47,noise:.19}),r=rng(4048);
  const all=shuffle(uniquePermutations(),r),train=all.slice(0,460),heldout=all.slice(460),events=[];
  for(const action of ACTIONS)for(let i=0;i<230;i++){
    const core=train[Math.floor(r()*train.length)],before=world.create(core,r);
    events.push({action,before,after:world.transition(before,action,r)});
  }
  const learner=new LearnedAxisNavigator({D}).learn(events);
  assert.equal(learner.axes.length,6);
  assert.deepEqual(learner.axes,world.slots);
  const states=uniquePermutations(),ids=new Map(states.map((s,i)=>[k(s),i]));
  const edges=states.map(s=>ACTIONS.map(action=>({
    action,to:ids.get(k(learner.move(s,action)))
  })));
  assert.ok(edges.every(es=>es.every(e=>e.to>=0)));
  return {world,r,learner,heldout,events,states,ids,edges};
}
let cachedAxes;
function axisWorld(){return cachedAxes??=setupAxes();}
let cachedDisc;
function mazeDisc(){
  if(cachedDisc)return cachedDisc;
  const disc=new Discoverer(11);
  for(let i=0;i<140;i++){
    const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
    playExercise(w,disc);
    if(i>=25&&disc.self()>=0&&disc.attract(KIND.target)>.2&&disc.conduct(KIND.floor)>=.5)break;
  }
  assert.ok(disc.episodes>=20);
  assert.ok(disc.attract(KIND.target)>.2);
  assert.ok(disc.conduct(KIND.floor)>=.5);
  cachedDisc=disc;
  return disc;
}
function helmert(s) {
  // Orthogonal coordinates spanning the fixed-sum 5D affine hyperplane.
  const centered=s.map(x=>(x-2.5)/6),out=[];
  for(let j=1;j<=5;j++){
    const divisor=Math.sqrt(j*(j+1));
    let dot=0;
    for(let q=0;q<j;q++)dot+=centered[q]/divisor;
    dot-=j*centered[j]/divisor;
    out.push(.5+dot/2);
  }
  return out;
}
function learnedPlan(ctx,disc,start,goal,{geometry=null,weight=0}={}){
  const startId=ctx.ids.get(k(start)),goalId=ctx.ids.get(k(goal));
  if(startId===goalId)return {solved:true,steps:0,actions:[],model:null};
  const kinds=Array(ctx.states.length).fill(KIND.floor);
  kinds[startId]=KIND.self;kinds[goalId]=KIND.target;
  const model=disc.shapeGraph(kinds,ctx.edges,startId,
    {geometry,geometryWeight:weight,details:true});
  if(!model)return {solved:false,steps:Infinity,actions:[],model:null};
  let position=startId,valid=true;
  for(const step of model.path){
    if(step.from!==position){valid=false;break;}
    const actual=ctx.ids.get(k(ctx.learner.move(ctx.states[position],step.action)));
    if(actual!==step.to){valid=false;break;}
    position=actual;
  }
  return {solved:valid&&position===goalId,steps:model.path.length,
    actions:model.path.map(e=>e.action),model};
}
function asStats(items){
  const successes=items.filter(x=>x.solved);
  return {success:successes.length,total:items.length,
    meanLength:successes.length?successes.reduce((s,x)=>s+x.steps,0)/successes.length:null};
}
function scalarStats(values){
  return {min:Math.min(...values),max:Math.max(...values),
    mean:values.reduce((a,b)=>a+b,0)/values.length};
}

test("Intrinsic rank: six DISCOVERED observation channels occupy a 5D affine permutation manifold, NOT six orthogonal meanings",()=>{
  const ctx=axisWorld(),samples=ctx.states,mu=2.5;
  const var0=samples.reduce((v,s)=>v+(s[0]-mu)**2,0)/samples.length;
  const cov01=samples.reduce((v,s)=>v+(s[0]-mu)*(s[1]-mu),0)/samples.length;
  const corr01=cov01/var0;
  const basis=[],tol=1e-8;
  for(const s of samples){
    let v=s.map(x=>x-mu);
    for(const b of basis){const p=v.reduce((a,x,i)=>a+x*b[i],0);v=v.map((x,i)=>x-p*b[i]);}
    const norm=Math.hypot(...v);
    if(norm>tol)basis.push(v.map(x=>x/norm));
  }
  assert.equal(basis.length,5);
  assert.ok(Math.abs(corr01+.2)<1e-12);
  assert.equal(ctx.learner.axes.length,6);
  for(const s of samples){
    const a=helmert(s);
    assert.equal(a.length,5);
    assert.ok(a.every(x=>x>=0&&x<1));
  }
  console.log("V30_DISCOVERED_INTRINSIC_DIMENSION",JSON.stringify({
    originalObservedChannels:ctx.world.D,causalChannelsRecovered:ctx.learner.axes.length,
    distinctLearnedCoreStates:samples.length,intrinsicAffineRank:basis.length,
    fixedSum:samples[0].reduce((a,b)=>a+b),offDiagonalCorrelation:corr01,
    interpretation:"Six relevant observed channels, five independent Euclidean degrees of freedom; not twelve-thousand orthogonal semantic concepts."
  }));
});

test("Learned transformations: identify commuting and noncommuting directions, then measure multi-scale composition on unseen starts",()=>{
  const ctx=axisWorld(),{learner,states,heldout}=ctx;
  let commuting=0,noncommuting=0;const examples=[];
  for(let i=0;i<ACTIONS.length;i++)for(let j=i+1;j<ACTIONS.length;j++){
    const a=ACTIONS[i],b=ACTIONS[j];
    const equal=states.every(s=>k(learner.move(learner.move(s,a),b))===
      k(learner.move(learner.move(s,b),a)));
    if(equal)commuting++;else noncommuting++;
    examples.push({a,b,commutes:equal});
  }
  assert.ok(commuting>0 && noncommuting>0);
  const r=rng(7701),trialsPerLength=64,results=[];
  for(const length of [1,2,4,8,16,32,64]){
    let exact=0,wrongOrder=0;
    for(let j=0;j<trialsPerLength;j++){
      const start=heldout[Math.floor(r()*heldout.length)];
      const actions=Array.from({length},()=>ACTIONS[Math.floor(r()*ACTIONS.length)]);
      let predicted=start.slice();
      for(const action of actions)predicted=learner.move(predicted,action);
      let observed=ctx.world.create(start,r);
      // Hidden evaluator executes the *already chosen* sequence with zero chance residual.
      // The learner does NOT read the hidden HIDDEN_RULES; it uses fitted transformations.
      for(const action of actions)observed=ctx.world.transition(observed,action,()=>.999999);
      exact+=+(k(predicted)===k(learner.read(observed)));
      let reordered=start.slice();
      for(const action of actions.slice().reverse())reordered=learner.move(reordered,action);
      wrongOrder+=+(k(reordered)===k(learner.read(observed)));
    }
    results.push({length,exact,wrongOrder,trials:trialsPerLength});
    assert.equal(exact,trialsPerLength,"Learned composition failure at length "+length);
  }
  console.log("V30_NONCOMMUTATIVE_MULTISCALE_COMPOSITION",JSON.stringify({
    learnedActionPairs:examples,commutingPairs:commuting,noncommutingPairs:noncommuting,
    heldoutSequenceLengths:results,
    caveat:"Long sequences composed from fixed learned permutation laws; recurrence alone does not prove fractality."
  }));
});

test("EXACT original Discoverer.shapeGraph traverses the learned 6-axis transformation graph; compare 6D, orthogonal 5D, and scrambled geometry biases",()=>{
  const ctx=axisWorld(),disc=mazeDisc();
  const source=ctx.states.map(s=>s.map(v=>v/6)),orthogonal=ctx.states.map(helmert);
  const sRand=shuffle(source,rng(992)); // Broken relationship control: wrong per-state geometry.
  const r=rng(2187),N=70,reports={original:[],sixD:[],orthogonal5D:[],scrambled:[],strongGeometry:[]};
  let exactlyOptimal=0,samples=[];
  for(let i=0;i<N;i++){
    const start=ctx.heldout[Math.floor(r()*ctx.heldout.length)],
      goal=ctx.heldout[Math.floor(r()*ctx.heldout.length)];
    if(k(start)===k(goal)){i--;continue;}
    const baseline=learnedPlan(ctx,disc,start,goal);
    const six=learnedPlan(ctx,disc,start,goal,{geometry:source,weight:.04});
    const five=learnedPlan(ctx,disc,start,goal,{geometry:orthogonal,weight:.04});
    const broken=learnedPlan(ctx,disc,start,goal,{geometry:sRand,weight:.04});
    const high=learnedPlan(ctx,disc,start,goal,{geometry:orthogonal,weight:.25});
    const optimal=ctx.learner.route(start,goal)?.length;
    reports.original.push(baseline);reports.sixD.push(six);
    reports.orthogonal5D.push(five);reports.scrambled.push(broken);
    reports.strongGeometry.push(high);
    exactlyOptimal+=+(baseline.solved&&baseline.steps===optimal);
    if(i<5)samples.push({start,goal,optimal,original:baseline.steps,
      sixD:six.steps,orthogonal5D:five.steps,scrambled:broken.steps,strongGeometry:high.steps});
  }
  assert.equal(reports.original.filter(x=>x.solved).length,N,
    "The native original shape must solve every reachable learned deterministic topology");
  assert.equal(exactlyOptimal,N,
    "Original native attraction should find shortest path on uniformly traversable learned graph");
  const summarized=Object.fromEntries(Object.entries(reports).map(([mode,rows])=>
    [mode,{...asStats(rows),optimalMatches:rows.filter((p,i)=>p.solved&&
      p.steps===reports.original[i].steps).length}]));
  console.log("V30_ORIGINAL_SHAPE_LEARNED_AXES_GEOMETRY_ABLATION",JSON.stringify({
    nativeMazeEpisodes:disc.episodes,original2DGoalAttraction:disc.attract(KIND.target),
    original2DConductance:disc.conduct(KIND.floor),
    graphStates:ctx.states.length,observedLearnedActions:ACTIONS.length,
    heldoutStartGoalPairs:N,geometryTieWeight:.04,strongWeight:.25,
    outcome:summarized,samples,
    caveat:"All graph edges come from learned 6-axis permutations, not from natural free-form text."
  }));
});

test("Frozen native full-shape versus action-feedback replanning under stochastic observed motor effects",()=>{
  const ctx=axisWorld(),disc=mazeDisc(),r=rng(3311),episodes=85,horizon=12;
  const scores={frozen:0,replan:0},trace=[];
  for(let j=0;j<episodes;j++){
    const start=ctx.heldout[Math.floor(r()*ctx.heldout.length)],
      goal=ctx.heldout[Math.floor(r()*ctx.heldout.length)];
    if(k(start)===k(goal)){j--;continue;}
    const frozen=learnedPlan(ctx,disc,start,goal).actions;
    for(const policy of ["frozen","replan"]){
      const stream=rng(17707+j*19),boardStart=ctx.world.create(start,stream);
      let observed=boardStart,unexpected=0,steps=0;
      for(;steps<horizon;steps++){
        const current=ctx.learner.read(observed);
        if(k(current)===k(goal))break;
        const route=policy==="frozen"?frozen:learnedPlan(ctx,disc,current,goal).actions;
        const action=policy==="frozen"?route[steps]:route[0];
        if(!action)break;
        const expected=ctx.learner.move(current,action);
        observed=ctx.world.transition(observed,action,stream);
        unexpected+=+(k(expected)!==k(ctx.learner.read(observed)));
      }
      const solved=k(ctx.learner.read(observed))===k(goal);
      scores[policy]+=+solved;
      if(j<3)trace.push({episode:j,policy,solved,steps,unexpected});
    }
  }
  assert.ok(scores.replan>=scores.frozen,
    "Feedback replanning should not be inferior on this fixed research sample");
  console.log("V30_ORIGINAL_SHAPE_FEEDBACK_VERSUS_FROZEN",JSON.stringify({
    episodes,horizon,stochasticWorldNoise:ctx.world.noise,
    nativeOriginalShape:true,initialShapePredictedBeforeFirstAction:true,
    scores,trace,
    caveat:"Feedback can repair unexpected actions; this does not show exploration noise improves semantic learning."
  }));
});

const wrap=x=>x-Math.round(x);
function inverse(A){
  const N=A.length,M=A.map((row,i)=>row.concat(Array.from({length:N},(_,j)=>+(i===j))));
  for(let j=0;j<N;j++){
    let p=j;for(let i=j+1;i<N;i++)if(Math.abs(M[i][j])>Math.abs(M[p][j]))p=i;
    assert.ok(Math.abs(M[p][j])>1e-12,"Singular regularized covariance");
    [M[j],M[p]]=[M[p],M[j]];
    const v=M[j][j];
    for(let c=0;c<2*N;c++)M[j][c]/=v;
    for(let i=0;i<N;i++)if(i!==j){
      const factor=M[i][j];for(let c=0;c<2*N;c++)M[i][c]-=factor*M[j][c];
    }
  }
  return M.map(r=>r.slice(N));
}
function quad(v,M){
  return v.reduce((s,x,i)=>s+x*M[i].reduce((q,y,j)=>q+y*v[j],0),0);
}
test("Real original native 5D torus text Geometry.learn: does learned orthogonalization improve frozen heldout next-symbol accuracy?",()=>{
  const corpus=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
    .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
  const chars=Array.from(corpus,c=>c.charCodeAt(0)),end=35000;
  assert.ok(chars.length>=45000,"Need a real untouched text tail");
  const g=new Geometry({D:5,lr:.03,neg:3,repel:.3,every:1000000000,seed:17});
  for(let i=1;i<end;i++)g.learn(chars[i-1],chars[i]);
  const xs=[];
  for(let t=10000;t<end;t++){
    const p=g.V.get(chars[t-1]),q=g.U.get(chars[t]);
    if(p&&q)xs.push(p.map((v,i)=>wrap(q[i]-v)));
  }
  assert.ok(xs.length>24000);
  const D=5,mean=Array(D).fill(0),cov=Array.from({length:D},()=>Array(D).fill(0));
  for(const x of xs)for(let i=0;i<D;i++)mean[i]+=x[i]/xs.length;
  for(const x of xs)for(let i=0;i<D;i++)for(let j=0;j<D;j++)
    cov[i][j]+=(x[i]-mean[i])*(x[j]-mean[j])/xs.length;
  const correlations=[];
  for(let i=0;i<D;i++)for(let j=i+1;j<D;j++)
    correlations.push(cov[i][j]/Math.sqrt(cov[i][i]*cov[j][j]));
  const ridge=.003,regularized=cov.map((row,i)=>row.map((v,j)=>v+(i===j?ridge:0))),precision=inverse(regularized);
  const alphabet=[...g.U.keys()].sort((a,b)=>a-b);
  const r=rng(781),shuffled=shuffle(alphabet,r);
  const wrongTarget=new Map(alphabet.map((a,i)=>[a,g.U.get(shuffled[i])]));
  let N=0,full=0,euclidean=0,whitened=0,broken=0;
  const byAxis=Array(D).fill(0);
  for(let t=end;t<chars.length;t++){
    const before=g.V.get(chars[t-1]),actual=chars[t];
    if(!before||!g.U.has(actual))continue;
    let best=[-Infinity,null],eBest=[Infinity,null],wBest=[Infinity,null],bBest=[-Infinity,null];
    let component=Array(D).fill(null).map(()=>[-Infinity,null]);
    for(const candidate of alphabet){
      const target=g.U.get(candidate),delta=target.map((v,i)=>wrap(v-before[i]));
      let cos=0,euc=0;
      for(let d=0;d<D;d++){
        const z=Math.cos(2*Math.PI*delta[d]);
        cos+=z;euc+=delta[d]**2;
        if(z>component[d][0])component[d]=[z,candidate];
      }
      const whiten=quad(delta.map((x,i)=>x-mean[i]),precision);
      if(cos>best[0])best=[cos,candidate];
      if(euc<eBest[0])eBest=[euc,candidate];
      if(whiten<wBest[0])wBest=[whiten,candidate];
      const bad=wrongTarget.get(candidate);
      const badScore=before.reduce((a,v,d)=>a+Math.cos(2*Math.PI*wrap(bad[d]-v)),0);
      if(badScore>bBest[0])bBest=[badScore,candidate];
    }
    N++;full+=+(best[1]===actual);euclidean+=+(eBest[1]===actual);
    whitened+=+(wBest[1]===actual);broken+=+(bBest[1]===actual);
    for(let d=0;d<D;d++)byAxis[d]+=+(component[d][1]===actual);
  }
  assert.ok(N>9000);
  assert.ok(full>broken,"Native frozen text geometry must outrank a shuffled-symbol negative control");
  const accuracy={nativePeriodicCosine:full/N,rawTorusEuclidean:euclidean/N,
    covarianceWhitened:whitened/N,shuffledSymbolControl:broken/N,
    singleAxis:byAxis.map(v=>v/N)};
  console.log("V30_REAL_NATIVE_TEXT_5D_ORTHOGONALITY_ABLATION",JSON.stringify({
    trainedOriginalGeometrySteps:end-1,heldoutCharacters:N,nativeDimension:D,
    learnedAxisPairCorrelations:correlations,
    correlationSpread:scalarStats(correlations),
    covarianceTrainingPairs:xs.length,regularization:ridge,
    accuracy,whiteningImprovementOverNative:accuracy.covarianceWhitened-accuracy.nativePeriodicCosine,
    interpretation:"Frozen real text metric comparison; no free-text semantic goal accuracy asserted."
  }));
});
