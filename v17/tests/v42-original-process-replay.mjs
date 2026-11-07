// Runs in an independent Node process, emulating the actual standalone
// original V41 Fast training worker. No hidden shared process-global counters.
import fs from "node:fs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const [mode,initialFile,outFile]=process.argv.slice(2);
if(!["original","optimized"].includes(mode)||!initialFile||!outFile)throw Error("Usage: original|optimized <original.v8> <save.v8>");
const b=Brain.load(initialFile);
if(mode==="original"){
  b.ctxOf=function(a,i){return Array.from({length:this.CTX},(_,j)=>i-j-1>=0?a[i-j-1]:32)};
  b.histOf=function(a,i){return Array.from({length:32},(_,j)=>i-j-1>=0?a[i-j-1]:32)};
}
b.beginExercise();
const corpus=Array.from({length:180},(_,i)=>(i*i*13+i*17+32)%128);
for(const y of corpus)b.live(y,false,{old:true});
b.learnConstructedText("What is repeated?","Repeated observed transformation");
b.learnObservedTransformations("alpha -> beta. alpha -> beta.");
b.save(outFile);
const score=b.predict([80,114,111,98,108,101,109]).slice(0,129);
console.log("V42_NATIVE_ORIGINAL_REPLAY",JSON.stringify({
  mode,bytes:fs.statSync(outFile).size,chars:b.chars,lived:b.lived,
  scoreHash:score.map(x=>Number(x).toPrecision(9)).join(",").slice(0,100),
  observed:b.observedTransformations.report().learnedOperators,
  constructed:b.constructedPaths.summary().textRows
}));
