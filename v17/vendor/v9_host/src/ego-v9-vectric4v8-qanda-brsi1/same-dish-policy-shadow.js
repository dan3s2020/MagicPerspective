import {IDENTITY_OBS_FEATURE_NAMES,IDENTITY_TRACK_COUNT} from "./config.js";
import {inferredExpectedBodyMass} from "./same-dish-body-discovery.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const tanh=x=>Math.tanh(Number(x)||0);

function rowsForPolicy(snapshot){
  return (snapshot?.tracks||[]).filter(t=>t.visible).map(t=>{
    const p=t.probability||{},c=t.causalPrediction?.last||{},rel=t.rel||{},d=Math.hypot(Number(rel.x)||0,Number(rel.y)||0,Number(rel.z)||0),maxClass=Math.max(Number(p.self)||0,Number(p.tool)||0,Number(p.other)||0,Number(p.passive)||0);
    const salience=maxClass*(1-clamp(Number(t.uncertainty)||0,0,1))+.15*Math.tanh(d/8);
    return{t,p,c,rel,d,salience};
  }).sort((a,b)=>b.salience-a.salience||a.d-b.d||(a.rel.x||0)-(b.rel.x||0)||(a.rel.y||0)-(b.rel.y||0)||(a.rel.z||0)-(b.rel.z||0));
}

export function sameDishIdentityFeatureVector(snapshot,{trackCount=IDENTITY_TRACK_COUNT,radius=16}={}){
  const rows=rowsForPolicy(snapshot),out=[],r=Math.max(1,Number(radius)||16);
  for(let i=0;i<trackCount;i++){
    const q=rows[i];
    if(!q){for(let k=0;k<12;k++)out.push(0);continue;}
    out.push(
      1,
      tanh((Number(q.rel.x)||0)/r),
      tanh((Number(q.rel.y)||0)/r),
      tanh((Number(q.rel.z)||0)/r),
      tanh(q.d/r),
      clamp(Number(q.p.self)||0,0,1),
      clamp(Number(q.p.tool)||0,0,1),
      clamp(Number(q.p.other)||0,0,1),
      clamp(Number(q.p.passive)||0,0,1),
      clamp(Number(q.p.unknown)||0,0,1),
      clamp(Number(q.c.directCoupling)||0,0,1),
      clamp(Number(q.c.autonomyEvidence)||0,0,1)
    );
  }
  for(let i=0;i<trackCount;i++){
    const q=rows[i],adv=Number(q?.c?.causalAdvantage)||0;
    out.push(clamp(.5+.5*adv,0,1));
  }
  const ambiguity=rows.length?rows.reduce((s,q)=>s+clamp(Number(q.t.uncertainty)||0,0,1),0)/rows.length:1;
  out.push(clamp(ambiguity,0,1));
  return Float64Array.from(out);
}

export function sameDishMembershipFreePolicyPatch(snapshot,{radius=16}={}){
  const rows=rowsForPolicy(snapshot),estimatedBodyMass=inferredExpectedBodyMass(snapshot),selfMass=rows.reduce((s,q)=>s+(Number(q.p.self)||0),1),visibleMass=Math.max(1,rows.length+1);
  const ownershipConfidence=rows.length?rows.reduce((s,q)=>s+(1-clamp(Number(q.t.uncertainty)||0,0,1))*(Number(q.p.self)||0),0)/Math.max(1e-9,rows.reduce((s,q)=>s+(Number(q.p.self)||0,0)):0;
  const predictionErrors=rows.map(q=>Number(q.c.actionError)).filter(Number.isFinite),meanPredictionError=predictionErrors.length?predictionErrors.reduce((a,b)=>a+b,0)/predictionErrors.length:0;
  const identityVector=sameDishIdentityFeatureVector(snapshot,{radius});
  if(identityVector.length!==IDENTITY_OBS_FEATURE_NAMES.length)throw new Error("same-dish identity vector width mismatch");
  return{
    // Dimension-compatible replacements for membership-derived V9 observation features.
    knownBodyFraction:clamp(ownershipConfidence,0,1),
    swarmSizeLog:Math.tanh(Math.log2(Math.max(1,estimatedBodyMass))/4),
    identityVector,
    estimatedBodyMass,
    selfEvidenceMass:selfMass,
    visibleMaterialLog:Math.tanh(Math.log2(visibleMass)/4),
    ownershipAmbiguity:identityVector[identityVector.length-1],
    meanPredictionError:Math.tanh(meanPredictionError)
  };
}
