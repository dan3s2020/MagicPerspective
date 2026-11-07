import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {CharacterHypermaze} from "../transcend/torus-aether/worlds/character-hypermaze.mjs";
import {explainOriginalV17AnswerShape} from "../transcend/torus-aether/worlds/original-v17-answer-forensics.mjs";

const fixedAtlas=()=>{
 const words=new LearnedCognitiveMap(),atlas=new CharacterHypermaze(),events=[];
 atlas.atlasSink=e=>events.push(e);
 words.onAtlasEvidence=e=>atlas.observeWordContrast(e);
 for(const [i,text] of [
  "cat flies.","cot flies.","bat glows.","bot glows.",
  "cot sings.","cut sings.","bot rests.","but rests."
 ].entries())words.observeWorld(text,{id:i+1});
 return {atlas,events};
};
test("NO ORACLE first-try claim: original predicted 'mat' != actual 'mut', post-hoc char atlas exposes missing a->o->u path but original shape stays 66.7%",()=>{
 const {atlas,events}=fixedAtlas();
 const sample={a0:3,shape:"mat",shapeSame:2/3,
  rows:[[81,81],[10,10],[58,58],...[...("mut")].map(c=>[c.charCodeAt(0),0])]};
 const before=JSON.stringify(atlas.export());
 const forensic=explainOriginalV17AnswerShape(sample,atlas,{maxExplained:40});
 assert.equal(forensic.valid,true);
 assert.equal(forensic.originalScore,2/3);
 assert.equal(forensic.originalWholeAnswerExactlyCorrect,false);
 assert.equal(forensic.correctOriginalPositions,2);
 assert.equal(forensic.incorrectOriginalPositions,1);
 assert.equal(forensic.totalAllMismatchedPositions,1);
 const p=forensic.examples[0];
 assert.equal(p.index,1);
 assert.equal(p.predicted,"a");
 assert.equal(p.expected,"u");
 assert.equal(p.preRepairBlocked,true);
 assert.equal(p.postHocCharacterRouteFound,true);
 assert.deepEqual(p.postHocCandidatePath.map(x=>x.to),["o","u"]);
 assert.equal(p.postHocOnly,true);
 assert.equal(p.referenceWasUsedToSetDiagnosticGoal,true);
 assert.equal(forensic.originalGeneratedBeforeReference,"mat");
 assert.equal(forensic.actualReferenceExaminedAfterGeneration,"mut");
 assert.equal(forensic.genuineImprovementInFirstTryScore,null);
 assert.deepEqual(atlas.export().evidence,JSON.parse(before).evidence);
 assert.ok(events.some(x=>x.type==="character-planning-attempt"&&x.postHocReferenceUsedForDiagnosisOnly===true));
 assert.ok(events.filter(x=>x.type==="character-planning-attempt").every(x=>x.notPartOfOriginalPrediction===true));
 console.log("V24_ORIGINAL_SHAPE_POSTHOC_UNLOCK_TRACE",JSON.stringify({
  firstTryText:"mat",actualTextAfterScoring:"mut",firstTryScore:forensic.originalScore,
  wrongPosition:p.index,brokenOriginalText:!forensic.originalWholeAnswerExactlyCorrect,
  postHocRoute:p.postHocCandidatePath.map(x=>x.to),referenceLeakedDuringWriting:false,
  firstTryScoreChanged:false
 }));
});
test("Full original V17 AligningGraph.write is STILL the only first-pass language answer writer; forensic agrees with its unchanged frozen shapeSame",()=>{
 const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 const ascii=s=>[...s].map(c=>c.charCodeAt(0));
 for(const y of ascii("Q: State a color.\nA: blue\n\n".repeat(32)))brain.live(y);
 const ex=ascii("Q: State a color.\nA: red\n\n");
 const original=brain.evalTextExercises([ex],{T:0,noise:0,seed:74129}).exercises[0];
 const noChar=new CharacterHypermaze();
 const frozen=explainOriginalV17AnswerShape(original,noChar,{maxExplained:20});
 assert.ok(frozen.valid);
 assert.equal(frozen.originalScore,original.shapeSame);
 assert.equal(frozen.originalGeneratedBeforeReference,original.shape);
 assert.equal(frozen.actualReferenceExaminedAfterGeneration," red\n\n");
 assert.equal(frozen.genuineImprovementInFirstTryScore,null);
 assert.ok(frozen.totalAllMismatchedPositions>0);
 const replay=brain.evalTextExercises([ex],{T:0,noise:0,seed:74129}).exercises[0];
 assert.equal(replay.shape,original.shape);
 assert.equal(replay.shapeSame,original.shapeSame);
 assert.ok(frozen.examples.every(x=>x.postHocOnly));
 console.log("V24_ORIGINAL_V17_SHAPE_NOT_REPLACED",JSON.stringify({
   shapeSame:original.shapeSame, firstPassGeneratedChars:original.shape.length,
   wrongPositions:frozen.totalAllMismatchedPositions,
   failedRoutes:frozen.examples.filter(x=>!x.postHocCharacterRouteFound).length,
   originalUnmodified:true
 }));
});
test("Missing A: boundary or malformed source cannot be disguised as 0% failed answer",()=>{
 const r=explainOriginalV17AnswerShape({a0:-1,rows:[],shape:null,
   invalidShapeReason:"NO_ANSWER_BOUNDARY_IN_EVALUATED_PREFIX"},new CharacterHypermaze());
 assert.equal(r.valid,false);
 assert.equal(r.reason,"NO_ANSWER_BOUNDARY_IN_EVALUATED_PREFIX");
});
