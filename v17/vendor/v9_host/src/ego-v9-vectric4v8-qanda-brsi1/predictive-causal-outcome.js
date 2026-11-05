import {createNativeHorizonRecord,NATIVE_HORIZON_AXES,NATIVE_PREDICTION_FAMILIES} from "./predictive-causal-horizons.js";

function finite(x,d=0){return Number.isFinite(Number(x))?Number(x):d;}
function mean(a){return a?.length?a.reduce((s,x)=>s+finite(x),0)/a.length:0;}
function counts(a){const o={};for(const x of a||[])o[String(x)]=(o[String(x)]||0)+1;return o;}
function sideMap(state){
  const m=new Map();for(const e of state?.allLocalSides||[])for(const s of e.sides||[])m.set(e.ego+"|"+s.side,s);return m;
}
function contactTotals(state){
  let contact=0,wall=0,push=0,pull=0,n=0;
  for(const e of state?.allLocalSides||[])for(const s of e.sides||[]){contact+=finite(s.contact);wall+=finite(s.wall);push+=finite(s.push);pull+=finite(s.pull);n++;}
  return{contact,wall,push,pull,n};
}
function displacement(root,row){
  const out=[],n=Math.max(root?.positions?.length||0,row?.positions?.length||0);
  for(let i=0;i<n;i++){const a=root?.positions?.[i]||[0,0,0],b=row?.positions?.[i]||a;out.push([finite(b[0])-finite(a[0]),finite(b[1])-finite(a[1]),finite(b[2])-finite(a[2])]);}return out;
}
function pointActual(root,row,{terminalSummary=null,windowRows=null}={}){
  const ds=(row?.distances||[]).map(Number),rootDs=(root?.distances||[]).map(Number),body=row?.body||{},movement={accepted:Boolean(row?.accepted),rejected:row?.accepted===false,reason:row?.reason??null,actual:row?.actual??null};
  const contacts=contactTotals(row),freq=windowRows?summarizeFrequency(windowRows,root):null;
  const reward=row?.localReward??null;
  return{
    cell_positions:structuredClone(row?.positions||[]),
    cell_displacement:displacement(root,row),
    swarm_centroid:{x:finite(body.centroidX),y:finite(body.centroidY),z:finite(body.centroidZ)},
    swarm_span:{x:finite(body.spanX),y:finite(body.spanY),z:finite(body.spanZ)},
    per_cell_distance_progress:rootDs.map((d,i)=>finite(d)-finite(ds[i],d)),
    mean_distance:mean(ds),worst_distance:ds.length?Math.max(...ds):0,
    pre_gate_count:finite(body.preGate),in_gate_count:finite(body.inGate),passed_count:finite(body.passed),
    terminal_success:terminalSummary?.success??((body.passed||0)>0&&(body.passed||0)===(row?.positions?.length||0)),
    budget_exhaustion:terminalSummary?.termination==="action-budget",
    accepted_rejected_movement:movement,
    reject_reason_distribution:freq?.rejectReasons??(row?.accepted===false?{[String(row.reason||"unknown")]:1}:{}),
    contact_outcomes:freq?.contacts??{current:contacts.contact},
    wall_contact_outcomes:freq?.walls??{current:contacts.wall},
    topology_outcomes:freq?.topology??{cellCount:row?.positions?.length||0},
    push_pull_relative_motion:freq?.pushPull??{push:contacts.push,pull:contacts.pull},
    motor_mismatch:freq?.motorMismatch??structuredClone(row?.motorMismatch||[]),
    action_distribution:freq?.actions??{[String(row?.action??"unknown")]:1},
    policy_confidence:freq?.confidence??finite(row?.confidence),
    policy_entropy:freq?.entropy??finite(row?.entropy),
    reward:freq?.reward??finite(reward?.total),
    reward_components:freq?.rewardComponents??structuredClone(reward||{}),
    own_prediction_error:terminalSummary?.own??"NOT_OBSERVED",
    world_prediction_error:terminalSummary?.world??"NOT_OBSERVED",
    agency_prediction_error:terminalSummary?.agency??"NOT_OBSERVED",
    body_shape_statistics:{...structuredClone(body),cellCount:row?.positions?.length||0},
    recurrent_self_state_fingerprint:structuredClone(row?.recurrentFingerprint||[])
  };
}
export function summarizeFrequency(rows,root=null){
  const actions=counts(rows.map(x=>x.action)),rejectReasons=counts(rows.filter(x=>x.accepted===false).map(x=>x.reason||"unknown"));
  let accepted=0,rejected=0,movement=0,noMovement=0,wallSum=0,contactSum=0,push=0,pull=0,conf=0,ent=0,reward=0,topologyChanges=0,mismatch=0;
  const rewardComponents={};
  let prevN=root?.positions?.length??rows[0]?.positions?.length??0;
  for(const x of rows){
    if(x.accepted)accepted++;else rejected++;
    const a=x.actual||{},m=Math.abs(finite(a.dx))+Math.abs(finite(a.dy))+Math.abs(finite(a.dz));if(m>0)movement++;else noMovement++;
    const c=contactTotals(x);wallSum+=c.wall;contactSum+=c.contact;push+=c.push;pull+=c.pull;conf+=finite(x.confidence);ent+=finite(x.entropy);
    const mm=x.motorMismatch||[];mismatch+=Math.hypot(...mm.map(v=>finite(v)));
    const rr=x.localReward||{};reward+=finite(rr.total);for(const [k,v] of Object.entries(rr))if(typeof v==="number")rewardComponents[k]=(rewardComponents[k]||0)+v;
    const n=x.positions?.length||0;if(n!==prevN)topologyChanges++;prevN=n;
  }
  const n=Math.max(1,rows.length);
  for(const k of Object.keys(rewardComponents))rewardComponents[k]/=n;
  return{actions,accepted,rejected,rejectReasons,movement,noMovement,contacts:{mean:contactSum/n},walls:{mean:wallSum/n},pushPull:{pushMean:push/n,pullMean:pull/n},
    motorMismatch:{meanL2:mismatch/n},confidence:conf/n,entropy:ent/n,reward:reward/n,rewardComponents,topology:{changes:topologyChanges,finalCellCount:prevN}};
}
function firstAt(trace,pred){for(const x of trace||[])if(pred(x))return x;return null;}
function rec(id,row,root,opts={}){return createNativeHorizonRecord({id,status:row?"RESOLVED":opts.status||"PENDING",actual:row?pointActual(root,row,opts):null,metadata:opts.metadata||null});}
function transitionEvent(prev,row,type,thresholds={}){
  if(!row)return false;
  if(type==="E_ACCEPTED_MOVE")return row.accepted===true;
  if(type==="E_REJECTED_INTENT")return row.accepted===false;
  const pm=sideMap(prev),cm=sideMap(row);
  const cross=(field,dir)=>{for(const [k,c] of cm){const p=pm.get(k)||{};if(dir==="gain"&&finite(p[field])<=0&&finite(c[field])>0)return true;if(dir==="loss"&&finite(p[field])>0&&finite(c[field])<=0)return true;}return false;};
  if(type==="E_CONTACT_GAIN")return cross("contact","gain");
  if(type==="E_CONTACT_LOSS")return cross("contact","loss");
  if(type==="E_WALL_CONTACT_GAIN")return cross("wall","gain");
  if(type==="E_WALL_CONTACT_LOSS")return cross("wall","loss");
  if(type==="E_PUSH_THRESHOLD_CROSSING"){if(!Number.isFinite(Number(thresholds.push)))return null;return [...cm.values()].some((c,k)=>finite(pm.get(k)?.push)<Number(thresholds.push)&&finite(c.push)>=Number(thresholds.push));}
  if(type==="E_PULL_THRESHOLD_CROSSING"){if(!Number.isFinite(Number(thresholds.pull)))return null;return [...cm.values()].some((c,k)=>finite(pm.get(k)?.pull)<Number(thresholds.pull)&&finite(c.pull)>=Number(thresholds.pull));}
  if(type==="E_HIGH_MOTOR_MISMATCH"){if(!Number.isFinite(Number(thresholds.motorMismatch)))return null;return Math.hypot(...(row.motorMismatch||[]).map(v=>finite(v)))>=Number(thresholds.motorMismatch);}
  if(type==="E_NEW_BEST_PROGRESS")return (row.maxProgress||[]).some((v,i)=>finite(v)>finite(prev?.maxProgress?.[i]));
  if(type==="E_ENTER_GATE")return (row.zones||[]).some((z,i)=>z!=="PRE_GATE"&&prev?.zones?.[i]==="PRE_GATE");
  if(type==="E_CROSS_EXIT")return (row.zones||[]).some((z,i)=>z==="PASSED"&&prev?.zones?.[i]!=="PASSED");
  if(type==="E_BODY_TOPOLOGY_CHANGE")return (row.positions?.length||0)!==(prev?.positions?.length||0);
  return false;
}
export function resolveNativeTraceHorizons({root,trace=[],terminalSummary=null,thresholds={}}={}){
  if(!root)throw new Error("trace root required");const rows=[...trace],out=[],rootStep=finite(root.globalStep),rootCycle=finite(root.scheduler?.cycle),cellCount=root.positions?.length||16;
  for(const h of NATIVE_HORIZON_AXES.A.offsets){const row=firstAt(rows,x=>finite(x.globalStep)-rootStep>=h);out.push(rec("A+"+h,row,root,{terminalSummary}));}
  out.push(rec("A+TERMINAL",rows.at(-1)||null,root,{terminalSummary,status:rows.length?"RESOLVED":"PENDING"}));
  for(const h of NATIVE_HORIZON_AXES.C.offsets){const row=firstAt(rows,x=>finite(x.scheduler?.cycle)-rootCycle>=h);out.push(rec("C+"+h,row,root,{terminalSummary}));}
  out.push(rec("C+TERMINAL",rows.at(-1)||null,root,{terminalSummary,status:rows.length?"RESOLVED":"PENDING"}));
  for(let i=0;i<cellCount;i++){
    const own=rows.filter(x=>Number(x.ego)===i);
    for(const h of NATIVE_HORIZON_AXES.D.offsets)out.push(rec("D_"+i+"+"+h,own[h-1]||null,root,{terminalSummary}));
    out.push(rec("D_"+i+"+TERMINAL",own.at(-1)||null,root,{terminalSummary,status:rows.length?"RESOLVED":"PENDING"}));
    for(const h of NATIVE_HORIZON_AXES.P.offsets){const d0=finite(root.distances?.[i]),row=firstAt(rows,x=>d0-finite(x.distances?.[i],d0)>=h);out.push(rec("P_"+i+"+"+h,row,root,{terminalSummary}));}
    out.push(rec("P_"+i+"+PASSED",firstAt(rows,x=>x.zones?.[i]==="PASSED"),root,{terminalSummary}));
  }
  const bodyTargets=[["B_FIRST_PASSED",1],["B_4_PASSED",4],["B_8_PASSED",8],["B_12_PASSED",12],["B_16_PASSED",16]];
  for(const [id,n] of bodyTargets)out.push(rec(id,firstAt(rows,x=>finite(x.body?.passed)>=Math.min(n,cellCount)),root,{terminalSummary}));
  out.push(rec("B_BUDGET_EXHAUSTED",terminalSummary?.termination==="action-budget"?(rows.at(-1)||null):null,root,{terminalSummary,status:terminalSummary?"NOT_APPLICABLE":"PENDING"}));
  let prev=root;
  for(const type of NATIVE_HORIZON_AXES.E.ids){
    let row=null,unknownThreshold=false;prev=root;
    for(const x of rows){const hit=transitionEvent(prev,x,type,thresholds);if(hit===null){unknownThreshold=true;break;}if(hit){row=x;break;}prev=x;}
    out.push(rec(type,row,root,{terminalSummary,status:unknownThreshold?"NOT_APPLICABLE":"PENDING",metadata:unknownThreshold?{reason:"threshold_not_supplied"}:null}));
  }
  for(const h of NATIVE_HORIZON_AXES.F.actionOffsets){
    const window=rows.filter(x=>finite(x.globalStep)-rootStep<=h),row=firstAt(rows,x=>finite(x.globalStep)-rootStep>=h);
    out.push(rec("F@A+"+h,row,root,{terminalSummary,windowRows:window}));
  }
  out.push(rec("F@TERMINAL",rows.at(-1)||null,root,{terminalSummary,windowRows:rows,status:rows.length?"RESOLVED":"PENDING"}));
  for(const h of NATIVE_HORIZON_AXES.EP.offsets)out.push(createNativeHorizonRecord({id:"EP+"+h,status:"PENDING",metadata:{resolver:"fresh_episode_capability"}}));
  for(const h of NATIVE_HORIZON_AXES.L.offsets)out.push(createNativeHorizonRecord({id:"L+"+h,status:"PENDING",metadata:{resolver:"future_learning"}}));
  return out;
}
export function resolvedNativeOutcomeMap(records){return Object.fromEntries((records||[]).filter(x=>x.status==="RESOLVED").map(x=>[x.id,x.actual]));}
