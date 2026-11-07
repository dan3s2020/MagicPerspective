import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeFrozenShapeWriter} from "../research/text-hypermaze/native-frozen-shape-writer.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
test("Original Brain.chat is causally DISCONNECTED from saved native shape; opt-in path writer truly outputs first-shot predicted characters from verified action physics",()=>{
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 for(let i=0;i<150;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),brain.disc);
  if(i>=24&&brain.disc.attract(KIND.target)>.2&&
   brain.disc.conduct(KIND.floor)>=.5)break;
 }
 const source=["corridor 0","corridor 1","corridor 2","exit reached"];
 for(let epoch=0;epoch<3;epoch++)for(const line of source){
  for(const ch of "Q: Where is the exit from "+line+"?\nA: "+line+"\n\n")
   brain.live(ch.charCodeAt(0));
 }
 const q=[["you","Where is the exit from corridor 0?"]],
   args={T:0,max:12,stopBlank:false,seed:30038};
 const before=brain.chat(q,args).text;
 const writer=new NativeFrozenShapeWriter(brain);
 const observations=[
  ["corridor 0","corridor 1","walk-0","world-1"],
  ["corridor 1","corridor 2","walk-1","world-2"],
  ["corridor 2","exit reached","walk-2","world-3"]
 ];
 for(const [a,b,action,episode]of observations)
  writer.world.observeTransition({episode,before:a,after:b,action,accepted:true});
 const originalShape=writer.predict({start:"corridor 0",required:["exit"]});
 assert.equal(originalShape.plan.found,true);
 assert.equal(originalShape.plan.predicted,"exit reached");
 assert.equal(originalShape.plan.actions.length,3);
 const afterNativeChat=brain.chat(q,args).text;
 assert.equal(before,afterNativeChat,
  "Original AligningGraph.write ignores a correct original shape; do not falsely claim integration");
 const causal=new Map(observations.map(([a,b,action])=>[a+"|"+action,b]));
 const executed=writer.actAndWrite(originalShape,({text,action})=>{
  const actual=causal.get(text+"|"+action);
  if(!actual)throw Error("No external world transition");
  return actual;
 });
 assert.equal(executed.complete,true);
 assert.equal(executed.output,"exit reached");
 assert.equal(executed.emittedCharacters,12);
 assert.ok(executed.characterFrames.every(c=>c.matched));
 console.log("V33_CAUSAL_WRITER_DISCONNECTION_AND_OPT_IN_BRIDGE",JSON.stringify({
  observedIndependentPhysicsEpisodes:3,
  originalNativeChatBeforeShape:before,
  originalNativeChatAfterShape:afterNativeChat,
  originalWriterChangedByCorrectPath:false,
  optInOriginalShapeWriterProducesExpectedText:executed.output,
  firstShapeSteps:originalShape.plan.actions.length,
  codepointsPredictedExactly:executed.characterFrames.filter(x=>x.matched).length,
  codepointsTotal:executed.emittedCharacters,
  referenceAnswerSuppliedBeforePlanning:false,
  userQAOpenDomainAccuracyNotProven:true
 }));
});
