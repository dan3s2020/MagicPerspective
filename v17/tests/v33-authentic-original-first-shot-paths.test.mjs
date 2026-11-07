// Authentic text FIRST-SHOT audit for historical original V17 ConstructedPathLearner.
// This recovers the original six-scale character-path producer from the SAME
// original Brain; it does NOT relabel character accuracy as semantic solution shape.
// Full HTTP official OpenThoughts3 source, strict QA split, no mock fallback.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {ConstructedPathLearner}
 from "../transcend/torus-aether/worlds/constructed-paths.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {qaPairsFromRealJSON} from "../research/text-hypermaze/openthoughts-jsonl-source.mjs";
const repo="open-thoughts/OpenThoughts3-1.2M";
const offsets=[0,210000,810000],rowsPer=20,holdoutStride=6;
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const cap=128,trainCap=1024;
const originalRules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function computeScore(prediction,gold){
 const P=Array.from(prediction),T=Array.from(gold).slice(0,cap);
 const positionMatches=T.reduce((n,c,i)=>n+Number(P[i]===c),0);
 let prefix=0;while(prefix<T.length&&P[prefix]===T[prefix])prefix++;
 return {charactersCompared:T.length,matchedAtSamePosition:positionMatches,
   positionalRate:positionMatches/Math.max(1,T.length),
   longestCorrectPrefix:prefix,predictionBytes:Buffer.byteLength(prediction),
   firstMismatch:prefix,firstWrongExpected:T[prefix]||null,
   firstWrongPredicted:P[prefix]||null,
   full128Exact:prefix===cap && P.length===cap,
   wholeAnswerExact:prediction===gold};
}
async function officialRows(offset,len){
 const url=new URL("https://datasets-server.huggingface.co/rows");
 for(const [k,v] of Object.entries({dataset:repo,config:"default",split:"train",
  offset:String(offset),length:String(len)}))url.searchParams.set(k,v);
 const response=await fetch(url,{headers:{"accept":"application/json",
  "user-agent":"MagicPerspective-V33-HistoricalPathFrozenAudit"},
  signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error("Official dataset HTTP "+response.status+" at "+offset+
  "; refusing fabricated fallback");
 const raw=await response.json();
 if(!Array.isArray(raw.rows)||raw.rows.length!==len)
  throw Error("Official dataset returned incomplete rows: "+offset);
 return raw.rows.map((r,i)=>{
  assert.equal(r.row_idx,offset+i);
  const parsed=qaPairsFromRealJSON(r.row);
  assert.equal(parsed.length,1);
  return {rowIndex:r.row_idx,question:parsed[0].question,
   answer:parsed[0].answer};
 });
}
test("ORIGINAL V17 first-shot six-scale path on REAL unseen OpenThoughts3: exact characters and where pathways break, equal-budget maze-transfer ablation",{
 timeout:420000
},async()=>{
 const data=(await Promise.all(offsets.map(off=>officialRows(off,rowsPer)))).flat();
 const sourceHash=hash(JSON.stringify(data.map(x=>[x.rowIndex,x.question,x.answer])));
 const train=data.filter((r,i)=>i%holdoutStride!==holdoutStride-1);
 const holdout=data.filter((r,i)=>i%holdoutStride===holdoutStride-1);
 assert.equal(data.length,60);
 assert.equal(train.length,50);
 assert.equal(holdout.length,10);
 const seen=new Set(train.map(x=>x.question));
 assert.ok(holdout.every(x=>!seen.has(x.question)));
 const goldenHashes=new Set(holdout.map(x=>hash(x.answer)));
 assert.ok(train.every(x=>!goldenHashes.has(hash(x.answer))));
 const original=new Brain({rules:originalRules,seed:11});
 const paired=new Brain({rules:originalRules,seed:11});
 const gateReleased=new Brain({rules:originalRules,seed:11});
 // Isolated controlled NEGATIVE ablation: release question-key gating on ALL
 // long-scale context edges. It deliberately removes source-world safeguards
 // and must never be mistaken for independently verified context bridges.
 // The same unmodified original V17 learner class still makes every decision.
 gateReleased.constructedPaths=new ConstructedPathLearner({seed:gateReleased.seed});
 const originalState=gateReleased.constructedPaths.textState;
 gateReleased.constructedPaths.textState=function(question,history,scale){
  return originalState.call(this,"all source worlds combined",history,scale);
 };
 // Identical training source, identical answer prefix, identical train order;
 // the second model only additionally sees complete-versus-masked training
 // mazes to learn original cross-world path-ranking coefficients.
 for(const [i,row] of train.entries()){
  for(const b of [original,paired,gateReleased]){
   const r=b.learnConstructedText(row.question,row.answer.slice(0,trainCap));
   assert.equal(r.trained,true,"Native historical Brain failed to consume authentic row "+i);
  }
 }
 const originalKeys=new Set(train.map(x=>
  ConstructedPathLearner.qkey(x.question)));
 const heldoutKeys=holdout.map(x=>ConstructedPathLearner.qkey(x.question));
 const absentQuestionAnchorCount=heldoutKeys.filter(k=>!originalKeys.has(k)).length;
 for(let i=0;i<8;i++)
  paired.trainConstructedMaze(makeMaze(seedOf(SEEDS.train,700+i),7),true);
 const firstAnswers=train.map(x=>x.answer);
 const sharedTrainPrefix=firstAnswers.slice(1).reduce((prefix,ans)=>{
  let i=0;while(i<prefix.length&&prefix[i]===ans[i])i++;return prefix.slice(0,i);
 },firstAnswers[0].slice(0,cap));
 const genericPrefixChars=Math.min(cap,Array.from(sharedTrainPrefix).length);
 const sourceSig=b=>JSON.stringify({
  rows:b.constructedPaths.textRows,chars:b.constructedPaths.textChars,
  states:b.constructedPaths.scales.map(x=>x.edges.size),
  observations:b.constructedPaths.scales.map(x=>x.observations)
 });
 assert.equal(sourceSig(original),sourceSig(paired),
  "Different factual text evidence must not confound maze transfer ablation");
 const copyBefore=[sourceSig(original),sourceSig(paired),sourceSig(gateReleased)];
 const results=[];
 for(const row of holdout){
  const qkey=ConstructedPathLearner.qkey(row.question);
  const item={rowIndex:row.rowIndex,questionSourceAnchor:qkey,
   questionSourceAnchorWasObserved:originalKeys.has(qkey),
   questionPreview:row.question.slice(0,180),
   questionSHA256:hash(row.question),answerSHA256:hash(row.answer),
   referenceTotalCodepoints:Array.from(row.answer).length,
   answerPreviewAfterFrozenScoring:null,variants:{}};
  const predicted=new Map();
  for(const [label,b,beamWidth,fanOut] of [
   ["originalTextOnly",original,3,4],
   ["originalGreedySameWorld",original,1,1],
   ["originalWideBeamSameWorld",original,6,8],
   ["sameTextPlusMazePaired",paired,3,4],
   ["allLongContextsUngatedResearchOnly",gateReleased,3,4]
  ]){
   const m=b.constructedPaths;
   // Important: at this exact point the answer string is NOT available to
   // the prediction API. It is referenced only in score() below.
   const f=m.imagineText(row.question,{maxChars:cap,beamWidth,
    fanOut,record:false});
   assert.equal(f.previewBeforeAnswer,true);
   assert.equal(f.referenceNotAvailable,true);
   const pred=f.predicted;
   predicted.set(label,pred);
   item.variants[label]={predictedFirstShot:pred.slice(0,180),
    rawPredictionUTF8Bytes:Buffer.byteLength(pred),
    pathActions:f.path.length,finishedEOS:f.finished,
    expandedNodes:f.expanded,learnedGraphStates:f.graphStates,
    generatedBeforeReference:true,
    heldoutReferenceNotSeenInTraining:true};
  }
  // All heldout reference inspection happens AFTER both plans are frozen.
  const gold=row.answer;
  item.answerPreviewAfterFrozenScoring=gold.slice(0,160);
  for(const [label,pred] of predicted){
   const m=(label.startsWith("original")?original:
      label==="allLongContextsUngatedResearchOnly"?gateReleased:paired).constructedPaths;
   const pretrainedContextEdgesAtAnswerStart=m.byScale.map((scale,k)=>
    m.scales[k].choices(m.textState(row.question,"",scale))
      .reduce((n,r)=>n+r.total,0));
   const pretrainedContextEdgesAtFirstKnownThink=m.byScale.map((scale,k)=>
    m.scales[k].choices(m.textState(row.question,"<think> ",scale))
      .reduce((n,r)=>n+r.total,0));
   const scoring=computeScore(pred,gold);
   scoring.scaleWitnessesAtAnswerStart=pretrainedContextEdgesAtAnswerStart;
   scoring.scaleWitnessesAtPrefix=pretrainedContextEdgesAtFirstKnownThink;
   scoring.longScaleContextAbsentAtQuestionStart=
    pretrainedContextEdgesAtAnswerStart.slice(3).every(n=>n===0);
   scoring.longScaleContextAbsentAtPrefix=
    pretrainedContextEdgesAtFirstKnownThink.slice(3).every(n=>n===0);
   const predictedChars=Array.from(pred),truthChars=Array.from(gold);
   const postPrefixMatch=truthChars.slice(genericPrefixChars,cap)
    .reduce((n,c,i)=>n+Number(predictedChars[genericPrefixChars+i]===c),0);
   scoring.genericPrefixCharactersDiscarded=genericPrefixChars;
   scoring.postTrainingTemplateMatch=postPrefixMatch;
   scoring.postTrainingTemplateCompared=Math.max(1,cap-genericPrefixChars);
   scoring.postTrainingTemplateAccuracy=postPrefixMatch/
    Math.max(1,cap-genericPrefixChars);
   const expectedFirst=scoring.firstWrongExpected;
   const branch=m.nextCharacters(row.question,
    pred.slice(0,scoring.firstMismatch),24);
   const matchingCandidate=branch.find(x=>x.character===
    expectedFirst?.charCodeAt(0));
   const totalCandidates=branch.length;
   item.variants[label]={...item.variants[label],...scoring,
    firstWrongCandidateObservedAtActualPredictedPrefix:!!matchingCandidate,
    firstWrongCandidateRank:matchingCandidate?branch.indexOf(matchingCandidate)+1:null,
    alternativeCountAtMismatch:totalCandidates,
    blocker:scoring.firstMismatch===cap?
      "FIRST_128_CHARACTERS_CORRECT":
      !matchingCandidate?
        "CORRECT_CHARACTER_TRANSITION_NOT_OBSERVED_AT_PREDICTED_PREFIX":
        "CORRECT_EDGE_PRESENT_BUT_ORIGINAL_RANKER_CHOSE_OTHER_EDGE",
    currentPrefixWasPredictedNotGold:true};
  }
  results.push(item);
 }
 assert.deepEqual([sourceSig(original),sourceSig(paired),sourceSig(gateReleased)],
  copyBefore,
  "Heldout generation must be entirely frozen: no training on secret answers");
 const aggregate=key=>{
  const variants=results.map(x=>x.variants[key]);
  const count=variants.reduce((n,x)=>n+x.matchedAtSamePosition,0);
  const denom=variants.reduce((n,x)=>n+x.charactersCompared,0);
  const reasonCounts={};
  const postTemplateCorrect=variants.reduce((n,x)=>n+x.postTrainingTemplateMatch,0);
  const postTemplateTotal=variants.reduce((n,x)=>n+x.postTrainingTemplateCompared,0);
  for(const r of variants)reasonCounts[r.blocker]=(reasonCounts[r.blocker]||0)+1;
  return {answerWholeExact:variants.filter(x=>x.wholeAnswerExact).length,
   uniqueFrozenAnswers:new Set(variants.map(x=>x.predictedFirstShot)).size,
   postTrainingTemplatePositionalAccuracy:postTemplateCorrect/postTemplateTotal,
   postTrainingTemplateCorrect:postTemplateCorrect,
   postTrainingTemplateCompared:postTemplateTotal,
   first128Correct:variants.filter(x=>x.full128Exact).length,
   first128MatchedCharacters:count,comparedCharacters:denom,
   first128PositionalAccuracy:count/denom,
   firstCharacterCorrect:variants.filter(x=>x.longestCorrectPrefix>0).length,
   meanLongestCorrectPrefix:variants.reduce((n,x)=>n+x.longestCorrectPrefix,0)/variants.length,
   meanModelPredictedChars:variants.reduce((n,x)=>n+Array.from(x.predictedFirstShot).length,0)/variants.length,
   blockers:reasonCounts};
 };
 // Independently held-out SECOND SOURCE WINDOW, never involved in
 // choosing the question-gating hypothesis above. Same pretrained native
 // models, no more training, no reference answers in generation.
 const independentOffsets=[420000,960000],independentCountPerOffset=10;
 const independent=(await Promise.all(independentOffsets.map(offset=>
  officialRows(offset,independentCountPerOffset)))).flat();
 assert.equal(independent.length,20);
 const allPriorQuestions=new Set(data.map(x=>x.question));
 assert.ok(independent.every(x=>!allPriorQuestions.has(x.question)),
  "Independent future questions must be entirely disjoint from training AND exploratory data");
 const independentPredictions=[];
 for(const row of independent){
  const attempts=[];
  for(const [name,b] of [
   ["originalRestrictiveLongQuestionGate",original],
   ["originalSameWeightsGlobalLongGateReleased",gateReleased]
  ]){
   const m=b.constructedPaths;
   // Full 128-step frozen prediction: GOLD is NOT passed into model.
   const prediction=m.imagineText(row.question,{maxChars:cap,
    beamWidth:3,fanOut:4,record:false});
   assert.equal(prediction.referenceNotAvailable,true);
   const longSourceAtStart=m.byScale.slice(3).map((scale,i)=>
    m.scales[i+3].choices(m.textState(row.question,"",scale))
      .reduce((acc,x)=>acc+x.total,0));
   const longSourceAtPrefix=m.byScale.slice(3).map((scale,i)=>
    m.scales[i+3].choices(m.textState(row.question,"<think> ",scale))
      .reduce((acc,x)=>acc+x.total,0));
   // Record the COMPLETE 128-action first-shot path including every
   // alternative branch considered by ORIGINAL V17 at each position.
   // No heldout truth is consulted to build any of these candidates.
   attempts.push({name,prediction:prediction.predicted,
    frozenFullActionSequence:prediction.path.map(st=>({
     position:st.position,chosenActionCode:st.action,
     chosenCharacter:st.action===256?"<END>":String.fromCharCode(st.action),
     scaleEvidence:st.scaleEvidence,alternatives:st.alternatives.map(a=>({
      actionCode:a.character,
      character:a.character===256?"<END>":String.fromCharCode(a.character),
      originalLearnedWeight:a.weight,originalPathPolicyScore:a.transferableScore
     }))
    })),
    longSourceAtStart,longSourceAtPrefix});
  }
  const expected=Array.from(row.answer);
  const scored=attempts.map(a=>{
   const P=Array.from(a.prediction),T=expected.slice(0,cap);
   const positionCorrect=T.filter((c,i)=>P[i]===c).length;
   const postTemplateCorrect=T.slice(genericPrefixChars)
    .filter((c,i)=>P[genericPrefixChars+i]===c).length;
   let prefix=0;while(prefix<T.length&&P[prefix]===T[prefix])prefix++;
   const fullPathDiagnostics=a.frozenFullActionSequence.map((st,i)=>{
    const gold=T[i]??null;
    const option=st.alternatives.find(x=>x.character===gold);
    return {...st,
     referenceCharacterOnlyAfterFrozenPrediction:gold,
     chosenMatchesReference:gold===st.chosenCharacter,
     correctCharAlreadyInOriginalAlternatives:!!option,
     referenceRankAmongPreviouslyConsideredAlternatives:option?
      st.alternatives.indexOf(option)+1:null,
     pathBlockedAtPosition:gold===st.chosenCharacter?null:
      option?"RANKING_OR_GLOBAL_SEARCH_CHOSE_WRONG_KNOWN_EDGE":
       "NEEDED_CHARACTER_NOT_IN_ORIGINAL_TOP_FOUR_AVAILABLE_EDGES",
     referenceNotUsedForPlanning:true
    };
   });
   return {...a,
    fullFrozenActionTraceAndAfterOnlyComparison:fullPathDiagnostics,
    positionCorrect,postTemplateCorrect,longestCorrectPrefix:prefix,
    answerWholeExact:a.prediction===row.answer,
    terminalShapeExactFirst128:prefix===cap,
    predictedPreview:a.prediction.slice(0,145)};
  });
  independentPredictions.push({offset:row.rowIndex,
   questionSHA256:hash(row.question),referenceSHA256:hash(row.answer),
   questionAnchorSeenInTrain:originalKeys.has(
    ConstructedPathLearner.qkey(row.question)),
   referencePreviewAfterFrozenPrediction:row.answer.slice(0,90),
   variants:scored});
 }
 assert.deepEqual([sourceSig(original),sourceSig(paired),sourceSig(gateReleased)],
  copyBefore,"Independent 20 unseen answers cannot enter any native Brain memory");
 const secondMetric=(variantIndex)=>{
  const v=independentPredictions.map(x=>x.variants[variantIndex]);
  const uniq=new Set(v.map(x=>x.prediction));
  const accurate=v.reduce((n,x)=>n+x.positionCorrect,0);
  const afterBoilerplate=v.reduce((n,x)=>n+x.postTemplateCorrect,0);
  return {testQuestions:v.length,uniqueFirstShotOutputs:uniq.size,
   fullAnswersCorrect:v.filter(x=>x.answerWholeExact).length,
   all128CharactersCorrect:v.filter(x=>x.terminalShapeExactFirst128).length,
   first128MatchedPositions:accurate,first128TotalPositions:v.length*cap,
   first128PositionAccuracy:accurate/(v.length*cap),
   noGenericPrefixMatched:afterBoilerplate,
   noGenericPrefixCompared:v.length*(cap-genericPrefixChars),
   noGenericPrefixAccuracy:afterBoilerplate/
    (v.length*(cap-genericPrefixChars)),
   firstWrongAfterMeanPrefix:v.reduce((n,x)=>n+x.longestCorrectPrefix,0)/v.length,
   unseenQuestionCountWithLongScaleStartEvidence:v.filter(x=>
    x.longSourceAtStart.some(n=>n>0)).length,
   unseenQuestionCountWithLongScalePrefixEvidence:v.filter(x=>
    x.longSourceAtPrefix.some(n=>n>0)).length};
 };
 const independentResults={
  source:"OFFICIAL authentic OpenThoughts3, strictly new offset windows, training source unchanged",
  offsets:independentOffsets,rowsPerOffset:independentCountPerOffset,
  sha256:hash(JSON.stringify(independent.map(x=>[x.rowIndex,x.question,x.answer]))),
  disjointTrainingAndExploration:true,
  original:secondMetric(0),
  allLongContextsUnconditionallyUngated:secondMetric(1),
  summary:"Causal effect of removing original Question QKey barrier on real heldout characters; does NOT establish semantic state or correct full answers",
  samples:independentPredictions
 };
 const report={version:"V33-original-constructed-multiscale-authentic-text",
  exactSource:"Official open-thoughts/OpenThoughts3-1.2M Dataset Viewer /rows",
  sourceOffsets:offsets,rowsPerSourceWindow:rowsPer,
  sourceSHA256:sourceHash,
  trainedRealQAPairs:train.length,fullyUnknownQuestions:holdout.length,
  trainingAnswerPrefixCodeUnits:trainCap,preactionPredictedCodepoints:cap,
  model:"Original V17 ConstructedPathLearner in original Brain",
  baselineNoNewTextPredictor:true,
  compareToNativeSemanticOriginalV29:"0/4 full answers on 4 heldout authentic questions",
  graphMethod:"6 original next-character context scales, not original semantic goal attraction",
  sharedTrainingOnlyTemplatePrefix:sharedTrainPrefix,
  genericPrefixCharactersDiscarded:genericPrefixChars,
  results:{
   originalTextOnly:aggregate("originalTextOnly"),
   originalGreedySameWorld:aggregate("originalGreedySameWorld"),
   originalWideBeamSameWorld:aggregate("originalWideBeamSameWorld"),
   sameTextPlusMazePaired:aggregate("sameTextPlusMazePaired"),
   allLongContextsUngatedResearchOnly:aggregate("allLongContextsUngatedResearchOnly")
  },
  sourceQuestionKeyEvidence:{
   trainedDistinctQuestionContextKeys:originalKeys.size,
   heldoutMissingExactQuestionAnchors:absentQuestionAnchorCount,
   heldoutCount:holdout.length,
   originalLongScaleRequiresExactQuestionWordSignature:true,
   researchOnlyUngatedLongScalesTreatAllQuestionsAsSameWorld:true,
   evenIfUngatingImprovesCharacterMetricsItIsNotEvidenceOfCausalSemanticEquivalence:true
  },
  independentNewSourceWindow:independentResults,
  independentWorldAblation:{
   identicalRealTextObservations:true,
   extraPairedOriginalTrainingMazes:8,
   sameBrainClass:true,
   originalTextRows:original.constructedPaths.textRows,
   mazeTrainedPathPolicyUpdates:paired.constructedPaths.pathPolicyUpdates,
   warning:"Any difference in short-position character accuracy is NOT causal proof of high-dimensional semantic goal paths"
  },
  perHeldoutQuestion:results,
  evidenceOfClosedLoopSemanticAnswer:false,
  noGoldInPlanning:true,heldoutQuestionHashesStoredNoTraining:true};
 const file=process.env.V33_AUTHENTIC_PATH_FORENSICS_FILE;
 if(file){fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(report,null,2)+"\n");}
 console.log("V33_HISTORICAL_ACTUAL_FIRST_SHOT_CHARACTER_PATHS",JSON.stringify({
  sha256:sourceHash,realTrain:train.length,unseen:holdout.length,
  originalTextOnly:report.results.originalTextOnly,
  sameTextPlusMazePaired:report.results.sameTextPlusMazePaired,
  originalGreedySameWorld:report.results.originalGreedySameWorld,
  originalWideBeamSameWorld:report.results.originalWideBeamSameWorld,
  sourceOnlySharedTrainingPrefix:sharedTrainPrefix,
  previouslyBlockedExactQuestionAnchors:absentQuestionAnchorCount,
  researchOnlyAllLongContextsUngated:report.results.allLongContextsUngatedResearchOnly,
  independentFutureSourceWindow:{
   offsets:independentOffsets,
   sha256:independentResults.sha256,
   original:independentResults.original,
   ungated:independentResults.allLongContextsUnconditionallyUngated,
   answerReferenceNotSeenBeforeAnyPrediction:true
  },
  examples:results.slice(0,4).map(x=>({
   index:x.rowIndex,question:x.questionPreview,
   reference:x.answerPreviewAfterFrozenScoring,
   original:x.variants.originalTextOnly,
   paired:x.variants.sameTextPlusMazePaired})),
  noAnswerLeakage:true,
  cannotClaimSemanticDiscovererShape:true
 }));
});
