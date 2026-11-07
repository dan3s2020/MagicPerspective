// Integration fixture only. Creates actual original V41 Fast Brain.v8 via Brain.save
// in an isolated temp folder. NEVER used as training data or model for user.
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const folder=process.argv[2];
if(!folder)throw Error("Supply temp source runtime");
const brains=path.join(folder,"brains");
fs.mkdirSync(brains,{recursive:true});
const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
b.beginExercise();
for(const y of [81,58,32,49,43,49,10,65,58,32,50,10,10])b.live(y,false,{old:true});
b.chars=13;b.exercises=1;
b.learnConstructedText("1+1","2");
b.learnObservedTransformations("cat bat rat");
const file=path.join(brains,"brain-0-winner.v8");
b.save(file);
fs.writeFileSync(file+".causal.json",'{"version":1,"test":"read-only-sidecar"}');
fs.writeFileSync(file+".hypermaze.json",'{"fixture":true}');
console.log("V42_REAL_ORIGINAL_BRAIN_FIXTURE_SAVED",file,fs.statSync(file).size);
