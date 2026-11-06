import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,dirname} from "node:path";
import {isCodePath,safeRepoPath,validateContract,checkChangeSet} from "../scripts/user-intent-gate.mjs";

const REQUEST="Use the ORIGINAL maze solution-shape mechanism when building a navigable language world, with no unapproved substitutions.";
const EXTRA="I explicitly authorize adding an optional latent predictor as a separate, disabled experiment while preserving the original maze route method.";
function withRepo(fn){
 const root=mkdtempSync(join(tmpdir(),"mp-user-intent-test-"));
 const put=(file,body="export const x = 1;\n")=>{
  mkdirSync(dirname(join(root,file)),{recursive:true});
  writeFileSync(join(root,file),body);
 };
 try{
  put("verbatim/USER.md","# USER\n\n"+REQUEST+"\n\n"+EXTRA+"\n");
  put("src/maze.js");put("src/text-world.js");put("src/maze.test.mjs");
  put("v17/transcend/torus-aether/worlds/exercise.mjs");
  const make=()=>({
   schema:"magicperspective.user-intent.change-contract.v1",
   regression_guard:"MP-REG-2026-11-06-001",
   contract_id:"MP-USER-001-explicit-original-maze",
   mode:"DIRECT_IMPLEMENTATION",
   source:{path:"verbatim/USER.md",exact_user_quote:REQUEST},
   original_baseline:{
     source_path:"src/maze.js",algorithm:"Discoverer.shape()",
     reuse_without_substitution:true,preserve_user_definitions:true
   },
   changed_code_paths:["src/text-world.js"],
   added_mechanisms:[],
   additional_user_authorization_quote:null,
   authorize_original_algorithm_replacement_quote:null,
   acceptance_tests:["src/maze.test.mjs"],
   actual_observed_results:"NOT_VERIFIED — tests pending; no scientific claim",
   limitations:["Full Verbatim incomplete"],
   verification_status:"NOT_VERIFIED",
   full_verbatim_gate:"BLOCKED"
  });
  fn({root,make,put});
 }finally{rmSync(root,{recursive:true,force:true});}
}
test("code-path classifier does not confuse user Verbatim or policy documents with source changes",()=>{
 assert.equal(isCodePath("src/text-world.js"),true);
 assert.equal(isCodePath("v17/transcend/torus-aether/worlds/exercise.mjs"),true);
 assert.equal(isCodePath("tests/real.test.mjs"),true);
 assert.equal(isCodePath(".github/workflows/user-intent-guard.yml"),true);
 assert.equal(isCodePath("verbatim/USER.md"),false);
 assert.equal(isCodePath("README.md"),false);
 assert.equal(isCodePath("user-intent/changes/legitimate.json"),false);
 assert.equal(safeRepoPath("../../secrets"),false);
 assert.equal(safeRepoPath("verbatim/USER.md"),true);
});
test("exact user quote, original maze method, test file and BLOCKED Verbatim are required",()=>{
 withRepo(({root,make})=>{
  assert.deepEqual(validateContract(make(),{root}),[]);
  const a=make();a.source.exact_user_quote="INVENTED assistant paraphrase";assert.ok(validateContract(a,{root}).includes("REQUEST_QUOTE_NOT_PRESENT_VERBATIM"));
  const b=make();b.original_baseline.reuse_without_substitution=false;assert.ok(validateContract(b,{root}).includes("ORIGINAL_ALGORITHM_NOT_PRESERVED"));
  const c=make();c.full_verbatim_gate="PASS";assert.ok(validateContract(c,{root}).includes("FALSE_COMPLETE_VERBATIM_CLAIM"));
  const d=make();d.acceptance_tests=["src/not-real.test.mjs"];assert.ok(validateContract(d,{root}).includes("MISSING_EXISTING_EXECUTABLE_ACCEPTANCE_TEST"));
  const e=make();e.original_baseline.preserve_user_definitions=false;assert.ok(validateContract(e,{root}).includes("USER_DEFINITIONS_NOT_PRESERVED"));
 });
});
test("new latent mechanism in direct language implementation is a hard blocking regression",()=>{
 withRepo(({root,make})=>{
  const original=make();
  assert.equal(checkChangeSet({
   changedFiles:["src/text-world.js"],
   diffAdded:{"src/text-world.js":["const neighbors = originalMaze.neighbors(state);"]},
   contracts:[{path:"user-intent/changes/a.json",data:original}],root
  }).ok,true);
  const substituted=checkChangeSet({
   changedFiles:["src/text-world.js"],
   diffAdded:{"src/text-world.js":["const encoder = new LatentEncoder(32);"]},
   contracts:[{path:"user-intent/changes/a.json",data:original}],root
  });
  assert.equal(substituted.ok,false);
  assert.ok(substituted.failures.some(x=>x.startsWith("PROHIBITED_LATENT_OR_TOKEN_SUBSTITUTION")));
  const smuggled=make();smuggled.added_mechanisms=["32D latent encoder"];
  assert.ok(validateContract(smuggled,{root}).includes("UNAUTHORIZED_NEW_MECHANISM_IN_DIRECT_IMPLEMENTATION"));
 });
});
test("new mechanism requires a distinct literal user authorization from the same source",()=>{
 withRepo(({root,make})=>{
  const a=make();a.mode="USER_AUTHORIZED_EXTENSION";a.added_mechanisms=["optional latent control"];
  a.additional_user_authorization_quote=EXTRA;
  assert.deepEqual(validateContract(a,{root}),[]);
  a.additional_user_authorization_quote=REQUEST;
  assert.ok(validateContract(a,{root}).includes("NO_DISTINCT_VERBATIM_APPROVAL_FOR_ADDED_MECHANISM"));
 });
});
test("PR may not change executable source without changed-file scope and user contract",()=>{
 withRepo(({root,make})=>{
  const noContract=checkChangeSet({changedFiles:["src/text-world.js"],contracts:[],root});
  assert.ok(noContract.failures.includes("CODE_CHANGED_WITHOUT_VERBATIM_USER_CONTRACT"));
  const mismatch=checkChangeSet({
   changedFiles:["src/text-world.js","src/maze.js"],
   contracts:[{path:"user-intent/changes/one.json",data:make()}],root
  });
  assert.ok(mismatch.failures.some(x=>x.includes("CODE_FILE_NOT_DECLARED_IN_CONTRACT: src/maze.js")));
  assert.equal(checkChangeSet({changedFiles:["README.md"],contracts:[],root}).ok,true);
 });
});
test("modifying the original maze algorithm requires separate exact user permission",()=>{
 withRepo(({root,make})=>{
  const a=make();a.changed_code_paths=["v17/transcend/torus-aether/worlds/exercise.mjs"];
  const result=checkChangeSet({
   changedFiles:a.changed_code_paths,
   contracts:[{path:"user-intent/changes/a.json",data:a}],root
  });
  assert.equal(result.ok,false);
  assert.ok(result.failures.some(x=>x.startsWith("ORIGINAL_MAZE_ALGORITHM_MODIFIED")));
 });
});
