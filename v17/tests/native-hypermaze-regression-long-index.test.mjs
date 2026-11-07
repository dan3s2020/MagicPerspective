// Regression found by REAL long-corpus falsification: candidate lookup
// uses unique token keys but old gate required repeated raw token count,
// so otherwise identical long passages produced ZERO learned operators.
// Insertion/deletion additionally differed in token length and were omitted.
import test from "node:test";
import assert from "node:assert/strict";
import {ObservedTransformations,tokenizeObservation,renderObservation}
 from "../transcend/torus-aether/worlds/observed-transformations.mjs";
const longPrefix=("The research team compared the observation against the previous observation "+
 "because the experimental apparatus remained in the same environment and the "+
 "reviewers required the team to explain the measurement before the study continued ").repeat(4);
const make=word=>longPrefix+"The final observed state of the recorded signal was "+word+".";
test("long repeated real-style text differing by ONE word must still discover true observed transformation",()=>{
 const a=make("calm"),b=make("active"),m=new ObservedTransformations();
 assert.ok(tokenizeObservation(a).length>100);
 assert.ok(tokenizeObservation(a).length<=256);
 const first=m.observeSentence(a);
 const second=m.observeSentence(b);
 assert.equal(first.learned,true);
 assert.equal(second.learned,true);
 assert.ok(second.matched>0,"One-change long passages must be compared");
 assert.ok(m.operators.size>=2,"Actual long-text delta must learn forward and reverse actions");
 const n=m.neighbors(tokenizeObservation(a));
 assert.ok(n.some(x=>renderObservation(x.tokens)===b),
  "Model must generate the actually observed successor using learned action");
 console.log("FIXED_LONG_REPEAT_OPERATOR_DISCOVERY",JSON.stringify({
  longUTF8Bytes:Buffer.byteLength(a),tokens:tokenizeObservation(a).length,
  uniqueTokens:new Set(tokenizeObservation(a)).size,
  candidatePairs:second.matched,learnedOperators:m.operators.size,
  notNextBytePrediction:true}));
});
test("same original observation engine must detect actual INSERT and DELETE, including when token-count differs",()=>{
 const base="The quiet team kept the record because the room was calm.";
 const inserted="The quiet team kept the record because the room was very calm.";
 const model=new ObservedTransformations();
 model.observeSentence(base);
 const result=model.observeSentence(inserted);
 assert.ok(result.matched>0,"The previous length-prefixed index did not retrieve +/-1-token neighbors");
 const verbs=[...model.operators.values()].map(x=>x.kind);
 assert.ok(verbs.includes("insert"),"True observed insertion must be inferred");
 assert.ok(verbs.includes("delete"),"True observed deletion must be inferred");
 const before=model.neighbors(tokenizeObservation(base));
 const after=model.neighbors(tokenizeObservation(inserted));
 assert.ok(before.some(x=>renderObservation(x.tokens)===inserted));
 assert.ok(after.some(x=>renderObservation(x.tokens)===base));
});
