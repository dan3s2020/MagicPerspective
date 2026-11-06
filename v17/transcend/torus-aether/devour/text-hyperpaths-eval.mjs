// Frozen PRE-ANSWER text-world evaluation on ACTUALLY learned Q/A transitions.
// Unlike the original AligningGraph character continuation, this evaluates
// explicit paths through observed text states and learned action effects.
// The held-out answer is not passed to EITHER planning method.
import {matchScore} from '../../../../isolated/noise-space/text_action_paths.mjs';

const ascii = bytes => String.fromCharCode(...bytes);
export function questionAndAnswer(bytes) {
  if(!Array.isArray(bytes)||bytes.some(x=>!Number.isInteger(x)||x<0||x>255)) return null;
  const text=ascii(bytes);
  const marker=/(?:^|\n)\s*(?:A|Assistant)\s*:\s*/im.exec(text);
  if(!marker) return null;
  const q=text.slice(0,marker.index).replace(/^\s*(?:Q|User)\s*:\s*/im,'').trim();
  const answer=text.slice(marker.index+marker[0].length).trim();
  return q && answer ? {question:q,answer} : null;
}
function charPositionMatch(output,reference) {
  const n=reference.length;let hits=0;
  for(let i=0;i<Math.min(output.length,n);i++)hits+=Number(output[i]===reference[i]);
  return n ? hits/n : null;
}
const stateOf=(paths,causal)=>({
  corpusRows:paths.rows,
  observedWordTransitions:paths.wordSteps,
  learnedCausalEpisodes:causal.episodes,
  actualInterventions:causal.interventions,
  learnedActionOutcomes:causal.dynamics.observations,
  learnedValueUpdates:causal.value.updates,
  learnedGoalUpdates:causal.latent.updates,
  vocabulary:paths.vocab.length
});
export function frozenTextRoutes(bytesList,{paths,causal,maxSteps=48,beamWidth=4}={}){
  if(!paths||!causal) return {enabled:false,reason:'No observed text action world is saved'};
  const trainBefore=stateOf(paths,causal);
  const canPlan=paths.rows>0&&paths.wordSteps>0&&causal.episodes>0&&causal.dynamics.observations>0;
  if(!canPlan)return {enabled:false,reason:'Text action world has not learned actual question/answer transitions',
    training:trainBefore};
  const rows=[];
  for(const bytes of bytesList){
    const qa=questionAndAnswer(bytes);
    if(!qa){rows.push({enabled:false,reason:'No Q:/A: boundary in unseen exercise'});continue;}
    const {question,answer}=qa;
    // CORRECT ORDER: infer BOTH routes from the QUESTION alone, then inspect
    // held-out reference. This is the exact information boundary the maze
    // first-path test uses. No teacher action or ideal route is supplied.
    const lexical=paths.plan(question,{maxSteps,beamWidth});
    const acted=causal.navigate(question,paths,{steps:maxSteps});
    const observed=stateOf(paths,causal);
    if(JSON.stringify(observed)!==JSON.stringify(trainBefore))
      throw Error('A frozen text-path evaluation changed learned states');
    // Only now that the routes exist may we score against the answer.
    const lexicalAccuracy=matchScore(lexical.output,answer);
    const actedAccuracy=matchScore(acted.generated,answer);
    rows.push({
      enabled:true,goalVisibleBeforeAnswer:false,
      question,referenceLength:answer.length,
      predictedBeforeAnswer:lexical.output,
      actionBasedPrediction:acted.generated,
      routeLength:lexical.actions.length,
      candidateActionsExpanded:lexical.expanded,
      learnedTransitionSteps:lexical.actions.filter(a=>a.observedTransitions>0).length,
      path:lexical.actions,
      worldActions:acted.events.map(e=>({
        before:e.before,action:e.action,after:e.after,predicted:e.predicted,
        confidence:e.confidence,fieldDelta:e.fieldDelta,effect:e.effect
      })),
      learnedGoalDimension:acted.goalLatent.length,
      plannedWordF1:lexicalAccuracy.f1,
      actedWordF1:actedAccuracy.f1,
      plannedCharacterPositionAccuracy:charPositionMatch(lexical.output,answer),
      actedCharacterPositionAccuracy:charPositionMatch(acted.generated,answer),
      referenceUsedAfterPrediction:true
    });
  }
  const after=stateOf(paths,causal);
  if(JSON.stringify(after)!==JSON.stringify(trainBefore))
    throw Error('Frozen route evaluation modified training');
  const usable=rows.filter(x=>x.enabled);
  return {enabled:true,training:trainBefore,exercises:rows,
    evaluated:usable.length,
    averageWordF1:usable.length?usable.reduce((n,x)=>n+x.plannedWordF1,0)/usable.length:null,
    averageActionWordF1:usable.length?usable.reduce((n,x)=>n+x.actedWordF1,0)/usable.length:null,
    averageCharacterPositionAccuracy:usable.length?usable.reduce((n,x)=>n+x.plannedCharacterPositionAccuracy,0)/usable.length:null,
    distinction:'This is real learned text-state path inference from the QUESTION. It is not the AligningGraph teacher-forced next-character alignment. Neither path score proves semantic comprehension.'};
}
