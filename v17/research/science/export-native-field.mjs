// READ-ONLY original V42/V17 checkpoint instrument. No learning, no save.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Brain} from '../../transcend/torus-aether/devour/brain.mjs';
import {Discoverer,makeMaze,SEEDS,seedOf} from '../../transcend/torus-aether/worlds/exercise.mjs';
import {fieldEvidence} from './native-field-mechanics.mjs';
function option(name,def=null){
  const i=process.argv.indexOf('--'+name);return i>=0?process.argv[i+1]:def;
}
function fail(msg){throw Error(msg)}
const checkpoint=option('checkpoint'),out=option('out');
if(!checkpoint||!out)fail('Usage: node export-native-field.mjs --checkpoint <REAL saved brain .v8> --out <new evidence .json> [--count 12] [--size 9] [--seed 20261108]');
const count=Number(option('count','12')),size=Number(option('size','9')),seed=Number(option('seed','20261108'));
if(!Number.isInteger(count)||count<1||count>64||![7,9,11,13].includes(size)||!Number.isInteger(seed)||seed<0||seed>2**32-1)
  fail('count 1..64; size 7,9,11,13; seed uint32 required');
const source=path.resolve(checkpoint),destination=path.resolve(out);
if(source===destination)fail('Never overwrite original brain');
if(!fs.existsSync(source))fail('Original checkpoint does not exist: '+source);
const sha256=async p=>new Promise((resolve,reject)=>{
  const h=crypto.createHash('sha256'),stream=fs.createReadStream(p);
  stream.on('data',x=>h.update(x));stream.on('error',reject);stream.on('end',()=>resolve(h.digest('hex')));
});
const beforeStat=fs.statSync(source);
const brain=Brain.load(source);
if(!brain.disc)fail('This ORIGINAL checkpoint has no Discoverer; cannot invent its maze field');
const D=Object.assign(Object.create(Discoverer.prototype),brain.disc);
D.temp=0; // Frozen deterministic analysis; does not mutate the checkpoint or original Brain.
D.noise=0;
const episodes=[];
let matched=0,goalReached=0,maxError=0,iterations=0;
for(let i=0;i<count;i++){
  const w=makeMaze(seedOf(SEEDS.test,seed+i),size);
  const result=fieldEvidence(D,w,{keepFrames:true});
  if(result.unavailable)fail(result.unavailable);
  if(!result.nativePathIdentical)fail('Research replay disagreed with ORIGINAL Discoverer: seed '+w.seed);
  if(result.independentMaxAbsError>1e-9)fail('Independent shortest-path field disagrees: '+result.independentMaxAbsError);
  matched++;goalReached+=Number(result.pathCells?.at(-1)===w.goal);
  maxError=Math.max(maxError,result.independentMaxAbsError);
  iterations+=result.iterations;
  const {w:ignored,...snapshot}=result;
  episodes.push({...snapshot,seed:w.seed,algorithm:'original-max-product-relaxation',
    observations:'Complete original symbolic retina, learned internal kind semantics',
    labelSource:'Original seeded unseen maze only for verification'});
}
const afterStat=fs.statSync(source);
if(beforeStat.size!==afterStat.size||beforeStat.mtimeMs!==afterStat.mtimeMs)
  fail('Source checkpoint changed during science export; refusing inconsistent evidence');
const digest=await sha256(source);
const data={
  schema:'MagicPerspective-native-field-replay-v1',version:'V42 isolated science',
  originalCheckpoint:{basename:path.basename(source),sha256:digest,bytes:beforeStat.size,
    modifiedAt:new Date(beforeStat.mtimeMs).toISOString()},
  scientificScope:'FROZEN ORIGINAL CHECKPOINT, original unseen mazes, no training and no oracle input to Discoverer',
  settings:{count,size,seed,temperature:0,noise:0},
  summary:{matchedOriginal:matched,goalReached,meanOriginalSweeps:iterations/count,
    maxIndependentFieldError:maxError},
  episodes
};
await fsp.mkdir(path.dirname(destination),{recursive:true});
await fsp.writeFile(destination,JSON.stringify(data,null,2),{flag:'wx'});
console.log('V42_NATIVE_FIELD_PROOF',JSON.stringify({out:destination,...data.summary,
  checkpointSha256:digest,savedCheckpointUntouched:true}));
