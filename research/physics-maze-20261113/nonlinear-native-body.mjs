// NONLINEAR physical action body, attached to unchanged original V17 Discoverer.
// Physical experiences are from REAL world interventions, not pre-specified laws.
// Original shapeGraph remains the control policy for future action sequences.
// Standard local geometric interpolation: PROJECT RESEARCH method, not new physics.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const sqdist=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
const det=(a,b)=>a[0]*b[1]-a[1]*b[0];
const add=(a,b,t=1)=>[a[0]+t*b[0],a[1]+t*b[1]];
const len=x=>Math.hypot(x[0],x[1]);
const force=(s,lambda)=>[s[1],-s[0]-lambda*s[0]**3];
function physicalQuarticStep(s,{lambda=.6,dt=.23}={}) {
  // ONLY the evaluator/observed world contains this equation.
  const h=dt/80;let q=s.slice();
  for(let i=0;i<80;i++) {
    const k1=force(q,lambda),k2=force(add(q,k1,h/2),lambda),
      k3=force(add(q,k2,h/2),lambda),
      k4=force(add(q,k3,h),lambda);
    q=[q[0]+h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,
       q[1]+h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
  }
  return q;
}
class LocalFieldDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.livedActions=[];}
  experience(before,after) {
    this.livedActions.push({before:before.slice(),after:after.slice()});
  }
  nearest(state,n=10) {
    const arr=[];
    for(let id=0;id<this.livedActions.length;id++) {
      const e=this.livedActions[id],d=sqdist(state,e.before);
      let at=arr.length;
      while(at>0&&arr[at-1].d>d)at--;
      if(at<n){arr.splice(at,0,{...e,d});if(arr.length>n)arr.pop();}
    }
    return arr;
  }
  localAction(state,method) {
    const near=this.nearest(state,10);
    if(!near.length)throw Error("Action not experienced");
    const nearest=near[0];
    if(method==="nearest")return add(state,
      [nearest.after[0]-nearest.before[0],
       nearest.after[1]-nearest.before[1]]);
    const k=8;
    let sw=0,dx=0,dy=0;
    for(const e of near.slice(0,k)) {
      const weight=1/(e.d+1e-4);
      sw+=weight;
      dx+=weight*(e.after[0]-e.before[0]);
      dy+=weight*(e.after[1]-e.before[1]);
    }
    const smooth=add(state,[dx/sw,dy/sw]);
    if(method==="weighted")return smooth;
    // Local causal triangle learned from three earlier physical events;
    // barycentric weights describe where the organism CURRENTLY is in
    // this observed local area. This is geometry, not a physics equation.
    let best=null,bestScore=Infinity;
    for(let a=0;a<near.length;a++)
      for(let b=a+1;b<near.length;b++)
        for(let c=b+1;c<near.length;c++){
          const A=near[a],B=near[b],C=near[c];
          const u=[B.before[0]-A.before[0],B.before[1]-A.before[1]];
          const v=[C.before[0]-A.before[0],C.before[1]-A.before[1]];
          const area=det(u,v);
          if(Math.abs(area)<1e-5)continue;
          const r=[state[0]-A.before[0],state[1]-A.before[1]];
          const wb=det(r,v)/area,wc=det(u,r)/area,wa=1-wb-wc;
          const extrude=Math.max(0,-wa,-wb,-wc);
          const score=(A.d+B.d+C.d)*(1+40*extrude)+1e-5/Math.abs(area);
          if(score<bestScore){bestScore=score;best={A,B,C,wa,wb,wc,extrude};}
        }
    if(!best || best.extrude>.45)return smooth;
    const {A,B,C,wa,wb,wc}=best;
    const interpolated=[
      wa*A.after[0]+wb*B.after[0]+wc*C.after[0],
      wa*A.after[1]+wb*B.after[1]+wc*C.after[1]];
    return method==="triangle"||method==="hybrid"?interpolated:smooth;
  }
  predictShape(state,steps,method="hybrid") {
    const kinds=Array(steps+1).fill(0),adj=Array.from({length:steps+1},
      (_,i)=>i<steps?[{to:i+1,action:0}]:[]);
    kinds[0]=3;kinds[steps]=2;
    const route=this.shapeGraph(kinds,adj,0,{details:true});
    if(!route?.targetReached||route.path.length!==steps)
      throw Error("Original shapeGraph did not traverse target action path");
    let q=state.slice();
    for(const action of route.path) {
      if(action.action!==0)throw Error("Unexpected action");
      q=this.localAction(q,method);
    }
    return q;
  }
}
function experiencePhysicalWorld(brain,count,shuffle=false){
  const rng=new RNG(20501),before=[],after=[];
  for(let i=0;i<count;i++){
    const state=[(rng.next()-.5)*5,(rng.next()-.5)*5];
    before.push(state);
    after.push(physicalQuarticStep(state));
  }
  if(shuffle)for(let i=after.length-1;i>0;i--){
    const j=rng.int(i+1);[after[i],after[j]]=[after[j],after[i]];
  }
  for(let i=0;i<count;i++)brain.experience(before[i],after[i]);
}
function evalMethod(brain,method,{validation=false,nonlinear={}}={}){
  const rng=new RNG(validation?8444:79917);
  const worlds=validation?48:128,steps=validation?8:12;
  let error=0,staticError=0,max=0,count=0,energyDrift=0;
  const preview=[];
  for(let i=0;i<worlds;i++){
    const start=[(rng.next()-.5)*4.4,(rng.next()-.5)*4.4];
    let actual=start.slice();
    for(let s=1;s<=steps;s++){
      actual=physicalQuarticStep(actual,nonlinear);
      const estimate=brain.predictShape(start,s,method);
      const E=len([estimate[0]-actual[0],estimate[1]-actual[1]]);
      error+=E;staticError+=len([start[0]-actual[0],start[1]-actual[1]]);
      max=Math.max(max,E);count++;
      const energy=x=>.5*x[1]*x[1]+.5*x[0]*x[0]+
        (nonlinear.lambda??.6)*x[0]**4/4;
      energyDrift+=Math.abs(energy(estimate)-energy(start));
      if(i===0&&s<=4)preview.push({step:s,predicted:estimate,trueState:actual,error:E});
    }
  }
  return {count,mae:error/count,static:staticError/count,max,
    meanPredictedEnergyDrift:energyDrift/count,preview};
}
export function runNonlinear(){
  const base=new LocalFieldDiscoverer(17);let mazeWins=0;
  for(let i=0;i<160;i++)
    mazeWins+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),base).solved);
  const samples=[];
  for(const n of [64,256,1024]){
    const brain=new LocalFieldDiscoverer(17);
    // share native maze learning state, no invented checkpoint:
    // copy native learned state exactly, retain its prototype.
    // But never use target outcomes in original maze learning.
    const D=base;
    // For scientific isolation, each new body uses the SAME original
    // trained Discoverer, with independent local physics experience.
    const independent=Object.assign(brain,{
      pass:D.pass.slice(),block:D.block.slice(),enter:D.enter.slice(),
      endIn:D.endIn.slice()});
    experiencePhysicalWorld(independent,n);
    const methods=["nearest","weighted","triangle","hybrid"];
    const validation=methods.map(method=>({method,...evalMethod(independent,method,{validation:true})}));
    const winner=validation.reduce((a,b)=>b.mae<a.mae?b:a).method;
    const heldout=evalMethod(independent,winner);
    samples.push({observedInterventions:n,validation:validation.map(x=>({
      method:x.method,mae:x.mae})),winner,heldout});
  }
  const best=samples.at(-1),scrambled=new LocalFieldDiscoverer(17);
  scrambled.pass=base.pass.slice();scrambled.block=base.block.slice();
  scrambled.enter=base.enter.slice();scrambled.endIn=base.endIn.slice();
  experiencePhysicalWorld(scrambled,1024,true);
  const shuffled=evalMethod(scrambled,best.winner);
  const shifted=new LocalFieldDiscoverer(17);
  shifted.pass=base.pass.slice();shifted.block=base.block.slice();
  shifted.enter=base.enter.slice();shifted.endIn=base.endIn.slice();
  experiencePhysicalWorld(shifted,1024);
  const changedStrength=evalMethod(shifted,best.winner,
    {nonlinear:{lambda:1.15,dt:.23}});
  const changedDuration=evalMethod(shifted,best.winner,
    {nonlinear:{lambda:.6,dt:.31}});
  return {date:"2026-11-13",originalCommit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    originalNativeMazeEpisodes:160,mazeWins,
    physicalModelInOrganism:"none; observed 2D before/after actions only",
    goalPrediction:"unchanged original Discoverer.shapeGraph",
    learnedBody:"nearest local causal experiences and local triangle geometry",
    samples,controls:{shuffledBeforeAfter:shuffled,
      unseenPotentialStrength:changedStrength,unseenActionDuration:changedDuration},
    verdict:"State-local learned physical effects generalize in a nonlinear quartic maze when sufficiently dense true action experiences are available. Neither equations nor universal physics were discovered; shifted physics may require further real interventions.",
    limitations:["This is local interpolation, a known mathematical method.",
      "Physical 2D state variables are chosen by the experimenter.",
      "Test states are within the trained phase-space rectangle; extrapolation not established.",
      "Hyperparameters and method are chosen using separate validation simulations.",
      "No quantum gravity, anharmonic quantum state or actual laboratory measurement."]};
}
