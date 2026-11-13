// Same ORIGINAL V17 Discoverer in a gravitational interferometer maze.
// A learned extension interprets PHOTON/ATOM-style two-detector observations.
// No gravitational phase equation in the learner; known physical equations
// are in the external weak-field and Schwarzschild world simulators.
// This is a KNOWN-PHYSICS regression experiment, NOT quantum gravity solved.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const phaseWeak=o=>o.m*o.g*o.height*o.time/o.hbar;
function phaseSchwarzschild(o,c,r){
  // Exact difference of static-clock redshift lapses in Schwarzschild
  // coordinate time; rationalized to avoid subtractive cancellation.
  const inU=2*o.g*r/(c*c),outU=2*o.g*r*r/((r+o.height)*c*c);
  if(inU>=1||outU>=1)throw Error("Static clock lies behind horizon");
  return (o.m*o.time/o.hbar)*
    (2*o.g*r*o.height/(r+o.height))/
    (Math.sqrt(1-inU)+Math.sqrt(1-outU));
}
const p0=phi=>(1+Math.cos(phi))/2;
function measureChannels(phi,rng,shots){
  let zero=0,quarter=0;
  const a=p0(phi),b=p0(phi-Math.PI/2);
  for(let k=0;k<shots;k++){
    zero+=Number(rng.next()<a);
    quarter+=Number(rng.next()<b);
  }
  return [2*zero/shots-1,2*quarter/shots-1];
}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function phaseExperienced(before,after){
  return Math.atan2(cross(before,after),
    before[0]*after[0]+before[1]*after[1]);
}
const CANDIDATES=[];
for(let a=0;a<=2;a++)for(let b=0;b<=2;b++)for(let c=0;c<=2;c++)
for(let d=0;d<=2;d++)for(let e=-2;e<=0;e++)CANDIDATES.push({a,b,c,d,e});
const basis=(o,k)=>o.m**k.a*o.g**k.b*o.height**k.c*
  o.time**k.d*o.hbar**k.e;
