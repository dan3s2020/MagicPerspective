// Physics-maze research: same native V17 Discoverer, no replacement learner.
// No output in this file is evidence of a newly discovered physical law.
// Run from pinned-original repository checkout: node research/physics-maze-20261113/run.mjs
import {Discoverer, playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze, RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";

const SEED = 17;
const PHASE_N = 16;
const HELDOUT = [1,2,3,5,6,7,9,10,11,13,14,15];
const assert = (test, message) => {if (!test) throw Error(message);};
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const probabilityD0 = phi => Math.cos(phi/2)**2;
const quantumBarrier = hbar => {
  if(hbar === 0) return 0;
  const E=.5, V0=1, m=1, width=1;
  const kappa=Math.sqrt(2*m*(V0-E))/hbar;
  const sinh=Math.sinh(kappa*width);
  return 1/(1+(V0*V0*sinh*sinh)/(4*E*(V0-E)));
};
const route = (brain, kinds, adj, at) => {
  const r = brain.shapeGraph(kinds, adj, at, {details:true});
  return {path:r?.path?.map(e=>e.to)??null, reached:r?.targetReached??false};
};
function trainOriginalMazeOrganism() {
  const brain = new Discoverer(SEED);
  let solved=0;
  for(let i=0;i<160;i++) {
    // Real original playExercise: retina, intervention, measured resistance,
    // learning, original internal shape prediction before action.
    const result=playExercise(makeMaze(1000003+i*7919,7,.3),brain);
    solved += Number(result.solved);
  }
  return {brain,solved};
}
function phaseWorld(brain) {
  // Physics supplies experimental outcomes, but NEVER a destination answer
  // to shapeGraph at test time. Phase circle adjacency is an explicit prior.
  const rng=new RNG(20261112), samples=[];
  for(const [phaseIndex,phi] of [[0,0],[8,Math.PI]]) {
    const counts=[0,0];
    for(let shot=0;shot<64;shot++)counts[Number(rng.next()>=probabilityD0(phi))]++;
    samples.push({phaseIndex,photons:64,detectorCounts:counts,majority:counts[0]>counts[1]?0:1});
  }
  const kinds=Array(PHASE_N).fill(0).concat([2,2]);
  const adj=Array.from({length:18},()=>[]);
  for(let i=0;i<PHASE_N;i++)adj[i].push((i+1)%PHASE_N,(i+PHASE_N-1)%PHASE_N);
  for(const s of samples)adj[s.phaseIndex].push(16+s.majority);
  const predict = i => {
    const r=route(brain,kinds,adj,i);
    const end=r.path?.at(-1);
    return {detector:end===16?0:end===17?1:null,path:r.path};
  };
  const conditions=HELDOUT.map(i=>{
    const p=probabilityD0(i*2*Math.PI/PHASE_N);
    const pred=predict(i);
    return {phaseIndex:i,phaseRadians:i*2*Math.PI/PHASE_N,pD0:p,
      organismDetector:pred.detector,mostLikelyQuantumDetector:p>.5?0:1,
      correct:pred.detector===(p>.5?0:1),path:pred.path};
  });
  const correct=conditions.filter(x=>x.correct).length;
  const calibrationMAE=conditions.reduce((s,x)=>
    s+Math.abs((x.organismDetector===0?1:0)-x.pD0),0)/conditions.length;
  const shuffled=[];
  const shuffleRng=new RNG(20261113);
  for(let trial=0;trial<200;trial++) {
    const perm=Array.from({length:PHASE_N},(_,i)=>i);
    for(let i=PHASE_N-1;i>0;i--) {
      const j=shuffleRng.int(i+1);
      [perm[i],perm[j]]=[perm[j],perm[i]];
    }
    shuffled.push(HELDOUT.filter(i=>predict(perm[i]).detector===
      (probabilityD0(i*2*Math.PI/PHASE_N)>.5?0:1)).length);
  }
  const phaseBlindAdj=[[1,2],[3,4],[3,4],[],[]],phaseBlindKinds=[3,0,0,2,2];
  const phaseBlind0=route(brain,phaseBlindKinds,phaseBlindAdj,0);
  const phaseBlindPi=route(brain,phaseBlindKinds,phaseBlindAdj,0);
  const blindDetector=phaseBlind0.path?.at(-1)===3?0:1;
  assert(correct===12,"Phase interpolation control unexpectedly failed");
  assert(same(phaseBlind0,phaseBlindPi),"Phase-blind worlds unexpectedly differed");
  return {trainingSamples:samples,periodicGeometrySupplied:true,
    heldout:conditions,correctMostLikely:correct,total:HELDOUT.length,
    phaseBlind:{at0:phaseBlind0,atPi:phaseBlindPi,correctOfTwo:Number(blindDetector===0)+Number(blindDetector===1)},
    shuffledControl:{trials:200,meanCorrect:shuffled.reduce((s,x)=>s+x,0)/200,
      min:Math.min(...shuffled),max:Math.max(...shuffled)},
    probabilityMAE:calibrationMAE};
}
function tunnelingWorld(brain) {
  return [0,.1,.25,.5,1,2].map((hbar,i)=>{
    const p=quantumBarrier(hbar),rng=new RNG(1000+i*71);
    let observedTransmissions=0;
    for(let j=0;j<512;j++)if(rng.next()<p)observedTransmissions++;
    const kinds=[3,1,2],barrierOnly=[[1],[2],[]];
    // Direct transition is ONLY introduced if the world ACTUALLY transmitted
    // a particle in the training observations. No unseen outcome inserted.
    const observedEdges=observedTransmissions?[[2,1],[2],[]]:barrierOnly;
    return {hbar,physicalTransmissionProbability:p,trials:512,
      observedTransmissions,
      organismBarrierOnly:route(brain,kinds,barrierOnly,0),
      organismWithObservedEdge:route(brain,kinds,observedEdges,0)};
  });
}
function fockQuantumMean(m,w,x0,p0,hbar,t,N=48) {
  // Independent finite Fock-basis Schrödinger evolution of coherent state.
  const ar=Math.sqrt(m*w/(2*hbar))*x0,ai=p0/Math.sqrt(2*m*hbar*w);
  const cr=new Float64Array(N),ci=new Float64Array(N);
  cr[0]=Math.exp(-(ar*ar+ai*ai)/2);
  for(let n=1;n<N;n++){
    cr[n]=(cr[n-1]*ar-ci[n-1]*ai)/Math.sqrt(n);
    ci[n]=(cr[n-1]*ai+ci[n-1]*ar)/Math.sqrt(n);
  }
  const re=new Float64Array(N),im=new Float64Array(N);
  for(let n=0;n<N;n++){
    const phase=(n+.5)*w*t,c=Math.cos(phase),s=Math.sin(phase);
    re[n]=cr[n]*c+ci[n]*s;
    im[n]=ci[n]*c-cr[n]*s;
  }
  let ra=0,ia=0;
  for(let n=1;n<N;n++){
    const f=Math.sqrt(n);
    ra+=f*(re[n-1]*re[n]+im[n-1]*im[n]);
    ia+=f*(re[n-1]*im[n]-im[n-1]*re[n]);
  }
  return {x:Math.sqrt(2*hbar/(m*w))*ra,p:Math.sqrt(2*m*hbar*w)*ia};
}
function classicalQuantumWorld(brain) {
  const configs=[{m:1,w:.5,x0:2,p0:-1},{m:2,w:1.3,x0:-1,p0:.7},
                 {m:.4,w:2.5,x0:.6,p0:1.8}];
  return configs.map(c=>{
    let maxPositionError=0,maxMomentumError=0;
    for(let i=0;i<=200;i++){
      const t=10*i/200, quantum=fockQuantumMean(c.m,c.w,c.x0,c.p0,1,t);
      const x=c.x0*Math.cos(c.w*t)+(c.p0/(c.m*c.w))*Math.sin(c.w*t);
      const p=c.p0*Math.cos(c.w*t)-c.m*c.w*c.x0*Math.sin(c.w*t);
      maxPositionError=Math.max(maxPositionError,Math.abs(x-quantum.x));
      maxMomentumError=Math.max(maxMomentumError,Math.abs(p-quantum.p));
    }
    // The graph is a supplied time chain, so these routes have no physics
    // content; specifically the same shape survives changing m,w,x0,p0.
    const kinds=Array(20).fill(0),adj=Array.from({length:20},(_,i)=>i<19?[i+1]:[]);
    kinds[12]=2;
    const predicted=route(brain,kinds,adj,0);
    assert(maxPositionError<1e-10&&maxMomentumError<1e-10,
           "Independent Schrödinger/Newton harmonic correspondence failed");
    return {...c,quantumHilbertDimension:48,samples:201,maxPositionError,
      maxMomentumError,nativeGraphShape:predicted};
  });
}
export function runPhysicsMazes() {
  const {brain,solved}=trainOriginalMazeOrganism();
  assert(brain.self()===3&&brain.attract(2)>.9&&brain.conduct(1)<.5,
         "Original organism did not learn the maze categories");
  const phase=phaseWorld(brain),tunneling=tunnelingWorld(brain),
    correspondence=classicalQuantumWorld(brain);
  return {date:"2026-11-13",originalCommit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    sourceClasses:["Discoverer","playExercise","makeMaze"],
    nativeMaze:{episodes:160,solved,learnedGoalAttraction:brain.attract(2),
      learnedWallConductance:brain.conduct(1),self:brain.self(),
      knownMovements:Array.from({length:8},(_,i)=>brain.effect(i)).filter(Boolean).length},
    interference:phase,tunneling,correspondence,
    verdict:"NO NEW PHYSICS LAW FOUND. Phase-conditioned graph navigation succeeds only when circular phase geometry and observed endpoint outcomes are supplied. Original graph mechanism does not recover quantum amplitudes, Born probabilities or unified gravity.",
    constraints:["Do not treat supplied graph topology or target kinds as discovery.",
      "Shuffled control tests geometry dependence, not novelty of law.",
      "Finite Fock propagation is an independent numerical known-law control.",
      "No modifications to original V17 source or original model checkpoints."]};
}
