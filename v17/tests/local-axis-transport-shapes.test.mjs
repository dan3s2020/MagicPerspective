import test from "node:test";
import assert from "node:assert/strict";
import {
 identity,compose,inverse,apply,same,seeded,randomFrame,
 world,stateView,physicalTransport,physicalProbe,LocalAxisLearner,execute,calibrate
} from "../research/local-axes/transport.mjs";

// Native ConstructedTransitionGraph stores all observed measurements.
// Hidden true frames are used ONLY for physical outcomes and scoring, never
// passed into LocalAxisLearner's constructor or predictShape().
test("signed multidimensional axes support a reversible nontrivial local frame transport",()=>{
 for(const D of [2,3,4,5,6]){
  const rand=seeded(901+D);
  for(let i=0;i<80;i++){
   const A=randomFrame(D,rand),B=randomFrame(D,rand),T=compose(inverse(B),A);
   assert.ok(same(compose(T,inverse(T)),identity(D)));
   assert.ok(same(compose(B,T),A));
   for(let k=1;k<=D;k++){
    assert.equal(apply(B,apply(T,k)),apply(A,k));
    assert.equal(apply(B,apply(T,-k)),apply(A,-k));
   }
  }
 }
});
test("actual V17 observed-edge evidence generalizes to HELDOUT graph links in 2D,3D,4D,5D",()=>{
 const results=[];
 for(const D of [2,3,4,5]){
  let correct=0,total=0,covered=0,optimal=0,baseline=0,trajectory=0,steps=0,heldoutTraversals=0;
  const runs=12,pathsPerWorld=28;
  for(let seed=1;seed<=runs;seed++){
   const w=world({D,side:3,seed:100+seed}),m=new LocalAxisLearner(stateView(w));
   const report=calibrate(w,m,{repeat:1,noise:0,seed:991});
   assert.equal(report.covered,w.size,"full spanning-tree frame synchronization");
   assert.equal(report.conflicts,0);
   for(const {u,v} of w.withheld){
    const predicted=compose(inverse(m.inferred[v]),m.inferred[u]);
    const trueT=physicalTransport(w,u,v);
    correct+=+same(predicted,trueT);total++;
   }
   const rng=seeded(88661+seed*17);
   for(let t=0;t<pathsPerWorld;t++){
    const start=Math.floor(rng()*w.size),goal=Math.floor(rng()*w.size);
    if(goal===start)continue;
    const p=m.predictShape(start,goal),actual=execute(w,p);
    const g=execute(w,m.predictShape(start,goal,{ablation:"global-only"}));
    const held=new Set(w.withheld.map(e=>e.u+":"+e.v));
    if(p.nodes.some((u,i)=>i<p.actions.length&&held.has(Math.min(u,p.nodes[i+1])+":"+Math.max(u,p.nodes[i+1]))))heldoutTraversals++;
    optimal++;trajectory+=+actual.exactPredictedTrajectory;baseline+=+g.exactPredictedTrajectory;
    assert.equal(actual.actions,p.optimal);
    steps+=p.actions.length;
   }
   covered+=report.covered;
  }
  assert.equal(correct,total,"all withheld edges must be predicted correctly");
  assert.equal(trajectory,optimal,"the whole pre-action route must physically execute exactly");
  assert.ok(baseline<optimal*.8,JSON.stringify({D,baseline,optimal}));
  assert.ok(heldoutTraversals>0,"some unseen edges must actually be traversed");
  results.push({D,worlds:runs,nodeFramesCalibrated:covered,withheldEdges:total,
    heldoutTransportAccuracy:correct/total,preactionRoutes:optimal,
    exactRoutes:trajectory,globalAxesOnlyRoutes:baseline,
    meanPathLength:steps/optimal,pathsCrossingUnobservedEdges:heldoutTraversals});
 }
 console.log("LEARNED_LOCAL_AXES_HELDOUT_ROUTES",JSON.stringify(results));
});
test("a randomized local-axis EVIDENCE CONTROL destroys the generalization",()=>{
 let learned=0,scrambled=0,calibrationFail=0,tests=0;
 for(let seed=1;seed<=28;seed++){
  const w=world({D:4,side:3,seed:500+seed});
  const m=new LocalAxisLearner(stateView(w)),bad=new LocalAxisLearner(stateView(w));
  calibrate(w,m,{repeat:3,seed:555});
  const report=calibrate(w,bad,{repeat:3,seed:555,shuffle:true});
  calibrationFail+=+(report.covered<w.size);
  for(const {u,v} of w.withheld){
   const T=physicalTransport(w,u,v);
   learned+=+same(compose(inverse(m.inferred[v]),m.inferred[u]),T);
   const F=bad.inferred;
   scrambled+=+(F[u]!==null&&F[v]!==null&&same(compose(inverse(F[v]),F[u]),T));
   tests++;
  }
 }
 assert.equal(learned,tests);
 assert.ok(scrambled/tests<.1,JSON.stringify({scrambled,tests}));
 console.log("LOCAL_FRAME_CAUSAL_PERMUTATION_CONTROL",
   JSON.stringify({testEdges:tests,learnedAccuracy:learned/tests,scrambledAccuracy:scrambled/tests,brokenCoverageWorlds:calibrationFail}));
});
test("fewer local-axis observations remove the ability to reconstruct higher-dimensional frames",()=>{
 const D=5,w=world({D,side:3,seed:7381}),l=new LocalAxisLearner(stateView(w));
 for(const {u,v}of w.tree)for(let k=1;k<=2;k++)l.observe(u,v,k,physicalProbe(w,u,v,k));
 const a=l.infer();
 assert.ok(a.covered<w.size,"two axes cannot determine an arbitrary 5D signed permutation");
 const full=new LocalAxisLearner(stateView(w));
 for(const {u,v}of w.tree)for(let k=1;k<=D;k++)full.observe(u,v,k,physicalProbe(w,u,v,k));
 const b=full.infer();
 assert.equal(b.covered,w.size);
 console.log("INCOMPLETE_AXIS_GATING_ABLATION",JSON.stringify({D,partialCoverage:a.covered,total:w.size,allAxesCoverage:b.covered}));
});
test("repeated stochastic measurements let local node charts survive noise; one-shot often does not",()=>{
 let one=0,many=0,oneCovered=0,manyCovered=0,all=0;
 for(let seed=1;seed<=24;seed++){
  const w=world({D:3,side:3,seed:70+seed});
  const a=new LocalAxisLearner(stateView(w)),b=new LocalAxisLearner(stateView(w));
  const x=calibrate(w,a,{repeat:1,noise:.30,seed:1900+seed});
  const y=calibrate(w,b,{repeat:13,noise:.30,seed:1900+seed});
  oneCovered+=x.covered/w.size;manyCovered+=y.covered/w.size;
  for(const e of w.withheld){
   const T=physicalTransport(w,e.u,e.v);
   one+=(a.inferred[e.u]&&a.inferred[e.v]&&same(compose(inverse(a.inferred[e.v]),a.inferred[e.u]),T))?1:0;
   many+=(b.inferred[e.u]&&b.inferred[e.v]&&same(compose(inverse(b.inferred[e.v]),b.inferred[e.u]),T))?1:0;
   all++;
  }
 }
 assert.ok(many/all>.90,JSON.stringify({one,many,all}));
 assert.ok(many>one*2,JSON.stringify({one,many,all}));
 console.log("NOISY_LOCAL_AXES_RECOVERY",JSON.stringify({
  withheldEdges:all,oneShotAccuracy:one/all,repeated13Accuracy:many/all,
  oneShotMeanCoverage:oneCovered/24,repeatedMeanCoverage:manyCovered/24}));
});
test("non-flat transports cause detectable loop inconsistency instead of fabricated solutions",()=>{
 const w=world({D:4,side:3,seed:143}),m=new LocalAxisLearner(stateView(w));
 const before=calibrate(w,m),held=w.withheld[0];
 assert.equal(before.conflicts,0);
 const T=physicalTransport(w,held.u,held.v);
 // Inject an explicitly INCONSISTENT but valid signed rotation on one loop-closing edge.
 const extra=identity(w.D);extra[0]=2;extra[1]=1;
 const twisted=compose(extra,T);
 for(let k=1;k<=w.D;k++)m.observe(held.u,held.v,k,apply(twisted,k));
 const after=m.infer();
 assert.ok(after.conflicts>0);
 console.log("HOLONOMY_LOOP_CONTRADICTION",JSON.stringify({
  dimensions:w.D,nodes:w.size,loopEdge:[held.u,held.v],
  beforeConflicts:before.conflicts,afterConflicts:after.conflicts
 }));
});
