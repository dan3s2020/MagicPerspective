// MagicPerspective V19 — observed cognitive topology, not next-token training.
// The original Discoverer.shape law is imported verbatim from V18 shape-topology.
// No hidden answer strings, maze BFS distances or oracle solution paths enter training.
import {shapeOnLearnedTopology} from '../language-maze/shape-topology.mjs';
import {KIND,Discoverer} from './exercise.mjs';
import {portableTransformations,candidatePortable,inspectPortable,parsePortableId} from './cross-world-transforms.mjs';

export const tokenizeWorld = s => String(s).normalize('NFC')
  .match(/[\p{L}\p{M}\p{N}_]+(?:['’\-][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu) || [];
const SEP='\u001f';
const sentence=t=>t.join(' ');
const key=a=>a.join(SEP);
const ruleId=(at,from,to)=>JSON.stringify([at,from,to]);
const valid=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
const clone=x=>JSON.parse(JSON.stringify(x));
const unkey=s=>s?String(s).split(SEP):[];
const contextOf=(at,before,kind='replace')=>{
 const tokens=unkey(before),right=kind==='insert'?tokens[at]:tokens[at+1];
 return {left:tokens[at-1]??null,right:right??null,
  atEnd:kind==='insert'?at===tokens.length:at===tokens.length-1};
};
const contextMatches=(r,t,op)=>{
 if(!r.contexts?.length)return true; // explicit observed action models lack this assumption.
 return r.contexts.some(c=>{
  const atEnd=op==='insert'?r.at===t.length:r.at===t.length-1;
  if(c.atEnd!==atEnd)return false;
  if(c.left!==null && c.left!==t[r.at-1])return false;
  const right=op==='insert'?t[r.at]:t[r.at+1];
  if(c.right!==null && c.right!==right)return false;
  return true;
 });
};


// V22 exact direct ORIGINAL V17 function, not the V19 parallel reimplementation.
// The world is learned from real complete-sentence contrasts/action results.
// The *only* input goal is a checkable state predicate supplied BEFORE action.
// No answer string, hidden heldout target or oracle route is ever an edge.
function originalDiscovererOnText(world,disc,{seed=74129,temperature=null}={}){
  const actor=new Discoverer(seed);
  // An evaluator cannot advance the training Brain RNG; a separate seeded
  // original Discoverer has precisely the same V17 uphill-noise sampling.
  actor.temp=temperature===null?(disc?.temp||0):Math.max(0,Number(temperature)||0);
  const kinds=world.states.map((_,i)=>i===world.start?KIND.self:
    world.targets.includes(i)?KIND.target:KIND.floor);
  const conduct=k=>k===KIND.wall?0:
    k===KIND.floor?Math.max(.5,disc?.conduct?.(KIND.floor)??.5):1;
  const attract=k=>k===KIND.target?1:0;
  let values=[];
  const path=actor.shape(kinds,0,world.start,{
    neighbors:world.neighbors,conduct,attract,
    onField:observed=>{values=observed;}
  })||[];
  return {path,nodes:[world.start,...path.map(h=>h.to)],values,
    reason:path.length?'SHAPE_PROPAGATED':'NO_ASCENDING_PATH',
    propagation:'DIRECT_ORIGINAL_DISCOVERER_SHAPE',
    originalMethod:'Discoverer.shape',
    temperature:actor.temp};
}

export class LearnedCognitiveMap {
  constructor({maxExamples=50000,maxRules=30000,maxNodes=768,maxDepth=12}={}){
    this.limits={maxExamples,maxRules,maxNodes,maxDepth};
    this.examples=new Map();this.skeletons=new Map();this.rules=new Map();this.shorterIndex=new Map();
    this.interventions=new Map();this.externalEdges=new Map();this.externalObservations=0;
    this.compactedExternalEdges=0;
    this.sentenceObservations=0;this.compactedExamples=0;this.compactedRules=0;
    this.instructionGoalMemory=new Map();this.instructionGoalEpisodes=0;
    this.documents=0;this.evaluations=0;
    this.last=null;this.version=1;
    this.onAtlasEvidence=null;this.activeObservation=null; // transient, not part of saved Brain
  }
  // One complete input is perceived before any attempt to move.
  observeWorld(text,{id=null}={}){
    if(typeof text!=='string')throw Error('Expected observed world text');
    const parts=text.match(/[^.!?\n]+[.!?]?/gu)||[];
    this.activeObservation=id;
    let added=0,rulesBefore=this.rules.size;
    for(const part of parts){
      const tokens=tokenizeWorld(part);if(!tokens.length||tokens.length>96)continue;
      if(this.observeSentence(tokens,{source:id}))added++;
    }
    this.documents++;
    this.activeObservation=null;
    return {absorbed:true,documents:this.documents,newSentences:added,
      newRuleHypotheses:this.rules.size-rulesBefore,ruleCount:this.rules.size};
  }
  observeSentence(input,{source=null}={}){
    const t=Array.isArray(input)?input.slice():tokenizeWorld(input);
    if(!t.length||t.length>96||t.some(s=>typeof s!=='string'))return false;
    const id=key(t);if(this.examples.has(id))return false;
    if(this.examples.size>=this.limits.maxExamples)this.compactObservedExamples();
    this.sentenceObservations++;
    // All positions are indexed simultaneously. No grammar labels or "correct next character" are supplied.
    for(let at=0;at<t.length;at++){
      const shape=t.length+':'+at+':'+key(t.map((word,j)=>j===at?'∅':word));
      const observed=this.skeletons.get(shape)||new Map();
      for(const [other,fromExample] of observed){
        if(other===t[at])continue;
        // Induced symmetric change hypotheses, grounded in two COMPLETE observed sentences.
        this.#evidence(at,other,t[at],fromExample,id);
        this.#evidence(at,t[at],other,id,fromExample);
      }
      observed.set(t[at],id);this.skeletons.set(shape,observed);
    }
    // A full sentence is a state, not a target to copy. Detect observed
    // insertion/deletion and adjacent swap contrasts across independently
    // observed complete strings (only hypotheses until intervention feedback).
    for(let at=0;at<t.length;at++){
      const shorter=t.slice(0,at).concat(t.slice(at+1));
      const shortKey=key(shorter);
      if(this.examples.has(shortKey)){
        this.#editEvidence('insert',at,'',t[at],shortKey,id);
        this.#editEvidence('delete',at,t[at],'',id,shortKey);
      }
      const previouslyLonger=this.shorterIndex.get(id);
      if(previouslyLonger)for(const x of previouslyLonger){
        this.#editEvidence('insert',x.at,'',x.token,id,x.longer);
        this.#editEvidence('delete',x.at,x.token,'',x.longer,id);
      }
      const lst=this.shorterIndex.get(shortKey)||[];
      if(lst.length<64)lst.push({at,token:t[at],longer:id});
      this.shorterIndex.set(shortKey,lst);
    }
    this.examples.set(id,{tokens:t,source});return true;
  }
  // All raw observations remain in the original dataset. The active map
  // retains a bounded recent index plus cumulative learned rules. Compaction
  // is reported; it never pretends that old raw sentences remain in RAM.
  compactObservedExamples(){
    const drop=Math.max(1,Math.ceil(this.limits.maxExamples*.10));
    for(let n=0;n<drop&&this.examples.size;n++){
      const [id,entry]=this.examples.entries().next().value,t=entry.tokens;
      this.examples.delete(id);this.compactedExamples++;
      for(let at=0;at<t.length;at++){
        const skeleton=t.length+':'+at+':'+key(t.map((x,j)=>j===at?'∅':x));
        const row=this.skeletons.get(skeleton);
        if(row?.get(t[at])===id){row.delete(t[at]);if(!row.size)this.skeletons.delete(skeleton);}
        const shortKey=key(t.slice(0,at).concat(t.slice(at+1)));
        const shorter=this.shorterIndex.get(shortKey);
        if(shorter){const newer=shorter.filter(x=>x.longer!==id);
          if(newer.length)this.shorterIndex.set(shortKey,newer);
          else this.shorterIndex.delete(shortKey);
        }
      }
    }
  }
  reserveRule(){
    if(this.rules.size<this.limits.maxRules)return;
    let weakest=null;
    for(const r of this.rules.values()){
      if(r.accepted>0)continue;
      if(!weakest||r.observations<weakest.observations)weakest=r;
      if(r.observations<=1)break;
    }
    if(!weakest)throw Error('All learned rules are verified; RAM rule budget exceeded');
    this.rules.delete(weakest.id);this.compactedRules++;
  }
  #evidence(at,from,to,before,after){
    const name=ruleId(at,from,to);let r=this.rules.get(name);
    if(!r){
      this.reserveRule();
      r={id:name,at,from,to,observations:0,accepted:0,rejected:0,
        sources:[],kind:'observed-contrast-hypothesis'};
      this.rules.set(name,r);
    }
    const pair=before+' → '+after;
    const ctx=contextOf(at,before,'replace');
    r.contexts ||= [];
    if(!r.contexts.some(x=>JSON.stringify(x)===JSON.stringify(ctx))&&r.contexts.length<24)r.contexts.push(ctx);
    if(!r.sources.includes(pair)){
      r.observations++;if(r.sources.length<12)r.sources.push(pair);
      this.onAtlasEvidence?.({type:"rule-evidence",kind:r.kind,world:"text",
        documentId:this.activeObservation,action:r.id,at:r.at,from:r.from,to:r.to,
        before:unkey(before),after:unkey(after),contexts:r.contexts,
        observations:r.observations,accepted:r.accepted,rejected:r.rejected,
        evidenceLevel:"OBSERVED_CONTRAST_NOT_CAUSAL_PROOF"});
    }
  }
  #editEvidence(operation,at,from,to,before,after){
    const name=JSON.stringify([operation,at,from,to]);let r=this.rules.get(name);
    if(!r){
      this.reserveRule();
      r={id:name,operation,at,from,to,observations:0,accepted:0,rejected:0,
        sources:[],kind:'observed-complete-state-edit-hypothesis'};
      this.rules.set(name,r);
    }
    const pair=before+' → '+after;
    const ctx=contextOf(at,before,operation);
    r.contexts ||= [];
    if(!r.contexts.some(x=>JSON.stringify(x)===JSON.stringify(ctx))&&r.contexts.length<24)r.contexts.push(ctx);
    if(!r.sources.includes(pair)){
      r.observations++;if(r.sources.length<12)r.sources.push(pair);
      this.onAtlasEvidence?.({type:"rule-evidence",kind:r.kind,world:"text",
        documentId:this.activeObservation,action:r.id,operation,at,from,to,
        before:unkey(before),after:unkey(after),contexts:r.contexts,
        observations:r.observations,accepted:r.accepted,rejected:r.rejected,
        evidenceLevel:"OBSERVED_COMPLETE_STATE_CONTRAST_NOT_VERIFIED_ACTION"});
    }
  }
  // A real before/action/after observation can teach an unfamiliar
  // contiguous string transformation; no predefined grammar labels.
  observeActionResult({before,action,after,accepted}={}){
    const b=Array.isArray(before)?before.slice():tokenizeWorld(before);
    const a=Array.isArray(after)?after.slice():tokenizeWorld(after);
    if(typeof action!=='string'||!action||typeof accepted!=='boolean')throw Error('Real action and accepted flag required');
    const record=this.interventions.get(key(b)+'|'+action)||{accepted:0,blocked:0};
    if(!accepted){
      record.blocked++;this.interventions.set(key(b)+'|'+action,record);
      const known=this.rules.get(action);if(known)known.rejected++;
      this.onAtlasEvidence?.({type:"observed-action",world:"text",
        before:b,after:a,action,accepted:false,
        reason:"WALL_ACTION_REJECTED",evidenceLevel:"REAL_OBSERVATION"});
      return {learned:false,wall:true,action};
    }
    let prefix=0,suffix=0;
    while(prefix<b.length&&prefix<a.length&&b[prefix]===a[prefix])prefix++;
    while(suffix<b.length-prefix&&suffix<a.length-prefix&&b[b.length-suffix-1]===a[a.length-suffix-1])suffix++;
    const from=b.slice(prefix,b.length-suffix),to=a.slice(prefix,a.length-suffix);
    if(from.length>16||to.length>16)throw Error('Observation exceeds bounded local transformation span');
    let r=this.rules.get(action);
    if(!r){
      this.reserveRule();
      r={id:action,operation:'span',at:prefix,from,to,
        observations:0,accepted:0,rejected:0,
        sources:[],kind:'causally-observed-action'};
      this.rules.set(action,r);
    }else if(r.operation==='span'&&(r.at!==prefix||JSON.stringify(r.from)!==JSON.stringify(from)||JSON.stringify(r.to)!==JSON.stringify(to))){
      // Do not claim one action has a single known effect when observed
      // results contradict that hypothesis; abstain until disambiguated.
      r.ambiguous=true;
    }
    r.observations++;r.accepted++;
    record.accepted++;this.interventions.set(key(b)+'|'+action,record);
    this.onAtlasEvidence?.({type:"observed-action",world:"text",
      before:b,after:a,action,accepted:true,
      predictedTransformation:{at:prefix,from,to},
      ambiguous:!!r.ambiguous,evidenceLevel:"REAL_OBSERVATION"});
    return {learned:!r.ambiguous,wall:false,action,from,to,at:prefix};
  }
  // Grounded interventions: this method NEVER calls an oracle. Callers pass the
  // actual observed state after a real action, and whether it was accepted.
  observeIntervention({before,action,after,accepted}={}){
    const b=Array.isArray(before)?before.slice():tokenizeWorld(before);
    const a=Array.isArray(after)?after.slice():tokenizeWorld(after);
    if(typeof action!=='string'||typeof accepted!=='boolean')throw Error('Observed action and accepted flag required');
    const portable=parsePortableId(action);
    if(!this.rules.has(action)&&!portable)
      throw Error('Action not learned from observations: '+action);
    const pred=this.predict(b,action);
    const correct=accepted&&pred!==null&&key(a)===key(pred);
    const id=key(b)+'|'+action;const record=this.interventions.get(id)||{accepted:0,blocked:0};
    if(correct)record.accepted++;else record.blocked++;
    this.interventions.set(id,record);
    const r=this.rules.get(action);
    this.onAtlasEvidence?.({type:"observed-action",world:"text",
      before:b,after:a,action,accepted,predicted:pred,
      accurate:correct,evidenceLevel:"REAL_INTERVENTION",
      reason:correct?"MATCHED_EXPECTED_EFFECT":"WALL_OR_WRONG_EFFECT"});
    if(r){r.accepted+=Number(correct);r.rejected+=Number(!correct);}
    else if(correct){
      // The portable route has now been independently executed by a real
      // action in this exact state. Promote this *observed result* into an
      // ordinary local span rule without retroactively verifying the whole
      // transform class or other hypothetical corridors.
      this.observeActionResult({before:b,action,after:a,accepted:true});
    }
    return {predicted:pred,actual:a,predictionCorrect:correct,blocked:!correct};
  }
  predict(input,action){
    const t=Array.isArray(input)?input.slice():tokenizeWorld(input);
    if(parsePortableId(action))
      return inspectPortable(this.rules,action,t,this.interventions);
    const r=this.rules.get(action);
    if(!r||r.ambiguous)return null;
    const op=r.operation||'replace';
    if(op==='insert'){
      if(r.at>t.length)return null;
    }else if(op==='delete'||op==='replace'){
      if(r.at>=t.length||t[r.at]!==r.from)return null;
    }else if(op==='span'){
      if(r.at>t.length||r.at+r.from.length>t.length||
        JSON.stringify(t.slice(r.at,r.at+r.from.length))!==JSON.stringify(r.from))return null;
    }else return null;
    if(!contextMatches(r,t,op))return null;
    const observed=this.interventions.get(key(t)+'|'+action);
    if(observed?.blocked&&(!observed.accepted||observed.blocked>observed.accepted))return null;
    if(r.rejected>r.accepted+Math.max(1,r.observations))return null;
    if(op==='insert')t.splice(r.at,0,r.to);
    else if(op==='delete')t.splice(r.at,1);
    else if(op==='span')t.splice(r.at,r.from.length,...r.to);
    else t[r.at]=r.to;
    return t;
  }
  // All V17 domains can share observed state/action/next-state relations
  // without copying simulator physics, BFS maps, or hidden desired answers.
  observeExternalTransition({domain,before,action,after,context=""}={}){
    if(!['maze','transform','text','code'].includes(domain))throw Error('Unknown observation domain');
    const s=x=>typeof x==='string'?x:Array.isArray(x)?x.slice():null;
    const a=s(before),b=s(after);
    if(a===null||b===null||action===undefined)throw Error('Real observed transition required');
    const start=JSON.stringify([domain,a]),end=JSON.stringify([domain,b]);
    const index=start+SEP+String(action);
    let transition=this.externalEdges.get(index);
    if(transition&&transition.to!==end){transition.ambiguous=true;}
    if(!transition){
      if(this.externalEdges.size>=50000){
        // An unbounded sequence of unique maze states must never crash all
        // training workers. Preserve cumulative evidence counters and keep
        // the freshest active transitions in a bounded atlas.
        const discard=Math.max(1,Math.ceil(this.externalEdges.size*.10));
        for(let i=0;i<discard;i++){
          const oldest=this.externalEdges.keys().next().value;
          if(oldest===undefined)break;
          this.externalEdges.delete(oldest);this.compactedExternalEdges++;
        }
      }
      transition={domain,from:start,to:end,before:a,after:b,action:String(action),
        count:0,ambiguous:false,context:String(context).slice(0,128)};
      this.externalEdges.set(index,transition);
    }
    transition.count++;this.externalObservations++;
    this.onAtlasEvidence?.({type:"observed-external-transition",world:domain,
      before:a,after:b,action:String(action),context:String(context),
      ambiguous:transition.ambiguous,count:transition.count,
      evidenceLevel:"ACTUAL_V17_WORLD_TRANSITION"});
    return {known:true,domain,conflict:transition.ambiguous,count:transition.count};
  }
  // The ORIGINAL V17 shape operator also runs over observed non-language edges.
  // Unlike the explicit hypercube this graph contains ONLY experienced edges.
  formObservedWorld(domain,initial,goal,{disc=null,maxNodes=512}={}){
    if(!['maze','transform','text','code'].includes(domain))throw Error('Unknown world domain');
    const start=JSON.stringify([domain,initial]),states=[initial],keys=new Map([[start,0]]);
    const outgoing=new Map();
    for(const e of this.externalEdges.values()){
      if(e.domain!==domain||e.ambiguous)continue;
      if(!outgoing.has(e.from))outgoing.set(e.from,[]);
      outgoing.get(e.from).push(e);
    }
    const neighbors=[[]];
    for(let i=0;i<states.length;i++){
      const id=JSON.stringify([domain,states[i]]);
      for(const edge of outgoing.get(id)||[]){
        let to=keys.get(edge.to);
        if(to===undefined){
          if(states.length>=maxNodes)continue;
          to=states.length;states.push(edge.after);keys.set(edge.to,to);neighbors.push([]);
        }
        neighbors[i].push({to,action:edge.action,transformation:'observed:'+domain});
      }
    }
    const targets=states.flatMap((state,i)=>LearnedCognitiveMap.matchGoal(state,goal)?[i]:[]);
    if(!targets.length)return {found:false,reason:'GOAL_NOT_REACHED_IN_OBSERVED_TRANSITIONS',
      domain,states:states.length,learnedEdges:outgoing.size,path:[]};
    const field=originalDiscovererOnText({states,neighbors,start:0,targets},disc);
    return {found:!!field.path?.length&&targets.includes(field.path.at(-1)?.to),
      domain,states:states.length,learnedEdges:outgoing.size,
      path:field.path||[],field,plannedBeforeAction:true,
      directOriginalMethod:'Discoverer.shape',
      interpretation:'DIRECT original V17 Discoverer.shape on observed action transitions ONLY; unseen action physics never inferred.'};
  }
  // Goal is a CHECKABLE predicate on the generated state; the finished sentence
  // is NEVER supplied as a target string, node, hidden path, or teacher-forced prefix.
  static matchGoal(tokens,goal){
    if(!goal||typeof goal!=='object'||!goal.slots||typeof goal.slots!=='object')throw Error('Explicit goal constraints required, not the answer string');
    const entries=Object.entries(goal.slots);
    if(!entries.length)throw Error('Goal must constrain at least one position');
    return entries.every(([i,token])=>valid(Number(i),0,tokens.length-1)&&tokens[Number(i)]===token);
  }
  buildWorld(initial,goal,{maxNodes=this.limits.maxNodes,maxDepth=this.limits.maxDepth,transfer=true,maxTokens=96}={}){
    const start=Array.isArray(initial)?initial.slice():tokenizeWorld(initial);
    if(!start.length||start.length>maxTokens||!valid(maxTokens,1,2048)||!valid(maxNodes,2,20000)||!valid(maxDepth,1,256))throw Error('Invalid cognitive planning limits');
    LearnedCognitiveMap.matchGoal(start,goal);
    const queue=[start],byKey=new Map([[key(start),0]]),out=[[]],depth=[0];
    let rejected=0,truncated=false,imagined=0,portableCount=0;
    let depthLimited=0;
    const portable=transfer?portableTransformations(this.rules):[];
    const portableClasses=portable.length,diagnostics={
      portableClasses,observedActionRules:this.rules.size,
      sourceExamplesActive:this.examples.size,
      compactedExamples:this.compactedExamples,compactedRules:this.compactedRules,
      maxNodes,maxDepth,maxTokens,transfer,excludedByDesign:[],
      pathSource:"observed local changes + multiple independent world contexts",
      goalKnownOnlyAsPredicate:true
    };
    for(let head=0;head<queue.length;head++){
      const state=queue[head],currentDepth=depth[head];
      if(currentDepth>=maxDepth){depthLimited++;continue;}
      for(const r of this.rules.values()){
        const next=this.predict(state,r.id);if(!next)continue;
        const nextKey=key(next),prior=this.interventions.get(key(state)+'|'+r.id);
        if(prior?.blocked>prior?.accepted){rejected++;continue;}
        let dest=byKey.get(nextKey);
        if(dest===undefined){
          if(queue.length>=maxNodes){truncated=true;continue;}
          dest=queue.length;queue.push(next);byKey.set(nextKey,dest);
          depth.push(currentDepth+1);out.push([]);
        }
        // Future edges are HYPOTHESES supported by observed contrasts.
        // They are not claimed to be verified actions until executed.
        out[head].push({to:dest,action:r.id,
          transformation:{at:r.at,from:r.from,to:r.to},
          support:r.observations,verified:!!prior?.accepted});
        imagined++;
      }
      // A new exercise can be only one SEGMENT of the world. Reuse
      // transformation evidence from OTHER complete sentences/maze episodes,
      // but require 2 independent original contexts before any projection.
      // These edges remain HYPOTHESES, not known walls or correct answers.
      for(const suggestion of candidatePortable(state,portable,this.interventions)){
        const next=suggestion.next, nextKey=key(next);
        if(out[head].some(x=>x.action===suggestion.action&&
            key(queue[x.to])===nextKey))continue;
        let dest=byKey.get(nextKey);
        if(dest===undefined){
          if(queue.length>=maxNodes){truncated=true;continue;}
          dest=queue.length;queue.push(next);byKey.set(nextKey,dest);
          depth.push(currentDepth+1);out.push([]);
        }
        out[head].push({to:dest,action:suggestion.action,
          transformation:{at:suggestion.at,from:suggestion.from,to:suggestion.to},
          support:suggestion.support,verified:suggestion.verified,
          hypothesis:true,crossWorld:true,
          provenance:suggestion.provenance,
          observedPositions:suggestion.sourceWorldPositions});
        portableCount++;imagined++;
      }
    }
    diagnostics.depthFrontierStates=depthLimited;
    diagnostics.portableProjectedEdges=portableCount;
    diagnostics.nodeLimitReached=truncated;
    diagnostics.depthLimitReached=depthLimited>0;
    if(truncated)diagnostics.excludedByDesign.push("MAX_NODES_EXCEEDED");
    if(depthLimited)diagnostics.excludedByDesign.push("MAX_DEPTH_EXCEEDED");
    if(!portable.length)diagnostics.excludedByDesign.push("INSUFFICIENT_INDEPENDENT_CONTEXT_EVIDENCE_FOR_TRANSFER");
    const targets=queue.map((tokens,i)=>LearnedCognitiveMap.matchGoal(tokens,goal)?i:null).filter(i=>i!==null);
    if(!targets.length){
      const demanded=Object.values(goal.slots);
      const observedTokens=new Set(queue.flat());
      const missing=Array.from(new Set(demanded.filter(v=>!observedTokens.has(v))));
      diagnostics.goalTokensNeverGenerated=missing;
      if(missing.length)diagnostics.excludedByDesign.push("MISSING_GOAL_TRANSFORMATION_OR_CONTEXT");
      diagnostics.failureReason=truncated?"SEARCH_BUDGET_EXHAUSTED_NOT_PROOF_OF_IMPOSSIBILITY":
        depthLimited?"DEPTH_BUDGET_EXHAUSTED_NOT_PROOF_OF_IMPOSSIBILITY":
        "NO_REACHABLE_GOAL_IN_CURRENT_EVIDENCE_NOT_PROOF_OF_IMPOSSIBILITY";
    }
    return {states:queue,neighbors:out,start:0,targets,goal:clone(goal),truncated,
      diagnostics,portableProjectedEdges:portableCount,
      estimatedTransitions:imagined,rejected,fromObservedExamples:this.examples.size,
      source:'observed complete-sentence contrasts + actual action feedback',
      unseenStates:queue.filter(s=>!this.examples.has(key(s))).length};
  }
  // Same V17 operator, same .97 and .5 thresholds: no BFS oracle or target string.
  // Only the target PREDICATE seeds the attraction field; its successful states
  // must emerge from learned transition hypotheses.
  formSolution(initial,goal,{disc=null,maxNodes,maxDepth,seed=74129,temperature=null,transfer=true,maxTokens=96}={}){
    const world=this.buildWorld(initial,goal,{maxNodes,maxDepth,transfer,maxTokens});
    if(world.targets.includes(0))return {found:true,path:[],world,field:{reason:'ALREADY_AT_GOAL',values:[]},
      goal:clone(goal),learnedRules:this.rules.size,novelGoal:false,
      plannedBeforeAction:true,planningLaw:'ORIGINAL_V17_ATTRACTION_0.97'};
    if(!world.targets.length)return {found:false,
      reason:world.diagnostics?.failureReason||'NO_GOAL_STATE_IN_LEARNED_MAP',world,
      learnedRules:this.rules.size,path:[],field:null};
    // This invokes the ACTUAL original Discoverer.shape method from
    // exercise.mjs with the discovered N-D text-world adjacency. No V19/V20
    // substitute field planner is used for this action path.
    const field=originalDiscovererOnText(world,disc,{seed,temperature});
    const path=field.path||[];
    const reached=path.length?world.targets.includes(path.at(-1).to):world.targets.includes(0);
    return {found:reached,path,world,field,goal:clone(goal),
      learnedRules:this.rules.size,novelGoal:reached&&!this.examples.has(key(world.states[path.at(-1)?.to??0])),
      plannedBeforeAction:true,planningLaw:'ORIGINAL_V17_ATTRACTION_0.97',
      directOriginalMethod:'Discoverer.shape',noise:field.temperature,
      usedCrossWorld:!!path.find(h=>h.action?.startsWith('__XWORLD__:')),
      projectedCrossWorldEdges:world.portableProjectedEdges};
  }
  // The path is constructed FIRST. Every step then calls a REAL environment
  // callback; failures produce feedback (walls) and stop, never silently pass.
  execute(plan,{step,observe=true,brain=null}={}){
    if(!plan?.found||typeof step!=='function')throw Error('Plan and environment step() are required');
    let cursor=plan.world.states[0].slice();const trace=[];
    for(const hop of plan.path){
      const predicted=this.predict(cursor,hop.action);
      if(!predicted)throw Error('Pre-action path invalidated by feedback');
      const actual=step(cursor.slice(),hop.action,predicted.slice());
      if(!actual||!Array.isArray(actual.after)||typeof actual.accepted!=='boolean')
        throw Error('World must return actual {after,accepted}');
      const accurate=actual.accepted&&key(actual.after)===key(predicted);
      const record={from:cursor.slice(),action:hop.action,predicted,
        observed:actual.after.slice(),accepted:actual.accepted,accurate};
      trace.push(record);
      if(observe)this.observeIntervention({before:cursor,action:hop.action,after:actual.after,accepted:actual.accepted});
      brain?.observeShared?.({domain:'text',before:cursor,after:actual.after,
        action:hop.action,context:'V19-observed-intervention'});
      if(!accurate)break;
      cursor=actual.after.slice();
    }
    const success=trace.every(t=>t.accurate)&&LearnedCognitiveMap.matchGoal(cursor,plan.goal);
    const result={solved:success,attempts:trace.length,
      predictionAccuracy:trace.length?trace.filter(t=>t.accurate).length/trace.length:null,
      plannedSteps:plan.path.length,goalMet:LearnedCognitiveMap.matchGoal(cursor,plan.goal),
      final:cursor,trace,learningRuleCount:this.rules.size,
      genuinelyUnseenGoal:plan.novelGoal};
    this.last={success,attempts:trace.length,goalMet:result.goalMet,
      novelGoal:plan.novelGoal,steps:result.plannedSteps};
    return result;
  }
  successor(world,{gammas=[.2,.5,.8],horizon=12}={}){
    // Finite-horizon expected future occupancy over the LEARNED transition graph:
    // M = I + gamma P + gamma^2 P^2 + ... . Neither a goal oracle nor a path.
    if(!valid(horizon,1,256))throw Error('Invalid successor horizon');
    const N=world.states.length,targets=new Set(world.targets);
    return gammas.map(gamma=>{
      if(!(gamma>0&&gamma<1))throw Error('Successor discount must lie in (0,1)');
      let next=Float64Array.from({length:N},(_,i)=>Number(targets.has(i))),sum=next.slice();
      for(let k=1;k<=horizon;k++){
        const step=new Float64Array(N);
        for(let i=0;i<N;i++){
          const edges=world.neighbors[i];if(!edges.length)continue;
          const p=1/edges.length;
          for(const e of edges)step[i]+=p*next[e.to];
        }
        next=step;for(let i=0;i<N;i++)sum[i]+=Math.pow(gamma,k)*next[i];
      }
      return {gamma,horizon,goalOccupancyAtStart:sum[world.start],
        visitedStates:N,values:Array.from(sum)};
    });
  }
  report(){return {version:1,documents:this.documents,observedSentences:this.examples.size,
    inducedActionRules:this.rules.size,sentenceObservations:this.sentenceObservations,
    compactedExamples:this.compactedExamples,compactedRules:this.compactedRules,
    activeSentenceMemory:this.examples.size,externalTransitionObservations:this.externalObservations,
    observedDomainEdges:this.externalEdges.size,compactedExternalEdges:this.compactedExternalEdges,
    realObservedActions:[...this.interventions.values()].reduce((s,e)=>s+e.accepted+e.blocked,0),
    confirmedActions:[...this.rules.values()].filter(r=>r.accepted>0).length,
    rejectedActions:[...this.rules.values()].reduce((s,r)=>s+r.rejected,0),last:this.last,
    interpretation:'Rules learned from contrasts are hypotheses until actions are observed. No next-token trainer.'};}
  export(){return {version:1,limits:this.limits,documents:this.documents,
    sentenceObservations:this.sentenceObservations,compactedExamples:this.compactedExamples,
    compactedRules:this.compactedRules,
    examples:[...this.examples],skeletons:[...this.skeletons].map(([k,m])=>[k,[...m]]),
    shorterIndex:[...this.shorterIndex],
    rules:[...this.rules],interventions:[...this.interventions],
    externalEdges:[...this.externalEdges],externalObservations:this.externalObservations,
    compactedExternalEdges:this.compactedExternalEdges,last:this.last,
    instructionGoalMemory:[...this.instructionGoalMemory],
    instructionGoalEpisodes:this.instructionGoalEpisodes};}
  static restore(data){
    if(data?.version!==1)throw Error('Incompatible cognitive map checkpoint version');
    const m=new LearnedCognitiveMap(data.limits);m.documents=data.documents;
    m.sentenceObservations=data.sentenceObservations||0;
    m.compactedExamples=data.compactedExamples||0;m.compactedRules=data.compactedRules||0;
    m.examples=new Map(data.examples);m.skeletons=new Map(data.skeletons.map(([k,a])=>[k,new Map(a)]));
    m.shorterIndex=new Map(data.shorterIndex||[]);
    m.rules=new Map(data.rules);m.interventions=new Map(data.interventions);
    m.externalEdges=new Map(data.externalEdges||[]);m.externalObservations=data.externalObservations||0;
    m.compactedExternalEdges=data.compactedExternalEdges||0;
    m.last=data.last||null;
    m.instructionGoalMemory=new Map(data.instructionGoalMemory||[]);
    m.instructionGoalEpisodes=data.instructionGoalEpisodes||0;
    return m;
  }
}
