// Windows Actions smoke: create an ORIGINAL native Brain.v8 source checkpoint,
// and a genuine UTF-8 TinyStories-shaped input fixture. The serious PowerShell
// script MUST then download the real pinned Stanford SQuAD and run unmodified.
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const dir=path.resolve(process.argv[2]||"");
if(!process.argv[2])throw Error("Explicit isolated CI output folder is required");
fs.mkdirSync(dir,{recursive:true});
const original=path.join(dir,"original-brain.v8");
new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false},seed:11}).save(original);
const story=path.join(dir,"TinyStories-train.txt");
fs.writeFileSync(story,[
 "Ștefania found a small blue bird.","A child climbed a quiet green hill.",
 "The boat moved across the bright lake.","The puppy enjoyed the kind stranger.",
 "A little cloud crossed the moon at night."
].join("<|endoftext|>\n")+"<|endoftext|>");
console.log("V39_ORIGINAL_WINDOWS_SMOKE_INPUTS",JSON.stringify({
 original,story,originalBytes:fs.statSync(original).size,
 actualUnchangedOriginalBrain:true,fixtureStories:5}));
