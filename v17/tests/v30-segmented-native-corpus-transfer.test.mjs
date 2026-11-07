import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeCrossEpisodeTransfer} from "../research/text-hypermaze/cross-episode-native.mjs";
import {NativeWorldAtlas} from "../research/text-hypermaze/native-world-atlas.mjs";
const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function brain(){
 const b=new Brain({rules,seed:11});
 for(let i=0;i<240;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
test("V30: two independent corpus contrasts transfer a reusable edit corridor to third unseen textual world with ORIGINAL shapeGraph",()=>{
 const b=brain(),m=b.observedTransformations;
 m.observeText("The metal feels cold. The metal feels warm.");
 m.observeText("The planet feels cold. The planet feels warm.");
 assert.ok([...m.operators.values()].some(op=>op.from==="cold"&&
  op.to==="warm"&&op.sourceObservations>=2&&op.evidence.length>=2),
  "Must learn general action contrast from two distinct text observations");
 const engine=new NativeCrossEpisodeTransfer(b),atlas=new NativeWorldAtlas(b);
 const source="The distant star feels cold.",goal={containsToken:"warm"};
 assert.equal(m.containsSentence(source),false);
 assert.equal(m.containsSentence("The distant star feels warm."),false);
 const off=engine.plan({startText:source,goal,includeTextContrasts:false});
 assert.equal(off.found,false);
 const frozenBefore=JSON.stringify(m.report());
 const on=engine.plan({startText:source,goal,includeTextContrasts:true});
 assert.equal(on.found,true,JSON.stringify({reason:on.reason,
  frontier:on.frontier,graph:on.graph}).slice(0,1400));
 assert.equal(on.predicted,"The distant star feels warm.");
 assert.equal(on.actions.length,1);
 assert.equal(on.actions[0].causalTrainingEvidence,false);
 assert.equal(on.corpusContrastsAllowedAsHypothesis,true);
 assert.equal(on.corpusContrastsAreVerifiedCausalWorldActions,false);
 assert.ok(on.graph.originalCorpusContrastHypothesisEdges>0);
 assert.equal(on.algorithm,"SAME original Discoverer.shapeGraph");
 assert.equal(JSON.stringify(m.report()),frozenBefore);
 const id=atlas.logAttempt(on,{episodeId:"never-seen-distant-star"}).id;
 const physicalStep=({text,action})=>{
  assert.ok(action.name.startsWith("text-contrast:"));
  return text.replace("cold.","warm.");
 };
 const executed=engine.execute(on,physicalStep);
 assert.equal(executed.completeExact,true);
 assert.equal(executed.actualFinal,"The distant star feels warm.");
 atlas.logOutcome(id,executed);
 assert.equal(atlas.summary().physicallyValidatedSuccesses,1);
 const graph=atlas.globalTopology({nodeLimit:1000,edgeLimit:2000});
 assert.ok(graph.textContrastEdges>0);
 assert.ok(graph.edges.some(x=>x.status==="PHYSICALLY_VERIFIED_IN_HELDOUT_WORLD"));
 assert.ok(graph.edges.some(x=>x.status==="TEXT_CONTRAST_OBSERVED_NOT_CAUSAL"));
 assert.equal(graph.noPhysicalClaimsFromCorpusTextContrasts,true);
 console.log("V30_SEGMENTED_NATIVE_TEXT_TRANSFER",JSON.stringify({
  sourceIndependentTextExamples:2,
  unseenThirdWorldCorrect:true,
  originalNativeShapeGraph:true,
  noTeacherAnswerProvided:true,
  noContrastAsCausalRule:true,
  independentActualWorldValidatedAfterPrediction:true,
  ablationWithoutCorpusContrastsFound:off.found,
  withCorpusContrastsFound:on.found
 }));
});
test("V30: one corpus contrast example alone is insufficient; no invented corridor is admitted",()=>{
 const b=brain();b.observedTransformations.observeText(
  "The metal feels cold. The metal feels warm.");
 const engine=new NativeCrossEpisodeTransfer(b);
 const p=engine.plan({startText:"The distant star feels cold.",
  goal:{containsToken:"warm"},includeTextContrasts:true});
 assert.equal(p.found,false);
 assert.equal(p.graph.originalCorpusContrastHypothesisEdges,0);
 assert.ok(p.frontier.nativeTextContrastCandidatesBelowSupport>0);
});
test("V30: a contrast transfer may be predicted but is NOT independently true in another physical world",()=>{
 const b=brain();const model=b.observedTransformations;
 model.observeText("The metal feels cold. The metal feels warm.");
 model.observeText("The planet feels cold. The planet feels warm.");
 const engine=new NativeCrossEpisodeTransfer(b),atlas=new NativeWorldAtlas(b);
 const plan=engine.plan({startText:"The solar flare feels cold.",
  goal:{containsToken:"warm"},includeTextContrasts:true});
 assert.ok(plan.found);
 const id=atlas.logAttempt(plan,{episodeId:"counterexample-world"}).id;
 // Independent physical world refuses the generated contrast!
 const out=engine.execute(plan,({text})=>text);
 assert.equal(out.completeExact,false);
 assert.equal(out.mismatchTransitions,1);
 atlas.logOutcome(id,out);
 const explanation=atlas.explain(id);
 assert.equal(explanation.physicallySucceeded,false);
 assert.ok(explanation.explicitDesignRestrictions.some(x=>
  x.type==="EXTERNAL_WORLD_DISAGREED_WITH_PREDICTED_ACTIONS"));
 assert.equal(engine.summary().observations,0,
  "A failed contrast must not contaminate witnessed physical rule memory");
});
