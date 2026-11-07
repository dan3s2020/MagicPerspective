// V37 pure POSTHOC actual natural-language QA forensic audit.
// Does NOT receive reference text until AFTER original native Brain returns a
// fully frozen preaction plan with the COMPLETE observed-source graph.
// This code does not train, rank, edit, solve or adjust the original model.
const norm=x=>String(x).toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu," ")
  .replace(/\b(a|an|the)\b/gu," ")
  .replace(/\s+/gu," ").trim();
export function auditFrozenRealEvidencePath(plan,source,{answers,questionId=null}={}){
 if(!plan?.found||plan.originalMotor!=="Discoverer.shapeGraph"||
  !plan.atlas?.completeRetainedSourceCandidates||!Array.isArray(plan.atlas.nodes))
  throw Error("Frozen complete native original source atlas required BEFORE posthoc labels");
 if(typeof source!=="string"||!Array.isArray(answers)||!answers.length||
  answers.some(a=>typeof a!=="string"||!a))
  throw Error("Need independent human source reference answers, POST-FREEZE only");
 const n=plan.atlas.nodes.filter(x=>x.type==="observed-source-span");
 if(!n.length)throw Error("No physical source spans in frozen atlas");
 if(source.slice(plan.extraction.start,plan.extraction.end)!==plan.predicted)
  throw Error("Frozen prediction is not from original source context");
 const gold=new Set(answers),normalized=new Set(answers.map(norm));
 const predicted=plan.predicted;
 const exact=gold.has(predicted),normal=normalized.has(norm(predicted));
 const goldNodes=n.filter(x=>gold.has(x.text)),normalizedNodes=n.filter(x=>normalized.has(norm(x.text)));
 const foundOriginalText=answers.some(a=>source.includes(a));
 const bestGold=goldNodes.length?Math.max(...goldNodes.map(x=>x.weight)):-Infinity;
 const bestNormal=normalizedNodes.length?Math.max(...normalizedNodes.map(x=>x.weight)):-Infinity;
 const ranked=n.slice().sort((a,b)=>b.weight-a.weight || a.id-b.id);
 const firstGoldIndex=ranked.findIndex(x=>gold.has(x.text));
 const firstNormalizedIndex=ranked.findIndex(x=>normalized.has(norm(x.text)));
 const bestSelected=n.find(x=>x.id===plan.atlas.firstPathIds.at(-1));
 if(!bestSelected)throw Error("Original chosen source state missing from complete native atlas");
 const diagnosis=exact?"exact-answer":
  normal?"normalized-match":
  normalizedNodes.length?"eligible-correct-source-span-lost-the-ranking":
  foundOriginalText?"correct-answer-source-present-but-candidate-missing":
  "annotated-answer-absent-from-given-passage";
 return {
  questionId,
  status:diagnosis,
  exact,normalizedExact:normal,
  actualSourceContainsReference:foundOriginalText,
  completeGraphNodes:plan.atlas.nodes.length,
  completeGraphEdges:plan.atlas.edges.length,
  sourceCandidateSpans:n.length,
  anyExactCorrectGoalPresent:goldNodes.length>0,
  anyCanonicalCorrectGoalPresent:normalizedNodes.length>0,
  predictedNativePathLength:plan.initialShape.length,
  correctlySourcedPrediction:true,
  bestLearnedCorrectGoalScore:bestGold===-Infinity?null:bestGold,
  bestLearnedCanonicalGoalScore:bestNormal===-Infinity?null:bestNormal,
  chosenLearnedGoalScore:bestSelected.weight,
  correctRawGoalRankInGraph:firstGoldIndex<0?null:firstGoldIndex+1,
  correctCanonicalGoalRankInGraph:firstNormalizedIndex<0?null:firstNormalizedIndex+1,
  wronglyRankedSourceGoals:n.length-normalizedNodes.length,
  originalValueAtStart:plan.atlas.nodes[0].potential,
  originalFrozenPlanGraphIntact:true,
  posthocReferenceNeverPassedToPlanner:true
 };
}
