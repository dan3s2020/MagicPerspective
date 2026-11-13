// Native V17 physics body extension: a continuous causal motor attached to
// the ORIGINAL Discoverer. Its original shapeGraph still selects every action.
// No quantum equations, trigonometric functions, time, or omega enter the learner.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";

const TAU=2*Math.PI, THETA=0.23;
const abs2=(a,b)=>a*a+b*b;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fitObservationMetric(samples) {
  // Purely observational: center and relative axis scale from unlabeled samples.
  const n=samples.length;
  const mean=[0,0];
  for(const s of samples){mean[0]+=s[0]/n;mean[1]+=s[1]/n;}
  const scale=[0,0];
  for(const s of samples){scale[0]+=(s[0]-mean[0])**2/n;
    scale[1]+=(s[1]-mean[1])**2/n;}
  scale[0]=Math.sqrt(scale[0]);scale[1]=Math.sqrt(scale[1]);
  if(Math.min(...scale)<1e-10)throw Error("Unobservable metric axis");
  return {mean,scale};
}
const normalize=(r,m)=>[(r[0]-m.mean[0])/m.scale[0],
  (r[1]-m.mean[1])/m.scale[1]];
const denormalize=(r,m)=>[r[0]*m.scale[0]+m.mean[0],
  r[1]*m.scale[1]+m.mean[1]];

