// Research extension on the REAL MagicPerspective ObservedTransformations model.
// Learns whether neighboring anchors may be released by seeing the SAME position
// vary in more than one observed neighboring context. It does not hardcode
// grammatical slot labels or assume all axes are independent.
// Native strict operator behavior is left untouched. Unobserved independence
// is a HYPOTHESIS, and can fail in constrained semantic worlds.
import {tokenizeObservation,renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
const stateKey=t=>JSON.stringify(t);
export class ContextAxisNavigator {
 constructor(observed) {
   this.observed=observed;
 }
 axisEvidence(length) {
   const editable=this.observed.editablePositions.get(length)||new Set();
   const values=new Map();
   for(const op of this.observed.operators.values()) {
     if(op.kind!=="replace"||op.beforeLength!==length)continue;
     let r=values.get(op.index);
     if(!r) values.set(op.index,r={left:new Set(),right:new Set()});
     if(op.left!==null)r.left.add(op.left);
     if(op.right!==null)r.right.add(op.right);
   }
   return [...editable].sort((a,b)=>a-b).map(index=>{
     const group=values.get(index)||{left:new Set(),right:new Set()};
     return {index,variable:true,leftContextValues:group.left.size,
       rightContextValues:group.right.size,
       canVaryLeft:editable.has(index-1)&&group.left.size>=2,
       canVaryRight:editable.has(index+1)&&group.right.size>=2};
   });
 }
 neighbors(state) {
   const length=state.length,axis=this.axisEvidence(length),byIndex=new Map(axis.map(x=>[x.index,x]));
   const results=[],seen=new Set();
   for(const op of this.observed.operators.values()){
     if(op.kind!=="replace"||op.beforeLength!==length)continue;
     const i=op.index;if(state[i]!==op.from)continue;
     const gate=byIndex.get(i);if(!gate)continue;
     if(op.left!==null && !gate.canVaryLeft && state[i-1]!==op.left)continue;
     if(op.right!==null && !gate.canVaryRight && state[i+1]!==op.right)continue;
     const next=state.slice();next[i]=op.to;
     const key=stateKey(next);if(seen.has(key))continue;
     const support=this.observed.structuralSupport(next);
     if(support.verified&&!support.consistent)continue;
     seen.add(key);
     results.push({tokens:next,operator:{kind:"replace",index:i,from:op.from,to:op.to,
       observedSupport:op.sourceObservations,evidence:op.evidence?.[0]||null,
       releasedLeft:gate.canVaryLeft,releasedRight:gate.canVaryRight}});
   }
   return results;
 }
 plan(start,required,{maxExpanded=6000,maxSteps=12}={}){
   const initial=tokenizeObservation(start),goals=[...new Set(required)],seen=new Set([stateKey(initial)]);
   const queue=[{tokens:initial,parent:null,action:null,depth:0}];
   let expanded=0,read=0;
   while(read<queue.length && expanded<maxExpanded){
     const cur=queue[read++];expanded++;
     if(goals.every(x=>cur.tokens.includes(x))){
       let p=cur,states=[],actions=[];
       while(p){states.push(renderObservation(p.tokens));if(p.action)actions.push(p.action);p=p.parent;}
       states.reverse();actions.reverse();
       return {found:true,predicted:states.at(-1),start,states,actions,
         steps:actions.length,expanded,goalConstraints:goals,
         referenceAnswerProvided:false,plannedBeforeFirstAction:true,
         axisEvidence:this.axisEvidence(initial.length)};
     }
     if(cur.depth>=maxSteps)continue;
     for(const nx of this.neighbors(cur.tokens)){
       const k=stateKey(nx.tokens);if(seen.has(k))continue;seen.add(k);
       queue.push({tokens:nx.tokens,depth:cur.depth+1,parent:cur,action:nx.operator});
     }
   }
   return {found:false,reason:"insufficient-evidence-for-transformation",
     expanded,axisEvidence:this.axisEvidence(initial.length)};
 }
 // The candidate intervention is inferred from recently observed separate
 // one-step effects; the environment must still accept/reject it. No future
 // validity is guaranteed by this recommendation.
 suggestBridge(start){
   const t=tokenizeObservation(start),axis=this.axisEvidence(t.length),
     missing=axis.filter(x=>!x.canVaryRight&&axis.some(y=>y.index===x.index+1));
   if(!missing.length)return null;
   const i=missing[0].index,j=i+1;
   const effects=k=>[...this.observed.operators.values()]
     .filter(op=>op.kind==="replace"&&op.beforeLength===t.length&&op.index===k&&
       op.from===t[k]&&op.to!==op.from)
     .sort((a,b)=>b.sourceObservations-a.sourceObservations||
       String(a.to).localeCompare(String(b.to)));
   const opA=effects(i)[0],opB=effects(j)[0];
   if(!opA||!opB)return null;
   const candidate=t.slice();candidate[i]=opA.to;candidate[j]=opB.to;
   return {candidate:renderObservation(candidate),positions:[i,j],actionSources:[
     opA.evidence?.[0]||null,opB.evidence?.[0]||null],
     warning:"Hypothesis to test against the environment; not a known valid sentence"};
 }
}
