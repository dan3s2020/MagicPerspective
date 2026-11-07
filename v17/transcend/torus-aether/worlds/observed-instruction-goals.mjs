// V36 isolated evidence-only question->goal inference for the SAME original
// LearnedCognitiveMap, whose route planner is ORIGINAL V17 Discoverer.shape.
// Goal outcome words are NEVER read from the heldout test answer or from the
// inference prompt; they are retained effects of actual prior lived episodes.
// This is a finite, witnessed instruction vocabulary, NOT arbitrary NLP.
import {LearnedCognitiveMap,tokenizeWorld} from './learned-cognitive-map.mjs';

const normalize=s=>String(s||'').normalize('NFC').trim()
  .replace(/\s+/gu,' ').replace(/[.!?]+$/gu,'').toLocaleLowerCase('en-US');
const validText=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const result=(ok,reason,rest={})=>({ok,reason,...rest});
const words=x=>Array.isArray(x)?x.slice():tokenizeWorld(x);
const encodeSeq=seq=>JSON.stringify(seq.map(x=>[x.from,x.to]));
const traceTokenStates=(states)=>{
 const trace=[],first=words(states[0]),length=first.length;
 if(length<1||length>2048)throw Error('Training source must contain 1..2048 tokens');
 let prior=first,slot=null;
 for(let step=1;step<states.length;step++){
  const next=words(states[step]);
  if(next.length!==length)throw Error('Only equal-width replacement effects have been witnessed');
  const diff=[];
  for(let i=0;i<length;i++)if(prior[i]!==next[i])diff.push(i);
  if(diff.length!==1)throw Error('Every witnessed action must change exactly one token');
  if(slot!==null&&slot!==diff[0])throw Error('Mixed coordinates require an independently evidenced goal selector');
  slot=diff[0];
  trace.push({from:prior[slot],to:next[slot],index:slot});
  prior=next;
 }
 return {start:first,slot,sequence:trace};
};

export function observeInstructionTrajectory(model,{
 instruction,states,episodeId,executedTransitionsObserved=false}={}){
 if(!(model instanceof LearnedCognitiveMap))
  throw Error('Must use the SAME original V17 LearnedCognitiveMap');
 if(!validText(instruction,240)||!Array.isArray(states)||states.length<2||states.length>9||
    typeof episodeId!=='string'||episodeId.length<1||episodeId.length>160)
  throw Error('Need a bounded real instruction, 2..9 state observations, and source episode ID');
 if(executedTransitionsObserved!==true)
  throw Error('Observed before/action/after effects required; do not treat desired hypothetical states as reality');
 const {start,slot,sequence}=traceTokenStates(states);
 const key=normalize(instruction),signature=encodeSeq(sequence);
 const all=model.instructionGoalMemory.get(key)||[];
 let g=all.find(x=>x.signature===signature);
 if(!g){g={signature,sourceToken:sequence[0].from,
   terminalToken:sequence.at(-1).to,
   sequence:sequence.map(x=>({from:x.from,to:x.to})),
   evidence:[],documentedExternalWitnesses:0};
  all.push(g);
  model.instructionGoalMemory.set(key,all);
 }
 if(g.evidence.some(x=>x.episodeId===episodeId))
  return result(false,'DUPLICATE_EPISODE_NOT_INDEPENDENT',
   {instructionKey:key,independentEpisodes:g.evidence.length});
 // Only independent episode labels count, never repeated observations
 // or different window slices of one identical training world.
 g.evidence.push({episodeId,sourceTokens:start.length,sourceIndex:slot,
  sourceText:typeof states[0]==='string'?states[0]:start.join(' '),
  actualFinalState:typeof states.at(-1)==='string'?states.at(-1):words(states.at(-1)).join(' '),
  witnessedSteps:sequence.length});
 g.documentedExternalWitnesses=g.evidence.length;
 model.instructionGoalEpisodes++;
 return result(true,null,{instructionKey:key,source:sequence[0].from,
  after:sequence.at(-1).to,sequence:g.sequence,
  independentlyLivedEpisodes:g.evidence.length,
  originalBrainOnly:true,externalPhysicsVerificationProvidedByCaller:true});
}

export function inferObservedInstructionGoal(model,{instruction,source,minEpisodes=2}={}){
 if(!(model instanceof LearnedCognitiveMap))
  throw Error('Must use the SAME original V17 LearnedCognitiveMap');
 if(!validText(instruction,240)||!validText(source,131072)||
   !Number.isInteger(minEpisodes)||minEpisodes<2||minEpisodes>16)
  return result(false,'INVALID_INSTRUCTION_OR_SOURCE');
 const intent=normalize(instruction),all=model.instructionGoalMemory.get(intent)||[];
 if(!all.length)return result(false,'UNSEEN_INSTRUCTION_INTENT');
 const tokens=tokenizeWorld(source);
 if(!tokens.length||tokens.length>2048)return result(false,'DESIGN_WALL_2048_INPUT_TOKENS');
 // If two distinct actual effects were observed from the same intent and
 // source token, refuse to invent which goal should be used.
 const applicants=all.filter(g=>tokens.includes(g.sourceToken));
 if(!applicants.length)return result(false,'NO_APPLICABLE_LEARNED_INTENT_EFFECTS');
 const sources=new Set(applicants.map(x=>x.sourceToken));
 if(sources.size>1)return result(false,'AMBIGUOUS_INPUT_INTENT_AXES');
 const seqs=new Set(applicants.map(x=>x.signature));
 if(seqs.size>1)return result(false,'CONFLICTING_OBSERVED_INTENT_OUTCOMES');
 const g=applicants[0],n=g.evidence.length;
 if(n<minEpisodes)return result(false,'INSUFFICIENT_INDEPENDENT_CONTEXTS',
  {observed:n,required:minEpisodes});
 const indices=tokens.flatMap((t,i)=>t===g.sourceToken?[i]:[]);
 if(indices.length!==1)return result(false,'AMBIGUOUS_SOURCE_TOKEN_POSITIONS');
 return result(true,null,{
  source,initialTokens:tokens,
  goal:{slots:{[indices[0]]:g.terminalToken}},
  goalWasLearnedBeforeRequest:true,
  destinationTokenAbsentFromInstruction:!tokenizeWorld(instruction).includes(g.terminalToken),
  originalObservedIntentKey:intent,
  supportedSequence:g.sequence,
  sourceToken:g.sourceToken,terminalToken:g.terminalToken,
  sourceCoordinate:indices[0],
  sourceTrainingEpisodes:g.evidence.map(x=>({episodeId:x.episodeId,
    sourceIndex:x.sourceIndex,witnessedSteps:x.witnessedSteps})),
  independentContexts:n,
  freeTextSemanticsNotProven:true,
  hypothesisAboutUnseenContexts:true
 });
}

export function inspectInstructionGoals(model){
 if(!(model instanceof LearnedCognitiveMap))throw Error('Original map required');
 return [...model.instructionGoalMemory.entries()].map(([intent,groups])=>({
  intent,groups:groups.map(g=>({from:g.sourceToken,to:g.terminalToken,
   sequence:g.sequence,independentEpisodes:g.evidence.length,
   actualObservedEpisodeIds:g.evidence.map(e=>e.episodeId)}))
 }));
}
