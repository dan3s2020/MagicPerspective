import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {originalMetrics,nativeProgressPercent} from "../transcend/torus-aether/ui/v27-native-metrics.mjs";

const root=fileURLToPath(new URL("..",import.meta.url));
const fetchFile=p=>fs.readFile(path.join(root,p));
const gitBlob=content=>createHash("sha1").update("blob "+content.length+"\0").update(content).digest("hex");
const unmodified={
 "transcend/torus-aether/worlds/exercise.mjs":"739d6c5cc36e8d43b83dc66f499c5140aca414d3",
 "transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs":"e34d787467b7238c7422a0509173b1f785eb2342",
 "transcend/torus-aether/worlds/labyrinth.mjs":"96877ee6537c9ceb34239fc20f85909d0e3237fd",
 "transcend/torus-aether/ui/app.js":"680896211b75074ab6047546f8ea45a4b0e35b8c",
 "transcend/torus-aether/ui/index.html":"8f315490a6d9b277dfa787f10fea81022b2cd043",
 "transcend/torus-aether/ui/server.mjs":"8ad17299f3040cb8da9093cd06731d959a7e513a"
};
test("all original training/visualization/HTTP source bytes are git-blob-identical to frozen V25 baseline",async()=>{
 for(const [p,sha]of Object.entries(unmodified)){
  const b=await fetchFile(p);
  assert.equal(gitBlob(b),sha,"UNAUTHORIZED REGRESSION at "+p);
 }
 console.log("V27_BYTES_IMMUTABLE",JSON.stringify({protectedFiles:Object.keys(unmodified).length,
   matchingExactBlobHashes:true}));
});
test("new studio includes every original control, id, input and original native script",async()=>{
 const old=(await fetchFile("transcend/torus-aether/ui/index.html")).toString("utf8");
 const fresh=(await fetchFile("transcend/torus-aether/ui/v27-studio.html")).toString("utf8");
 const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const a=ids(old),b=ids(fresh);
 assert.ok(a.every(id=>b.includes(id)),
   "Native DOM original IDs, including old chart IDs, all required");
 assert.equal(new Set(b).size,b.length,"No duplicate UI ids");
 for(const oldScript of ["app.js","text-hypermaze-live.js","veil-aether-live.js"]){
  assert.match(fresh,new RegExp('<script type="module" src="'+oldScript.replaceAll(".","\\.")+'"></script>'));
 }
 // Original legacy view and new shell use separate paths, neither overwritten.
 assert.match(fresh,/<style id="v27StandaloneStyle">/,"Inline CSS avoids original server MIME mismatch");
 assert.match(fresh,/<script type="module" src="v27-studio.js">/);
 assert.match(fresh,/id="evGo"/);
 assert.match(fresh,/id="allStart"/);
 assert.match(fresh,/id="allSave"/);
 assert.match(fresh,/id="textMazeCanvas"/);
 assert.match(fresh,/id="datasetProgressCount"/);
 console.log("V27_NATIVE_UI_PARITY",JSON.stringify({originalControls:a.length,
    newTotalIds:b.length,allOriginalControlsPreserved:true,
    originalsScriptsExact:true}));
});
test("read-only visual metrics match raw original /graphs input numerators and denominators",()=>{
 const raw={world:"original-world",corpus:{trainRows:1200000,heldOut:4000},
   graphs:[{w:0,status:"antrenează",arm:"original",
     test:{n:4000,aligned:.642,live:.617,together:.581,C:.594,field:.551},
     maze:{played:512,test:{n:512,solved:1,ratio:1,shape:1}},
     transform:{played:300,test:{n:80,solved:.81,ratio:1.32,
       failedRate:.17,saidLimitation:9,impossible:10}},
     progress:{trained:6,total:1200000,heldOut:4000,remaining:1199994,
       mode:"native-text",shards:1},
     shared:{training:{step:8192,preUpdatePredictionLoss:.348,
       identityBaselineLoss:.721}}}]};
 const j=JSON.stringify(raw),m=originalMetrics(raw,0);
 assert.equal(JSON.stringify(raw),j,"V27 must not mutate original payload");
 for(const [k,v] of Object.entries({
   textAligned:.642,textLegacy:.617,textTogether:.581,
   textC:.594,textWithField:.551,textTestN:4000,
   mazePlayed:512,mazeTestN:512,mazeShape:1,mazeSolved:1,mazeRatio:1,
   transPlayed:300,transSolved:.81,transRatio:1.32,transFailedRate:.17,
   transSaidLimitation:9,transImpossible:10,
   progressTrained:6,progressTotal:1200000,progressHeldOut:4000,
   progressRemaining:1199994,progressMode:"native-text",
   pytorchStep:8192,preUpdatePredictionLoss:.348,identityBaselineLoss:.721
 })){
   assert.deepEqual(m.measured[k],v,"metric changed: "+k);
 }
 assert.equal(m.labels.aligned,"64.2%");
 assert.equal(m.labels.legacy,"61.7%");
 assert.equal(m.labels.together,"58.1%");
 assert.equal(m.labels.mazeShape,"100.0%");
 assert.equal(m.labels.progress,nativeProgressPercent(6,1200000));
 assert.equal(m.labels.progress,"0.0005%");
 assert.equal(m.labels.loss,"0.348");
 assert.equal(m.labels.baseline,"0.721");
 const absent=originalMetrics({graphs:[{w:2,progress:null,test:null}]},2);
 assert.equal(absent.labels.aligned,"—");
 assert.equal(absent.labels.mazeSolved,"—");
 assert.equal(absent.labels.progress,"—");
 console.log("V27_NATIVE_METRICS_PARITY",JSON.stringify({
   originalAligned:m.labels.aligned,originalGraph:m.labels.legacy,
   originalTogether:m.labels.together,originalShape:m.labels.mazeShape,
   originalTrainDatasetProgress:m.labels.progress,
   originalPreUpdateLoss:m.labels.loss,absenceNeverFabricatesAccuracy:true}));
});
test("new UI has no native trainer or benchmark mutation endpoint calls",async()=>{
 const files=["transcend/torus-aether/ui/v27-studio.js",
 "transcend/torus-aether/ui/v27-native-metrics.mjs"];
 for(const p of files){
   const source=(await fetchFile(p)).toString("utf8");
   assert.doesNotMatch(source,/method\s*:\s*["']POST["']/i);
   assert.doesNotMatch(source,/fetch\s*\(\s*["'`]\/control|fetch\s*\(\s*["'`]\/controls|fetch\s*\(\s*["'`]\/gpu|fetch\s*\(\s*["'`]\/add/);
 }
 const src=(await fetchFile(files[0])).toString("utf8");
 assert.match(src,/fetch\("\/graphs"/);
 assert.match(src,/setInterval\(poll,1500\)/);
 console.log("V27_UI_READ_ONLY",JSON.stringify({newControllerUsesOnlyGET:true,
   originalNativeControlHandlersPreserved:true}));
});
