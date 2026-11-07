import test from "node:test";
import assert from "node:assert/strict";
import {makeGrammar} from "../research/relational-hypermaze/engine.mjs";
import {trainQuestionForms,unknownAnswerWorld,predictUnknownEntity,
  independentAnswerScore} from "../research/relational-hypermaze/unknown-answer.mjs";

test("V23 unknown answer: original shape infers 300 unseen answer entities before any actions",()=>{
 const facts=makeGrammar(),queries=trainQuestionForms();
 const factBefore=JSON.stringify(facts.snapshot()),queryBefore=queries.experiences;
 let correct=0,shortest=0,unknown=0,bytes=0,allSteps=0;
 for(let seed=180000;seed<180300;seed++){
  const w=unknownAnswerWorld(seed,{routeLength:4+seed%9,distractors:75+seed%45});
  const r=predictUnknownEntity(facts,queries,w.document,w.question,{seed});
  const v=independentAnswerScore(r,w);
  correct+=Number(v.correct);shortest+=Number(v.shortest);
  allSteps+=v.steps;bytes+=w.document.length;
  unknown+=Number(r.answerEntityGiven===false);
  assert.equal(r.method,"Discoverer.shape");
  assert.equal(r.beforeAction,true);
 }
 assert.equal(correct,300);
 assert.equal(shortest,300);
 assert.equal(unknown,300);
 assert.equal(JSON.stringify(facts.snapshot()),factBefore);
 assert.equal(queries.experiences,queryBefore);
 console.log("V23_UNKNOWN_ENTITY",JSON.stringify({cases:300,correct,
   shortest,answersNotGiven:unknown,meanDocumentBytes:bytes/300,
   meanPathLength:allSteps/300,learnedQuestionWitnesses:queryBefore,
   isOpenDomainQA:false}));
});
test("V23 unknown question structure and missing observed relations abstain",()=>{
 const fact=makeGrammar(),query=trainQuestionForms(),
   w=unknownAnswerWorld(188881);
 const malformed=predictUnknownEntity(fact,query,w.document,
   "Can you answer arbitrary open-domain scientific questions?");
 assert.equal(malformed.found,false);
 assert.equal(malformed.reason,"UNKNOWN_QUESTION_PATTERN");
 const empty=predictUnknownEntity(fact,query,"No recorded transitions.",w.question);
 assert.equal(empty.found,false);
});
test("V23 unknown answer is not inserted as a target node before parsing text",()=>{
 const facts=makeGrammar(),queries=trainQuestionForms(),w=unknownAnswerWorld(188882);
 const p=predictUnknownEntity(facts,queries,w.document,w.question);
 assert.ok(p.found);
 assert.equal(p.answerEntityGiven,false);
 assert.ok(!w.question.includes(p.answerEntity));
 assert.ok(p.targetsFound>=1);
 assert.ok(independentAnswerScore(p,w).correct);
});
