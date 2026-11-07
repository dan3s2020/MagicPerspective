// Read-only validation of a user-owned ORIGINAL V41 Fast checkpoint.
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const file=process.argv[2];
if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  console.error("V42_ORIGINAL_BRAIN_NOT_FOUND",file||"");
  process.exit(2);
}
try{
  const b=Brain.load(file);
  if(!b||!b.chain||!b.align||!b.constructedPaths||!b.observedTransformations||!b.xdAtlas){
    throw Error("Missing original V41 Fast Brain components; refusing incompatible checkpoint");
  }
  if(!Number.isInteger(b.exercises)||b.exercises<0||
     !Number.isFinite(b.chars)||b.chars<0){throw Error("Invalid persisted original training counters");}
  const result={checkpoint:path.resolve(file),bytes:fs.statSync(file).size,
    chars:b.chars,exercises:b.exercises,lived:b.lived,
    nativeChain:true,aligningGraph:true,constructedPaths:true,observedOperators:true,
    finiteXD:true,mutation:false};
  console.log("V42_ORIGINAL_V41FAST_V8_RESUME_VALIDATED",JSON.stringify(result));
}catch(err){
  console.error("V42_ORIGINAL_BRAIN_INVALID",err.stack||String(err));
  process.exit(3);
}
