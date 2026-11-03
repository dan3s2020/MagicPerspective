// V4 FTU constraint laboratory. These are illustrative, balanced chemical equations.
// No claim of real-world laboratory automation or miraculous transmutation.
export const FORMULAS=Object.freeze({
  water:{H:2,O:1},glucose:{C:6,H:12,O:6},ethanol:{C:2,H:6,O:1},
  carbon_dioxide:{C:1,O:2},oxygen:{O:2},acetic_acid:{C:2,H:4,O:2}
});
export const REACTIONS=Object.freeze([
  {id:'fermentation',name:'Glucose fermentation (idealized)',in:{glucose:1},
    out:{ethanol:2,carbon_dioxide:2}},
  {id:'oxidation',name:'Ethanol oxidation (idealized)',in:{ethanol:1,oxygen:1},
    out:{acetic_acid:1,water:1}}
]);
const ELEMENTS=['C','H','O'];
export function atomCounts(inventory){
  const atoms={C:0,H:0,O:0};
  for(const [name,amount] of Object.entries(inventory)){
    if(!FORMULAS[name]||!Number.isInteger(amount)||amount<0||amount>1000)throw Error('Invalid molecular inventory');
    for(const e of ELEMENTS)atoms[e]+=(FORMULAS[name][e]||0)*amount;
  }
  return atoms;
}
export function reactionBalance(reaction){
  const before=atomCounts(reaction.in),after=atomCounts(reaction.out);
  return {balanced:ELEMENTS.every(e=>before[e]===after[e]),before,after};
}
export function applyReaction(inventory,reaction){
  if(!reactionBalance(reaction).balanced)throw Error('Unbalanced reaction rejected');
  for(const [k,v] of Object.entries(reaction.in))if((inventory[k]||0)<v)return null;
  const next={...inventory};
  for(const [k,v] of Object.entries(reaction.in))next[k]=(next[k]||0)-v;
  for(const [k,v] of Object.entries(reaction.out))next[k]=(next[k]||0)+v;
  const a=atomCounts(inventory),b=atomCounts(next);
  if(!ELEMENTS.every(e=>a[e]===b[e]))throw Error('Matter conservation violated');
  return next;
}
const normalized=i=>JSON.stringify(Object.fromEntries(Object.entries(i).filter(([,n])=>n>0).sort((a,b)=>a[0].localeCompare(b[0]))));
export function planChemistry(initial,{goal='ethanol',amount=1,maxDepth=6}={}){
  if(!FORMULAS[goal]||!Number.isInteger(amount)||amount<1||amount>20||!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>9)throw Error('Invalid goal');
  const start=Object.fromEntries(Object.entries(initial).filter(([,v])=>v>0));
  const available=atomCounts(start),needed=atomCounts({[goal]:amount});
  const deficits=Object.fromEntries(ELEMENTS.map(e=>[e,Math.max(0,needed[e]-available[e])]));
  if(Object.values(deficits).some(v=>v>0))
    return {possible:false,reason:'Insufficient atoms in this closed system',deficits,available,needed,steps:[]};
  const queue=[{state:start,steps:[]}],seen=new Set([normalized(start)]);
  for(let k=0;k<queue.length;k++){
    const cur=queue[k];
    if((cur.state[goal]||0)>=amount)return {possible:true,reason:'Reachable using the listed idealized reactions',
      initial:start,final:cur.state,steps:cur.steps,available,needed};
    if(cur.steps.length>=maxDepth)continue;
    for(const r of REACTIONS){
      const next=applyReaction(cur.state,r);if(!next)continue;
      const key=normalized(next);if(seen.has(key))continue;seen.add(key);
      queue.push({state:next,steps:[...cur.steps,{id:r.id,name:r.name,inputs:r.in,outputs:r.out}]});
    }
  }
  return {possible:false,reason:'No permitted balanced reaction sequence reaches the goal',
    deficits,available,needed,steps:[]};
}
