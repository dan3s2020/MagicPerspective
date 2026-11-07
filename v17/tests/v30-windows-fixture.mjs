// CI-only original V17 trained Brain + independently witnessed world actions.
// No fabricated training outcomes are embedded in the released atlas engine.
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
const out=process.argv[2];if(!out)throw Error("Usage: node v30-windows-fixture.mjs <output-folder>");
fs.mkdirSync(out,{recursive:true});
const brain=new Brain({rules:{depth:1,off:["R2","R4"],
 budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
for(let i=0;i<240;i++){
 playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),brain.disc);
 if(i>=24&&brain.disc.attract(KIND.target)>.2&&
  brain.disc.conduct(KIND.floor)>=.5)break;
}
if(brain.disc.attract(KIND.target)<=.2)throw Error("Real original maze learning unsuccessful");
const bfile=path.join(out,"trained original V17.v8");
brain.save(bfile);
const rows=[
 {episodeId:"world-apples",action:"increase-two",before:"Anna has 3 apples.",
  after:"Anna has 5 apples.",accepted:true},
 {episodeId:"world-books",action:"increase-two",before:"Dan has 8 books.",
  after:"Dan has 10 books.",accepted:true},
 {episodeId:"world-stones",action:"decrease-one",before:"Hana has 6 stones.",
  after:"Hana has 5 stones.",accepted:true},
 {episodeId:"world-shells",action:"decrease-one",before:"Daro has 15 shells.",
  after:"Daro has 14 shells.",accepted:true}
];
const events=path.join(out,"world witnesses with spaces.jsonl");
fs.writeFileSync(events,rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log("V30_REAL_NATIVE_ORIGINAL_FIXTURE_READY",JSON.stringify({
 brain:bfile,events,originalMazeEpisodes:brain.disc.episodes,
 targetAttraction:brain.disc.attract(KIND.target)}));
