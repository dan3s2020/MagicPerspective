// V23 Cross-world transform induction from the EXISTING observed V19 evidence.
// This is NOT a new text-generator and not a replacement for Discoverer.shape.
// A portable replacement must occur in at least TWO independently observed
// complete-sentence contrasts with distinct local contexts. Projection into
// a new context remains a HYPOTHESIS until an actual world step confirms it.
const SEP="\u001f";
const ID="__XWORLD__:";
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const portableId=(at,from,to)=>ID+JSON.stringify([at,from,to]);
export function parsePortableId(action){
 if(typeof action!=="string"||!action.startsWith(ID))return null;
 let parts;
 try{parts=JSON.parse(action.slice(ID.length));}catch{return null;}
 if(!Array.isArray(parts)||parts.length!==3||
    !Number.isSafeInteger(parts[0])||parts[0]<0||
    typeof parts[1]!=="string"||typeof parts[2]!=="string"||
    !parts[1]||!parts[2]||parts[1]===parts[2])return null;
 return {at:parts[0],from:parts[1],to:parts[2]};
}
export function portableTransformations(rules){
 const groups=new Map();
 for(const r of rules.values()){
   if(r.ambiguous||r.operation&&r.operation!=="replace"||
      typeof r.from!=="string"||typeof r.to!=="string"||
      !r.from||!r.to||r.from===r.to)continue;
   const k=JSON.stringify([r.from,r.to]);
   let g=groups.get(k);
   if(!g){g={from:r.from,to:r.to,sources:new Set(),contexts:new Set(),
       positions:new Set(),rules:[],observations:0,accepted:0,rejected:0};groups.set(k,g);}
   for(const s of r.sources||[])g.sources.add(s);
   for(const ct of r.contexts||[])g.contexts.add(JSON.stringify(ct));
   if(Number.isInteger(r.at))g.positions.add(r.at);
   g.rules.push(r.id);g.observations+=r.observations||0;
   g.accepted+=r.accepted||0;g.rejected+=r.rejected||0;
 }
 const admitted=[];
 for(const g of groups.values()){
   // Two different observed BEFORE->AFTER pairs, and at least two
   // different local contexts. Multiple repeats of a single example
   // cannot unlock transfer merely by overcounting a frequency.
   if(g.sources.size<2||g.contexts.size<2||g.rejected>g.accepted+g.observations)continue;
   admitted.push({from:g.from,to:g.to,support:g.sources.size,contexts:g.contexts.size,
      positions:[...g.positions].sort((a,b)=>a-b),
      sources:[...g.sources],observations:g.observations,
      accepted:g.accepted,rejected:g.rejected,
      ruleIds:g.rules,verified:g.accepted>0,
      status:g.accepted?"PARTIALLY_CONFIRMED_EFFECT":"UNVERIFIED_CROSS_WORLD_HYPOTHESIS"});
 }
 return admitted.sort((a,b)=>b.support-a.support||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
}
export function candidatePortable(state,portable,interventions){
 const results=[];
 for(const r of portable){
   for(let i=0;i<state.length;i++){
     if(state[i]!==r.from||
        (r.causallySupportedPositions&&!r.causallySupportedPositions.includes(i)))continue;
     if(r.causallySupportedContexts&&!r.causallySupportedContexts.some(ctx=>
       ctx.at===i&&ctx.left===(state[i-1]??null)&&
       ctx.right===(state[i+1]??null)&&ctx.atEnd===(i===state.length-1)))continue;
     const action=portableId(i,r.from,r.to),id=state.join(SEP)+"|"+action;
     const seen=interventions.get(id);
     if(seen?.blocked && seen.blocked>=seen.accepted)continue;
     const next=state.slice();next[i]=r.to;
     results.push({next,action,at:i,from:r.from,to:r.to,
       support:r.support,verified:!!seen?.accepted,
       hypothesis:true,provenance:r.sources.slice(0,12),
       sourceWorldPositions:r.positions});
   }
 }
 return results;
}
export function inspectPortable(rules,action,state,interventions){
 const id=parsePortableId(action);
 if(!id||id.at>=state.length||state[id.at]!==id.from)return null;
 const rule=portableTransformations(rules).find(r=>r.from===id.from&&r.to===id.to);
 if(!rule)return null;
 const blocked=interventions.get(state.join(SEP)+"|"+action);
 if(blocked?.blocked && blocked.blocked>=blocked.accepted)return null;
 const next=state.slice();next[id.at]=id.to;return next;
}
