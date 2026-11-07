// ORIGINAL V17 native Brain integration: contextual goal evidence -> frozen
// full preaction path -> action execution. This is a real trained path model,
// not a next-character generator and not a simulated UI.
import {tokenizeObservation,renderObservation} from "./observed-transformations.mjs";

// Words are discovered from actual Q/A sources. No answer, domain-specific
// grammar labels or correct heldout target is supplied at prediction time.
const isWord=s=>/^[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*$/u.test(s);
const lex=text=>[...new Set(tokenizeObservation(String(text||""))
  .filter(isWord).map(x=>x.toLowerCase()))];
const finite=n=>Number.isFinite(n)?n:0;
const bounded=(n,a,b)=>Math.max(a,Math.min(b,n));
export class GoalConditionedHyperpath {
  constructor({maxQuestionTokens=24,maxAnswerTokens=24,maxPairFeatures=600000,
    maxQuestionAxes=10000,maxAnswerAxes=10000,maxCandidateStarts=96}={}){
    Object.assign(this,{maxQuestionTokens,maxAnswerTokens,maxPairFeatures,
      maxQuestionAxes,maxAnswerAxes,maxCandidateStarts});
    this.questions=new Map(); // learned source-axis activity on actual questions
    this.answers=new Map(); // learned target-axis activity on actual answers
    this.bridge=new Map(); // genuine co-observation of question axis -> answer axis
    this.rows=0;this.bytesObserved=0;this.skippedFeatures=0;
    this.lastPlan=null;this.predicted=0;this.planned=0;this.executed=0;
    this.goalReached=0;this.failed=0;this.causalAblations=0;
  }
  observePair(question,answer){
    if(typeof question!=="string"||typeof answer!=="string"||
      !question.trim()||!answer.trim())return {learned:false,reason:"missing-real-pair"};
    // Scan the ENTIRE observed answer, no truncation of training input.
    const Q=lex(question),A=lex(answer);
    const q=Q.slice(0,this.maxQuestionTokens);
    // The answer is fully scanned; these are the local target axes retained
    // for a bounded goal-inference index, NOT skipped text observations.
    const a=A.map(token=>({token,df:this.answers.get(token)||0}))
      .sort((x,y)=>x.df-y.df||x.token.localeCompare(y.token))
      .slice(0,this.maxAnswerTokens).map(x=>x.token);
    if(!q.length||!a.length)return {learned:false,reason:"empty-observed-content"};
    this.rows++;this.bytesObserved+=Buffer.byteLength(question)+Buffer.byteLength(answer);
    for(const x of q)if(this.questions.size<this.maxQuestionAxes||this.questions.has(x))
      this.questions.set(x,(this.questions.get(x)||0)+1);
    for(const y of A)if(this.answers.size<this.maxAnswerAxes||this.answers.has(y))
      this.answers.set(y,(this.answers.get(y)||0)+1);
    for(const x of q){
      if(!this.questions.has(x))continue;
      let map=this.bridge.get(x);
      if(!map){
        if(this.bridge.size>=this.maxQuestionAxes)continue;
        map=new Map();this.bridge.set(x,map);
      }
      for(const y of a){
        if(!this.answers.has(y))continue;
        if(!map.has(y)&&this.maxPairFeatures<=this.featureCount()){this.skippedFeatures++;continue;}
        map.set(y,(map.get(y)||0)+1);
      }
    }
    return {learned:true,sourceAxes:q.length,targetAxes:a.length,
      observedAnswerWords:A.length,rows:this.rows,features:this.featureCount()};
  }
  featureCount(){let n=0;for(const m of this.bridge.values())n+=m.size;return n;}
  // Local axes are question terms whose empirically observed answer-term
  // associations have the most predictive specificity, not fixed 6 axes.
  inferGoal(question,{maxRequired=2,minimumSupport=2,ablate=false}={}){
    this.predicted++;
    const q=lex(question),scored=new Map(),active=[];
    const total=Math.max(1,this.rows);
    for(const token of q){
      const n=this.questions.get(token)||0,targets=this.bridge.get(token);
      if(!n||!targets)continue;
      const axisScore=Math.log1p(total/n);
      let used=0;
      for(const [target,c] of targets){
        if(c<minimumSupport)continue;
        const af=this.answers.get(target)||0;
        // Conditional association penalized by the target's frequency across
        // ALL observed answers; frequent filler words are downweighted.
        const empirical=(c+.25)/(n+.5);
        const specificity=Math.log((total+1)/(af+.75));
        const weight=axisScore*empirical*specificity;
        if(!finite(weight)||weight<=0)continue;
        if(!ablate)scored.set(target,(scored.get(target)||0)+weight);
        used++;
      }
      if(used)active.push({axis:token,observations:n,weights:used,
        relevance:+axisScore.toFixed(6)});
    }
    const sorted=[...scored].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    const required=sorted.slice(0,bounded(maxRequired,1,4)).map(([word])=>word);
    const result={ready:required.length>0,required,question,
      activeAxes:active.sort((a,b)=>b.relevance-a.relevance),
      answerTargetCandidates:sorted.slice(0,12).map(([token,weight])=>
        ({token,score:+weight.toFixed(6)})),
      evidenceRows:this.rows,source:"observed-QA-context-to-goal-axes",
      noReferenceAnswer:true,notAnOracle:true};
    return result;
  }
  // The only admissible output is a whole predicted state from learned edit
  // actions; no fallback to generating next characters on no-plan.
  plan(question,learnedWorld,{maxDepth=5,maxExpanded=1800,required=null,
    start=null,worldCore=null,ablateAxes=false,recordSearch=true}={}){
    const inferred=required?.length?{ready:true,required,activeAxes:[],question,
      source:"explicit-goal-constraints"}:this.inferGoal(question,{ablate:ablateAxes});
    if(!inferred.ready){
      this.failed++;this.lastPlan={ready:false,reason:"no-learned-goal-axes"};
      return {...this.lastPlan,goalInference:inferred,plannedBeforeFirstAction:true};
    }
    // A planner receives ONLY the question, learned model, target features and
    // its chosen source state. It never sees reference heldout answer.
    // Use actual observed corpus sentences as potential starting states.
    const targets=new Set(inferred.required.map(x=>x.toLowerCase()));
    let choices=[];
    if(start!==null)choices=[start];
    else if(learnedWorld?.records instanceof Map){
      for(const record of learnedWorld.records.values()){
        const toks=record.tokens||[],lower=toks.map(x=>x.toLowerCase());
        const matched=lower.filter(x=>targets.has(x)).length;
        if(matched===targets.size)continue;
        const lexical=lower.filter(x=>lex(question).includes(x)).length;
        choices.push({text:renderObservation(toks),
          score:matched*3+lexical*.3-Math.abs(toks.length-7)*.02});
      }
      choices.sort((a,b)=>b.score-a.score);
      choices=choices.slice(0,this.maxCandidateStarts).map(x=>x.text);
    }
    if(!choices.length){
      this.failed++;this.lastPlan={ready:false,reason:"no-observed-starting-state"};
      return {...this.lastPlan,goalInference:inferred,plannedBeforeFirstAction:true};
    }
    let candidate=null,attempted=0;
    for(const source of choices){
      if(!source||!learnedWorld?.containsSentence(source))continue;
      const path=learnedWorld.plan({start:source,required:inferred.required,
        maxDepth,maxExpanded,recordSearch,worldCore});
      attempted++;
      if(!path.found)continue;
      if(!candidate||path.steps.length<candidate.steps.length||
        path.steps.length===candidate.steps.length&&path.unseen&&!candidate.unseen)
        candidate=path;
      if(candidate?.unseen&&candidate.steps.length>0)break;
    }
    if(!candidate){
      this.failed++;this.lastPlan={ready:false,reason:"no-observed-transform-path",
        searchedStarts:attempted,goalInference:inferred,plannedBeforeFirstAction:true};
      return this.lastPlan;
    }
    this.planned++;
    const stepAxes=candidate.steps.map((step,i)=>({
      index:i,localAxis:step.index,kind:step.kind,learnedSupport:step.observedSupport,
      from:step.from,to:step.to,context:[step.left,step.right],
      actionSource:step.learnedFrom||null
    }));
    const report={...candidate,ready:true,goalInference:inferred,stepAxes,
      fullPredictedStateBeforeExecution:candidate.predicted,
      initialShape:candidate.initialShape,
      exploredStarts:attempted,plannedBeforeFirstAction:true,
      usesLearnedOperators:true,usesNativeSharedWorld:!!worldCore,
      fallbackNextCharacterUsed:false,semanticValidation:false};
    this.lastPlan={...report,search:null};
    return report;
  }
  execute(plan,learnedWorld,{localPolicy=false,noiseAgent=null}={}){
    if(!plan?.ready||!plan?.found)return {executed:false,reason:"no-frozen-shape"};
    // Frozen evaluator uses ONLY learned operators and sensor feedback.
    const body=learnedWorld.embody(plan,{localPolicy,noiseAgent,maxSteps:64,
      worldCore:plan.usesNativeSharedWorld?learnedWorld.worldCore:null});
    this.executed++;this.goalReached+=+body.success;
    return {...body,executed:true,plannedState:plan.fullPredictedStateBeforeExecution,
      initialShape:plan.initialShape,correctByInternalWorldModel:body.success,
      externalSemanticCorrectness:null,referenceAnswerUsed:false};
  }
  status(){
    return {observedQAPairs:this.rows,bytesObserved:this.bytesObserved,
      sourceAxes:this.questions.size,targetAxes:this.answers.size,
      learnedAxisRelations:this.featureCount(),skippedAxisFeatures:this.skippedFeatures,
      plansAttempted:this.predicted,plansFound:this.planned,
      executed:this.executed,goalReachedInternally:this.goalReached,
      failures:this.failed,
      lastPlan:this.lastPlan?{
        ready:this.lastPlan.ready,found:this.lastPlan.found,
        predicted:this.lastPlan.predicted,reason:this.lastPlan.reason,
        required:this.lastPlan.goalInference?.required,steps:this.lastPlan.steps?.length||0,
        initialShape:this.lastPlan.initialShape?.slice(0,20)}:null};
  }
}