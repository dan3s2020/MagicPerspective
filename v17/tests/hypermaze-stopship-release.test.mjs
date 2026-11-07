import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
const here=path.dirname(fileURLToPath(import.meta.url));
const gate=path.resolve(here,"../research/text-hypermaze/production-release-gate.mjs");
test("FULL release must refuse misleading component metrics as 100% long unseen answers",()=>{
 const r=spawnSync(process.execPath,[gate,"--gate"],{
  encoding:"utf8",timeout:12000});
 assert.equal(r.status,1,"A 42/42 original maze parity + 6/6 short text is NOT evidence of full semantic success");
 const output=JSON.parse(r.stdout);
 assert.equal(output.status,"BLOCKED");
 assert.equal(output.accepted,false);
 assert.ok(output.unsatisfied.some(x=>x.includes("heldout")||
  x.includes("independent semantic")));
 assert.equal(output.recordedEvidence,false);
 assert.equal(fs.existsSync(path.resolve(here,"../research/text-hypermaze/PRODUCTION_ACCEPTANCE_EVIDENCE.json")),false,
  "No invented production evidence is allowed in repository");
 console.log("REAL_HYPERMAZE_STOPSHIP_BLOCKED",JSON.stringify({
  originalNativeMazeShapeParity:"42/42 exact",
  nativeSmallTextComposition:"6/6 heldout structured",
  causalGeometryBenefit:"NOT PROVEN",
  exactLongUnseenAnswers:"NOT VERIFIED",
  originalGPUFastCorpus:"NOT PORTED/NOT VERIFIED",
  releaseCommandAuthorized:false}));
});