function physicalRows(seed,n,{kind="weak",shots=1024}={}){
  const rng=new RNG(seed),rows=[];
  for(let i=0;i<n;i++){
    const o={m:.5+rng.next(),g:.2+.9*rng.next(),
      height:.2+.7*rng.next(),time:.5+.8*rng.next(),
      hbar:.8+rng.next()};
    const beforePhase=rng.next()*Math.PI*2;
    const effect=kind==="weak"?phaseWeak(o):
      kind==="weakSchwarzschild"?phaseSchwarzschild(o,1000,500):
      phaseSchwarzschild(o,3,3);
    const before=measureChannels(beforePhase,rng,shots),
      after=measureChannels(beforePhase+effect,rng,shots);
    rows.push({...o,before,after,beforePhase,
      experiencedPhase:phaseExperienced(before,after),
      truePhaseEffect_FOR_SCORING_ONLY:effect});
  }
  return rows;
}
function fitModel(rows,k){
  let top=0,bot=0;
  for(const row of rows){
    const v=basis(row,k);
    top+=v*row.experiencedPhase;bot+=v*v;
  }
  return bot>1e-20?top/bot:0;
}
function scoreModel(rows,k,coeff){
  let phaseError=0,detectorError=0,phaseStatic=0,detectorStatic=0;
  const preview=[];
  for(const row of rows){
    const predicted=coeff*basis(row,k),trueEffect=row.truePhaseEffect_FOR_SCORING_ONLY;
    const phaseDiff=Math.atan2(Math.sin(predicted-trueEffect),
      Math.cos(predicted-trueEffect));
    const originalAngle=Math.atan2(row.before[1],row.before[0]);
    const detector=p0(originalAngle+predicted),trueDetector=p0(row.beforePhase+trueEffect);
    phaseError+=Math.abs(phaseDiff);
    detectorError+=Math.abs(detector-trueDetector);
    phaseStatic+=Math.abs(trueEffect);
    detectorStatic+=Math.abs(p0(originalAngle)-trueDetector);
    if(preview.length<4)preview.push({predictedPhase:predicted,truePhase:trueEffect,
      predictedDetector:detector,actualDetector:trueDetector});
  }
  return {n:rows.length,phaseMAE:phaseError/rows.length,
    detectorProbabilityMAE:detectorError/rows.length,
    phaseBlindDetectorMAE:detectorStatic/rows.length,
    meanTruePhaseMagnitude:phaseStatic/rows.length,preview};
}
class GravityDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.gravitationalExperience=[];}
  livedQuantumGravitationalEvent(row){this.gravitationalExperience.push(row);}
  hypothesisMaze(goal) {
    const N=CANDIDATES.length,types=Array(N).fill(0),edges=Array.from({length:N},()=>[]);
    types[0]=3;types[goal]=2;
    const id=q=>CANDIDATES.findIndex(t=>t.a===q.a&&t.b===q.b&&
      t.c===q.c&&t.d===q.d&&t.e===q.e);
    for(let i=0;i<N;i++) {
      const q=CANDIDATES[i];
      for(const axis of ["a","b","c","d","e"])for(const d of [-1,1]) {
        const to=id({...q,[axis]:q[axis]+d});
        if(to>=0)edges[i].push({to,action:axis+":"+d});
      }
    }
    const shape=this.shapeGraph(types,edges,0,{details:true});
    if(!shape?.targetReached)throw Error("Original shape could not navigate gravity hypothesis");
    return {actions:shape.path.map(x=>x.action),steps:shape.path.length,reached:true};
  }
  discover(validation){
    let best=null;
    for(let id=0;id<CANDIDATES.length;id++){
      const k=CANDIDATES[id],coeff=fitModel(this.gravitationalExperience,k);
      let error=0;
      for(const row of validation){
        const d=coeff*basis(row,k)-row.experiencedPhase;
        error+=d*d;
      }
      error/=validation.length;
      if(!best||error<best.error)best={id,k,coeff,error};
    }
    return {...best,nativeRoute:this.hypothesisMaze(best.id)};
  }
}
export function runGravity(){
  const brain=new GravityDiscoverer(17);
  let mazeSolved=0;
  for(let i=0;i<160;i++)
    mazeSolved+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  const training=physicalRows(411,420,{kind:"weak"});
  for(const row of training)brain.livedQuantumGravitationalEvent(row);
  const model=brain.discover(physicalRows(412,160,{kind:"weak"}));
  const ordinary=scoreModel(physicalRows(413,320,{kind:"weak",shots:2048}),model.k,model.coeff);
  const weakGR=scoreModel(physicalRows(414,320,{kind:"weakSchwarzschild",shots:2048}),model.k,model.coeff);
  const strongGR=scoreModel(physicalRows(415,320,{kind:"strongSchwarzschild",shots:2048}),model.k,model.coeff);
  const old=physicalRows(411,420,{kind:"weak"}),ys=old.map(r=>r.experiencedPhase);
  const rng=new RNG(1881);
  for(let i=ys.length-1;i>0;i--){const j=rng.int(i+1);[ys[i],ys[j]]=[ys[j],ys[i]];}
  const bad=new GravityDiscoverer(17);
  for(let i=0;i<160;i++)playExercise(makeMaze(1000003+i*7919,7,.3),bad);
  for(let i=0;i<old.length;i++)bad.livedQuantumGravitationalEvent({...old[i],experiencedPhase:ys[i]});
  const badModel=bad.discover(physicalRows(412,160,{kind:"weak"}));
  const shuffled=scoreModel(physicalRows(413,320,{kind:"weak",shots:2048}),badModel.k,badModel.coeff);
  return {date:"2026-11-13",nativeV17Source:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    originalMazeSolved:mazeSolved,trainingActions:training.length,
    candidates:CANDIDATES.length,model,
    test:{weakQuantum:ordinary,weakSchwarzschild:weakGR,strongSchwarzschild:strongGR},
    control:{shuffledModel:badModel,shuffled},
    knownPhysicsOracle:"weak gravitational phase m*g*h*t/hbar; separate Schwarzschild static-clock lapse difference",
    verdict:"Same native organism's added physical causal hypothesis body recovers known weak-field gravity-induced quantum phase law from detector experiences. Predictions degrade at stronger spacetime curvature; no quantum gravity or new law discovered.",
    limitations:["The monomial grammar, two quadrature readout and phase inverse are supplied research structures.",
      "The simulated weak-field training law is known and exactly matches a monomial candidate.",
      "Schwarzschild redshift is a classical GR background, not dynamical quantum spacetime.",
      "No real atom interferometer or laboratory measurement involved."]};
}