// A single extended native organism, with the same original maze and shape body.
// The added organ accumulates lived 2D physical action consequences, rather
// than receiving the true physical law or answers at future states.
class PhysicsDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.physicsBody=new Map();this.physicsGauge=1;}
  liveMotor(before,after,action=0){
    if(!this.physicsBody.has(action))
      this.physicsBody.set(action,{dot:0,cross:0,norm:0,experiences:0});
    const b=this.physicsBody.get(action);
    b.dot+=before[0]*after[0]+before[1]*after[1];
    b.cross+=before[0]*after[1]-before[1]*after[0];
    b.norm+=abs2(...before);
    b.experiences++;
  }
  learnedMotor(action=0){
    const b=this.physicsBody.get(action);
    if(!b || b.experiences<4||b.norm<1e-10)return null;
    const d=b.dot/b.norm, c=b.cross/b.norm, r=Math.hypot(d,c);
    if(r<1e-10)return null;
    return [d/r,c/r]; // Preserves measured 2D norm; no imposed angle.
  }
  motorStep(state,action=0,flip=this.physicsGauge){
    const motor=this.learnedMotor(action);
    if(!motor)return null;
    const [c,s0]=motor, s=s0*flip;
    return [c*state[0]-s*state[1],s*state[0]+c*state[1]];
  }
  calibrateHandedness(start,next,action=0){
    const same=this.motorStep(start,action,+1),flip=this.motorStep(start,action,-1);
    const err1=abs2(same[0]-next[0],same[1]-next[1]);
    const err2=abs2(flip[0]-next[0],flip[1]-next[1]);
    this.physicsGauge=err1<err2?+1:-1;
    return {selected:this.physicsGauge,consistentError:Math.min(err1,err2),
      excludedError:Math.max(err1,err2)};
  }
  forecastOnNativeShape(raw,metric,steps,{gauge=this.physicsGauge}={}){
    const kinds=Array(steps+1).fill(0),edges=Array.from({length:steps+1},
      (_,i)=>i<steps?[{to:i+1,action:0}]:[]);
    kinds[0]=3;
    kinds[steps]=2;
    const native=this.shapeGraph(kinds,edges,0,{details:true});
    if(!native?.targetReached || native.path.length!==steps)
      throw Error("Original Discoverer did not select a physics path");
    let state=normalize(raw,metric);
    for(const intervention of native.path){
      state=this.motorStep(state,intervention.action,gauge);
      if(!state)throw Error("Original organism's causal motor is not learned");
    }
    return denormalize(state,metric);
  }
}
function trainNative(seed=17) {
  const brain=new PhysicsDiscoverer(seed);let solved=0;
  for(let i=0;i<160;i++)
    solved+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  return {brain,solved};
}
function classicalObservation({m,w,R,phi}) {
  return [R*Math.cos(phi),-m*w*R*Math.sin(phi)];
}
function classicalTraining(brain,{shufflePairs=false}={}) {
  const details=[];
  for(let world=0;world<3;world++){
    const rng=new RNG(1100+world*777);
    const env={m:[.7,2.1,4.2][world],w:[1.3,.43,2.7][world],
      R:[.8,2.4,1.1][world]};
    const phases=Array.from({length:512},()=>TAU*rng.next());
    const before=phases.map(phi=>classicalObservation({...env,phi}));
    const after=phases.map(phi=>classicalObservation({...env,phi:phi+THETA}));
    const metric=fitObservationMetric(before);
    // Unpaired classical snapshots are used for a local sensor metric.
    // SHUFFLE control breaks actual before->after causal correspondences.
    const perm=Array.from({length:phases.length},(_,i)=>i);
    if(shufflePairs)for(let i=perm.length-1;i>0;i--){
      const j=rng.int(i+1);[perm[i],perm[j]]=[perm[j],perm[i]];
    }
    for(let j=0;j<before.length;j++)
      brain.liveMotor(normalize(before[j],metric),normalize(after[perm[j]],metric),0);
    details.push({world,rawMetricRatio:metric.scale[1]/metric.scale[0],
      truePhysicalRatio_FOR_SCORING_ONLY:env.m*env.w,experiences:phases.length});
  }
  return details;
}
function quantumProb(phi,analyzer=0) {
  // INDEPENDENT physical world: amplitudes A0=(1+exp(i phi))/2,
  // A1=(1-exp(i phi))/2; analyzer changes relative phase.
  const re=Math.cos(phi-analyzer),im=Math.sin(phi-analyzer);
  const a0=[(1+re)/2,im/2],a1=[(1-re)/2,-im/2];
  const p0=abs2(...a0),p1=abs2(...a1);
  if(Math.abs(p0+p1-1)>1e-12)throw Error("Nonunitary quantum oracle");
  return p0;
}
function photonContrast(phi,analyzer,shots,rng){
  const p0=quantumProb(phi,analyzer);
  let cnt=0;
  for(let k=0;k<shots;k++)if(rng.next()<p0)cnt++;
  return 2*cnt/shots-1;
}
function quantumObservation(phi,shots,rng){
  // Two complementary ACTUAL measurement settings, not hidden complex state.
  return [photonContrast(phi,0,shots,rng),
    photonContrast(phi,Math.PI/2,shots,rng)];
}
function quantumMetric(seed=9801) {
  const rng=new RNG(seed),raw=[];
  for(let i=0;i<256;i++)
    raw.push(quantumObservation(rng.next()*TAU,4096,rng));
  return fitObservationMetric(raw);
}
function gaugeExperiment(brain,metric) {
  // Exactly ONE quantum motor experiment; no unseen target examples.
  const rng=new RNG(78781),phi=1.23;
  const before=normalize(quantumObservation(phi,16384,rng),metric);
  const after=normalize(quantumObservation(phi+THETA,16384,rng),metric);
  return brain.calibrateHandedness(before,after);
}
function evaluateQuantum(brain,metric,{gauge=brain.physicsGauge,
                  increment=()=>THETA,seed=56789}={}) {
  const rng=new RNG(seed),rows=[];let absError=0,absErrorStatic=0,n=0;
  for(let world=0;world<128;world++){
    const startPhi=rng.next()*TAU;
    const raw=quantumObservation(startPhi,2048,rng);
    let physicalPhase=startPhi;
    for(let step=1;step<=12;step++){
      physicalPhase+=increment(rng,world,step);
      const observed=brain.forecastOnNativeShape(raw,metric,step,{gauge});
      const predicted=clamp((observed[0]+1)/2,0,1);
      const actual=quantumProb(physicalPhase,0);
      const staticP=clamp((raw[0]+1)/2,0,1);
      absError+=Math.abs(predicted-actual);
      absErrorStatic+=Math.abs(staticP-actual);
      n++;
      if(world<2&&step<=4)rows.push({world,step,initial:raw[0],
        predicted,actual,staticP});
    }
  }
  return {predictions:n,mae:absError/n,
    staticObservationMAE:absErrorStatic/n,preview:rows};
}
export function run() {
  const {brain,solved}=trainNative(17);
  const classical=classicalTraining(brain);
  const nativeMotor=brain.learnedMotor(0);
  const metric=quantumMetric();
  const chosenGauge=gaugeExperiment(brain,metric);
  const transfer=evaluateQuantum(brain,metric);
  const uncalibrated=evaluateQuantum(brain,metric,{gauge:1});
  const scrambled=trainNative(17).brain;
  classicalTraining(scrambled,{shufflePairs:true});
  const scrambledGauge=gaugeExperiment(scrambled,metric);
  const shuffled=evaluateQuantum(scrambled,metric);
  const mismatch=evaluateQuantum(brain,metric,{
    seed:65337,increment:(rng)=>THETA*(.3+1.4*rng.next())});
  const negative={nativeMazeSolved:solved,rawClassicalEnvironments:classical,
    learnedNativeMotor:nativeMotor,quantumUnlabeledMetric:metric,
    singleInterventionGauge:chosenGauge,transfer,
    withoutGaugeCalibration:uncalibrated,
    shuffledCausalPairs:{motor:scrambled.learnedMotor(),gauge:scrambledGauge,
      forecast:shuffled},mismatchedActionStrength:mismatch};
  if(!Number.isFinite(transfer.mae)||transfer.predictions!==1536)
    throw Error("Invalid original-organism transfer evaluation");
  return {date:"2026-11-13",status:"CROSS-DOMAIN PROJECT EXPERIMENT; NO NEW PHYSICAL LAW",
    originalV17Commit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    organismClass:"PhysicsDiscoverer extends original Discoverer",
    actionSelector:"unchanged original Discoverer.shapeGraph; real body actions",
    quantumAnswersHiddenUntilScoring:true,
    metricLearning:"unlabeled observed centroids and channel variances",
    causalLearning:"observed classical before/after complex correlation",
    oneQuantumInterventionForHandedness:true,
    result:negative,
    caveats:["The experimental motor increment is shared by design in the two worlds.",
      "The 2D observable channels are chosen by the researcher; not discovered de novo.",
      "The complex multiplication motor is an added existing mathematical operation, not a physics-law discovery.",
      "All detectors and classical positions are simulations; not measured laboratory data.",
      "General relativity and nonharmonic quantum dynamics not tested; physics is not unified."]};
}
