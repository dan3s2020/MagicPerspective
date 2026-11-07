// V31: CAUSAL output readout from the ORIGINAL V17 Discoverer.shape() path
// exposed by the existing V19/V23 LearnedCognitiveMap. Isolated research
// adapter: it does NOT change AligningGraph.write() or claim unrestricted NL.
import {tokenizeWorld,LearnedCognitiveMap} from './learned-cognitive-map.mjs';
import {inferObservedInstructionGoal} from './observed-instruction-goals.mjs';

const instruction=/^Replace "([^"\r\n]+)" with "([^"\r\n]+)" in:\n([^\r\n]+)$/u;
const render=tokens=>tokens.join(' ')
  .replace(/\s+([.,!?;:)\]}])/gu,'$1')
  .replace(/([([{])\s+/gu,'$1');

export function parseExplicitRewriteQuestion(question,{maxTokens=512}={}){
  if(typeof question!=='string'||question.length>131072)
    return {ok:false,error:'UNSUPPORTED_INPUT_BOUNDARY'};
  const m=instruction.exec(question);
  if(!m)return {ok:false,error:'UNSUPPORTED_INSTRUCTION_GRAMMAR'};
  const [,from,to,initial]=m;
  if(from===to||!from||!to)return {ok:false,error:'NO_NONTRIVIAL_GOAL'};
  const tokens=tokenizeWorld(initial);
  if(!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>2048)return {ok:false,error:'INVALID_MAX_TOKENS'};
  if(tokens.length>maxTokens)return {ok:false,error:'DESIGN_WALL_MAX_TOKENS_'+maxTokens};
  const locations=tokens.flatMap((v,i)=>v===from?[i]:[]);
  if(locations.length!==1)return {ok:false,error:locations.length?'AMBIGUOUS_SOURCE_POSITIONS':'SOURCE_TOKEN_NOT_PRESENT'};
  if(tokenizeWorld(from).length!==1||tokenizeWorld(to).length!==1)
    return {ok:false,error:'ONLY_SINGLE_TOKEN_REPLACEMENTS_SUPPORTED'};
  return {ok:true,from,to,initial,tokens,goal:{slots:{[locations[0]]:to}},slot:locations[0]};
}

export function answerFromOriginalPath(model,question,{maxDepth=8,maxNodes=384,maxTokens=512,seed=74129,includeAtlas=false}={}){
  if(!(model instanceof LearnedCognitiveMap))
    throw new Error('Use the original LearnedCognitiveMap — no standalone answer predictor');
  const parsed=parseExplicitRewriteQuestion(question,{maxTokens});
  if(!parsed.ok)return {found:false,answer:null,reason:parsed.error,source:'Discoverer.shape',path:[]};
  const plan=model.formSolution(parsed.initial,parsed.goal,
    {maxNodes,maxDepth,maxTokens,seed,transfer:true,temperature:0});
  const evidence={
    goalType:'EXPLICIT_REPLACEMENT_REQUEST_NOT_INFERRED_SEMANTIC_GOAL',
    goalPredicate:parsed.goal,question,source:'Discoverer.shape',
    actualWriter:'PATH_TERMINAL_STATE_READOUT_NOT_LEGACY_ALIGNING_GRAPH',
    semanticOpenThoughtsAnswer:false,firstTry:true,
    modelLearningChanged:false,found:!!plan.found,
    reason:plan.reason||null,
    path:plan.path?.map(h=>{const edge=plan.world?.neighbors?.[h.from]?.find(e=>e.to===h.to&&e.action===h.action);
      return {...h,verified:!!edge?.verified,crossWorld:!!edge?.crossWorld,
        support:edge?.support??0,provenance:edge?.provenance||[],
        transformation:edge?.transformation||h.transformation||null};})||[],
    fullAtlas:includeAtlas?{states:plan.world?.states||[],neighbors:plan.world?.neighbors||[],targets:plan.world?.targets||[]}:undefined,
    nodesConsidered:plan.world?.states.length||0,
    inputTokenCount:parsed.tokens.length,requestedMaxTokens:maxTokens,
    candidateEdges:plan.world?.estimatedTransitions||0,
    diagnostics:plan.world?.diagnostics||null,
    hypothesisVerifiedByEnvironment:false,
    generatedByReadoutOnlyWhenPathFound:true,
    answer:null,
  };
  if(!plan.found)return evidence;
  // No output string is copied from the declared goal or the test answer.
  // Start with the original observed state; apply ONLY the path discovered
  // by Discoverer, verifying every effect against the learned topology.
  let cursor=plan.world.states[0].slice();
  for(const hop of plan.path){
    const learned=model.predict(cursor,hop.action);
    if(!learned||JSON.stringify(learned)!==JSON.stringify(plan.world.states[hop.to])){
      return {...evidence,found:false,answer:null,reason:'DISCOVERED_EDGE_CANNOT_BE_REEXECUTED',rejectedHop:hop};
    }
    cursor=learned;
  }
  if(!LearnedCognitiveMap.matchGoal(cursor,parsed.goal))
    return {...evidence,found:false,answer:null,reason:'PATH_TERMINAL_STATE_VIOLATES_GOAL'};
  return {...evidence,answer:render(cursor),terminalTokens:cursor,reason:null};
}

export function firstTryCharacterComparison(predicted,reference){
  if(typeof reference!=='string')throw Error('Independent reference required only after frozen prediction');
  const a=Array.from(predicted??''),b=Array.from(reference);
  const n=Math.max(a.length,b.length),errors=[];let correct=0;
  for(let i=0;i<n;i++){
    if(a[i]===b[i])correct++;
    else errors.push({at:i,predicted:a[i]??null,expected:b[i]??null});
  }
  return {answerExact:predicted===reference,correctCharacters:correct,
    comparedCharacters:n,firstMismatch:errors[0]?.at??null,
    errors,predicted,reference};
}


// V36: TASK-CONDITIONED GOAL LEARNED FROM OTHER ACTUAL EPISODES.
// The caller supplies a *question* and a source text, NEVER an explicit
// destination token or teacher answer. Unlike the explicit V31 parser,
// the source->goal operator must have been witnessed in independent worlds.
// This is still a finite vocabulary of previously observed instruction
// phrases, NOT a claim of general language comprehension.
export function answerFromObservedInstructionPath(model,{instruction,source}={},
 {maxDepth=8,maxNodes=384,maxTokens=512,seed=74129,includeAtlas=false,
 minEpisodes=2}={}){
 if(!(model instanceof LearnedCognitiveMap))
  throw Error('The ORIGINAL LearnedCognitiveMap is required');
 const inference=inferObservedInstructionGoal(model,{instruction,source,minEpisodes});
 const base={source:'Discoverer.shape',
  actualWriter:'ORIGINAL_LEARNED_PATH_TERMINAL_STATE_NOT_NEXT_CHARACTER_MODEL',
  inferredGoalFromEarlierObservedActions:true,
  userSpecifiedDestinationToken:false,
  referenceAnswerProvided:false,originalBrain:true,
  independentEnvironmentSemanticValidationNotEstablished:true,
  evidence:inference,goalPredicate:inference.ok?inference.goal:null,
  found:false,answer:null,path:[],reason:inference.reason,
  modelLearningChanged:false};
 if(!inference.ok)return base;
 if(inference.initialTokens.length>maxTokens)
  return {...base,reason:'DESIGN_WALL_MAX_TOKENS_'+maxTokens};
 let plan;
 try{plan=model.formSolution(source,inference.goal,
  {maxDepth,maxNodes,maxTokens,seed,transfer:true,temperature:0});}
 catch(err){return {...base,reason:'ORIGINAL_SHAPE_ERROR_'+err.message};}
 const initial={...base,reason:plan.reason||null,
  firstShapeFrozenBeforeAnswer:true,observedIntentContextCount:inference.independentContexts,
  sourceStatesConsidered:plan.world?.states?.length||0,
  diagnostics:plan.world?.diagnostics||null,
  fullAtlas:includeAtlas?{states:plan.world?.states,
   neighbors:plan.world?.neighbors,targets:plan.world?.targets}:undefined,
  path:plan.path?.map(h=>{const e=plan.world?.neighbors?.[h.from]?.find(x=>
    x.to===h.to&&x.action===h.action);
   return {...h,verified:!!e?.verified,crossWorld:!!e?.crossWorld,
     evidence:e?.provenance||[],support:e?.support??0};})||[]};
 if(!plan.found)return initial;
 if(plan.path.length!==inference.supportedSequence.length)
  return {...initial,reason:'PATH_LENGTH_DIFFERS_FROM_OBSERVED_INTENT_SEQUENCE'};
 const tokens=inference.initialTokens;
 let cursor=tokens.slice();
 for(let i=0;i<plan.path.length;i++){
  const hop=plan.path[i],wanted=inference.supportedSequence[i];
  if(cursor[inference.sourceCoordinate]!==wanted.from)
   return {...initial,reason:'PATH_SOURCE_DIFFERS_FROM_OBSERVED_INTENT_EFFECT',rejectedStep:i};
  const predicted=model.predict(cursor,hop.action);
  if(!predicted||JSON.stringify(predicted)!==
     JSON.stringify(plan.world.states[hop.to]))
   return {...initial,reason:'ORIGINAL_LEARNED_ACTION_NOT_REEXECUTABLE',rejectedStep:i};
  const changed=cursor.flatMap((v,j)=>predicted[j]!==v?[j]:[]);
  if(changed.length!==1||changed[0]!==inference.sourceCoordinate||
      predicted[inference.sourceCoordinate]!==wanted.to)
   return {...initial,reason:'PATH_ACTION_DIFFERS_FROM_WITNESSED_INTENT',rejectedStep:i};
  cursor=predicted;
 }
 if(!LearnedCognitiveMap.matchGoal(cursor,inference.goal))
  return {...initial,reason:'ORIGINAL_PATH_FAILED_INFERRED_GOAL'};
 return {...initial,found:true,reason:null,answer:render(cursor),
  terminalTokens:cursor,firstTry:true,completedOriginalActions:plan.path.length,
  learnedGoalNotCopiedFromHeldoutAnswer:true};
}
