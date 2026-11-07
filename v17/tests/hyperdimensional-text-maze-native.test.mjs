import test from "node:test";
import assert from "node:assert/strict";
import {
 HyperdimensionalTextMaze,torusChar,advanceTorus,torusDistance
} from "../transcend/torus-aether/worlds/hyperdimensional-text-maze.mjs";
import {TextActionPaths,matchScore} from "../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../isolated/noise-space/causal_text_world.mjs";

function trained(seed=11){
 const paths=new TextActionPaths(),causal=new CausalTextAgent({seed});
 const geom={U:new Map()};
 const corpus=[
  ["Which route reaches the north gate?", "Move north then turn east at the bridge."],
  ["Which route reaches the west gate?", "Move west then turn north at the bridge."],
  ["How does the east door open?", "Push the lever and take the east passage."],
  ["How does the west door open?", "Pull the lever and take the west passage."],
  ["What is two plus two?", "Four is the result of adding two and two."],
  ["Which path crosses the bridge?", "Follow the bridge through the open east door."]
 ];
 for(let i=32;i<127;i++)geom.U.set(i,Array.from({length:5},(_,j)=>
  ((i*17+j*23)%97)/97));
 const maze=new HyperdimensionalTextMaze({seed});
 for(let i=0;i<corpus.length;i++){
  const [question,answer]=corpus[i];
  paths.learn(question,answer);
  causal.train(question,answer,paths,{maxActions:5,seed:i+23});
  maze.learn(question,answer,geom);
 }
 return {paths,causal,maze,geom,corpus};
}

test("real 38D graph: trains from observed Q/A, predicts entire path before any action",()=>{
 const {paths,causal,maze,geom}=trained();
 const history=JSON.stringify({maze:maze.export(),paths:paths.export(),causal:causal.export()});
 const q="Which route reaches the east gate?"; // intentionally never a training question
 const opts={paths,causal,geometry:geom,noise:0,seed:99,maxSteps:30,beamWidth:4};
 const planned=maze.plan(q,opts);
 assert.equal(planned.ready,true);
 assert.equal(planned.answerNotSupplied,true);
 assert.equal(planned.dimensions,38);
 assert.ok(planned.target.predicted5?.length===5);
 assert.ok(planned.target.predicted32?.length===32);
 assert.ok(planned.initialShape.length>0);
 assert.ok(planned.initialFullPath.every(a=>a.predictedBeforeMoving));
 assert.ok(planned.initialFullPath.every(a=>a.toState.coordinates.length===38));
 assert.ok(planned.expanded>0);
 const moved=maze.execute(planned,opts);
 assert.ok(typeof moved.generated==="string");
 assert.equal(moved.plannedBeforeFirstMove,true);
 assert.ok(moved.trajectory.every(e=>Array.isArray(e.alternatives)));
 assert.equal(maze.plan(q,{...opts,record:false}).predictedText,planned.predictedText);
 const previous=JSON.parse(history);
 assert.deepEqual(maze.export(),previous.maze,"planning and moving must not learn hidden answer");
 assert.deepEqual(paths.export(),previous.paths,"no path learner mutation");
 assert.deepEqual(causal.export(),previous.causal,"no latent or tool learner mutation");
});

test("goal trainer reads ALL observed characters, not a limited 256-character continuation",()=>{
 const {geom}=trained();
 const maze=new HyperdimensionalTextMaze();
 const answer="A sentence of real observed training text that must all be consumed.\n".repeat(850);
 const r=maze.learn("Answer based on observed long paragraph.",answer,geom);
 assert.equal(r.observedChars,answer.length);
 assert.equal(maze.lettersSeen,answer.length);
 assert.ok(r.coordsKnown>256);
 const restored=HyperdimensionalTextMaze.restore(maze.export());
 assert.deepEqual(restored.export(),maze.export(),"goal weights and counts must survive restore");
});

test("noise-space seed and learned geometry affect a genuine 5D route, not only decorative points",()=>{
 const {paths,causal,maze,geom}=trained(71);
 const question="Which route crosses the east bridge?";
 const args={paths,causal,geometry:geom,maxSteps:20,beamWidth:5,noise:0,seed:773};
 const original=maze.plan(question,{...args,record:false});
 const originalAgain=maze.plan(question,{...args,record:false});
 assert.deepEqual(original.initialShape,originalAgain.initialShape,"noise=0 is deterministic");
 const stateOriginal=original.initialFullPath[0]?.toState?.torus5;
 assert.equal(stateOriginal?.length,5);
 const otherGeo={U:new Map([...geom.U].map(([k,v])=>[k,v.map(x=>(x+.4)%1)]))};
 const perturbed=maze.plan(question,{...args,geometry:otherGeo,torusWeight:400,record:false});
 assert.equal(perturbed.dimensions,38);
 assert.notDeepEqual(
  original.initialFullPath[0]?.toState?.torus5,
  perturbed.initialFullPath[0]?.toState?.torus5,
  "actual 5D coordinates drive the planner's state"
 );
 const sample=torusChar("north",geom),next=advanceTorus(new Array(5).fill(.5),sample);
 assert.equal(next.length,5);
 assert.ok(Number.isFinite(torusDistance(next,sample)));
 const noisy=maze.plan(question,{...args,noise:0.7,seed:123,record:false});
 assert.equal(noisy.noisePolicy.strength,0.7);
 assert.equal(noisy.initialFullPath.every(a=>Number.isFinite(a.noise)),true);
});

test("held-out reference is never a planner argument, and scoring is strictly afterward",()=>{
 const {paths,causal,maze,geom}=trained();
 const q="Which route goes through the unknown gate?",reference="Take the eastern corridor and stop.";
 const opts={paths,causal,geometry:geom,noise:0,maxSteps:36,seed:771};
 const planned=maze.plan(q,{...opts,record:false});
 const moved=maze.execute(planned,opts);
 const assessed=maze.evaluate(q,reference,{...opts,record:false});
 assert.equal(assessed.plan.predictedText,planned.predictedText);
 assert.equal(assessed.executed.generated,moved.generated);
 assert.deepEqual(assessed.metrics.executed,matchScore(moved.generated,reference));
 assert.equal(assessed.heldoutAnswerUsedOnlyAfterMovement,true);
});
