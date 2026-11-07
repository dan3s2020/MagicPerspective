// HIDDEN experimental world physics. The AXIS LEARNER does NOT import this file.
// Only the evaluator can construct this world and obtain observation triples.
// Six symbolic coordinates occupy unknown positions in a much larger xD signal.
// Other channels are resampled independent noise with the SAME value vocabulary.
import {ACTIONS,rng,shuffle,permute} from "./axis-navigator.mjs";
const CORE=6,ID=[0,1,2,3,4,5],N1=[1,0,2,3,4,5],N2=[0,1,2,3,5,4];
const HIDDEN_RULES=Object.freeze({
 a:[1,0,2,3,4,5],
 b:[0,2,1,3,4,5],
 c:[0,1,2,4,3,5],
 d:[1,2,3,4,5,0],
 e:[5,4,3,2,1,0],
 f:[0,1,2,3,5,4]
});
export function mkWorld({D=64,seed=314,noise=.2}={}){
 if(D<CORE)throw Error("D must be at least 6");
 const random=rng(seed),slots=shuffle(Array.from({length:D},(_,i)=>i),random).slice(0,CORE).sort((a,b)=>a-b);
 function create(core,r){
  const result=Array.from({length:D},()=>Math.floor(r()*CORE));
  for(let i=0;i<CORE;i++)result[slots[i]]=core[i];
  return result;
 }
 const coreOf=state=>slots.map(i=>state[i]);
 function transition(before,action,r){
  if(!ACTIONS.includes(action))throw Error("Unknown intervention");
  const deterministic=permute(coreOf(before),HIDDEN_RULES[action]);
  const z=r(),fraction=["a","b","c"].includes(action)?.8:.2;
  const residual=z<noise*fraction?N1:z<noise?N2:ID;
  return create(permute(deterministic,residual),r);
 }
 // Evaluation-only slots; callers must never supply them to the learner.
 return {D,slots,noise,create,coreOf,transition};
}
