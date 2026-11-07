// V30 — learn WHICH coordinates the QUESTION asks the same native Brain to
// change, from REAL separate user-question / answer outcomes. No answer is
// accepted as an input, no multiplication rule, question keyword classifier,
// teacher-forced goal, language model, BFS or new route optimizer exists here.
//
// This reduces the last manual numeric-goal input from the previously proven
// PR34 state-dependent world: question-only => witnessed input coordinate
// correspondence => previously witnessed world action physics => ORIGINAL
// Discoverer.shapeGraph() => entire heldout sentence before any action.
//
// Hypothesis class: fixed short numeric question grammar whose input numbers
// are carried consistently to independent numeric slots of witnessed answers.
// This is NOT unrestricted natural-language goal inference.
import {tokenizeObservation} from
 "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const integer=s=>/^\d+$/u.test(s)&&Number.isSafeInteger(Number(s));
const signature=t=>JSON.stringify(t.map(x=>integer(x)?"#":x));
const stable=t=>JSON.stringify(t);
const numerical=t=>t.flatMap((x,i)=>integer(x)?[i]:[]);
const varied=(rows,index)=>new Set(rows.map(r=>r.q[index])).size>=2;
function independentlyVaried(rows,variablePositions){
 return variablePositions.every(target=>rows.some((a,i)=>rows.some((b,j)=>{
  if(i>=j||a.q[target]===b.q[target])return false;
  return variablePositions.every(other=>
   other===target||a.q[other]===b.q[other]);
 })));
}
export function inferNativeTaskGoalFromObservedQA(brain,question){
 const q=tokenizeObservation(question),state=brain.qaRoleEvidence;
 const refusal=(reason,extra={})=>({found:false,reason,referenceAnswerProvided:false,
  goalLearnedFromQuestion:false,goalDependentAnswerSupplied:false,
  originalPlanner:"Discoverer.shapeGraph",...extra});
 if(!state||!Array.isArray(state.examples)||!q.length||q.length>128)
  return refusal("NO_WITNESSED_QA_GOAL_EXAMPLES");
 if(state.conflicts?.includes(stable(q)))
  return refusal("CONTRADICTORY_QUESTION_OUTCOME");
 if(state.examples.some(r=>stable(r.q)===stable(q)))
  return refusal("QUESTION_WAS_ALREADY_SEEN_NOT_TRUE_HELDOUT");
 const targetTemplate=signature(q),qVar=numerical(q);
 if(!qVar.length||qVar.length>8||q.some(x=>!integer(x)&&x==="#"))
  return refusal("QUESTION_HAS_NO_LEARNABLE_NUMERIC_VARIABLES");
 const candidates=state.examples.filter(r=>
  signature(r.q)===targetTemplate&&r.q.length===q.length);
 if(candidates.length<4)
  return refusal("INSUFFICIENT_REPEATED_QUESTION_CONTEXTS",{
   actualWitnessedQAPairs:candidates.length});
 if(candidates.some(r=>state.conflicts?.includes(stable(r.q))))
  return refusal("CONTRADICTORY_WITNESSED_QUESTION_GRAMMAR");
 if(!independentlyVaried(candidates,qVar))
  return refusal("INDEPENDENT_QUESTION_AXES_NOT_OBSERVED");
 const answerGrammars=new Map();
 for(const row of candidates){
  const name=signature(row.a),arr=answerGrammars.get(name)||[];
  arr.push(row);answerGrammars.set(name,arr);
 }
 // If equivalent question experiences have divergent answer structures,
 // there is no uniquely grounded goal state space to navigate.
 if(answerGrammars.size!==1)
  return refusal("MULTIPLE_INCOMPATIBLE_ANSWER_GRAMMARS",
   {alternatives:answerGrammars.size});
 const rows=[...answerGrammars.values()][0],answerPositions=numerical(rows[0].a);
 const mapped=[],seen=new Set();
 for(const qi of qVar){
  const options=answerPositions.filter(ai=>!seen.has(ai)&&
   rows.every(row=>row.q[qi]===row.a[ai])&&varied(rows,qi));
  if(options.length!==1)
   return refusal("QUESTION_TO_WORLD_COORDINATE_MAPPING_AMBIGUOUS",{
    questionIndex:qi,possibilities:options.length});
  const ai=options[0];seen.add(ai);
  mapped.push({questionIndex:qi,answerIndex:ai,
   observedDistinctValues:new Set(rows.map(row=>row.q[qi])).size});
 }
 if(!mapped.length||mapped.length===answerPositions.length)
  return refusal("NO_UNCONSTRAINED_DEPENDENT_OUTPUT_REMAINS");
 // Choose a previously observed answer-state near the requested INPUT
 // coordinates only. No dependent answer value from the heldout task exists.
 const score=row=>mapped.reduce((sum,m)=>sum+
  Math.abs(Number(row.a[m.answerIndex])-Number(q[m.questionIndex])),0);
 const chosen=rows.slice().sort((a,b)=>score(a)-score(b))[0];
 return {found:true,referenceAnswerProvided:false,
  goalLearnedFromQuestion:true,goalDependentAnswerSupplied:false,
  originalPlanner:"Discoverer.shapeGraph",
  sourceWitnessedQuestionAnswerExamples:rows.length,
  sourceObservedAnswer:chosen.answer,
  questionTemplate:targetTemplate,
  learnedQuestionNumericAxes:mapped,
  numericGoals:mapped.map(m=>({
   index:m.answerIndex,value:Number(q[m.questionIndex])
  })),
  dependentAnswerGoalExplicitlyUnknown:true,
  questionWasUnseen:true,
  hypothesisScope:"repeated numeric question-and-output formats observed across independent past exercises"};
}
export function planNativeQuestionOnCumulativeMemory(graph,{question,
 maxGraphNodes=5000,maxExpansionDepth=18,includeTopology=false}={}){
 const inferred=inferNativeTaskGoalFromObservedQA(graph.brain,question);
 const fail=(reason,extra={})=>({found:false,reason,
  originalPlanner:"Discoverer.shapeGraph",referenceAnswerProvided:false,
  goalLearnedFromQuestion:false,goalDependentAnswerSupplied:false,
  plannedBeforeFirstAction:true,...extra});
 if(!inferred.found)return fail(inferred.reason,{
  witnessedInputContexts:inferred.actualWitnessedQAPairs??null});
 const prediction=graph.planNumeric({
  start:inferred.sourceObservedAnswer,
  numericGoals:inferred.numericGoals,
  maxGraphNodes,maxExpansionDepth,includeTopology
 });
 if(!prediction.found)return fail(prediction.reason,{
  goalLearnedFromQuestion:true,
  numericRuleEvidenceMissing:prediction.learnedOperatorObservations??null,
  sourceWitnessedQuestionAnswerExamples:inferred.sourceWitnessedQuestionAnswerExamples
 });
 return {...prediction,question,
  goalLearnedFromQuestion:true,
  goalDependentAnswerSupplied:false,
  referenceAnswerProvided:false,
  sourceWitnessedQuestionAnswerExamples:inferred.sourceWitnessedQuestionAnswerExamples,
  learnedQuestionNumericAxes:inferred.learnedQuestionNumericAxes,
  taskGoalProvenance:"prior observed independent Q/A numeric role variation, no target output",
  predictedByOriginalDiscoverer:true,
  genericOpenThoughtsSemanticAnswersProven:false
 };
}
