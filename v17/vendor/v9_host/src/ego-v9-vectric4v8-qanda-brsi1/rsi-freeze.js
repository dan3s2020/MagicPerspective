import {hashValue} from "./causal-types.js";
import {experimentalManifest} from "./experimental-features.js";
import {trainerArchitectureCompatible} from "./trainer-compatibility.js";

export const FROZEN_RSI_ROOT_SCHEMA=1;
export const FROZEN_RSI_ROOT_KIND="v9-manual-frozen-rsi-root";

export function createFrozenRsiRoot({trainer,replaySnapshot=null,createdAt=null}={}){
  if(!trainerArchitectureCompatible(trainer))throw new Error("cannot freeze incompatible V9 trainer");
  const trainerCopy=structuredClone(trainer),replayCopy=replaySnapshot==null?null:structuredClone(replaySnapshot);
  // The inheritance barrier is host-runtime state, not part of the scientific H0.
  // A frozen source must not persist a transient "strict gate currently armed" bit.
  if(trainerCopy.config)trainerCopy.config.rsiInheritanceGateStrict=false;
  const featureManifest=experimentalManifest(trainerCopy.config||{});
  const rootHash=hashValue({schemaVersion:FROZEN_RSI_ROOT_SCHEMA,kind:FROZEN_RSI_ROOT_KIND,trainer:trainerCopy,replaySnapshot:replayCopy});
  return{
    schemaVersion:FROZEN_RSI_ROOT_SCHEMA,
    kind:FROZEN_RSI_ROOT_KIND,
    rootHash,
    createdAt:createdAt??Date.now(),
    policyVersion:trainerCopy.policyVersion,
    batch:trainerCopy.batch,
    featureManifest,
    trainer:trainerCopy,
    replaySnapshot:replayCopy
  };
}

export function validateFrozenRsiRoot(bundle){
  if(!bundle||bundle.schemaVersion!==FROZEN_RSI_ROOT_SCHEMA||bundle.kind!==FROZEN_RSI_ROOT_KIND)return{ok:false,reason:"schema"};
  if(!trainerArchitectureCompatible(bundle.trainer))return{ok:false,reason:"trainer-shape"};
  const expected=hashValue({schemaVersion:FROZEN_RSI_ROOT_SCHEMA,kind:FROZEN_RSI_ROOT_KIND,trainer:bundle.trainer,replaySnapshot:bundle.replaySnapshot??null});
  if(expected!==bundle.rootHash)return{ok:false,reason:"hash",expected,actual:bundle.rootHash};
  return{ok:true,rootHash:expected};
}

export function restoreFrozenRsiRoot(bundle){
  const check=validateFrozenRsiRoot(bundle);if(!check.ok)throw new Error("invalid frozen RSI root: "+check.reason);
  return{trainer:structuredClone(bundle.trainer),replaySnapshot:bundle.replaySnapshot==null?null:structuredClone(bundle.replaySnapshot),rootHash:bundle.rootHash,featureManifest:structuredClone(bundle.featureManifest||null)};
}
