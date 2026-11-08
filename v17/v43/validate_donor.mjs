// V43 donor preflight runs in original Node launcher; NO PowerShell -e quoting.
import fs from "node:fs";
const file=process.argv[2];
if(!file)throw Error("A previously prepared genuine GGUF donor atlas is required");
const d=JSON.parse(fs.readFileSync(file,"utf8"));
if(d.format!=="braivour/v42-brain-character/v1"||d.source_genuine_gguf!==true||
   d.immutable_donor_atlas!==true||d.actual_donor_forward_pass!==false)
  throw Error("Unsupported or not proven read-only Braivour donor coordinate format");
if(!Number.isInteger(d.dimensions)||d.dimensions<16||d.dimensions>256)
  throw Error("Invalid native Qwen donor dimension");
for(const k of ["input_rows","output_rows"]){
  if(!Array.isArray(d[k])||d[k].length!==256)
    throw Error(k+" must contain all 256 exact real GGUF byte-coordinate rows");
}
if(!Array.isArray(d.movement_axes)||d.movement_axes.length<2||d.movement_axes.length>1024)
  throw Error("Real donor movement axes missing or invalid");
for(const rows of [d.input_rows,d.output_rows,d.movement_axes])
  for(const row of rows)
    if(!Array.isArray(row)||row.length!==d.dimensions||row.some(x=>!Number.isFinite(x)))
      throw Error("Invalid non-finite/mismatched donor coordinate");
if(!Number.isFinite(d.move_gain)||d.move_gain<=0||d.move_gain>5)
  throw Error("Invalid donor movement strength");
process.stdout.write(JSON.stringify({ok:true,donor:"real sampled GGUF coordinates",
  frozen:true,dimensions:d.dimensions,byteStates:256,movementAxes:d.movement_axes.length,
  notFullQwenInference:true})+"\n");
