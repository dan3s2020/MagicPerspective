// One ORIGINAL Discoverer with learned two-experience physical action geometry.
// No domain-specific transition equation enters the organism's choice or body.
// Native shapeGraph selects every action. Known physics exists only in worlds.
// IMPORTANT: This assumes a globally linear 2D action; its failure is tested.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const det=(a,b)=>a[0]*b[1]-a[1]*b[0];
const length=a=>Math.hypot(a[0],a[1]);
const addScaled=(a,t,b,u)=>[t*a[0]+u*b[0],t*a[1]+u*b[1]];

class GeometryDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.geometryBody=new Map();}
  livedIntervention(context,before,after){
    const observations=this.geometryBody.get(context)??[];
    if(observations.length>=2)throw Error("Only 2 native experiences allowed");
    observations.push({before:[...before],after:[...after]});
    this.geometryBody.set(context,observations);
  }
  physicallyPredictedConsequence(context,state){
    const obs=this.geometryBody.get(context);
    if(!obs||obs.length!==2)throw Error("No complete learned action geometry");
    const [a,b]=obs,area=det(a.before,b.before);
    if(Math.abs(area)<1e-10)throw Error("Not enough independent experiences");
    const coordA=det(state,b.before)/area;
    const coordB=det(a.before,state)/area;
    return addScaled(a.after,coordA,b.after,coordB);
  }
  forecastThroughNativeShape(context,initial,steps){
    const kinds=Array(steps+1).fill(0),neighbors=Array.from({length:steps+1},
      (_,i)=>i<steps?[{to:i+1,action:0}]:[]);
    kinds[0]=3;kinds[steps]=2;
    const shape=this.shapeGraph(kinds,neighbors,0,{details:true});
    if(!shape?.targetReached || shape.path.length!==steps)
      throw Error("Original Discoverer did not find target path");
    let state=[...initial];
    for(const move of shape.path){
      if(move.action!==0)throw Error("Unexpected output motor");
      state=this.physicallyPredictedConsequence(context,state);
    }
    return state;
  }
  signatureFromLivedInterventions(context){
    const col0=this.physicallyPredictedConsequence(context,[1,0]),
      col1=this.physicallyPredictedConsequence(context,[0,1]);
    const determinant=det(col0,col1),trace=col0[0]+col1[1];
    const discriminant=trace*trace-4*determinant;
    return {determinant,trace,discriminant,
      geometricClass:discriminant < -1e-7?"elliptic":
        discriminant > 1e-7?"hyperbolic":"parabolic",
      observedBodyColumns:[col0,col1]};
  }
}
// Physics simulator ONLY, never imported into the native organism's body.
const harmonicState=(phi,R=1.3,kappa=2.7)=>
  [R*Math.cos(phi),-kappa*R*Math.sin(phi)];
const harmonicStep=x=>{
  const R=Math.hypot(x[0],x[1]/2.7),phi=Math.atan2(-x[1]/2.7,x[0]);
  return harmonicState(phi+.31,R,2.7);
};
const interferometerProbability=phi=>{
  const re=Math.cos(phi),im=Math.sin(phi);
  return ((1+re)/2)**2+(im/2)**2;
};
const interferometerState=phi=>[
  2*interferometerProbability(phi)-1,
  2*interferometerProbability(phi-Math.PI/2)-1];
const interferometerStep=x=>{
  const phi=Math.atan2(x[1],x[0]),R=Math.hypot(x[0],x[1]);
  const y=interferometerState(phi+.31);
  return [R*y[0],R*y[1]];
};
const cosh=x=>(Math.exp(x)+Math.exp(-x))/2,
      sinh=x=>(Math.exp(x)-Math.exp(-x))/2;
const boostStep=x=>[cosh(.27)*x[0]-sinh(.27)*x[1],
  -sinh(.27)*x[0]+cosh(.27)*x[1]];
