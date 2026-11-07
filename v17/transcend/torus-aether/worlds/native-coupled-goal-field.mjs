// NATIVE V17: complete solution-shape predictions from empirically observed
// multi-coordinate textual state changes. Does NOT generate next characters.
// Numeric equations are one documented evidence class, NOT general semantics.
import {tokenizeObservation,renderObservation} from "./observed-transformations.mjs";
import {StateDependentTextAxes} from "../../../research/text-hypermaze/state-dependent-axes.mjs";

const numeric=t=>/^\d+$/u.test(t);
const readNums=s=>tokenizeObservation(s).filter(numeric).map(Number);
const template=s=>tokenizeObservation(s).map(t=>numeric(t)?"#":t).join("\u001f");
const finiteInts=v=>v.every(Number.isSafeInteger);
const safeFields=p=>p && p.found===true && p.referenceAnswerProvided===false &&
  p.predictedBeforeExecution===true && Array.isArray(p.actions);

export class NativeCoupledGoalField {
  constructor({maxWorlds=4096,maxStatesPerWorld=128,maxTextChars=512,
    maxValue=10000,maxExpanded=9000,minPairs=8,minRows=8}={}){
    Object.assign(this,{maxWorlds,maxStatesPerWorld,maxTextChars,
      maxValue,maxExpanded,minPairs,minRows});
    this.worlds=new Map();this.paired=0;this.rows=0;this.skipped=0;
    this.refusals=0;this.plans=0;this.executed=0;this.success=0;this.last=null;
  }
  observe(question,answer){
    // ALL bytes still flow through the ORIGINAL Brain. Only this specialized
    // learned numerical state index is bounded by source length and cardinality.
    if(typeof question!=="string"||typeof answer!=="string"||
       !question.length||!answer.length||
       question.length>this.maxTextChars||answer.length>this.maxTextChars){
      this.skipped++;return {learned:false,reason:"outside-numeric-index-budget"};
    }
    const Q=readNums(question),A=readNums(answer);
    if(Q.length<2||Q.length>6||A.length<Q.length+1||A.length>9||
       !finiteInts(Q)||!finiteInts(A)||Math.max(...A,...Q)>this.maxValue){
      this.skipped++;return {learned:false,reason:"no-mappable-numeric-world"};
    }
    const qTemplate=template(question),aTemplate=template(answer),key=qTemplate+"\u0000"+aTemplate;
    let w=this.worlds.get(key);
    if(!w){
      if(this.worlds.size>=this.maxWorlds){this.skipped++;return {learned:false,reason:"numeric-template-budget"};}
      w={qTemplate,aTemplate,states:[],seen:new Set(),
        model:new StateDependentTextAxes({maxValue:this.maxValue,maxExpanded:this.maxExpanded}),
        align:[],rows:0};
      this.worlds.set(key,w);
    }
    w.rows++;this.rows++;
    // Learn which source coordinates map onto which observed answer axes.
    // Nothing about +, * or answer position is preprogrammed.
    for(let i=0;i<Q.length;i++){
      w.align[i] ||= [];
      for(let j=0;j<A.length;j++)
        w.align[i][j]=(w.align[i][j]||0)+(Q[i]===A[j]?1:0);
    }
    const keySeen=answer+"\u0000"+question;
    if(w.seen.has(keySeen))return {learned:false,reason:"duplicate"};
    // Before/after states are both ACTUAL observed answers; source questions
    // establish which single free axis changed while the dependent target
    // changes jointly. Never compare against hypothetical heldout answers.
    for(const previous of w.states){
      let changed=0;
      for(let i=0;i<Q.length;i++)changed+=(Q[i]!==previous.qnums[i]);
      if(changed!==1)continue;
      const outputChanges=A.reduce((n,x,i)=>n+(x!==previous.anums[i]),0);
      if(outputChanges!==2)continue;
      if(w.model.observePair(previous.answer,answer).learned)this.paired++;
    }
    w.states.push({question,answer,qnums:Q,anums:A});
    w.seen.add(keySeen);
    if(w.states.length>this.maxStatesPerWorld){
      const first=w.states.shift();
      w.seen.delete(first.answer+"\u0000"+first.question);
    }
    return {learned:true,world:qTemplate,pairedTransitions:this.paired,trainingRows:this.rows};
  }
  plan(question,{ablateAxes=false,maxSteps=96}={}){
    const Q=readNums(question),qTemplate=template(question);
    const matches=[...this.worlds.values()].filter(w=>w.qTemplate===qTemplate&&w.rows>=this.minRows);
    matches.sort((a,b)=>b.rows-a.rows);
    const fail=(reason,details={})=>{
      this.refusals++;
      this.last={found:false,reason,question,...details};
      return {...this.last,ready:false,mode:"goal-path",
        fullShape:null,plannedBeforeFirstOutput:true,noNextCharacterFallback:true};
    };
    if(matches.length!==1)return fail(matches.length?"ambiguous-answer-template":"untrained-question-template");
    const w=matches[0];
    if(w.model.observations<this.minPairs)return fail("insufficient-observed-correlated-transitions",
      {pairedObserved:w.model.observations});
    const sample=w.states[0].answer,positions=tokenizeObservation(sample)
      .flatMap((token,i)=>numeric(token)?[i]:[]);
    const used=new Set(),goals=[],axes=[];
    for(let i=0;i<Q.length;i++){
      const scores=(w.align[i]||[]).map((hits,j)=>({j,ratio:hits/w.rows}))
        .filter(s=>!used.has(s.j)).sort((a,b)=>b.ratio-a.ratio||a.j-b.j);
      if(!scores.length||scores[0].ratio<.80||
         scores[1]&&scores[0].ratio-scores[1].ratio<.15)
        return fail("unidentified-numeric-axis-correspondence",{knownRows:w.rows});
      const index=scores[0].j;
      used.add(index);
      goals.push({index:positions[index],value:Q[i]});
      axes.push({questionAxis:i,answerAxis:positions[index],support:+scores[0].ratio.toFixed(6)});
    }
    if(ablateAxes)return fail("ablated-learned-coordinate-correspondence");
    const start=w.states.slice().sort((a,b)=>
      a.qnums.reduce((sum,x,i)=>sum+Math.abs(x-Q[i]),0)-
      b.qnums.reduce((sum,x,i)=>sum+Math.abs(x-Q[i]),0))[0].answer;
    const model=w.model.discover(start);
    if(!model.ready||goals.some(g=>g.index===model.numericTokenIndices[model.dependent]))
      return fail("unidentifiable-dependent-axis");
    const shape=w.model.plan(start,goals,{maxSteps,maxExpanded:this.maxExpanded});
    if(!safeFields(shape))return fail(shape.reason||"no-learned-transformation-path",
      {observedPairs:w.model.observations});
    const report={...shape,ready:true,mode:"goal-path",fullShape:shape.predicted,
      sourceQuestion:question,observedStart:start,axisMapping:axes,
      activeLocalAxes:shape.model,learnedPairedTransitions:w.model.observations,
      noNextCharacterFallback:true,usesLearnedCausalField:true,
      plannedBeforeFirstOutput:true,referenceAnswerProvided:false};
    this.plans++;
    this.last={found:true,ready:true,predicted:report.predicted,
      steps:shape.actions.length,axisMapping:axes,observedStart:start};
    return report;
  }
  executeFrozen(plan){
    if(!safeFields(plan)||!plan.ready)throw Error("Cannot execute without a frozen learned solution shape");
    const w=[...this.worlds.values()].find(x=>x.states.some(s=>s.answer===plan.observedStart));
    if(!w)throw Error("Observed initial state absent from trained model");
    const model=w.model.discover(plan.observedStart);
    if(!model.ready)throw Error("State-dependent field unavailable");
    let state=tokenizeObservation(plan.observedStart);
    const frames=[renderObservation(state)];
    for(const action of plan.actions){
      const next=w.model.apply(state,action,model);
      if(!next)throw Error("Learned action failed during embodied replay");
      state=next;frames.push(renderObservation(state));
    }
    const actual=renderObservation(state),internalMatch=actual===plan.fullShape;
    this.executed++;this.success+=+internalMatch;
    return {actual,frames,executedSteps:plan.actions.length,
      internalMatch,externalSemanticVerified:false,noReferenceAnswer:true,
      predictedBeforeFirstAction:plan.fullShape};
  }
  report(){return {observedNumericQAPairs:this.rows,correlatedTransitions:this.paired,
    learnedNumericTemplates:this.worlds.size,skippedNumericIndex:this.skipped,
    completePlans:this.plans,refusedPlans:this.refusals,
    executed:this.executed,internallyMatched:this.success,
    last:this.last?{...this.last,question:undefined}:null};}
}
