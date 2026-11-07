import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

// Real human-readable questions with a deliberately disjoint heldout wording.
// Truth labels exist ONLY in the tester and in other training question phrasing;
// no label is provided to native chat() or the cognitive-plan API at inference.
const facts=[
 ["Finland","Helsinki"],["Norway","Oslo"],["Sweden","Stockholm"],
 ["Italy","Rome"],["France","Paris"],["Spain","Madrid"],
 ["Portugal","Lisbon"],["Germany","Berlin"],["Poland","Warsaw"],
 ["Czechia","Prague"],["Austria","Vienna"],["Greece","Athens"]
];
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const ascii=text=>Array.from(text,ch=>ch.charCodeAt(0));
const questionA=country=>"What is the capital of "+country+"?";
const questionB=country=>"Which city is the capital of "+country+"?";
const heldout=country=>"Name the capital city of "+country+".";
const measure=(brain,questions)=>questions.map(([country,answer],i)=>{
 const q=questions===facts?heldout(country):questionA(country);
 const prediction=brain.chat([["you",q]],{T:0,max:answer.length,stopBlank:false,seed:74129+i}).text;
 return {country,expected:answer,prediction,exact:prediction===answer,
  perCharacter:[...answer].filter((ch,j)=>prediction[j]===ch).length/answer.length};
});

test("V24 native original writer: blinded heldout factual-language accuracy and direct path-to-writer causal ablation",{
 timeout:60000
},()=>{
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 for(let epoch=0;epoch<3;epoch++)for(const [country,city] of facts)
  for(const q of [questionA(country),questionB(country)])
   for(const byte of ascii("Q: "+q+"\nA: "+city+"\n\n"))brain.live(byte);
 assert.ok(brain.align?.mem?.n>0,"Native writer must have actually trained");
 const memoryBefore=brain.align.mem.n;
 const testRows=measure(brain,facts);
 const trainingRows=facts.map(([country,answer],i)=>{
  const prediction=brain.chat([["you",questionA(country)]],{T:0,max:answer.length,stopBlank:false,seed:91000+i}).text;
  return {country,expected:answer,prediction,exact:prediction===answer};
 });
 const right=testRows.filter(x=>x.exact).length;
 const meanChars=testRows.reduce((s,x)=>s+x.perCharacter,0)/testRows.length;
 assert.equal(brain.align.mem.n,memoryBefore,"Heldout answers must not enter AligningGraph training");
 const m=new LearnedCognitiveMap();
 for(const [action,from,to] of [["normalize-A","A","B"],["normalize-B","B","C"]]){
  m.observeActionResult({before:["train",from,"tail"],after:["train",to,"tail"],action,accepted:true});
  m.observeActionResult({before:["prefix","train",from,"tail"],after:["prefix","train",to,"tail"],action,accepted:true});
 }
 const path=m.formSolution(["entirely","novel","A","sentence"],{slots:{2:"C"}},{maxNodes:12,maxDepth:4});
 assert.equal(path.found,true,"An original V17 cognitive graph path must exist");
 assert.equal(path.path.length,2);
 const target="Name the capital city of Finland.";
 const generatedWithGraph=brain.chat([["you",target]],{T:0,max:8,stopBlank:false,seed:12345}).text;
 brain.cognitiveMap=m.export();
 const generatedWithMap=brain.chat([["you",target]],{T:0,max:8,stopBlank:false,seed:12345}).text;
 brain.cognitiveMap=null;
 const generatedWithoutMap=brain.chat([["you",target]],{T:0,max:8,stopBlank:false,seed:12345}).text;
 assert.equal(generatedWithGraph,generatedWithMap);
 assert.equal(generatedWithMap,generatedWithoutMap,
  "Do not pretend that the learned original path already causes native V17 chat() to generate answers");
 console.log("V24_REAL_NATURAL_QA_BLIND_AUDIT",JSON.stringify({
  trainingQuestions:2*facts.length*3,heldoutQuestions:facts.length,
  trainedNativeBytes:memoryBefore,heldoutWholeAnswerCorrect:right,
  heldoutWholeAnswerAccuracy:right/facts.length,
  heldoutMeanPositionCharacterAccuracy:meanChars,
  trainedPhrasingExact:trainingRows.filter(x=>x.exact).length,
  exampleHeldout:testRows.slice(0,5),
  causalGraphMapAttachedChangesNativeWriter:false,
  originalDiscovererStillPlansSymbolicText:path.found,
  criticalBlocker:"native AligningGraph.write remains causally disconnected from original Discoverer.shape text action paths"
 }));
});