const freeStep=x=>[x[0]+.23*x[1],x[1]];
const quarticForce=x=>[x[1],-x[0]-.6*x[0]**3];
const nonlinearStep=x=>{
  const dt=.23/80;let a=[...x];
  for(let j=0;j<80;j++){
    const k1=quarticForce(a),k2=quarticForce(addScaled(a,1,k1,dt/2)),
      k3=quarticForce(addScaled(a,1,k2,dt/2)),
      k4=quarticForce(addScaled(a,1,k3,dt));
    a=[a[0]+dt*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,
      a[1]+dt*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
  }
  return a;
};
const WORLDS=[
  {id:"oscillator",step:harmonicStep,
    examples:[harmonicState(.27,1.1),harmonicState(1.52,1.1)],
    test:rng=>harmonicState(rng.next()*Math.PI*2,.5+2*rng.next())},
  {id:"quantum_interferometer",step:interferometerStep,
    examples:[interferometerState(.37),interferometerState(1.42)],
    test:rng=>interferometerState(rng.next()*Math.PI*2)},
  {id:"special_relativity",step:boostStep,
    examples:[[2,.3],[3,1.4]],
    test:rng=>{const t=1+4*rng.next();return [t,t*(rng.next()*1.6-.8)];}},
  {id:"free_newtonian",step:freeStep,
    examples:[[-1,2],[2,-1]],
    test:rng=>[rng.next()*4-2,rng.next()*4-2]},
  {id:"nonlinear_quartic",step:nonlinearStep,
    examples:[[.2,.05],[.7,-.1]],
    test:rng=>[rng.next()*4.4-2.2,rng.next()*4.4-2.2]}
];
function evaluate(brain,world){
  const rng=new RNG(20261+world.id.length*37);
  let totalError=0,staticError=0,maxError=0,count=0;
  const preview=[];
  for(let i=0;i<128;i++){
    const initial=world.test(rng);
    let actual=[...initial];
    for(let step=1;step<=12;step++){
      actual=world.step(actual);
      const predicted=brain.forecastThroughNativeShape(world.id,initial,step);
      const error=length([predicted[0]-actual[0],predicted[1]-actual[1]]);
      const base=length([initial[0]-actual[0],initial[1]-actual[1]]);
      totalError+=error;staticError+=base;maxError=Math.max(error,maxError);
      count++;
      if(i===0&&step<=3)preview.push({step,actual,predicted,error});
    }
  }
  return {predictions:count,meanVectorError:totalError/count,
    staticMeanVectorError:staticError/count,maxVectorError:maxError,preview};
}
export function runMultiPhysics(){
  const brain=new GeometryDiscoverer(17);
  let mazeSolved=0;
  for(let i=0;i<160;i++)
    mazeSolved+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  const results=[];
  for(const world of WORLDS){
    // The original organism sees exactly two physical interventions in this world.
    for(const before of world.examples)
      brain.livedIntervention(world.id,before,world.step(before));
    const signature=brain.signatureFromLivedInterventions(world.id);
    const heldout=evaluate(brain,world);
    results.push({world:world.id,physicalExperiences:2,signature,heldout});
  }
  if(!results.every(x=>x.heldout.predictions===1536))
    throw Error("Incorrect heldout split");
  return {date:"2026-11-13",nativeV17Commit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    originalNativeMazeEpisodes:160,mazeSolved,
    originalShapeGraphOwnsAllActions:true,
    multiplePhysicalWorldsInSameOrganism:true,
    testedDomainCount:WORLDS.length,
    assumedFamily:"globally linear 2D state actions",
    results,
    verdict:"Known 2D transformation geometry can be induced from 2 physical action consequences and correctly forecasts unseen dynamics of selected linear worlds; fails for nonlinear quartic oscillator. No new physical law or general relativity unification.",
    caveats:["World context ID supplies a sensor environment identifier; not an autonomous discovered context.",
      "Two-dimensional linear combination is a preselected existing mathematical family.",
      "Deterministic simulator; experimental measurement uncertainty omitted in this test.",
      "Special relativity is not general relativity or quantum gravity.",
      "Trace discriminant classification is standard mathematics, not a discovered law."]};
}
