// Research-only MagicPerspective V17 hypothesis: discover COUPLED text movement axes
// from real paired textual observations, then construct a goal-conditioned path.
// Uses the native V17 tokenizer/renderer. Neither arithmetic semantics nor
// equation solving is encoded. The induction bias is explicit: repeated integer
// differences in the SAME two observed token positions can form a reusable move.
// This is a TEST of a hypothesis, not the original Brain learning this already.
import {tokenizeObservation,renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const integer=t=>/^\d+$/u.test(t);
const keyOf=t=>t.map(v=>integer(v)?"#":v).join("\x1f");
const stateKey=t=>t.join("\x1f");
const EPS=1e-9;
function rref(rows,d) {
  const a=rows.map(v=>v.slice()),pivots=[];let r=0;
  for(let col=0;col<d && r<a.length;col++){
    let best=r;for(let i=r+1;i<a.length;i++)if(Math.abs(a[i][col])>Math.abs(a[best][col]))best=i;
    if(Math.abs(a[best][col])<EPS)continue;
    [a[r],a[best]]=[a[best],a[r]];
    let v=a[r][col];for(let j=col;j<d;j++)a[r][j]/=v;
    for(let i=0;i<a.length;i++)if(i!==r){
      const coeff=a[i][col];for(let j=col;j<d;j++)a[i][j]-=coeff*a[r][j];
    }
    pivots.push(col);r++;
  }
  const nullBasis=[];
  for(let free=0;free<d;free++)if(!pivots.includes(free)){
    const v=Array(d).fill(0);v[free]=1;
    for(let i=0;i<pivots.length;i++)v[pivots[i]]=-a[i][free];
    nullBasis.push(v.map(x=>Math.abs(x)<EPS?0:+x.toFixed(9)));
  }
  return {rank:pivots.length,pivotPositions:pivots,nullBasis};
}
export class CoupledTextMaze {
  constructor({maxValue=200,maxExpanded=10000,maxPairedChanges=2}={}) {
    this.maxValue=maxValue;this.maxExpanded=maxExpanded;
    this.maxPairedChanges=maxPairedChanges;
    this.grammars=new Map();this.observations=0;this.rejected=0;
  }
  structure(tokens) {
    return keyOf(tokens);
  }
  observePair(before,after) {
    const a=tokenizeObservation(before),b=tokenizeObservation(after);
    if(a.length!==b.length || keyOf(a)!==keyOf(b)){this.rejected++;return {learned:false,reason:"different-structure"};}
    const numericPositions=[];
    for(let i=0;i<a.length;i++)if(integer(a[i]))numericPositions.push(i);
    const delta=Array(numericPositions.length).fill(0);
    for(let j=0;j<numericPositions.length;j++){
      const i=numericPositions[j],x=Number(a[i]),y=Number(b[i]);
      if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)){this.rejected++;return {learned:false,reason:"non-safe-number"};}
      delta[j]=y-x;
    }
    const changed=delta.filter(x=>x!==0).length;
    if(changed!==this.maxPairedChanges){this.rejected++;return {learned:false,reason:"not-a-coupled-pair"};}
    const signature=keyOf(a);
    let grammar=this.grammars.get(signature);
    if(!grammar) {
      grammar={signature,numericPositions,actions:new Map(),observedPairs:0};
      this.grammars.set(signature,grammar);
    }
    // Observed pair exhibits both endpoints; reverse change is also evidenced.
    for(const signed of [delta,delta.map(x=>-x)]) {
      const k=JSON.stringify(signed),prev=grammar.actions.get(k);
      grammar.actions.set(k,{delta:signed,observedSupport:(prev?.observedSupport||0)+1,
        example:prev?.example||{before,after}});
    }
    grammar.observedPairs++;this.observations++;
    return {learned:true,numericPositions,axis:delta,actions:grammar.actions.size};
  }
  axesFor(start) {
    const tokens=tokenizeObservation(start),grammar=this.grammars.get(keyOf(tokens));
    if(!grammar)return {known:false,rank:0,dimensions:0};
    const basis=rref([...grammar.actions.values()].map(a=>a.delta),grammar.numericPositions.length);
    return {known:true,stateDimensions:grammar.numericPositions.length,
      numericTokenIndices:grammar.numericPositions.slice(),learnedSignedActions:grammar.actions.size,
      observedPairs:grammar.observedPairs,transformationRank:basis.rank,
      invariantDimension:basis.nullBasis.length,invariants:basis.nullBasis,
      ...basis};
  }
  apply(tokens,action,grammar) {
    const result=tokens.slice();
    for(let i=0;i<grammar.numericPositions.length;i++){
      const index=grammar.numericPositions[i],number=Number(tokens[index])+action.delta[i];
      if(!Number.isSafeInteger(number)||number<0||number>this.maxValue)return null;
      result[index]=String(number);
    }
    return result;
  }
  invariantResidual(before,after) {
    const a=tokenizeObservation(before),b=tokenizeObservation(after);
    const grammar=this.grammars.get(keyOf(a));
    if(!grammar || keyOf(a)!==keyOf(b))return {known:false};
    const {nullBasis}=rref([...grammar.actions.values()].map(op=>op.delta),grammar.numericPositions.length);
    const difference=grammar.numericPositions.map(i=>Number(b[i])-Number(a[i]));
    const components=nullBasis.map(n=>n.reduce((s,x,j)=>s+x*difference[j],0));
    return {known:true,components,tangent:components.every(v=>Math.abs(v)<1e-8)};
  }
  plan(start,goalConstraints,{maxExpanded=this.maxExpanded,maxSteps=200}={}) {
    const init=tokenizeObservation(start),grammar=this.grammars.get(keyOf(init));
    if(!grammar)return {found:false,reason:"no-observed-transformation"};
    const targets=goalConstraints.map(g=>({index:g.index,value:Number(g.value)}));
    if(!targets.length||targets.some(g=>!grammar.numericPositions.includes(g.index)||!Number.isSafeInteger(g.value))){
      throw Error("Goal must constrain known numeric token positions; the output may remain unconstrained");
    }
    const h=t=>targets.reduce((s,g)=>s+Math.abs(Number(t[g.index])-g.value),0);
    const queue=[{tokens:init,g:0,estimated:h(init),parent:null,action:null}];
    const bestG=new Map([[stateKey(init),0]]);
    let expanded=0;
    while(queue.length && expanded<maxExpanded){
      queue.sort((a,b)=>a.estimated-b.estimated || h(a.tokens)-h(b.tokens) || a.g-b.g);
      const node=queue.shift(),code=stateKey(node.tokens);
      if(node.g!==(bestG.get(code)??Infinity))continue;
      expanded++;
      if(h(node.tokens)===0){
        const states=[],actions=[];
        for(let x=node;x;x=x.parent){states.push(renderObservation(x.tokens));if(x.action)actions.push(x.action);}
        states.reverse();actions.reverse();
        return {found:true,predicted:states.at(-1),start:states[0],states,actions,steps:actions.length,
          expanded,plannedBeforeFirstAction:true,referenceAnswerProvided:false,
          goalConstraints:targets,axisEvidence:this.axesFor(start)};
      }
      if(node.g>=maxSteps)continue;
      for(const action of grammar.actions.values()){
        const next=this.apply(node.tokens,action,grammar);if(!next)continue;
        const k=stateKey(next),g=node.g+1;
        if(g>=(bestG.get(k)??Infinity))continue;
        bestG.set(k,g);
        queue.push({tokens:next,g,estimated:g+1.1*h(next),parent:node,
          action:{delta:action.delta.slice(),observedSupport:action.observedSupport,
            evidence:action.example}});
      }
    }
    return {found:false,reason:"no-learned-path-satisfies-constraints",
      expanded,availableActions:grammar.actions.size,referenceAnswerProvided:false};
  }
  execute(plan) {
    if(!plan?.found)return {verified:false,reason:"no-plan"};
    let tokens=tokenizeObservation(plan.start);
    const visited=[renderObservation(tokens)],grammar=this.grammars.get(keyOf(tokens));
    for(let i=0;i<plan.actions.length;i++){
      const next=this.apply(tokens,plan.actions[i],grammar);
      if(!next)return {verified:false,failedStep:i,visited};
      tokens=next;visited.push(renderObservation(tokens));
    }
    return {verified:renderObservation(tokens)===plan.predicted,
      actual:renderObservation(tokens),matchedPrediction:renderObservation(tokens)===plan.predicted,
      visited,executedActions:plan.actions.length};
  }
}
