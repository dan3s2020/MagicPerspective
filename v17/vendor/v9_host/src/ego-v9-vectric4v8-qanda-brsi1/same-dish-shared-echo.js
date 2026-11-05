import {dishDirs,dishKey,hiddenOccupancy} from "./same-dish-shadow-world.js";

const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const manhattan=(a,b)=>Math.abs((a.x||0)-(b.x||0))+Math.abs((a.y||0)-(b.y||0))+Math.abs((a.z||0)-(b.z||0));

export function createSharedEchoField(options={}){
  return{
    version:1,
    harmonics:Math.max(1,Math.min(8,Math.floor(Number(options.harmonics)||4))),
    bands:Math.max(8,Math.floor(Number(options.bands)||16)),
    maxRaySteps:Math.max(4,Math.floor(Number(options.maxRaySteps)||48)),
    speedCellsPerStep:Math.max(.25,Number(options.speedCellsPerStep)||1),
    pulses:[],nextPulseId:1,maxPulses:Math.max(8,Math.floor(Number(options.maxPulses)||128))
  };
}
export function createLocalEchoReceiverState(){return{version:1,heard:new Set(),last:{energy:0,novelty:0,phase:0,delay:0,timeOfFlight:0,attenuation:0,reflectionCount:0,spectrumAmplitude:[],spectrumPhase:[]}};}

function inBounds(world,x,y,z=0){return x>=0&&x<world.width&&y>=0&&y<world.height&&(world.dimension===2?z===0:(z>=0&&z<world.depth));}
function firstReflector(world,origin,dir,maxSteps){
  const occ=hiddenOccupancy(world);let x=origin.x,y=origin.y,z=origin.z||0;
  for(let k=1;k<=maxSteps;k++){
    x+=dir[0];y+=dir[1];z+=dir[2];
    const key=dishKey(x,y,z);
    if(!inBounds(world,x,y,z)||world.solids.has(key)||occ.has(key))return{position:{x,y,z},distance:k};
  }
  return null;
}

export function emitSharedEcho(world,field,{position,step=0,observerProvenance=null,phaseSeed=0}={}){
  if(!world||!field||!position)return null;
  const pulse={pulseId:field.nextPulseId++,step:Number(step)||0,origin:{x:Number(position.x)||0,y:Number(position.y)||0,z:Number(position.z)||0},returns:[],observerProvenance:observerProvenance?structuredClone(observerProvenance):null};
  const dirs=dishDirs(world.dimension);
  for(let di=0;di<dirs.length;di++){
    const hit=firstReflector(world,pulse.origin,dirs[di],field.maxRaySteps);if(!hit)continue;
    const harmonics=[];
    for(let h=1;h<=field.harmonics;h++){
      const band=(di*3+h*5+Math.floor(Number(phaseSeed)||0))%field.bands,phase=((hit.distance*.37*h+di*.71+Number(phaseSeed||0)*.11)%TAU+TAU)%TAU;
      harmonics.push({band,harmonic:h,phase,baseAmp:1/Math.pow(h,1.15)});
    }
    pulse.returns.push({ray:di,hit:hit.position,outLeg:hit.distance,harmonics});
  }
  field.pulses.push(pulse);if(field.pulses.length>field.maxPulses)field.pulses.splice(0,field.pulses.length-field.maxPulses);
  return pulse.pulseId;
}

export function hearSharedEcho(field,receiverState,receiverPosition,{step=0}={}){
  const state=receiverState||createLocalEchoReceiverState(),B=field?.bands||16,sr=new Float64Array(B),si=new Float64Array(B);let energy=0,best=null,count=0;
  if(!field||!receiverPosition)return{...state.last,spectrumAmplitude:Array(B).fill(0),spectrumPhase:Array(B).fill(0),returnCount:0};
  const now=Number(step)||0;
  for(const pulse of field.pulses)for(const ret of pulse.returns){
    const eventKey=pulse.pulseId+":"+ret.ray;if(state.heard.has(eventKey))continue;
    const returnLeg=manhattan(ret.hit,receiverPosition),distance=ret.outLeg+returnLeg,tof=distance/field.speedCellsPerStep;
    if(now+1e-9<pulse.step+tof)continue;
    state.heard.add(eventKey);count++;
    const baseAtt=1/Math.sqrt(1+distance);
    for(const h of ret.harmonics){
      const amp=baseAtt*h.baseAmp,ph=h.phase+returnLeg*.23*h.harmonic,rr=amp*Math.cos(ph),ii=amp*Math.sin(ph);
      sr[h.band%B]+=rr;si[h.band%B]+=ii;energy+=amp;
      if(!best||amp>best.amp)best={amp,delay:tof,timeOfFlight:tof,attenuation:baseAtt};
    }
  }
  if(!count){
    state.last={...state.last,energy:state.last.energy*.92,novelty:state.last.novelty*.9,attenuation:state.last.attenuation*.95};
    return{...state.last,spectrumAmplitude:[...(state.last.spectrumAmplitude||[])],spectrumPhase:[...(state.last.spectrumPhase||[])],returnCount:0};
  }
  const amp=new Float64Array(B),phase=new Float64Array(B);let pr=0,pi=0;
  for(let b=0;b<B;b++){amp[b]=Math.hypot(sr[b],si[b]);phase[b]=Math.atan2(si[b],sr[b]);pr+=sr[b];pi+=si[b];}
  const observed=Math.tanh(energy/Math.max(1,count)),prev=Number(state.last.energy)||0;
  state.last={
    energy:observed,novelty:Math.tanh(Math.abs(observed-prev)),phase:Math.atan2(pi,pr)/Math.PI,
    delay:best?.delay||0,timeOfFlight:best?.timeOfFlight||0,attenuation:best?.attenuation||0,reflectionCount:count,
    spectrumAmplitude:Array.from(amp),spectrumPhase:Array.from(phase)
  };
  return{...state.last,returnCount:count};
}

export function sharedEchoObserverSnapshot(field){
  return{
    version:field?.version||1,
    pulseCount:field?.pulses?.length||0,
    pulses:(field?.pulses||[]).map(p=>({
      pulseId:p.pulseId,step:p.step,origin:{...p.origin},returnCount:p.returns.length,
      observerProvenance:p.observerProvenance?structuredClone(p.observerProvenance):null
    }))
  };
}
