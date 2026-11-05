const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const v3=v=>({x:Number(v?.x)||0,y:Number(v?.y)||0,z:Number(v?.z)||0});
const sub=(a,b)=>({x:(a.x||0)-(b.x||0),y:(a.y||0)-(b.y||0),z:(a.z||0)-(b.z||0)});
const mag=v=>Math.hypot(v.x||0,v.y||0,v.z||0);
const dist=(a,b)=>mag(sub(a,b));
const signKey=v=>`${Math.sign(Number(v?.x)||0)},${Math.sign(Number(v?.y)||0)},${Math.sign(Number(v?.z)||0)}`;

function stat(){return{n:0,mean:{x:0,y:0,z:0},m2:{x:0,y:0,z:0}};}
function updateStat(s,value){
  const x=v3(value);s.n++;
  for(const k of ["x","y","z"]){
    const d=x[k]-s.mean[k];s.mean[k]+=d/s.n;s.m2[k]+=d*(x[k]-s.mean[k]);
  }
}
function variance(s){
  if(!s||s.n<2)return{x:1,y:1,z:1};
  return{x:s.m2.x/(s.n-1),y:s.m2.y/(s.n-1),z:s.m2.z/(s.n-1)};
}
function predictStat(s){
  if(!s||s.n<1)return{available:false,n:0,mean:{x:0,y:0,z:0},variance:{x:1,y:1,z:1},confidence:0};
  return{available:true,n:s.n,mean:{...s.mean},variance:variance(s),confidence:s.n/(s.n+2)};
}

export function createTrackCausalPredictor(){
  return{
    version:1,
    acceptedByCommand:new Map(),
    passive:stat(),
    couplingError:stat(),
    acceptedSamples:0,
    passiveSamples:0,
    last:null
  };
}

export function causalPredictBeforeUpdate(model,{command,accepted,anchorDelta,globalDelta}={}){
  const cmd=signKey(command),target=v3(globalDelta),anchor=v3(anchorDelta);
  const actionStat=model.acceptedByCommand.get(cmd),action=predictStat(actionStat),passive=predictStat(model.passive);
  const actionMean=action.available?action.mean:anchor;
  const passiveMean=passive.available?passive.mean:{x:0,y:0,z:0};
  const actionErr=dist(target,actionMean),passiveErr=dist(target,passiveMean),couplingErr=dist(target,anchor);
  const predictiveConfidence=accepted?action.confidence:passive.confidence;
  const advantage=accepted?clamp(Math.tanh((passiveErr-actionErr)*predictiveConfidence),-1,1):0;
  const directCoupling=accepted?clamp(Math.exp(-1.5*couplingErr)*(0.25+0.75*Math.max(action.confidence,.15)),0,1):0;
  const passiveMotion=mag(target);
  const autonomyEvidence=!accepted&&mag(anchor)<=.10?clamp(Math.tanh(passiveMotion)*(.25+.75*Math.max(passive.confidence,.15)),0,1):0;
  return{
    commandKey:cmd,accepted:Boolean(accepted),action,passive,
    actionPrediction:{...actionMean},passivePrediction:{...passiveMean},
    actionError:actionErr,passiveError:passiveErr,couplingError,
    predictiveConfidence,causalAdvantage:advantage,directCoupling,autonomyEvidence
  };
}

export function causalPredictLearn(model,{command,accepted,anchorDelta,globalDelta}={}){
  const cmd=signKey(command),target=v3(globalDelta),anchor=v3(anchorDelta);
  if(accepted){
    let s=model.acceptedByCommand.get(cmd);if(!s){s=stat();model.acceptedByCommand.set(cmd,s);}
    updateStat(s,target);updateStat(model.couplingError,{x:target.x-anchor.x,y:target.y-anchor.y,z:target.z-anchor.z});model.acceptedSamples++;
  }else{
    updateStat(model.passive,target);model.passiveSamples++;
  }
}

export function causalPredictStep(model,input={}){
  const prediction=causalPredictBeforeUpdate(model,input);
  causalPredictLearn(model,input);
  model.last=prediction;
  return prediction;
}

export function trackCausalPredictorSnapshot(model){
  const accepted={};
  for(const[k,s]of model.acceptedByCommand)accepted[k]=predictStat(s);
  return{
    version:model.version,
    acceptedSamples:model.acceptedSamples,
    passiveSamples:model.passiveSamples,
    accepted,
    passive:predictStat(model.passive),
    couplingError:predictStat(model.couplingError),
    last:model.last?structuredClone(model.last):null
  };
}
