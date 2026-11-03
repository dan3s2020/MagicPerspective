// Independent-output-organism ECONOMY CONTRACT, NOT the existing A11 CUDA motor.
// A11 native currently has just ONE trained byte motor, so this module is
// deliberately NOT wired to its historical "output organism" graphics.
// Future actual independent GPU output heads must call settle() only AFTER
// each head commits its own slot action and the referee reveals correct slots.
//
// All amounts are abstract "credits". The convex curve is a testable incentive
// design, not evidence of emergent cooperation or a claim of true exponentiality.
export const DEMOCRACY_SCHEMA="a11-output-democracy-economy-v1";
export const DEMOCRACY_POLICY=Object.freeze({
  baseCorrect:1,
  extraMemberLinear:.225,
  extraMemberQuadratic:.045,
  maximumPathBudgetPerCorrect:.15,
  maxCausalContributors:6
});
const finite=(n,name)=>{
  if(typeof n!=="number"||!Number.isFinite(n))throw Error("Invalid "+name);
  return n;
};
export function successMultiplier(totalCorrect,policy=DEMOCRACY_POLICY){
  if(!Number.isSafeInteger(totalCorrect)||totalCorrect<1)
    throw Error("Group size must be a positive integer");
  const n=totalCorrect-1;
  const multiplier=1+finite(policy.extraMemberLinear,"linear bonus")*n+
    finite(policy.extraMemberQuadratic,"quadratic bonus")*n*n;
  if(multiplier<1||!Number.isFinite(multiplier))
    throw Error("Cooperation multiplier must be finite and >= 1");
  return multiplier;
}
export function rewardSchedule(total=4,policy=DEMOCRACY_POLICY){
  if(!Number.isSafeInteger(total)||total<1||total>16)
    throw Error("Output organisms must be 1..16");
  return Array.from({length:total},(_,i)=>{
    const k=i+1;
    const perCorrect=policy.baseCorrect*successMultiplier(k,policy);
    return{correct:k,total,perCorrect,totalBase:k*policy.baseCorrect,
      totalDistributed:k*perCorrect,teamPremiumPerCorrect:perCorrect-policy.baseCorrect};
  });
}
function uniqueSlots(slots){
 if(!Array.isArray(slots)||slots.length<1||slots.length>16)
   throw Error("Requires 1..16 independently submitted output slot actions");
 const ids=new Set(),orgs=new Set();
 for(const item of slots){
   if(!Number.isSafeInteger(item?.slot)||item.slot<0||item.slot>=slots.length ||
     typeof item.organismId!=="string"||!item.organismId.trim() ||
     typeof item.output!=="string"||item.output.length===0 ||
     typeof item.target!=="string"||item.target.length===0 ||
     typeof item.feedbackAfterAction!=="boolean"||!item.feedbackAfterAction)
     throw Error("Each organism must provide a distinct real slot, committed output, then post-action referee target");
   if(ids.has(item.slot)||orgs.has(item.organismId))
     throw Error("Each output slot and output organism must be independently owned");
   ids.add(item.slot);orgs.add(item.organismId);
   const actions=item.path??[];
   if(!Array.isArray(actions)||actions.length>16)
     throw Error("Causal path must be an explicitly recorded bounded list");
   const uniq=new Set();
   for(const node of actions){
     if(typeof node?.actionId!=="string"||!node.actionId ||
        typeof node?.organismId!=="string"||!node.organismId ||
        typeof node?.cellId!=="string"||!node.cellId ||
        uniq.has(node.actionId))
       throw Error("Invalid or repeated real path action ID");
     uniq.add(node.actionId);
   }
 }
 if(ids.size!==slots.length)throw Error("Output slots must be contiguous 0..N-1");
}
// Exact Shapley marginal credit on frozen counterfactual replays, 2^n,
// with separate budget per correct slot. No valid replay => NO path money.
// Any unverifiable missing/corrupt replay or disagreed factual baseline
// throws, rather than silently giving everyone an invented reward.
export function pathAttribution({slot,pass,path,counterfactualReplay,
  policy=DEMOCRACY_POLICY}){
 if(!pass||!path?.length)return{credits:[],status:pass?"no-eligible-path":"wrong-output"};
 if(typeof counterfactualReplay!=="function")
   return{credits:[],status:"no-frozen-intervention-oracle"};
 if(path.length>policy.maxCausalContributors)
   return{credits:[],status:"path-exceeds-exact-oracle-budget"};
 const keys=path.map(x=>x.actionId);
 if(new Set(keys).size!==keys.length)throw Error("Repeated causal action");
 const n=path.length,all=(1<<n)-1,states=new Array(1<<n);
 for(let mask=0;mask<=all;mask++){
   const active=keys.filter((_,i)=>(mask&(1<<i))!==0);
   const result=counterfactualReplay({slot,activeActionIds:active,
     intervention:"freeze-prior-state-and-replay-exact-input"});
   if(typeof result!=="boolean")
     throw Error("Counterfactual replay must return measured Boolean correctness");
   states[mask]=Number(result);
 }
 if(states[all]!==1)throw Error("Frozen full-path replay disagrees with actual correct output");
 const factorial=[1];
 for(let i=1;i<=n;i++)factorial[i]=factorial[i-1]*i;
 const shapley=path.map((_,i)=>{
   let value=0;
   for(let mask=0;mask<=all;mask++){
     if(mask&(1<<i))continue;
     let before=0;for(let j=0;j<n;j++)if(mask&(1<<j))before++;
     const w=factorial[before]*factorial[n-before-1]/factorial[n];
     value+=w*(states[mask|(1<<i)]-states[mask]);
   }
   return value;
 });
 const positives=shapley.map(x=>Math.max(0,x)),sum=positives.reduce((a,b)=>a+b,0);
 if(sum===0)return{credits:[],status:"no-positive-causal-credit",replays:all+1};
 const budget=finite(policy.maximumPathBudgetPerCorrect,"path budget")*
   finite(policy.baseCorrect,"baseCorrect");
 if(budget<0)throw Error("Negative path budget");
 return{credits:path.map((p,i)=>({
   organismId:p.organismId,cellId:p.cellId,actionId:p.actionId,
   causalMarginal:shapley[i],credit:budget*positives[i]/sum
 })).filter(x=>x.credit>0),status:"frozen-exact-shapley-credit",
   replays:all+1,budget};
}
export function settleOutputDemocracy({slots,policy=DEMOCRACY_POLICY,
  frozenCounterfactualReplay=null,collectiveEnabled=true,pathEnabled=true}){
 uniqueSlots(slots);
 const ordered=slots.slice().sort((a,b)=>a.slot-b.slot);
 const successes=ordered.map(x=>x.output===x.target);
 const correctCount=successes.filter(Boolean).length;
 const factor=correctCount===0?1:
   collectiveEnabled?successMultiplier(correctCount,policy):1;
 const payouts=[];
 let groupTotal=0,personalTotal=0,causalTotal=0;
 for(let i=0;i<ordered.length;i++){
   const s=ordered[i],correct=successes[i];
   const personal=correct?policy.baseCorrect:0;
   const groupPremium=correct?personal*(factor-1):0;
   const path=pathEnabled?pathAttribution({
      slot:s.slot,pass:correct,path:s.path??[],policy,
      counterfactualReplay:frozenCounterfactualReplay?
       x=>frozenCounterfactualReplay({...x,outputOrganismId:s.organismId}):null
   }):{credits:[],status:"disabled-ablation"};
   const pathTotal=path.credits.reduce((a,b)=>a+b.credit,0);
   personalTotal+=personal;groupTotal+=groupPremium;causalTotal+=pathTotal;
   payouts.push({slot:s.slot,organismId:s.organismId,
     correct,personal,groupPremium,
     ownPayout:personal+groupPremium,
     teamSize:correctCount,causalPath:path,
     firstPress:s.output,expected:s.target});
 }
 const creditsByContributor=new Map();
 for(const p of payouts)for(const c of p.causalPath.credits){
   const k=c.organismId+"\u0000"+c.cellId+"\u0000"+c.actionId;
   const existing=creditsByContributor.get(k);
   creditsByContributor.set(k,{...c,fromSlot:p.slot,
     credit:c.credit+(existing?.credit??0)});
 }
 return{schema:DEMOCRACY_SCHEMA,totalSlots:ordered.length,
   correctCount,collectiveEnabled,pathEnabled,
   multiplier:factor,payouts,
   personalTotal,groupPremiumTotal:groupTotal,causalTotal,
   totalIssued:personalTotal+groupTotal+causalTotal,
   creditedPathActions:[...creditsByContributor.values()],
   verdict:"reward allocation AFTER committed output only; no GPU weights updated by this function"};
}
// An independent per-output-organism learning policy may use this wallet
// with its own optimizer. The existing history-only A11 slots MUST NOT do so.
export function preferCoalition({personalSuccess=true,teamSizes=[1,2,3,4],
  policy=DEMOCRACY_POLICY}={}){
 if(!personalSuccess)return teamSizes.map(k=>({teamSize:k,ownPayout:0}));
 return teamSizes.map(k=>({teamSize:k,
   ownPayout:policy.baseCorrect*successMultiplier(k,policy)}));
}
