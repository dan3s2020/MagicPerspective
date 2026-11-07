// Validate the official OpenThoughts3 download with the original V17 loader.
// Use a source FILE, not node -e: Windows PowerShell 5.1 strips JavaScript
// quote characters from command-line eval arguments.
// Ignore any legacy duplicate root-level parquet: official shards live in data/.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {openTextDataset} from "./transcend/torus-aether/data/text-dataset.mjs";

const DATASET_ID="open-thoughts/OpenThoughts3-1.2M";

export async function verifyFullOpenThoughtsData(root,{
  minimumRows=1_000_000
}={}){
  if(!root)throw Error("Dataset root must be provided");
  const full=path.resolve(root);
  const manifestPath=path.join(full,".magicperspective-full-source.json");
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  if(manifest.repository!==DATASET_ID)
    throw Error("Dataset manifest references an unexpected repository");
  if(!Array.isArray(manifest.parquetFiles)||manifest.parquetFiles.length<100)
    throw Error("Dataset manifest missing expected complete Parquet shard listing");
  const expected=manifest.parquetFiles.map(s=>{
    if(typeof s!=="string"||!/^data\/[^/\\]+\.parquet$/i.test(s))
      throw Error("Invalid Parquet path in dataset manifest");
    return path.basename(s);
  }).sort();
  if(new Set(expected).size!==expected.length)
    throw Error("Manifest contains duplicate shard filenames");
  const shardDir=path.join(full,"data");
  // Only official data/ directory. Root may contain an older duplicate shard
  // and partial downloads, neither of which should enter training.
  const entries=fs.readdirSync(shardDir,{withFileTypes:true});
  const present=entries.filter(e=>e.isFile()&&e.name.toLowerCase().endsWith(".parquet"))
    .map(e=>e.name).sort();
  if(present.length!==expected.length||present.some((n,i)=>n!==expected[i]))
    throw Error("Parquet file list incomplete/extra in official data/: expected "+
      expected.length+", found "+present.length);
  const empty=present.filter(n=>fs.statSync(path.join(shardDir,n)).size<8192);
  if(empty.length)throw Error("Empty or truncated shards: "+empty.slice(0,5).join(", "));
  const ds=await openTextDataset(shardDir);
  if(ds.files.length!==expected.length)
    throw Error("Original V17 loader found "+ds.files.length+", expected "+expected.length);
  if(ds.total<minimumRows)
    throw Error("Original V17 loader found only "+ds.total+
      " examples; expected at least "+minimumRows);
  if(ds.trainRows+ds.held!==ds.total)
    throw Error("Original V17 held-out train/test partition mismatch");
  return {
    repository:DATASET_ID,parquetDirectory:shardDir,
    parquetFiles:ds.files.length,allExamples:ds.total,
    trainExamples:ds.trainRows,heldOutNeverTrained:ds.held
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const root=process.env.MP_FULL_DATASET_ROOT||process.argv[2];
    const result=await verifyFullOpenThoughtsData(root);
    console.log("REAL DATASET VERIFIED:",JSON.stringify(result));
    console.log("TRAINING INPUT DIRECTORY:",result.parquetDirectory);
  }catch(error){
    console.error("FULL DATASET VERIFICATION FAILED:",error?.stack||String(error));
    process.exitCode=1;
  }
}
