// Original V17 organism: learn reusable actions from DIFFERENCES between lived
// observations. No grammar labels, manually defined subject/adjective slots,
// desired full answer or oracle target sentences are supplied in training.
//
// TRAIN: observe corpus sentences; compare neighbors that share most tokens;
// induce contextual edit-operators and invariant/variable dimensions.
// PLAN: receive ONLY a start state and partial goal constraints; traverse the
// learned actions to construct an UNOBSERVED goal state before writing text.
// EXECUTE: apply chosen operators, verify predicted/actual state changes.
// Frozen planning never writes to any learned weights or observations.

// Runtime-only observer; never serialized into existing V17 Brain checkpoints.
const EFFECT_HOOKS=new WeakMap();
export function setObservedOperatorHook(model,observer){
  if(observer===null)EFFECT_HOOKS.delete(model);
  else if(typeof observer==='function')EFFECT_HOOKS.set(model,observer);
  else throw Error('Observed effect hook must be a function or null');
}
const TOKEN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu;
const closePunctuation = /^[.,!?;:%)\]}]$/u;
const openPunctuation = /^[(\[{]$/u;

export const tokenizeObservation = text =>
  (String(text || "").match(TOKEN) || []).filter(Boolean);

export function renderObservation(tokens) {
  let s = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const previous = tokens[i - 1];
    const space = i && !closePunctuation.test(t) &&
      !openPunctuation.test(previous || "") &&
      previous !== "’" && t !== "’";
    s += (space ? " " : "") + t;
  }
  return s;
}

const cloneTokens = t => t.slice();
const freezeKey = t => JSON.stringify(t);
const unique = a => [...new Set(a)];
const normalized = t => String(t).normalize("NFC");
const maxSafe = (v,a,b) => Math.max(a,Math.min(b,v));
const clampSelf = (v,a,b) => Math.max(a,Math.min(b,Math.trunc(v)||a));

function oneEdit(a,b) {
  if(Math.abs(a.length-b.length)>1)return null;
  let i=0;
  while(i<a.length&&i<b.length&&a[i]===b[i])i++;
  if(i===a.length&&i===b.length)return null;
  if(a.length===b.length) {
    if(a.slice(i+1).some((x,j)=>x!==b[i+1+j]))return null;
    return {kind:"replace",index:i,from:a[i],to:b[i]};
  }
  if(b.length===a.length+1) {
    for(let k=i;k<a.length;k++)if(a[k]!==b[k+1])return null;
    return {kind:"insert",index:i,from:null,to:b[i]};
  }
  if(a.length===b.length+1) {
    for(let k=i;k<b.length;k++)if(a[k+1]!==b[k])return null;
    return {kind:"delete",index:i,from:a[i],to:null};
  }
  return null;
}

function actionFrom(a,b) {
  const edit=oneEdit(a,b);
  if(!edit)return null;
  const index=edit.index;
  const left=a[index-1]||null;
  const right=a[index+(edit.kind==="insert"?0:1)]||null;
  return {...edit,left,right,
    beforeLength:a.length,afterLength:b.length};
}
function runAction(tokens,action,index) {
  const t=cloneTokens(tokens);
  if(index<0||index>t.length)return null;
  const left=t[index-1]||null;
  const right=t[index+(action.kind==="insert"?0:1)]||null;
  // Anchors and the position of the editable part are discovered from real
  // compared observations, never encoded as subject/verb/adjective rules.
  if(action.left!==null&&action.left!==left)return null;
  if(action.right!==null&&action.right!==right)return null;
  if(action.left===null&&index!==0)return null;
  if(action.right===null&&index!==(action.kind==="insert"?t.length:t.length-1))return null;
  if(action.kind==="replace"&&t[index]===action.from) t[index]=action.to;
  else if(action.kind==="insert") t.splice(index,0,action.to);
  else if(action.kind==="delete"&&t[index]===action.from)t.splice(index,1);
  else return null;
  return t;
}

const signature = a => JSON.stringify([
  a.kind,a.from,a.to,a.left,a.right
]);
export class ObservedTransformations {
  constructor({maxObserved=12000,maxOperators=18000,maxCandidatePairs=64,maxTokens=256}={}) {
    this.maxObserved=maxObserved;
    this.maxOperators=maxOperators;
    this.maxCandidatePairs=maxCandidatePairs;
    this.maxTokens=maxTokens;
    this.records=new Map(); // actual corpus sentences only
    this.lookup=new Map(); // exact observed strings for O(1) no-memorized-answer check
    this.order=[];
    this.index=new Map(); // length + token -> recent actual sentences
    this.operators=new Map(); // edit actions inferred from observation differences
    this.operatorIndex=new Map(); // from-token / insertion-anchor -> only relevant possible actions
    this.invariants=new Map(); // learned contextual invariants at each length
    this.editablePositions=new Map(); // observed effects falsify apparent invariants
    this.nextId=1;
    this.seen=0;this.newObservations=0;this.comparisons=0;this.matchingComparisons=0;
    this.rejectedLong=0;this.evicted=0;this.droppedOperators=0;
    this.executed=0;this.correctEffects=0;this.failedEffects=0;
    this.lastPlan=null;
  }
  tokenize(s){return tokenizeObservation(s);}
  containsSentence(s){return this.lookup.has(freezeKey(tokenizeObservation(s)));}
  _indexKeys(tokens) {
    return unique(tokens).map(x=>tokens.length+"|"+normalized(x));
  }
  _candidateSentences(tokens) {
    const scores=new Map();
    for(const key of this._indexKeys(tokens)){
      const ids=this.index.get(key)||[];
      for(let i=Math.max(0,ids.length-80);i<ids.length;i++){
        const id=ids[i];
        if(this.records.has(id)) scores.set(id,(scores.get(id)||0)+1);
      }
    }
    return [...scores].filter(([,count])=>count>=Math.max(1,tokens.length-2))
      .sort((a,b)=>b[1]-a[1]||b[0]-a[0])
      .slice(0,this.maxCandidatePairs).map(([id])=>this.records.get(id));
  }
  _operatorBucket(action){
    return action.kind==="insert" ?
      "i:"+(action.left??"^") : "e:"+action.from;
  }
  _ensureOperatorIndex() {
    if(this.operatorIndex)return;
    this.operatorIndex=new Map();
    for(const [key,op] of this.operators){
      const bucket=this._operatorBucket(op);
      if(!this.operatorIndex.has(bucket))this.operatorIndex.set(bucket,new Set());
      this.operatorIndex.get(bucket).add(key);
    }
  }
  _recordOperator(before,after) {
    const action=actionFrom(before,after);
    if(!action)return;
    const k=signature(action);
    const sample={from:renderObservation(before),to:renderObservation(after)};
    let op=this.operators.get(k);
    if(!op){
      if(this.operators.size>=this.maxOperators){this.droppedOperators++;return;}
      op={...action,sourceObservations:0,evidence:[],key:k};
      this.operators.set(k,op);
      this._ensureOperatorIndex();
      const bucket=this._operatorBucket(op);
      if(!this.operatorIndex.has(bucket))this.operatorIndex.set(bucket,new Set());
      this.operatorIndex.get(bucket).add(k);
    }
    op.sourceObservations++;
    // Only REAL corpus differences reach the shared learned transformation
    // core. This does not run during frozen planning or evaluation.
    EFFECT_HOOKS.get(this)?.({before:before.slice(),after:after.slice(),
      action:{...op},observedSupport:op.sourceObservations});
    if(op.evidence.length<4 &&
        !op.evidence.some(x=>x.from===sample.from&&x.to===sample.to))op.evidence.push(sample);
  }
  _compare(previous,current){
    this.comparisons++;
    const direct=oneEdit(previous,current);
    if(!direct)return;
    this.matchingComparisons++;
    if(previous.length===current.length){
      let variable=this.editablePositions.get(previous.length);
      if(!variable){variable=new Set();this.editablePositions.set(previous.length,variable);}
      variable.add(direct.index);
    }
    this._recordOperator(previous,current);
    this._recordOperator(current,previous);
    // Comparison discovers which positions can vary while other dimensions
    // remain stable; a true invariant is supported by at least TWO examples.
    if(previous.length===current.length){
      const length=previous.length;
      let invariant=this.invariants.get(length);
      if(!invariant){
        invariant=Array.from({length},()=>new Map());
        this.invariants.set(length,invariant);
      }
      for(let j=0;j<length;j++)if(previous[j]===current[j]){
        const m=invariant[j],word=previous[j];
        m.set(word,(m.get(word)||0)+1);
      }
    }
  }
  observeSentence(sentence){
    const tokens=tokenizeObservation(sentence);
    if(tokens.length<2)return {learned:false,reason:"too-short"};
    this.seen++;
    if(tokens.length>this.maxTokens){this.rejectedLong++;return {learned:false,reason:"max-tokens"};}
    const key=freezeKey(tokens);
    const already=this.lookup.get(key);
    if(already&&this.records.has(already)){
      const saved=this.records.get(already);
      saved.count++;return {learned:false,reason:"duplicate",count:saved.count};
    }
    const candidates=this._candidateSentences(tokens);
    for(const item of candidates)this._compare(item.tokens,tokens);
    const id=this.nextId++;
    this.records.set(id,{id,tokens,count:1});
    this.lookup.set(key,id);
    this.newObservations++;
    this.order.push(id);
    for(const k of this._indexKeys(tokens)){
      let arr=this.index.get(k);
      if(!arr){arr=[];this.index.set(k,arr);}
      arr.push(id);
      if(arr.length>96)arr.shift();
    }
    if(this.order.length>this.maxObserved){
      const old=this.order.shift(),record=this.records.get(old);
      if(record)this.lookup.delete(freezeKey(record.tokens));
      this.records.delete(old);this.evicted++;
    }
    return {learned:true,matched:candidates.length,operators:this.operators.size};
  }
  observeText(text){
    if(typeof text!=="string")throw Error("Corpus observation must be text");
    // Entire corpus is streamed. Each sentence is a real observation;
    // question and answer strings may be different observations.
    const units=text.split(/(?<=[.!?])\s+|\r?\n+/u).map(x=>x.trim()).filter(Boolean);
    let newSentences=0,newOperators=0;
    for(const unit of units){
      const n=this.operators.size;
      const r=this.observeSentence(unit);
      if(r.learned)newSentences++;
      newOperators+=this.operators.size-n;
    }
    return {observedUnits:units.length,newSentences,newOperators};
  }
  neighbors(tokens){
    const out=[],seen=new Set();
    this._ensureOperatorIndex();
    // Full-corpus scalability: look up only operators whose learned source
    // symbol or left-insertion anchor exists in this state, instead of
    // traversing ALL learned operators for every planned node.
    const buckets=new Set(["i:^"]);
    for(const token of tokens){buckets.add("e:"+token);buckets.add("i:"+token);}
    const keys=new Set();
    for(const b of buckets)for(const k of this.operatorIndex.get(b)||[])keys.add(k);
    for(const k of keys){
      const op=this.operators.get(k);
      if(!op)continue;
      for(let i=0;i<tokens.length+(op.kind==="insert"?1:0);i++){
        const result=runAction(tokens,op,i);
        if(!result)continue;
        const key=freezeKey(result);
        if(seen.has(key))continue;
        seen.add(key);
        out.push({tokens:result,action:{key:op.key,kind:op.kind,
          from:op.from,to:op.to,index:i,
          observedSupport:op.sourceObservations,
          learnedFrom:op.evidence[0]||null}});
      }
    }
    return out;
  }
  structuralSupport(tokens) {
    const info=this.invariants.get(tokens.length);
    if(!info)return {verified:false,consistent:false,matched:0,total:0};
    // An axis which has ever changed in a real one-step observed effect is
    // a reusable VARIABLE, regardless of how frequently one value recurs.
    const editable=this.editablePositions?.get(tokens.length)||new Set();
    let matched=0,total=0;
    for(let j=0;j<info.length;j++){
      if(editable.has(j))continue;
      const entries=[...info[j].entries()].filter(([,n])=>n>=1)
        .sort((a,b)=>b[1]-a[1]);
      if(!entries.length)continue;
      const strongest=entries[0];
      // Positions with conflicting observed values are learned variables.
      const values=entries.reduce((n,[,c])=>n+c,0);
      if(strongest[1]>=2 && strongest[1]===values){
        total++;matched+=Number(tokens[j]===strongest[0]);
      }
    }
    return {verified:total>0,consistent:total>0&&total===matched,matched,total};
  }
  _goal(tokens,required) {
    return required.every(t=>tokens.includes(t));
  }
  plan({required,start=null,maxDepth=4,maxExpanded=6000,
    recordSearch=false,maxRecordedStates=240,allowUnseenStart=false,worldCore=null}={}) {
    if(!Array.isArray(required)||!required.length||
      required.some(x=>typeof x!=="string"||!x.trim()))throw Error("Goal must list required observed tokens");
    const req=unique(required.map(x=>x.trim()));
    for(const value of req)if(tokenizeObservation(value).length!==1)
      throw Error("Each goal constraint must be one observed token");
    const budget=maxSafe(Math.trunc(maxExpanded),10,40000);
    const depth=maxSafe(Math.trunc(maxDepth),0,9);
    let sources;
    if(start!==null) {
      const t=tokenizeObservation(start);
      if(!allowUnseenStart&&!this.containsSentence(start))
        return {found:false,reason:"starting-state-not-observed",goal:{required:req},expanded:0};
      sources=[t];
    } else {
      sources=[...this.records.values()].map(x=>x.tokens)
        .filter(tokens=>tokens.length>=req.length)
        .sort((a,b)=>
          req.filter(x=>b.includes(x)).length-req.filter(x=>a.includes(x)).length||
          a.length-b.length);
      sources=sources.slice(0,Math.min(128,sources.length));
    }
    if(!sources.length)return {found:false,reason:"no-observed-states",expanded:0,goal:{required:req}};
    const visited=new Set(),q=[];
    // Every drawn node and edge comes from a state that THIS search really
    // generated. No oracle response, graph layout or target string is inserted.
    const search=recordSearch?{nodes:[],edges:[],expanded:0,
      limit:maxRecordedStates,truncated:false}:null;
    const drawn=new Set();
    const mark=(text,depth,observed,role="explored")=>{
      if(!search||drawn.has(text))return;
      if(search.nodes.length>=maxRecordedStates){search.truncated=true;return;}
      drawn.add(text);search.nodes.push({id:text,label:text,depth,
        observed:!!observed,role});
    };
    for(const tokens of sources){
      const key=freezeKey(tokens);if(visited.has(key))continue;
      visited.add(key);
      const text=renderObservation(tokens);
      q.push({tokens,start:tokens,steps:[],states:[text]});
      mark(text,0,true,"origin");
    }
    let expanded=0;
    while(q.length&&expanded<budget) {
      const current=q.shift();expanded++;
      const currentText=renderObservation(current.tokens);
      if(this._goal(current.tokens,req)){
        const support=this.structuralSupport(current.tokens);
        if(support.consistent) {
          const answer=renderObservation(current.tokens);
          const startText=renderObservation(current.start);
          if(search){search.expanded=expanded;
            mark(answer,current.steps.length,this.containsSentence(answer),"goal");
            for(const n of search.nodes)if(current.states.includes(n.id))n.onInitialShape=true;}
          return {found:true,start:startText,predicted:answer,
            unseen:this.containsSentence(answer)===false,
            goal:{required:req},steps:current.steps,expanded,
            initialShape:current.states,search,
            structure:support,
            plannedBeforeAnswer:true,referenceProvided:false,
            predictedStateBeforeExecution:answer};
        }
      }
      if(current.steps.length>=depth)continue;
      const edges=this.neighbors(current.tokens);
      // One shared effect learner ranks the EXACT SAME learned-operator edges
      // as the baseline; it cannot invent operators or inspect an answer.
      if(worldCore&&edges.length>1)edges.sort((a,b)=>
        worldCore.scoreText(current.tokens,b.tokens,b.action,req)-
        worldCore.scoreText(current.tokens,a.tokens,a.action,req));
      for(const next of edges){
        const key=freezeKey(next.tokens),name=renderObservation(next.tokens);
        const prior=visited.has(key);
        const support=this.structuralSupport(next.tokens);
        const valid=!support.verified||support.consistent;
        if(search&&search.edges.length<maxRecordedStates*3&&drawn.has(currentText)){
          mark(name,current.steps.length+1,this.containsSentence(name),
            prior?"visited":valid?"explored":"blocked");
          if(drawn.has(name))search.edges.push({
            from:currentText,to:name,kind:next.action.kind,
            action:next.action,observedSupport:next.action.observedSupport,
            previouslyVisited:prior,allowed:valid});
        } else if(search)search.truncated=true;
        if(prior||!valid)continue;
        visited.add(key);
        q.push({tokens:next.tokens,start:current.start,
          steps:current.steps.concat(next.action),
          states:current.states.concat(name)});
        if(visited.size>=budget)break;
      }
    }
    if(search)search.expanded=expanded;
    return {found:false,reason:"no-learned-path-satisfies-goal",goal:{required:req},
      expanded,search,observed:this.records.size,operators:this.operators.size};
  }
  // A bounded SELF-PROBE chooses goal CONSTRAINTS from actual operations
  // that the original organism learned. This is NOT an independent language
  // teacher or a model-invented human desire: it is a structural self-test
  // automatically derived from its current observed world.
  selfSelectedChallenge({maxSeeds=16}={}){
    if(this.records.size<3||this.operators.size<2)return null;
    const candidates=this.order.slice(-clampSelf(maxSeeds,1,24)).reverse();
    const attempts={count:0,max:180};
    const evaluate=(start,dst,minPath)=>{
      if(attempts.count++>=attempts.max||this.containsSentence(renderObservation(dst)))return null;
      const introduced=unique(dst.filter(t=>!start.includes(t)&&/^[\p{L}\p{N}]+$/u.test(t)));
      const retained=unique(dst.filter(t=>start.includes(t)&&/^[\p{L}\p{N}]+$/u.test(t)));
      for(const a of introduced.slice(0,2))for(const b of retained.slice(0,3)){
        if(a===b)continue;
        const required=[a,b],source=renderObservation(start);
        const P=this.plan({required,start:source,maxDepth:5,maxExpanded:1500});
        if(P.found&&P.unseen&&P.steps.length>=minPath){
          return {required,start:source,source:"learned-operator-self-probe",
            requiredEdits:P.steps.length,observedStates:this.records.size,
            operatorEvidence:this.operators.size,
            noReferenceAnswerProvided:true,
            note:"Goal constraints selected from reachable learned effects. This is a structural self-test, not semantic autonomous motivation."};
        }
      }
      return null;
    };
    // Prefer hierarchical two-step compositions over one-step copycat tests.
    for(const wanted of [2,1])for(const id of candidates){
      const item=this.records.get(id);if(!item)continue;
      const first=this.neighbors(item.tokens).slice(0,12);
      for(const x of first){
        if(wanted===1){
          const found=evaluate(item.tokens,x.tokens,1);
          if(found)return found;
        }else{
          for(const y of this.neighbors(x.tokens).slice(0,10)){
            const found=evaluate(item.tokens,y.tokens,2);
            if(found)return found;
          }
        }
        if(attempts.count>=attempts.max)break;
      }
      if(attempts.count>=attempts.max)break;
    }
    return null;
  }
  // A second, LOCAL perspective using the SAME actual learned edit graph.
  // The global line is frozen FIRST. Each subsequent step is an action
  // independently chosen from locally available learned operators and goal
  // information, with an optional copy of the organism-owned noise policy.
  // The local controller can take a different route, then rediscover a plan.
  // Crucially, the textual world model's action effects are NOT an independent
  // external semantic judge: they are the operations induced from training.
  embody(plan,{maxSteps=40,noiseAgent=null,localPolicy=true,worldCore=null}={}) {
    if(!plan?.found)return {attempted:false,reason:plan?.reason||"no-shape"};
    const required=plan.goal.required;
    const start=tokenizeObservation(plan.start);
    let tokens=start.slice(),currentPlan=plan,position=0,corrections=0,
      executed=0,alternateMoves=0,failures=0,stalled=0;
    const frames=[{index:0,stage:"before-first-action",
      state:renderObservation(tokens),globalShape:plan.initialShape||[plan.start],
      localOptions:[],perspective:"global",goalReached:false}];
    const visits=new Map([[freezeKey(tokens),1]]);
    const agency=noiseAgent?Object.assign(Object.create(Object.getPrototypeOf(noiseAgent)),
      structuredClone(noiseAgent)):null;
    for(let k=0;k<maxSafe(Math.trunc(maxSteps),1,120);k++){
      const known=this.structuralSupport(tokens);
      if(this._goal(tokens,required)&&known.consistent)break;
      const state=renderObservation(tokens);
      let candidates=this.neighbors(tokens);
      if(!candidates.length){failures++;break;}
      // The local perspective does NOT see an oracle route. Scores combine
      // experienced operator support, goal progress and local revisits.
      const oldGoal=required.filter(t=>tokens.includes(t)).length;
      const ranked=candidates.map(next=>{
        const key=freezeKey(next.tokens),seen=visits.get(key)||0;
        const newGoal=required.filter(t=>next.tokens.includes(t)).length;
        const sharedContribution=worldCore?
          worldCore.scoreText(tokens,next.tokens,next.action,required):0;
        const score=(newGoal-oldGoal)*1.4+
          Math.log1p(next.action.observedSupport||0)*.18-
          seen*.85+sharedContribution;
        return {...next,score,seen,progress:newGoal-oldGoal,sharedContribution};
      }).sort((a,b)=>b.score-a.score||
        b.action.observedSupport-a.action.observedSupport||
        renderObservation(a.tokens).localeCompare(renderObservation(b.tokens)));
      if(!currentPlan.found||currentPlan.initialShape?.[0]!==state){
        currentPlan=this.plan({required,start:state,allowUnseenStart:true,
          maxDepth:Math.min(8,Math.max(4,maxSafe(maxSteps-k,1,8))),
          maxExpanded:2500,worldCore});
        position=0;corrections++;
      }
      const intended=currentPlan.initialShape?.[1]||null;
      let choice=ranked[0],choiceIndex=0,why="operator-support + goal-overlap + local novelty";
      const noise=agency?.decide({domain:"text",known:true,planned:!!intended})||null;
      if(noise?.site==="imagination"&&ranked.length>1){
        const selected=agency.output(0,ranked.length,noise);
        if(selected!==0){choice=ranked[selected];choiceIndex=selected;
          why="endogenous imagination from a frozen copy of organism noise policy";}
      }
      // If the local controller is stuck, it can consult its newly computed
      // goal-directed line; this is explicitly recorded as a perspective swap.
      if((visits.get(freezeKey(choice.tokens))||0)>=3&&intended){
        const directed=ranked.find(x=>renderObservation(x.tokens)===intended);
        if(directed){choice=directed;choiceIndex=ranked.indexOf(choice);
          why="local revisit → switch to overhead route";
        }
      }
      if(!localPolicy&&intended){
        const directed=ranked.find(x=>renderObservation(x.tokens)===intended);
        if(directed){choice=directed;choiceIndex=ranked.indexOf(choice);
          why="follow global planned action";}
      }
      const spec=this.operators.get(choice.action.key);
      const actual=spec?runAction(tokens,spec,choice.action.index):null;
      if(!actual){failures++;frames.push({index:k+1,stage:"failed-action",state,
        intended,chosen:choice.action,actual:null,why,error:"operator rejected"});break;}
      const after=renderObservation(actual),matched=intended===after;
      if(!matched)alternateMoves++;
      executed++;
      visits.set(freezeKey(actual),(visits.get(freezeKey(actual))||0)+1);
      // If it moved off the overhead path, recompute using only the currently
      // reached text state + learned operators + goal tokens. Never use a
      // reference target sentence or a hidden ground-truth graph.
      let updated=null;
      if(!matched){
        updated=this.plan({required,start:after,allowUnseenStart:true,
          maxDepth:Math.min(8,Math.max(4,maxSafe(maxSteps-k-1,1,8))),
          maxExpanded:2500,worldCore});
        currentPlan=updated;corrections++;position=0;
      } else {
        const tail=currentPlan.initialShape?.slice(1)||[after];
        currentPlan={...currentPlan,initialShape:tail};
        position++;
      }
      const support=this.structuralSupport(actual);
      const completed=this._goal(actual,required)&&support.consistent;
      frames.push({index:k+1,stage:"after-action",before:state,state:after,
        plannedNext:intended,chosen:choice.action,selectedIndex:choiceIndex,
        after,worldModelExpected:renderObservation(choice.tokens),
        predictionMatched:matched,causalEffectMatched:after===renderObservation(choice.tokens),
        alternativePath:!matched,localCandidateCount:ranked.length,
        alternatives:ranked.slice(0,8).map(x=>({state:renderObservation(x.tokens),
          score:+x.score.toFixed(5),observedSupport:x.action.observedSupport,
          action:x.action})),why,noise,
        goalReached:completed,remainingShape:currentPlan.initialShape||null,
        correctedShape:updated?.found?updated.initialShape:null,
        correctedPathExists:updated?.found??null,
        perspective:matched?"body":"body → overhead → body",
        effectSource:"learned-text-action-model",
        realSemanticWorldFeedback:false});
      tokens=actual;
      if(completed)break;
      if(!matched&&updated&&!updated.found)stalled++;
      if(stalled>3)break;
    }
    const final=renderObservation(tokens);
    const success=this._goal(tokens,required)&&this.structuralSupport(tokens).consistent;
    return {attempted:true,start:plan.start,predictedBeforeMovement:plan.predicted,
      final,success,executed,corrections,alternateMoves,failures,
      reachedPredictedGoal:final===plan.predicted,
      initialShape:plan.initialShape,frames,
      independentBodyActions:localPolicy,
      perspectiveChanges:frames.filter(x=>x.perspective?.includes("→")).length,
      effectSource:"learned-text-action-model",referenceProvided:false,
      frozen:true,semanticValidation:false,
      note:"Actual learned edit operations executed in the organism's internal text world; NOT independent semantic ground truth."};
  }
  execute(plan,{record=true}={}) {
    if(!plan?.found) return {verified:false,reason:"no-plan"};
    let tokens=tokenizeObservation(plan.start);
    const experience=[];
    for(const step of plan.steps){
      const op=this.operators.get(step.key);
      if(!op) return {verified:false,reason:"operator-not-observed",experience};
      const before=renderObservation(tokens);
      const after=runAction(tokens,op,step.index);
      if(!after){if(record)this.failedEffects++;return {verified:false,reason:"causal-effect-failed",experience};}
      if(record){this.executed++;this.correctEffects++;}
      tokens=after;
      experience.push({before,action:step.kind+" "+(step.from||"")+" → "+(step.to||""),
        after:renderObservation(after),effectVerified:true,learnedFrom:step.learnedFrom});
    }
    const result=renderObservation(tokens);
    const success=result===plan.predicted&&this._goal(tokens,plan.goal.required);
    if(!success&&record)this.failedEffects++;
    return {verified:success,result,actionCount:experience.length,experience,
      predictionMatchedExecution:result===plan.predicted};
  }
  report() {
    // Real learned actions and example provenance, never generated/fabricated
    // labels. Bounded payload for responsive UI and large corpora.
    const topOperators=[...this.operators.values()]
      .sort((a,b)=>b.sourceObservations-a.sourceObservations)
      .slice(0,24)
      .map(a=>({kind:a.kind,from:a.from,to:a.to,left:a.left,right:a.right,
        observedSupport:a.sourceObservations,examples:a.evidence.slice(0,2)}));
    return {topOperators,
      observed:this.newObservations,totalSeen:this.seen,activeObserved:this.records.size,
      comparedPairs:this.comparisons,oneChangePairs:this.matchingComparisons,
      learnedOperators:this.operators.size,learnedInvariantGroups:this.invariants.size,
      evicted:this.evicted,skippedLong:this.rejectedLong,droppedNewOperators:this.droppedOperators,
      executed:this.executed,verifiedEffects:this.correctEffects,
      failedEffects:this.failedEffects,
      lastPlan:this.lastPlan?{found:this.lastPlan.found,unseen:this.lastPlan.unseen,
        predicted:this.lastPlan.predicted,steps:this.lastPlan.steps?.length}:null};
  }
}
