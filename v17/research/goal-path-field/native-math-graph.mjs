// Native V17 original-solution-shape field over INDUCED arithmetic action edges.
// Reuses the exact existing Discoverer.shape() method: no A*, token predictor,
// hidden answer, precomputed multiplication law, teacher path, or decoded next byte.
// The numerical action effects are induced from actual observed before/after texts.
// Long surrounding document text is retained byte-for-byte outside the acted span.
// Scoped experimental integration; no original Brain or UI source is overwritten.
import {Discoverer,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {tokenizeObservation,renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {StateDependentTextAxes} from "../text-hypermaze/state-dependent-axes.mjs";

// Exact document-state identifier granularity: underscores belong to the
// token (as in original cognitive tokenizeWorld), not seven fake words.
// The proven observed-action tokenizer itself remains BYTE-IDENTICAL.
const TOKEN = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu;
const SEP = "\u001f";
const numeric = s => /^\d+$/u.test(s);
const structure = t => t.map(x => numeric(x) ? "#" : x).join(SEP);
const code = a => JSON.stringify(a);
const assertNumber = n => Number.isSafeInteger(n) && n >= 0;
const printDocument = (original,source,rewritten) =>
  original.slice(0,source.start)+renderObservation(rewritten.slice(source.offset,source.offset+source.width))+original.slice(source.end);

export class NativeMathGoalField {
  constructor({maxNodes=1800,maxSteps=40,maxDocumentTokens=4096,maxValue=300}={}){
    if(!Number.isInteger(maxNodes)||maxNodes<2||maxNodes>4096||
       !Number.isInteger(maxSteps)||maxSteps<1||maxSteps>128||
       !Number.isInteger(maxDocumentTokens)||maxDocumentTokens<6||maxDocumentTokens>8192)
      throw Error("Invalid bounded native goal-field configuration");
    this.limits={maxNodes,maxSteps,maxDocumentTokens};
    this.induction=new StateDependentTextAxes({maxValue});
    this.observedPairs=0;
    this.observedExecutions=0;
    this.failedExecutions=0;
    // Only genuinely observed failed physical actions block a context.
    // Hypothetical test-state edges are never silently treated as walls.
    this.blockedContexts=new Map();
    this.last=null;
  }
  observePair(before,after){
    // Independent complete before/after observations; never parse an answer key.
    const r=this.induction.observePair(before,after);
    if(r.learned)this.observedPairs++;
    return r;
  }
  findObservedClause(document){
    if(typeof document!=="string")throw Error("Expected complete document text");
    const spans=[...document.matchAll(TOKEN)].map(x=>({
      word:x[0],at:x.index,end:x.index+x[0].length
    }));
    if(!spans.length||spans.length>this.limits.maxDocumentTokens)
      return {found:false,reason:"UNSUPPORTED_DOCUMENT_TOKEN_COUNT",tokens:spans.length};
    const tokens=spans.map(x=>x.word),found=[];
    for(const [signature] of this.induction.data){
      const pattern=signature.split(SEP),width=pattern.length;
      if(!width||width>tokens.length)continue;
      for(let offset=0;offset+width<=tokens.length;offset++){
        let same=true;
        for(let j=0;j<width;j++){
          const candidate=tokens[offset+j];
          if((pattern[j]==="#"&&!numeric(candidate))||
             (pattern[j]!=="#"&&candidate!==pattern[j])){same=false;break;}
        }
        if(same)found.push({offset,width,start:spans[offset].at,
          end:spans[offset+width-1].end,tokens:tokens.slice(offset,offset+width),
          template:signature});
        if(found.length>1)return {found:false,reason:"AMBIGUOUS_MULTIPLE_LEARNED_CLAUSES"};
      }
    }
    if(found.length!==1)return {found:false,reason:"NO_SUPPORTED_LEARNED_CLAUSE"};
    return {found:true,documentTokens:tokens,source:found[0]};
  }
  formSolution(document,goalConstraints,{seed=4105,temperature=0}={}){
    const located=this.findObservedClause(document);
    if(!located.found)return {found:false,reason:located.reason,path:[]};
    const {source,documentTokens}=located;
    const induced=this.induction.discover(renderObservation(source.tokens));
    if(!induced.ready)return {found:false,reason:induced.reason||"NO_LEARNED_ACTION_FIELD",path:[]};
    // Goals identify independent INPUT coordinates only. The unknown result is
    // never accepted in the goal, predicted by an oracle or given as training.
    if(!Array.isArray(goalConstraints)||goalConstraints.length===0||
       goalConstraints.some(g=>!Number.isInteger(g?.index)||!assertNumber(g?.value)||
         !induced.numericTokenIndices.includes(g.index)||
         g.index===induced.numericTokenIndices[induced.dependent]))
      throw Error("Goal must constrain learned independent coordinates, never the unknown dependent answer");
    const goals=goalConstraints.map(g=>({index:g.index,value:g.value}));
    const goalMet=t=>goals.every(g=>Number(t[source.offset+g.index])===g.value);
    const operators=induced.operators.filter(op=>op.trainingPairs>0&&
      op.maxTrainingResidual<=1e-8&&op.evidence.some(n=>n>0));
    if(!operators.length)return {found:false,reason:"NO_CAUSAL_ACTION_RULE_EVIDENCE",path:[]};
    const opByAction=new Map(operators.map(op=>[code([op.primary,op.step]),op]));
    if(opByAction.size!==operators.length)
      return {found:false,reason:"AMBIGUOUS_LEARNED_ACTION_AXIS",path:[]};
    // Reject memory explosions instead of pretending to train a 1M-token graph.
    if(documentTokens.length*this.limits.maxNodes>8_000_000)
      return {found:false,reason:"FULL_STATE_GRAPH_MEMORY_BUDGET_EXCEEDED",path:[]};
    const states=[documentTokens],edges=[[]],depth=[0],ids=new Map([[structure(source.tokens)+SEP+code(source.tokens),0]]);
    let truncated=false;
    for(let head=0;head<states.length;head++){
      if(depth[head]>=this.limits.maxSteps)continue;
      const current=states[head],clause=current.slice(source.offset,source.offset+source.width);
      for(const op of operators){
        if(this.blockedContexts.has(code(clause)+"|"+code([op.primary,op.step])))continue;
        const nextClause=this.induction.apply(clause,op,induced);
        if(!nextClause)continue;
        const key=structure(nextClause)+SEP+code(nextClause);
        let dest=ids.get(key);
        if(dest===undefined){
          if(states.length>=this.limits.maxNodes){truncated=true;continue;}
          const next=current.slice();
          next.splice(source.offset,source.width,...nextClause);
          dest=states.length;ids.set(key,dest);
          states.push(next);edges.push([]);depth.push(depth[head]+1);
        }
        edges[head].push({to:dest,action:code([op.primary,op.step]),
          transformation:{kind:"learned-state-dependent-action",
            dependent:op.dependent,trainingPairs:op.trainingPairs,
            maxTrainingResidual:op.maxTrainingResidual},
          verified:false}); // Novel-context edge: still only a hypothesis.
      }
    }
    const targets=[];
    for(let i=0;i<states.length;i++)if(goalMet(states[i]))targets.push(i);
    const world={states,neighbors:edges,targets,start:0,truncated,
      source:"actual observed arithmetic differences, not target answers"};
    if(!targets.length)return {found:false,reason:"NO_GOAL_IN_BOUNDED_LEARNED_GRAPH",
      world,learnedOperators:operators.length,path:[]};
    if(targets.includes(0))return {found:true,path:[],world,
      fullCandidate:document,plannedBeforeAction:true,method:"Discoverer.shape",
      referenceAnswerProvided:false,source,induced,opByAction,goals,
      initialDocument:document,field:[],conditionedOn:"independent input goal only"};
    const actor=new Discoverer(seed);
    actor.temp=Math.max(0,Number(temperature)||0);
    const kind=states.map((_,i)=>targets.includes(i)?KIND.target:i===0?KIND.self:KIND.floor);
    let values=[];
    // The ORIGINAL operator performs the entire goal propagation and uphill
    // selection. Evidence-positive rules have assumed traversability for
    // planning; test-state effects are independently checked on execution.
    const path=actor.shape(kind,0,0,{
      neighbors:edges,
      conduct:k=>k===KIND.wall?0:1,
      attract:k=>k===KIND.target?1:0,
      onField:v=>{values=v;}
    })||[];
    const final=path.length?states[path.at(-1).to]:states[0];
    const reached=path.length>0&&targets.includes(path.at(-1).to);
    return {found:reached,reason:reached?"ORIGINAL_SHAPE_REACHED_GOAL":"NO_ASCENDING_FULL_SHAPE",
      path,world,source,induced,opByAction,goals,initialDocument:document,
      fullCandidate:reached?printDocument(document,source,final):null,
      method:"Discoverer.shape",planningLaw:"ORIGINAL_V17_ATTRACTION_0.97",
      field:values,plannedBeforeAction:true,referenceAnswerProvided:false,
      learnedObservedPairs:this.observedPairs,learnedOperators:operators.length,
      novelDocument:!this.induction.data.has(structure(documentTokens)),
      fullDocumentTokens:documentTokens.length,
      note:"Input-number goal, one observed short-clause grammar; not unrestricted natural-language reasoning"};
  }
  execute(plan,{step,observe=true,brain=null}={}){
    if(!plan?.found||typeof step!=="function")throw Error("Frozen found plan and independent physics step are required");
    let current=plan.world.states[0].slice();
    const trace=[];
    for(const hop of plan.path){
      const op=plan.opByAction.get(hop.action);
      if(!op)throw Error("Planned action has no learned observation evidence");
      const before=current.slice(),clause=before.slice(plan.source.offset,plan.source.offset+plan.source.width);
      const proposed=this.induction.apply(clause,op,plan.induced);
      if(!proposed)throw Error("Learned action has no predicted successor");
      const predicted=before.slice();predicted.splice(plan.source.offset,plan.source.width,...proposed);
      // Do not pass predicted answer or next-state to the actual world callback.
      const actual=step(before.slice(),{primary:op.primary,step:op.step,
        numericIndices:plan.induced.numericTokenIndices.slice(),
        dependent:op.dependent,offset:plan.source.offset});
      if(!actual||!Array.isArray(actual.after)||typeof actual.accepted!=="boolean")
        throw Error("Actual world must return {after: completeStateArray, accepted:boolean}");
      const accurate=actual.accepted&&code(actual.after)===code(predicted);
      trace.push({action:hop.action,accurate,accepted:actual.accepted,
        predictedNumbers:plan.induced.numericTokenIndices.map(i=>predicted[plan.source.offset+i]),
        observedNumbers:plan.induced.numericTokenIndices.map(i=>actual.after[plan.source.offset+i])});
      if(observe){
        this.observedExecutions++;
        if(accurate)this.observePair(renderObservation(clause),
          renderObservation(actual.after.slice(plan.source.offset,plan.source.offset+plan.source.width)));
        else this.failedExecutions++;
      }
      brain?.observeShared?.({domain:"text",before,after:actual.after,
        action:hop.action,context:"native-v24-math-field-action"});
      current=actual.after.slice();
      if(!accurate)break;
    }
    const goalMet=plan.goals.every(g=>Number(current[plan.source.offset+g.index])===g.value);
    const solved=goalMet&&trace.length===plan.path.length&&trace.every(t=>t.accurate);
    const result={solved,goalMet,steps:trace.length,
      fullActual:printDocument(plan.initialDocument,plan.source,current),
      predictedBeforeAction:plan.fullCandidate,allMovesVerified:trace.every(t=>t.accurate),
      trace,method:"Discoverer.shape"};
    this.last={solved,steps:trace.length,goalMet};
    return result;
  }
  // Report only externally witnessed outcomes, never self-certify an imagined
  // transition. A contradicted/rejected edge becomes resistance in THIS
  // context alone; all other learned corridors remain intact.
  recordActionOutcome({beforeDocument,action,afterDocument,accepted,expectedDocument}){
    if(typeof beforeDocument!=="string"||typeof afterDocument!=="string"||
       typeof action!=="string"||typeof accepted!=="boolean")
      throw Error("Independent before/action/after/accepted physical observations required");
    const first=this.findObservedClause(beforeDocument),
      second=this.findObservedClause(afterDocument);
    if(!first.found)throw Error("Source state is not the observed action world");
    const before=first.source.tokens,after=second.found?second.source.tokens:null;
    const accurate=accepted&&second.found&&expectedDocument===afterDocument;
    this.observedExecutions++;
    if(!accurate){
      this.failedExecutions++;
      const key=code(before)+"|"+action;
      this.blockedContexts.set(key,(this.blockedContexts.get(key)||0)+1);
    }else{
      this.observePair(renderObservation(before),renderObservation(after));
    }
    this.last={accurate,accepted,action,
      observedOutputOrigin:"external afterDocument, NOT predicted output"};
    return {accurate,accepted,blockedThisContext:!accurate,
      beforeClause:renderObservation(before),
      observedClause:after?renderObservation(after):null,
      unexpectedWorldTemplate:!second.found,
      changedFullDocument:beforeDocument!==afterDocument,
      source:"external-observed-action-result"};
  }
  documentForHop(plan,hop){
    if(!plan?.source||!plan?.world?.states||!Number.isInteger(hop?.to))
      throw Error("Frozen original path and hop required");
    const state=plan.world.states[hop.to];
    if(!state)throw Error("Unknown original state in path");
    return printDocument(plan.initialDocument,plan.source,state);
  }
  // Additive checkpoint content lives inside the ORIGINAL Brain .v8 file.
  // No second Brain, alternate language predictor, or mutable global singleton.
  export(){
    return {version:1,limits:{...this.limits,maxValue:this.induction.maxValue},
      induction:{maxValue:this.induction.maxValue,maxExpanded:this.induction.maxExpanded,
        observations:this.induction.observations,rejected:this.induction.rejected,
        data:[...this.induction.data]},
      observedPairs:this.observedPairs,observedExecutions:this.observedExecutions,
      failedExecutions:this.failedExecutions,blockedContexts:[...this.blockedContexts],last:this.last};
  }
  static restore(saved){
    if(saved?.version!==1||!saved.induction||!Array.isArray(saved.induction.data))
      throw Error("Unsupported native math field checkpoint");
    const m=new NativeMathGoalField(saved.limits);
    const d=saved.induction;
    m.induction.maxExpanded=d.maxExpanded;
    m.induction.observations=d.observations||0;
    m.induction.rejected=d.rejected||0;
    m.induction.data=new Map(d.data);
    m.observedPairs=saved.observedPairs||0;
    m.observedExecutions=saved.observedExecutions||0;
    m.failedExecutions=saved.failedExecutions||0;
    m.blockedContexts=new Map(saved.blockedContexts||[]);
    m.last=saved.last||null;
    return m;
  }
  report(){
    return {version:1,observedPairs:this.observedPairs,
      learnedWorldGrammars:this.induction.data.size,
      observedExecutions:this.observedExecutions,
      failedExecutions:this.failedExecutions,blockedContexts:this.blockedContexts.size,
      status:this.observedPairs?"OBSERVED_NUMERIC_ACTION_RULES":"NO_OBSERVED_ACTION_EVIDENCE",
      planner:"original V17 Discoverer.shape (goal-conditioned, before any action)",
      generalNaturalLanguageProven:false,last:this.last};
  }
}
