/**
 * A live graph view assembled ONLY from a committed corpus row and the
 * post-update V18 observed topology. Character edges come from corpus
 * observations; pre-row predictions are read from previous memory.
 * NOT a free-running autonomous actor, a hidden-answer oracle, or a demo.
 */
export function committedTrainingMaze(event){
 if(event?.kind!=="TRAINING_QA_COMMITTED"||
  typeof event.observedAnswer!=="string"||
  !event.after?.graph||!Array.isArray(event.after.graph.nodes)||
  !Array.isArray(event.after.graph.edges))
  throw Error("Committed Q/A and observed graph are required for live navigation");
 const source=event.after.graph;
 const graph={...source,nodes:source.nodes.map(v=>({...v})),edges:source.edges.map(e=>({...e}))};
 const adjacency=new Map();
 for(const edge of graph.edges){
  const row=adjacency.get(edge.from)||[];
  row.push(edge);adjacency.set(edge.from,row);
 }
 // Locate a character sequence through OBSERVED edges. Never substitute a
 // planner-generated path for the ground-truth training experience.
 function follow(chars,extend=false){
  const nodes=[0];let pos=0,truncated=false;
  for(const c of chars){
   let edge=adjacency.get(pos)?.find(e=>e.character===c);
   if(!edge){
    if(!extend){truncated=true;break;}
    const to=graph.nodes.length;
    graph.nodes.push({id:to,kind:0,lastCharacter:c,potential:null,
      successorOccupancy:null,source:"actual_completed_corpus_character"});
    edge={from:pos,to,character:c,observedSupport:1,
      source:"actual_completed_corpus_character"};
    graph.edges.push(edge);
    const row=adjacency.get(pos)||[];row.push(edge);adjacency.set(pos,row);
   }
   pos=edge.to;nodes.push(pos);
  }
  return {nodes,truncated};
 }
 const observedChars=[...event.observedAnswer];
 const observed=follow(observedChars,true);
 const expected=typeof event.before?.before==="string"?[...event.before.before]:[];
 const predicted=expected.length?follow(expected,false):null;
 const afterPrediction=typeof event.after.output==="string"?
   follow([...event.after.output].slice(0,2048),false):null;
 // Preserve the PRE-COMMIT original proposal (if it exists) as the gold line.
 // Post-commit proposed path is a separate distinct after-learning shape.
 const trace=[];
 for(let i=1;i<observed.nodes.length;i++){
  const from=observed.nodes[i-1],to=observed.nodes[i],
    before=graph.nodes[from]||{},after=graph.nodes[to]||{};
  trace.push({step:i,source:from,target:to,character:observedChars[i-1],
    predictedCharacter:expected[i-1]??null,
    agreesWithGlobal:expected[i-1]===observedChars[i-1],
    localChoices:(adjacency.get(from)||[]).length,
    transformation:"actual_corpus_character_observation",
    potentialBefore:before.potential??null,potentialAfter:after.potential??null,
    successorBefore:before.successorOccupancy??null,
    successorAfter:after.successorOccupancy??null,
    prefix:observedChars.slice(Math.max(0,i-160),i).join("")});
 }
 const correct=trace.reduce((a,t)=>a+(t.agreesWithGlobal?1:0),0);
 const prefixLength=Math.min(trace.length,expected.length);
 const metrics={
  beforeHadPrediction:!!predicted,
  beforeAbstained:event.before?.abstained??true,
  preAnswerCharacters:expected.length,observedCharacters:observedChars.length,
  originalAnswerLength:event.fullAnswerChars,
  predictionMatchesInObservedPrefix:correct,
  comparablePositions:prefixLength,
  beforePredictionCharacterRate:prefixLength?correct/prefixLength:null,
  observedPreviewTruncated:!!event.answerPreviewTruncated,
  observedBranches:new Set(graph.edges.map(e=>e.from).filter(id=>
   (adjacency.get(id)||[]).length>1)).size,
  trainedRows:event.trainingMemory?.rowsObserved??null,
  successorUpdates:event.trainingMemory?.successorTraining?.updates??null
 };
 return {graph,trace,observedNodes:observed.nodes,
   preNodes:predicted&&!predicted.truncated?predicted.nodes:[],
   postNodes:afterPrediction&&!afterPrediction.truncated?afterPrediction.nodes:[],
   metrics,provenance:"ACTUAL_COMMITTED_TRAINING_ROW_AND_PREVIOUS_LANGUAGE_WORLD",
   since:event.seq,brainChars:event.brainChars,at:event.at,prompt:event.prompt,
   source:event.where};
}
