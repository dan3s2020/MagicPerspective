export const EXPERIMENTAL_PROFILES=Object.freeze({
  V8_STYLE:"v8-style-core",
  FULL:"full-v9",
  CUSTOM:"custom"
});

export const EXPERIMENTAL_FEATURE_KEYS=Object.freeze([
  "mapAdaptiveActionBudget",
  "energyEnabled",
  "corticalSoundEnabled",
  "echoEnabled",
  "spatialCortexEnabled",
  "worldModelEnabled",
  "perspectiveEnabled",
  "organogenesisEnabled",
  "cSpecializationEnabled",
  "metaControllerEnabled",
  "identityEnabled"
]);

const FULL_PATCH=Object.freeze({
  experimentalProfile:EXPERIMENTAL_PROFILES.FULL,
  mapAdaptiveActionBudget:true,
  energyEnabled:true,
  corticalSoundEnabled:true,
  echoEnabled:true,
  spatialCortexEnabled:true,
  worldModelEnabled:true,
  perspectiveEnabled:true,
  organogenesisEnabled:true,
  cSpecializationEnabled:true,
  metaControllerEnabled:true,
  identityEnabled:true,
  morphologyMode:"active",
  adaptiveKMode:"active"
});

const V8_STYLE_PATCH=Object.freeze({
  experimentalProfile:EXPERIMENTAL_PROFILES.V8_STYLE,
  mapAdaptiveActionBudget:false,
  energyEnabled:false,
  corticalSoundEnabled:false,
  echoEnabled:false,
  spatialCortexEnabled:false,
  worldModelEnabled:false,
  perspectiveEnabled:false,
  organogenesisEnabled:false,
  cSpecializationEnabled:false,
  metaControllerEnabled:false,
  identityEnabled:false,
  morphologyMode:"off",
  adaptiveKMode:"off"
});

export function profilePatch(profile){
  if(profile===EXPERIMENTAL_PROFILES.V8_STYLE)return{...V8_STYLE_PATCH};
  if(profile===EXPERIMENTAL_PROFILES.FULL)return{...FULL_PATCH};
  return{experimentalProfile:EXPERIMENTAL_PROFILES.CUSTOM};
}

export function applyExperimentalProfile(config={},profile=EXPERIMENTAL_PROFILES.CUSTOM){
  return{...config,...profilePatch(profile)};
}

export function requestedFeatureGates(config={}){
  return{
    adaptiveActionBudget:config.mapAdaptiveActionBudget!==false,
    energy:config.energyEnabled!==false,
    corticalSound:config.corticalSoundEnabled!==false,
    echo:config.echoEnabled!==false,
    spatial:config.spatialCortexEnabled!==false,
    worldModel:config.worldModelEnabled!==false,
    perspective:config.perspectiveEnabled!==false,
    organogenesis:config.organogenesisEnabled!==false,
    specialization:config.cSpecializationEnabled!==false,
    metaController:config.metaControllerEnabled!==false,
    identity:config.identityEnabled!==false,
    morphology:String(config.morphologyMode||"off")!=="off",
    adaptiveK:String(config.adaptiveKMode||"off")!=="off"
  };
}

export function effectiveFeatureGates(config={}){
  const q=requestedFeatureGates(config);
  return{
    ...q,
    worldModel:q.worldModel&&q.spatial,
    perspective:q.perspective&&q.spatial,
    morphology:q.morphology&&q.metaController,
    adaptiveK:q.adaptiveK&&q.metaController
  };
}

export function experimentalManifest(config={}){
  const requested=requestedFeatureGates(config),effective=effectiveFeatureGates(config);
  return{
    version:1,
    profile:String(config.experimentalProfile||EXPERIMENTAL_PROFILES.CUSTOM),
    requested,
    effective,
    morphologyMode:String(config.morphologyMode||"off"),
    adaptiveKMode:String(config.adaptiveKMode||"off")
  };
}

export function policyActionMask(config={},physicalDimensions=2){
  // Fixed super-network output width is preserved for checkpoint compatibility.
  // Disabled experimental actions are removed from the policy distribution.
  const mask=new Uint8Array(9);mask.fill(1);
  if(Number(physicalDimensions)!==3){mask[5]=0;mask[6]=0;}
  const g=effectiveFeatureGates(config);
  if(!g.echo)mask[7]=0;
  if(!g.corticalSound)mask[8]=0;
  return mask;
}

export function inferExperimentalProfile(config={}){
  const same=(patch)=>Object.entries(patch).every(([k,v])=>k==="experimentalProfile"||config[k]===v);
  if(same(V8_STYLE_PATCH))return EXPERIMENTAL_PROFILES.V8_STYLE;
  if(same(FULL_PATCH))return EXPERIMENTAL_PROFILES.FULL;
  return EXPERIMENTAL_PROFILES.CUSTOM;
}
