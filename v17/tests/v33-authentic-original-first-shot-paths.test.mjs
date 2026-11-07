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
 // Identical training source, identical answer prefix, identical train order;
 // the second model only additionally sees complete-versus-masked training
 // mazes to learn original cross-world path-ranking coefficients.
 for(const [i,row] of train.entries()){
  for(const b of [original,paired]){
   const r=b.learnConstructedText(row.question,row.answer.slice(0,trainCap));
   assert.equal(r.trained,true,"Native historical Brain failed to consume authentic row "+i);
  }
 }
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
 const copyBefore=[sourceSig(original),sourceSig(paired)];
 const results=[];
 for(const row of holdout){
  const item={rowIndex:row.rowIndex,
   questionPreview:row.question.slice(0,180),
   questionSHA256:hash(row.question),answerSHA256:hash(row.answer),
   referenceTotalCodepoints:Array.from(row.answer).length,
   answerPreviewAfterFrozenScoring:null,variants:{}};
  const predicted=new Map();
  for(const [label,b,beamWidth,fanOut] of [
   ["originalTextOnly",original,3,4],
   ["originalGreedySameWorld",original,1,1],
   ["originalWideBeamSameWorld",original,6,8],
   ["sameTextPlusMazePaired",paired,3,4]
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
   const m=(label.startsWith("original")?original:paired).constructedPaths;
   const scoring=computeScore(pred,gold);
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
 assert.deepEqual([sourceSig(original),sourceSig(paired)],copyBefore,
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
   sameTextPlusMazePaired:aggregate("sameTextPlusMazePaired")
  },
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
  examples:results.slice(0,4).map(x=>({
   index:x.rowIndex,question:x.questionPreview,
   reference:x.answerPreviewAfterFrozenScoring,
   original:x.variants.originalTextOnly,
   paired:x.variants.sameTextPlusMazePaired})),
  noAnswerLeakage:true,
  cannotClaimSemanticDiscovererShape:true
 }));
});
