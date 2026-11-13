// Robustness experiments on the EXACT native V17 Discoverer; original files untouched.
// This file tests organism-seed variation, arbitrary sensory-code remapping,
// and adversarial nonuniform phase spacing. It does NOT infer a new physical law.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const TEST=[1,2,3,5,6,7,9,10,11,13,14,15];
function train(seed) {
  const brain=new Discoverer(seed);
  let solved=0;
  for(let i=0;i<160;i++) solved+=Number(
    playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  return {brain,solved};
}
function predict(brain,kinds,edges,index) {
  const r=brain.shapeGraph(kinds,edges,index,{details:true});
  const end=r?.path?.at(-1)?.to;
  return end===16?0:end===17?1:null;
}
function phaseGraph(encoding,physicallyObserved=true) {
  const kinds=Array(16).fill(0).concat(2,2);
  const edges=Array.from({length:18},()=>[]);
  let nTransitions=0;
  // Each observation is an action on the actual knob: BEFORE raw code,
  // AFTER raw code. The graph is recorded from lived transitions, not
  // constructed by numerically sorting the phase symbols.
  for(const delta of [1,-1]) {
    let physicalPosition=0;
    for(let step=0;step<16;step++) {
      const from=encoding[physicalPosition];
      physicalPosition=(physicalPosition+delta+16)%16;
      const to=encoding[physicalPosition];
      if(!edges[from].includes(to)) {
        edges[from].push(to);nTransitions++;
      }
    }
  }
  if(physicallyObserved) {
    // Calibration: real simulated detector readings at phase 0 and pi,
    // 64 shots each. Outcomes at any OTHER phase are held out.
    const detectorRng=new RNG(20261112);
    for(const [index,phi] of [[0,0],[8,Math.PI]]) {
      let count0=0,count1=0;
      for(let j=0;j<64;j++){
        if(detectorRng.next()<Math.cos(phi/2)**2)count0++;else count1++;
      }
      edges[encoding[index]].push(count0>count1?16:17);
    }
  }
  return {kinds,edges,nTransitions};
}
function permutation(seed) {
  const rng=new RNG(seed),a=Array.from({length:16},(_,i)=>i);
  for(let i=15;i>0;i--){
    const j=rng.int(i+1);[a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function nonlinearPhase(seed) {
  const rng=new RNG(29000+seed),weights=Array.from({length:16},
    ()=>.05+4*rng.next()**4),angles=[0];
  for(let i=0;i<16;i++){
    const section=Math.floor(i/8)*8;
    const total=weights.slice(section,section+8).reduce((a,b)=>a+b,0);
    angles.push(angles[i]+Math.PI*weights[i]/total);
  }
  return angles; // Explicitly hidden from the organism's state observations
}
export function runPhaseCausalTopology() {
  const organismSeeds=[];
  const straight=Array.from({length:16},(_,i)=>i);
  const learned=phaseGraph(straight);
  for(const seed of [1,2,3,7,11,17,23,41]){
    const {brain,solved}=train(seed);
    let correct=0;
    for(const i of TEST)correct+=Number(predict(brain,learned.kinds,
      learned.edges,i)===(Math.cos(i*Math.PI/16)**2>.5?0:1));
    organismSeeds.push({seed,mazeSolved:solved,correct,goalAttraction:brain.attract(2),
      wallConductance:brain.conduct(1)});
  }
  const brain=train(17).brain;
  const remappedCodes=[];
  for(const seed of [17,19,23,29,31,37,41,43,47,53]){
    const codes=permutation(seed),world=phaseGraph(codes);
    let correct=0;
    for(const phase of TEST)correct+=Number(predict(brain,world.kinds,
      world.edges,codes[phase])===(Math.cos(phase*Math.PI/16)**2>.5?0:1));
    remappedCodes.push({worldSeed:seed,observedDirectedEdges:world.nTransitions,
      correct,unseenDetectorTests:TEST.length,rawCodes:codes});
  }
  const nonuniform=[];
  for(let seed=0;seed<40;seed++){
    const actualAngles=nonlinearPhase(seed);
    let correct=0;
    for(const physical of TEST)correct+=Number(predict(brain,learned.kinds,
      learned.edges,physical)===(Math.cos(actualAngles[physical]/2)**2>.5?0:1));
    nonuniform.push({seed,correct,unseenDetectorTests:TEST.length,
      phaseAtIndex4:actualAngles[4],phaseAtIndex12:actualAngles[12]});
  }
  const avg=nonuniform.reduce((s,x)=>s+x.correct,0)/nonuniform.length;
  if(!organismSeeds.every(x=>x.correct===12))throw Error("Organism-seed parity failed");
  if(!remappedCodes.every(x=>x.correct===12&&x.observedDirectedEdges===32))
    throw Error("Learned-topology randomized-code transfer failed");
  return {originalCommit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    status:"PROJECT-LEVEL TRANSFER ONLY; NO NEW PHYSICS LAW",
    organismSeeds,remappedCodes,nonuniform,
    summary:{organismSeedsAllPerfect:organismSeeds.every(x=>x.correct===12),
      remappedScenarios:remappedCodes.length,
      totalRemappedCorrect:remappedCodes.reduce((s,x)=>s+x.correct,0),
      totalRemappedHeldout:remappedCodes.length*TEST.length,
      nonuniformMeanCorrect:avg,nonuniformMin:Math.min(...nonuniform.map(x=>x.correct)),
      nonuniformMax:Math.max(...nonuniform.map(x=>x.correct)),
      nonuniformPerfect:nonuniform.filter(x=>x.correct===12).length,
      nonuniformWorlds:nonuniform.length},
    limitations:["The intervention schedule is supplied; autonomous phase-action exploration not tested.",
      "Raw symbol identity is observable in the physics simulator; circular topology is RECORDED from 32 transitions, not inferred from bare text.",
      "Both calibration detector nodes are learned from known extreme phases; all heldout evaluations concern majority detector, not Born probability.",
      "Nonuniform angle results show a missing metric, not evidence of hidden new physical dynamics."]};
}
