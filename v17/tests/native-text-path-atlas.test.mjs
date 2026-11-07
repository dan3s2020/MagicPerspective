import test from "node:test";
import assert from "node:assert/strict";
import {ConstructedPathLearner} from "../transcend/torus-aether/worlds/constructed-paths.mjs";
import {ObservedTransformations} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {NativeTextPathAtlas} from "../transcend/torus-aether/worlds/native-text-path-atlas.mjs";

test("full native atlas is empty before reading any real text; never fabricates corpus paths",()=>{
  const model=new ConstructedPathLearner(),inspector=new NativeTextPathAtlas();
  const p=inspector.before(model,"Unseen question?");
  assert.equal(p.sourceBefore.textRows,0);
  assert.equal(p.preActionPrediction,"");
  assert.equal(p.alternativeEdges.length,0);
  const out=inspector.after(model,p,"XYZ");
  assert.equal(out.teacherForcedCorrect,0);
  assert.equal(out.missingEdges,3);
  assert.equal(out.nativeRowsAfter,0);
  assert.equal(inspector.page(model,{scale:1}).totalStates,0);
  assert.equal(inspector.summary().episodes,1);
});

test("native V17 text memory spans DIFFERENT training exercises; preview uses no answer, explanation is prequential and frozen",()=>{
  const model=new ConstructedPathLearner(),atlas=new NativeTextPathAtlas();
  for(const [question,answer] of [
    ["repeat step 01","abababababababab"],
    ["repeat step 02","abababababaaaaaa"],
    ["repeat step 03","abababababababab"],
    ["repeat step 04","abababababababab"]
  ])model.trainText(question,answer);
  assert.equal(model.textRows,4);
  const before=JSON.stringify(model.scales.map(s=>[s.edges.size,s.observations]));
  const p=atlas.before(model,"repeat step 99",{episode:123,maxOutput:36});
  assert.equal(p.answerProvidedToPreview,false);
  assert.ok(p.alternativeEdges.length>0);
  assert.ok(p.selectedEdges.length>0);
  assert.equal(p.sourceBefore.textRows,4);
  const r=atlas.after(model,p,"abababababababab",{maxAnalyze:16});
  assert.equal(r.nativeRowsBefore,4);
  assert.equal(r.teacherForcedTotal,16);
  assert.ok(r.teacherForcedCorrect>0);
  assert.equal(r.referenceNotUsedForFreePrediction,true);
  assert.equal(r.teacherForcedUsesObservedPrefix,true);
  assert.equal(JSON.stringify(model.scales.map(s=>[s.edges.size,s.observations])),before);
  assert.ok(r.frames.every(x=>x.evidence.length===6&&x.beforeCurrentRowTraining));
  assert.ok(r.allPreActionCandidateEdges.every(x=>x.previouslyObservedContext===true));
});

test("atlas explains why a character is impossible: NO previously learned path, not fake navigation",()=>{
  const model=new ConstructedPathLearner(),atlas=new NativeTextPathAtlas();
  model.trainText("What is known","AAAAAAAAAAAA");
  const pre=atlas.before(model,"What is still missing",{maxOutput:24});
  const r=atlas.after(model,pre,"ΩΩxxx",{maxAnalyze:3});
  assert.equal(r.unicodeCharsOutsideNativeAscii,2);
  assert.equal(r.teacherForcedTotal,3);
  assert.ok(r.frames.some(x=>x.reason==="missing-learned-edge-at-this-context"));
  assert.equal(r.frames[0].actual,"x");
  assert.ok(r.frames[0].trueActionRank===null);
  assert.ok(r.missedByReason===undefined);
  assert.equal(r.noSemanticGroundTruthClaim,true);
});

test("complete native six-scale atlas is paginated: no 220-edge display limit; every stored action available",()=>{
  const model=new ConstructedPathLearner({maxTextStates:160000});
  for(let k=0;k<180;k++)model.trainText("sentence "+k,
    "answers are paths from prior worlds "+(k%9)+" repeated many times");
  const atlas=new NativeTextPathAtlas();
  for(let scale=0;scale<6;scale++){
    const all=[],total=atlas.page(model,{scale,offset:0,limit:1}).totalStates;
    for(let offset=0;offset<total;offset+=17){
      const p=atlas.page(model,{scale,offset,limit:17});
      assert.equal(p.noTruncationOfOriginalGraph,true);
      all.push(...p.entries);
      if(p.nextOffset===null)break;
    }
    assert.equal(all.length,total);
    const keys=all.map(x=>x.from);
    assert.equal(new Set(keys).size,total);
    const native=[...model.scales[scale].edges.keys()];
    assert.deepEqual(keys,native);
    for(const row of all)
      assert.equal(row.actions.length,model.scales[scale].choices(row.from).length);
  }
});

test("blocked contextual edit operators and bridge suggestions are EXPLAINED, never injected as permissive actions",()=>{
  const observed=new ObservedTransformations(),model=new ConstructedPathLearner();
  for(const sentence of [
    "She is calm","He is calm","She is happy","He is happy",
    "They are happy","They are calm"
  ])observed.observeSentence(sentence);
  const atlas=new NativeTextPathAtlas();
  const before=observed.operators.size;
  const p=atlas.before(model,"She is calm",{observed});
  const d=atlas.after(model,p,"He is happy",{observed});
  assert.ok(d.observedAnchorDiagnostics);
  assert.equal(d.observedAnchorDiagnostics.source,"actual native observed one-edit operators");
  assert.ok(Array.isArray(d.observedAnchorDiagnostics.evidencedIndependenceAxes));
  assert.equal(d.observedAnchorDiagnostics.interventionIsHypothesisOnly,true);
  assert.equal(observed.operators.size,before);
});
