// Windows CI acceptance only: a REAL saved original V17 Brain, not a stand-in.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
const root=path.dirname(fileURLToPath(import.meta.url));
const target=process.argv[2];
if(!target||!path.isAbsolute(target))throw Error("Supply absolute ORIGINAL runtime path");
const originalBrains=path.join(target,"brains");
fs.mkdirSync(originalBrains,{recursive:true});
const checkpoint=path.join(originalBrains,"brain-0-winner.v8");
if(fs.existsSync(checkpoint))throw Error("Will not overwrite actual existing original Brain");
const brain=new Brain({rules:{depth:1,off:["R2","R4"],
 budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
for(let i=0;i<180;i++){
 const world=makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]);
 playExercise(world,brain.disc);
 if(i>=24&&brain.disc.attract(KIND.target)>.2&&
  brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
}
const corpus=fs.readFileSync(path.resolve(root,"../docs/TORUS_AETHER_ABC_20261104.md"),"utf8");
const learned=brain.observedTransformations.observeText(corpus.slice(0,25000));
if(learned.observedUnits<20||brain.disc.attract(KIND.target)<=.2)
 throw Error("Original native V17 training failed");
brain.save(checkpoint);
const reread=Brain.load(checkpoint);
if(!reread.observedTransformations.records.size)
 throw Error("Original text corpus evidence lost from checkpoint");
console.log("V34_WINDOWS_ORIGINAL_REAL_BRAIN_GENERATED",JSON.stringify({
 checkpoint,source:"actual repository research text and actual native V17 maze worlds",
 trainMazeEpisodes:brain.disc.episodes,
 originalTextWindows:brain.observedTransformations.records.size,
 originalMazeAttraction:brain.disc.attract(KIND.target)}));
