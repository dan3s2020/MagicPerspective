export const PREDICTIVE_CAUSAL_HORIZON_VERSION="v9-octopus-native-horizons-1";

export const HORIZON_STATUS=Object.freeze([
  "PENDING",
  "RESOLVED",
  "NOT_APPLICABLE",
  "UNREACHABLE_BY_BUDGET",
  "NOT_EVALUATED_COMPUTE_BUDGET",
  "INVALID"
]);

export const NATIVE_HORIZON_AXES=Object.freeze({
  A:Object.freeze({name:"global-action",offsets:Object.freeze([1,4,16,64,256]),terminal:"A+TERMINAL"}),
  C:Object.freeze({name:"scheduler-cycle",offsets:Object.freeze([1,4,16,32]),terminal:"C+TERMINAL"}),
  D:Object.freeze({name:"own-decision",offsets:Object.freeze([1,2,4,8,16]),terminal:"TERMINAL"}),
  P:Object.freeze({name:"spatial-progress",offsets:Object.freeze([1,2,4,8]),terminal:"PASSED"}),
  B:Object.freeze({name:"body-milestone",ids:Object.freeze(["B_FIRST_PASSED","B_4_PASSED","B_8_PASSED","B_12_PASSED","B_16_PASSED","B_BUDGET_EXHAUSTED"])}),
  E:Object.freeze({name:"physical-event",ids:Object.freeze([
    "E_ACCEPTED_MOVE","E_REJECTED_INTENT","E_CONTACT_GAIN","E_CONTACT_LOSS","E_WALL_CONTACT_GAIN","E_WALL_CONTACT_LOSS",
    "E_PUSH_THRESHOLD_CROSSING","E_PULL_THRESHOLD_CROSSING","E_HIGH_MOTOR_MISMATCH","E_NEW_BEST_PROGRESS","E_ENTER_GATE","E_CROSS_EXIT","E_BODY_TOPOLOGY_CHANGE"
  ])}),
  F:Object.freeze({name:"frequency-window",actionOffsets:Object.freeze([16,64,256]),terminal:"F@TERMINAL"}),
  EP:Object.freeze({name:"fresh-episode-capability",offsets:Object.freeze([1,4,16])}),
  L:Object.freeze({name:"future-learning",offsets:Object.freeze([1,4,16,64]),unit:"batch"})
});

export const NATIVE_PREDICTION_FAMILIES=Object.freeze([
  "cell_positions",
  "cell_displacement",
  "swarm_centroid",
  "swarm_span",
  "per_cell_distance_progress",
  "mean_distance",
  "worst_distance",
  "pre_gate_count",
  "in_gate_count",
  "passed_count",
  "terminal_success",
  "budget_exhaustion",
  "accepted_rejected_movement",
  "reject_reason_distribution",
  "contact_outcomes",
  "wall_contact_outcomes",
  "topology_outcomes",
  "push_pull_relative_motion",
  "motor_mismatch",
  "action_distribution",
  "policy_confidence",
  "policy_entropy",
  "reward",
  "reward_components",
  "own_prediction_error",
  "world_prediction_error",
  "agency_prediction_error",
  "body_shape_statistics",
  "recurrent_self_state_fingerprint"
]);

export function nativeHorizonIds({cellCount=16}={}){
  const n=Math.max(1,Math.floor(Number(cellCount)||16)),out=[];
  for(const x of NATIVE_HORIZON_AXES.A.offsets)out.push("A+"+x);
  out.push(NATIVE_HORIZON_AXES.A.terminal);
  for(const x of NATIVE_HORIZON_AXES.C.offsets)out.push("C+"+x);
  out.push(NATIVE_HORIZON_AXES.C.terminal);
  for(let i=0;i<n;i++){
    for(const x of NATIVE_HORIZON_AXES.D.offsets)out.push("D_"+i+"+"+x);
    out.push("D_"+i+"+TERMINAL");
    for(const x of NATIVE_HORIZON_AXES.P.offsets)out.push("P_"+i+"+"+x);
    out.push("P_"+i+"+PASSED");
  }
  out.push(...NATIVE_HORIZON_AXES.B.ids);
  out.push(...NATIVE_HORIZON_AXES.E.ids);
  for(const x of NATIVE_HORIZON_AXES.F.actionOffsets)out.push("F@A+"+x);
  out.push(NATIVE_HORIZON_AXES.F.terminal);
  for(const x of NATIVE_HORIZON_AXES.EP.offsets)out.push("EP+"+x);
  for(const x of NATIVE_HORIZON_AXES.L.offsets)out.push("L+"+x);
  return out;
}

export function derivedSimTimeDelta({globalActions,egoCount=16,egoDecisionHz=30}={}){
  const a=Math.max(0,Number(globalActions)||0),n=Math.max(1,Number(egoCount)||16),hz=Math.max(1e-9,Number(egoDecisionHz)||30);
  return a/(n*hz);
}

export function createNativeHorizonRecord({id,status="PENDING",prediction=null,actual=null,error=null,subject=null,metadata=null}={}){
  if(!nativeHorizonIdLooksValid(id))throw new Error("invalid native horizon id "+id);
  if(!HORIZON_STATUS.includes(status))throw new Error("invalid native horizon status "+status);
  return{schemaVersion:1,horizonVersion:PREDICTIVE_CAUSAL_HORIZON_VERSION,id,status,subject,prediction,actual,error,metadata};
}

export function nativeHorizonIdLooksValid(id){
  const s=String(id||"");
  return /^A\+(?:1|4|16|64|256|TERMINAL)$/.test(s)
    ||/^C\+(?:1|4|16|32|TERMINAL)$/.test(s)
    ||/^D_\d+\+(?:1|2|4|8|16|TERMINAL)$/.test(s)
    ||/^P_\d+\+(?:1|2|4|8|PASSED)$/.test(s)
    ||NATIVE_HORIZON_AXES.B.ids.includes(s)
    ||NATIVE_HORIZON_AXES.E.ids.includes(s)
    ||/^F@A\+(?:16|64|256)$/.test(s)
    ||s==="F@TERMINAL"
    ||/^EP\+(?:1|4|16)$/.test(s)
    ||/^L\+(?:1|4|16|64)$/.test(s);
}
