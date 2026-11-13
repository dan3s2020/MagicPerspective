// CONTINUOUS physical action field experienced by original V17 Discoverer.
// The unchanged native shapeGraph chooses macro-actions. Inside the SAME
// organism, local action changes are normalized by observed action duration
// and composed to forecast an UNOBSERVED future action duration.
// This employs standard local geometric interpolation and midpoint integration:
// a project capability test, NOT the discovery of any new law of physics.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const sq=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
const length=a=>Math.hypot(a[0],a[1]);
const add=(a,b,h)=>[a[0]+h*b[0],a[1]+h*b[1]];
const wedge=(a,b)=>a[0]*b[1]-a[1]*b[0];
// SIMULATOR ONLY. The organism does not read this equation.
const force=(s,lambda)=>[s[1],-s[0]-lambda*s[0]*s[0]*s[0]];
function actualStep(s,dt,lambda=.6) {
  let state=s.slice(),h=dt/80;
  for(let i=0;i<80;i++) {
    const k1=force(state,lambda),k2=force(add(state,k1,h/2),lambda),
      k3=force(add(state,k2,h/2),lambda),
      k4=force(add(state,k3,h),lambda);
    state=[state[0]+h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,
           state[1]+h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
  }
  return state;
}
class FlowDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.flowMemory=[];this.experiencedClock=.035;}
  livePhysicalAction(before,after,duration){
    if(!Number.isFinite(duration)||Math.abs(duration)<1e-9)
      throw Error("Observed physical action duration required");
    this.flowMemory.push({at:before.slice(),
      change:[(after[0]-before[0])/duration,
              (after[1]-before[1])/duration]});
    this.experiencedClock=Math.min(this.experiencedClock,Math.abs(duration));
  }
  localFlow(state) {
    const near=[];
    for(const e of this.flowMemory) {
      const d=sq(state,e.at);let i=near.length;
      while(i>0&&d<near[i-1].d)i--;
      if(i<8){near.splice(i,0,{...e,d});if(near.length>8)near.pop();}
    }
    if(!near.length)throw Error("Organism has not lived physical actions");
    let wt=0,vx=0,vy=0;
    for(const e of near){
      const w=1/(1e-4+e.d);wt+=w;
      vx+=w*e.change[0];vy+=w*e.change[1];
    }
    const smooth=[vx/wt,vy/wt];
    let champion=null,score=Infinity;
    for(let a=0;a<near.length;a++)
      for(let b=a+1;b<near.length;b++)
        for(let c=b+1;c<near.length;c++){
          const A=near[a],B=near[b],C=near[c];
          const u=[B.at[0]-A.at[0],B.at[1]-A.at[1]];
          const v=[C.at[0]-A.at[0],C.at[1]-A.at[1]];
          const area=wedge(u,v);
          if(Math.abs(area)<1e-5)continue;
          const w=[state[0]-A.at[0],state[1]-A.at[1]];
          const bWeight=wedge(w,v)/area,cWeight=wedge(u,w)/area;
          const aWeight=1-bWeight-cWeight;
          const outside=Math.max(0,-aWeight,-bWeight,-cWeight);
          const candidate=(A.d+B.d+C.d)*(1+40*outside)+1e-5/Math.abs(area);
          if(candidate<score){
            score=candidate;champion={A,B,C,aWeight,bWeight,cWeight,outside};
          }
        }
    if(!champion||champion.outside>.45)return smooth;
    const {A,B,C,aWeight,bWeight,cWeight}=champion;
    return [aWeight*A.change[0]+bWeight*B.change[0]+cWeight*C.change[0],
      aWeight*A.change[1]+bWeight*B.change[1]+cWeight*C.change[1]];
  }
  motor(state,duration,{singleStep=false}={}){
    if(singleStep)return add(state,this.localFlow(state),duration);
    const count=Math.max(1,Math.ceil(Math.abs(duration)/this.experiencedClock));
    const h=duration/count;
    let at=state.slice();
    for(let j=0;j<count;j++){
      const v=this.localFlow(at),mid=add(at,v,h/2);
      at=add(at,this.localFlow(mid),h);
    }
    return at;
  }
  liveFutureShape(initial,steps,duration,{singleStep=false}={}){
    const kinds=Array(steps+1).fill(0),adj=Array.from({length:steps+1},
      (_,i)=>i<steps?[{to:i+1,action:0}]:[]);
    kinds[0]=3;kinds[steps]=2;
    const shape=this.shapeGraph(kinds,adj,0,{details:true});
    if(!shape?.targetReached||shape.path.length!==steps)
      throw Error("Native original shape path incomplete");
    let current=initial.slice();
    for(const step of shape.path){
      if(step.action!==0)throw Error("Native output motor different");
      current=this.motor(current,duration,{singleStep});
    }
    return current;
  }
}
function livedActions(brain,{samples=1024,shuffle=false}={}){
  const rng=new RNG(20261113),before=[],after=[];
  for(let i=0;i<samples;i++) {
    const q=[6*rng.next()-3,6*rng.next()-3];
    before.push(q);after.push(actualStep(q,.035));
  }
  if(shuffle)for(let i=samples-1;i>0;i--){
    const j=rng.int(i+1);[after[i],after[j]]=[after[j],after[i]];
  }
  for(let i=0;i<samples;i++)brain.livePhysicalAction(before[i],after[i],.035);
}
function physicalValidation(brain,{duration=.23,lambda=.6,singleStep=false,seed=61001}={}){
  const rng=new RNG(seed);
  let E=0,stationary=0,max=0,drift=0,n=0;
  const preview=[];
  for(let world=0;world<48;world++){
    const begin=[4.4*rng.next()-2.2,4.4*rng.next()-2.2];
    let actual=begin.slice();
    const energy=x=>.5*x[1]**2+.5*x[0]**2+lambda*x[0]**4/4;
    for(let steps=1;steps<=8;steps++) {
      actual=actualStep(actual,duration,lambda);
      const pred=brain.liveFutureShape(begin,steps,duration,{singleStep});
      const err=length([pred[0]-actual[0],pred[1]-actual[1]]);
      E+=err;stationary+=length([actual[0]-begin[0],actual[1]-begin[1]]);
      drift+=Math.abs(energy(pred)-energy(begin));
      max=Math.max(max,err);n++;
      if(world===0&&steps<=4)preview.push({steps,actual,pred,err});
    }
  }
  return {duration,lambda,predictions:n,mae:E/n,stationary:stationary/n,
    energyDrift:drift/n,maxError:max,preview};
}
export function runFlow(){
  const brain=new FlowDiscoverer(17);
  let solved=0;
  for(let i=0;i<160;i++)
    solved+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  livedActions(brain);
  const conditions=[.23,.31,.52,-.23].map(duration=>({
    duration,learned:physicalValidation(brain,{duration}),
    fixedSingleAction:physicalValidation(brain,{duration,singleStep:true})}));
  const changedPotential=physicalValidation(brain,{duration:.31,lambda:1.15});
  const scrambled=new FlowDiscoverer(17);
  for(let i=0;i<160;i++)
    playExercise(makeMaze(1000003+i*7919,7,.3),scrambled);
  livedActions(scrambled,{shuffle:true});
  const shuffled=physicalValidation(scrambled,{duration:.31});
  return {date:"2026-11-13",nativeV17Commit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    nativeMazeSolved:solved,nativeShapeGraphPreserved:true,
    physicalExperienceCount:brain.flowMemory.length,
    sourceActionDuration:.035,testDurations:conditions.map(x=>x.duration),
    conditions,controls:{changedPotential,shuffled},
    verdict:"Continuous causal flow constructed by same original Discoverer from small action observations predicts previously unseen duration scales on nonlinear physical worlds; still standard interpolation/integration, not new laws.",
    caveats:["Simulator laws used for observation/scoring, not in organism.",
      "Physical state x,p and action duration are provided as measured sensors.",
      "Local triangles/midpoint are known numerical techniques.",
      "Requires covered state space; no guaranteed extrapolation, GR or quantum gravity."]};
}
