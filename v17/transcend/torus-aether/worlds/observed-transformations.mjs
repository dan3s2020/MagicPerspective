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
    if(op.evidence.length<4 &&
        !op.evidence.some(x=>x.from===sample.from&&x.to===sample.to))op.evidence.push(sample);
  }
  _compare(previous,current){
    this.comparisons++;
    const direct=oneEdit(previous,current);
    if(!direct)return;
    this.matchingComparisons++;
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
    let matched=0,total=0;
    for(let j=0;j<info.length;j++){
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
  plan({required,start=null,maxDepth=4,maxExpanded=6000}={}) {
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
      if(!this.containsSentence(start))
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
    for(const tokens of sources){
      const key=freezeKey(tokens);if(visited.has(key))continue;
      visited.add(key);q.push({tokens,start:tokens,steps:[]});
    }
    let expanded=0;
    while(q.length&&expanded<budget) {
      const current=q.shift();expanded++;
      if(this._goal(current.tokens,req)){
        const support=this.structuralSupport(current.tokens);
        if(support.consistent) {
          const answer=renderObservation(current.tokens);
          const startText=renderObservation(current.start);
          return {found:true,start:startText,predicted:answer,
            unseen:this.containsSentence(answer)===false,
            goal:{required:req},steps:current.steps,expanded,
            structure:support,
            plannedBeforeAnswer:true,referenceProvided:false,
            predictedStateBeforeExecution:answer};
        }
      }
      if(current.steps.length>=depth)continue;
      for(const next of this.neighbors(current.tokens)){
        const key=freezeKey(next.tokens);if(visited.has(key))continue;
        const support=this.structuralSupport(next.tokens);
        if(support.verified&&!support.consistent)continue;
        visited.add(key);
        q.push({tokens:next.tokens,start:current.start,steps:current.steps.concat(next.action)});
        if(visited.size>=budget)break;
      }
    }
    return {found:false,reason:"no-learned-path-satisfies-goal",goal:{required:req},
      expanded,observed:this.records.size,operators:this.operators.size};
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
    return {observed:this.newObservations,totalSeen:this.seen,activeObserved:this.records.size,
      comparedPairs:this.comparisons,oneChangePairs:this.matchingComparisons,
      learnedOperators:this.operators.size,learnedInvariantGroups:this.invariants.size,
      evicted:this.evicted,skippedLong:this.rejectedLong,droppedNewOperators:this.droppedOperators,
      executed:this.executed,verifiedEffects:this.correctEffects,
      failedEffects:this.failedEffects,
      lastPlan:this.lastPlan?{found:this.lastPlan.found,unseen:this.lastPlan.unseen,
        predicted:this.lastPlan.predicted,steps:this.lastPlan.steps?.length}:null};
  }
}
