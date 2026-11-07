import test from "node:test";
import assert from "node:assert/strict";
import {QuestionGoalNavigator} from "../transcend/torus-aether/worlds/question-goal-navigation.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
import {Discoverer as FrozenDiscoverer,KIND as FrozenKind} from "../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {Discoverer as CurrentDiscoverer,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";

function make(){
 const map=new LearnedCognitiveMap(),geometry=new Geometry({seed:17,neg:2,every:250000}),
  agent=new QuestionGoalNavigator({seed:17});
 return {map,geometry,agent};
}
function learnObserved(s,q,a){
 let prev=32;for(const ch of "Q: "+q+"\nA: "+a+"\n\n"){
  s.geometry.learn(prev,ch.charCodeAt(0));prev=ch.charCodeAt(0);
 }
 return s.agent.learn(q,a,{map:s.map,geometry:s.geometry});
}
test("V24 uses original V17 Discoverer.shape for full route from QUESTION, then executes observed edges",()=>{
 const s=make();
 learnObserved(s,"How do we walk through the east hall?","Walk east through the hall and take the open door.");
 learnObserved(s,"How do we reach the north bridge?","Cross the north bridge then open the wooden gate.");
 learnObserved(s,"How do we walk through the west hall?","Walk west through the hall and take the closed door.");
 const before=JSON.stringify([s.map.export(),s.agent.export()]);
 const q="How do we reach the unseen northern hall?";
 const r=s.agent.plan(q,{map:s.map,geometry:s.geometry,maxNodes:1500,temperature:0});
 assert.equal(r.ready,true,JSON.stringify({reason:r.reason,attempts:r.predictedTargets}));
 assert.equal(r.originalOperator,"Discoverer.shape");
 assert.equal(r.predictedBeforeFirstMovement,true);
 assert.equal(r.referenceAnswerProvided,false);
 assert.ok(r.initialFullRoute.length>0);
 assert.ok(r.initialFullRoute.every(x=>x.predictedBeforeAction));
 assert.equal(r.dimensions,38);
 assert.equal(r.targetEstimatedFromQuestion,true);
 assert.equal(r.noAnswerOracle,true);
 assert.ok(r.predictedText.length>0);
 const result=s.agent.execute(r,{map:s.map});
 assert.equal(result.reached,true);
 assert.equal(result.steps,r.plannedSteps);
 assert.ok(result.frames.slice(1).every(f=>f.matched===true));
 assert.equal(JSON.stringify([s.map.export(),s.agent.export()]),before,"frozen planning must not train or mutate");
});
test("long 144+ transitions are predicted BEFORE moving using exactly original Discoverer",()=>{
 const s=make(),tokens=Array.from({length:145},(_,i)=>"state_"+String(i).padStart(4,"0"));
 const q="Produce the path to the last recorded checkpoint";
 const answer=tokens.join(" ");
 const learned=learnObserved(s,q,answer);
 assert.equal(learned.allObservedWords,145);
 assert.equal(learned.observedAnswerChars,answer.length);
 assert.ok(learned.observedAnswerChars>256);
 const r=s.agent.plan("Produce the route to a final recorded checkpoint",
  {map:s.map,geometry:s.geometry,maxNodes:512});
 assert.equal(r.ready,true,JSON.stringify({reason:r.reason,attempts:r.predictedTargets?.slice(0,2)}));
 assert.equal(r.originalOperator,"Discoverer.shape");
 assert.equal(r.initialFullRoute.length,145);
 assert.equal(s.agent.execute(r,{map:s.map}).reached,true);
 assert.equal(r.predictedText,answer);
 assert.equal(r.predictedGoal.tokens[1],tokens.at(-1));
});
test("missing/contradictory actual observed transitions are walls, not imagined 38D paths",()=>{
 const s=make();
 learnObserved(s,"Finish the observed maze route","one two three four five");
 const r=s.agent.plan("Finish the observed route", {map:s.map});
 assert.equal(r.ready,true);
 const first=r.initialFullRoute[0];
 const noEdge=JSON.stringify(["text",["<bos>","<bos>"]])+"\u001f"+first.action;
 const original=s.map.externalEdges.get(noEdge);
 s.map.externalEdges.delete(noEdge);
 const failed=s.agent.plan("Finish the observed route",{map:s.map});
 assert.equal(failed.ready,false,"missing edge cannot become physical path from learned geometry");
 s.map.externalEdges.set(noEdge,original);
 const other=s.map.observeExternalTransition({domain:"text",before:["<bos>","<bos>"],
  action:first.action,after:["<bos>","incorrect"],context:"contradictory observation"});
 assert.equal(other.conflict,true);
 const confused=s.agent.plan("Finish the observed route",{map:s.map});
 assert.equal(confused.ready,false,"contradictory observed physics must not be silently accepted");
});
test("trained goal and all action evidence survive V24 plain-data checkpoint restore",()=>{
 const s=make();
 learnObserved(s,"Show the narrow route","Turn left then move to the safe corridor.");
 const before=s.agent.export(),a=JSON.stringify(before);
 const restored=QuestionGoalNavigator.restore(JSON.parse(a));
 assert.equal(JSON.stringify(restored.export()),a);
 const q="Show me a narrow route to the corridor";
 const p=restored.plan(q,{map:s.map,geometry:s.geometry});
 assert.equal(p.ready,true);
 assert.equal(p.originalOperator,"Discoverer.shape");
});
test("no heldout answer is supplied to the plan, reference consulted only in evaluate",()=>{
 const s=make();
 learnObserved(s,"How to reach the final spot?","Cross the bridge and stop near the tower.");
 const frozen=JSON.stringify([s.map.export(),s.agent.export()]);
 const question="How can I get to an unseen final stop?",heldout="Cross near the other watchtower.";
 const predicted=s.agent.plan(question,{map:s.map,geometry:s.geometry});
 const evaluated=s.agent.evaluate(question,heldout,{map:s.map,geometry:s.geometry});
 assert.equal(evaluated.referenceVisibleOnlyAfterPlan,true);
 assert.equal(evaluated.planned.predictedText,predicted.predictedText);
 assert.ok(evaluated.answerAccuracy>=0&&evaluated.answerAccuracy<=1);
 assert.equal(JSON.stringify([s.map.export(),s.agent.export()]),frozen);
 // No accidental 100% certification on unseen long-form language.
 assert.ok(typeof evaluated.exact==="boolean");
});
test("original 2D solver parity is immutable for the same retinas, including noise",()=>{
 for(let seed=1;seed<=30;seed++){
  const n=7+2*(seed%4),retina=new Array(n*n).fill(KIND.floor);
  for(let i=0;i<n*n;i++)if(i%13===seed%13)retina[i]=KIND.wall;
  retina[0]=KIND.self;retina[retina.length-1]=KIND.target;
  const frozen=new FrozenDiscoverer(seed),current=new CurrentDiscoverer(seed);
  for(const a of [frozen,current]){
   a.pass=[5,1,20,2];a.block=[1,12,1,1];
   a.enter=[1,2,10,3];a.endIn=[0,0,9,0];a.temp=seed%2?0.7:0;
  }
  assert.deepEqual(current.shape(retina,n,0),frozen.shape(retina,n,0));
 }
});
