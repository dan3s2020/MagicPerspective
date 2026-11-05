const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TAU=Math.PI*2;
const distance=(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0),(a.z||0)-(b.z||0));
function copyVec(v,n){const out=new Float64Array(n);for(let i=0;i<n;i++)out[i]=Number(v?.[i])||0;return out;}
function occluded2D(solids,a,b){
  if(!solids)return false;
  const dx=(b.x||0)-(a.x||0),dy=(b.y||0)-(a.y||0),steps=Math.max(Math.abs(dx),Math.abs(dy));
  if(steps<=1)return false;
  for(let i=1;i<steps;i++){
    const x=Math.round((a.x||0)+dx*i/steps),y=Math.round((a.y||0)+dy*i/steps);
    if(solids.has(`${x},${y},0`))return true;
  }
  return false;
}

export function createSharedComplexField(options={}){
  return{
    version:1,bands:Math.max(1,Math.floor(Number(options.bands)||32)),
    maxRange:Math.max(1,Number(options.maxRange)||18),
    attenuation:Math.max(.01,Number(options.attenuation)||.18),
    propagationPerStep:Math.max(.01,Number(options.propagationPerStep)||4),
    ttlSteps:Math.max(1,Math.floor(Number(options.ttlSteps)||8)),
    events:[],nextEventId:1,maxEvents:Math.max(16,Math.floor(Number(options.maxEvents)||256))
  };
}

export function emitSharedComplex(field,{position,real,imag,step=0,lifetimeSteps=null,observerProvenance=null}={}){
  if(!field||!position)return null;
  const event={
    eventId:field.nextEventId++,step:Number(step)||0,expires:(Number(step)||0)+Math.max(1,Math.floor(Number(lifetimeSteps)||field.ttlSteps)),
    position:{x:Number(position.x)||0,y:Number(position.y)||0,z:Number(position.z)||0},
    real:copyVec(real,field.bands),imag:copyVec(imag,field.bands),
    // Provenance is retained only for observer diagnostics. hearSharedComplex never returns it.
    observerProvenance:observerProvenance?structuredClone(observerProvenance):null
  };
  field.events.push(event);if(field.events.length>field.maxEvents)field.events.splice(0,field.events.length-field.maxEvents);
  return event.eventId;
}

export function advanceSharedComplexField(field,step){
  if(!field)return 0;const before=field.events.length,s=Number(step)||0;
  field.events=field.events.filter(e=>e.expires>=s);return before-field.events.length;
}

export function hearSharedComplex(field,receiver,{step=0,solids=null,occlusion=true}={}){
  const real=new Float64Array(field?.bands||0),imag=new Float64Array(field?.bands||0);
  if(!field||!receiver)return{real,imag,energy:0,coherence:0,phase:0,sourceCount:0};
  const now=Number(step)||0;let sourceCount=0,sumAbs=0;
  for(const e of field.events){
    const age=now-e.step;if(age<0||now>e.expires)continue;
    const d=distance(receiver,e.position);if(d>field.maxRange)continue;
    const arrival=d/field.propagationPerStep;if(age+1e-9<arrival)continue;
    if(occlusion&&Math.abs((receiver.z||0)-(e.position.z||0))<1e-9&&occluded2D(solids,receiver,e.position))continue;
    const gain=Math.exp(-field.attenuation*d)/(1+.12*d*d),phaseDelay=TAU*(arrival%1);sourceCount++;
    for(let b=0;b<field.bands;b++){
      const er=e.real[b]||0,ei=e.imag[b]||0,phase=phaseDelay*(1+(b%7)*.07),cs=Math.cos(phase),sn=Math.sin(phase);
      const rr=er*cs-ei*sn,ii=er*sn+ei*cs;
      real[b]+=gain*rr;imag[b]+=gain*ii;sumAbs+=gain*Math.hypot(er,ei);
    }
  }
  let sumMag=0,pr=0,pi=0;for(let b=0;b<real.length;b++){sumMag+=Math.hypot(real[b],imag[b]);pr+=real[b];pi+=imag[b];}
  const energy=Math.tanh(sumMag/Math.max(1,real.length)),coherence=sumAbs<=1e-12?0:clamp(sumMag/sumAbs,0,1),phase=sumMag<=1e-12?0:Math.atan2(pi,pr)/Math.PI;
  return{real,imag,energy,coherence,phase,sourceCount};
}

export function sharedFieldObserverSnapshot(field,step=0){
  return{version:field?.version||1,bands:field?.bands||0,step:Number(step)||0,events:(field?.events||[]).map(e=>({
    eventId:e.eventId,step:e.step,expires:e.expires,position:{...e.position},observerProvenance:e.observerProvenance?structuredClone(e.observerProvenance):null
  }))};
}
