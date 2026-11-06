#!/usr/bin/env node
/**
 * MagicPerspective user-intent change gate.
 *
 * Structural PR admission policy. NOT a proof of scientific correctness, genuine
 * user authorization, full Verbatim recovery, or live acceptance tests.
 *
 * It rejects untraceable additions that would let a contributor quietly redefine
 * the user's requested original maze-to-language solution-shape mechanism.
 *
 * The PR must be reviewed by a human. GitHub branch protection must require this
 * workflow, otherwise direct pushes/admin bypass remain possible.
 */
import {existsSync,readFileSync} from "node:fs";
import {resolve,relative,dirname,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const CONTRACT_DIR="user-intent/changes/";
const CONTRACT_SCHEMA="magicperspective.user-intent.change-contract.v1";
const REGRESSION="MP-REG-2026-11-06-001";
const CODE_EXT=new Set([".js",".mjs",".cjs",".jsx",".ts",".tsx",".py",".ps1",".sh",".html",".css",".json",".yml",".yaml",".rs",".cpp",".c",".h",".cu"]);
const CODE_ROOTS=/^(?:src\/|scripts\/|engine\/|experiments\/|isolated\/|tests\/|test\/|v\d+\/|web\/|ui\/|cuda\/|\.github\/workflows\/)/;
const HIGH_RISK_LANGUAGE=/(?:^|\/)(?:language|linguist|causal[-_]text|text[-_]?action|text[-_]?world|text[-_]?path|text[-_]?learn|text[-_]?navigator)/i;
const SUBSTITUTE_TOKENS=/\b(?:latent|encoder|decoder|embedding|embeddings|next[_-]?(?:token|character|char)|TextCard|SGD)\b/i;
const ORIGINAL_MAZE_PATH=/\/worlds\/exercise\.mjs$/;
const NULL_VALUE=x=>x===null||x===undefined||x==="";

export function safeRepoPath(p){
 if(typeof p!=="string"||!p||p.startsWith("/")||p.includes("\\")||p.includes("\0"))return false;
 const segments=p.split("/");
 return !segments.includes("..")&&!segments.includes(".")&&!segments.some(x=>!x);
}
export function isCodePath(p){
 if(!safeRepoPath(p))return false;
 if(p.startsWith(CONTRACT_DIR)||p==="user-intent/CHANGE_CONTRACT_TEMPLATE.json"||p.startsWith("verbatim/"))return false;
 if(/(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(p))return false;
 return CODE_ROOTS.test(p)&&CODE_EXT.has(extname(p).toLowerCase());
}
function existsFile(path,root=ROOT){
 return safeRepoPath(path)&&existsSync(resolve(root,path));
}
export function validateContract(record,{root=ROOT,read=(p)=>readFileSync(resolve(root,p),"utf8")}={}){
 const failures=[];
 if(!record||typeof record!=="object"||Array.isArray(record))return ["INVALID_CONTRACT_OBJECT"];
 if(record.schema!==CONTRACT_SCHEMA)failures.push("INVALID_CONTRACT_SCHEMA");
 if(record.regression_guard!==REGRESSION)failures.push("MISSING_BLOCKING_REGRESSION_REFERENCE");
 if(typeof record.contract_id!=="string"||record.contract_id.length<8||record.contract_id.includes("REPLACE_WITH"))
   failures.push("MISSING_UNIQUE_CONTRACT_ID");
 const mode=record.mode;
 if(!["DIRECT_IMPLEMENTATION","USER_AUTHORIZED_EXTENSION"].includes(mode))failures.push("INVALID_CHANGE_MODE");
 const source=record.source||{};
 if(!safeRepoPath(source.path)||!source.path.startsWith("verbatim/")||!existsFile(source.path,root))
   failures.push("INVALID_OR_MISSING_LITERAL_USER_SOURCE");
 let original="";
 if(safeRepoPath(source.path)&&existsFile(source.path,root)){
   try{original=read(source.path)}catch{failures.push("UNREADABLE_USER_SOURCE");}
 }
 if(typeof source.exact_user_quote!=="string"||source.exact_user_quote.trim().length<25||
    !original.includes(source.exact_user_quote)||source.exact_user_quote.includes("PASTE AN EXACT"))
   failures.push("REQUEST_QUOTE_NOT_PRESENT_VERBATIM");
 const baseline=record.original_baseline||{};
 if(!safeRepoPath(baseline.source_path)||!existsFile(baseline.source_path,root))failures.push("ORIGINAL_BASELINE_CODE_NOT_INSPECTABLE");
 if(typeof baseline.algorithm!=="string"||baseline.algorithm.length<4||baseline.algorithm.includes("REPLACE_WITH"))
   failures.push("ORIGINAL_ALGORITHM_NOT_NAMED");
 if(baseline.reuse_without_substitution!==true)failures.push("ORIGINAL_ALGORITHM_NOT_PRESERVED");
 if(baseline.preserve_user_definitions!==true)failures.push("USER_DEFINITIONS_NOT_PRESERVED");
 const changed=record.changed_code_paths;
 if(!Array.isArray(changed)||changed.length===0||changed.some(x=>!isCodePath(x)))
   failures.push("INVALID_CHANGED_CODE_PATHS");
 const tests=record.acceptance_tests;
 if(!Array.isArray(tests)||tests.length===0||tests.some(t=>!safeRepoPath(t)||!existsFile(t,root)||!/\.(?:test\.(?:[cm]?js|ts)|test\.py|spec\.(?:js|ts))$/.test(t)))
   failures.push("MISSING_EXISTING_EXECUTABLE_ACCEPTANCE_TEST");
 if(record.full_verbatim_gate!=="BLOCKED")failures.push("FALSE_COMPLETE_VERBATIM_CLAIM");
 if(!["NOT_VERIFIED","PARTIAL","TESTED","PROVEN"].includes(record.verification_status))
   failures.push("INVALID_VERIFICATION_STATUS");
 if(typeof record.actual_observed_results!=="string"||!record.actual_observed_results.trim())
   failures.push("MISSING_ACTUAL_OBSERVED_RESULT");
 if(!Array.isArray(record.limitations)||!record.limitations.length)
   failures.push("NO_DISCLOSED_LIMITATIONS");
 if(!Array.isArray(record.added_mechanisms))failures.push("NEW_MECHANISMS_NOT_DECLARED");
 if(mode==="DIRECT_IMPLEMENTATION"){
   if(Array.isArray(record.added_mechanisms)&&record.added_mechanisms.length>0)
     failures.push("UNAUTHORIZED_NEW_MECHANISM_IN_DIRECT_IMPLEMENTATION");
   if(!NULL_VALUE(record.additional_user_authorization_quote))
     failures.push("ALTERNATIVE_MECHANISM_NOT_ALLOWED_IN_DIRECT_IMPLEMENTATION");
 }
 if(mode==="USER_AUTHORIZED_EXTENSION"){
   const approval=record.additional_user_authorization_quote;
   if(typeof approval!=="string"||approval.trim().length<25||!original.includes(approval)||approval===source.exact_user_quote)
     failures.push("NO_DISTINCT_VERBATIM_APPROVAL_FOR_ADDED_MECHANISM");
   if(!Array.isArray(record.added_mechanisms)||record.added_mechanisms.length<1)
     failures.push("NO_EXPLICITLY_DISCLOSED_ADDITIONAL_MECHANISMS");
 }
 if(!NULL_VALUE(record.authorize_original_algorithm_replacement_quote)){
   const approval=record.authorize_original_algorithm_replacement_quote;
   if(mode!=="USER_AUTHORIZED_EXTENSION"||typeof approval!=="string"||!original.includes(approval)||approval===source.exact_user_quote)
     failures.push("ORIGINAL_ALGORITHM_REPLACEMENT_NOT_SEPARATELY_AUTHORIZED");
 }
 return failures;
}
export function checkChangeSet({changedFiles=[],diffAdded={},contracts=[],root=ROOT,read}={}){
 const failures=[],codes=changedFiles.filter(isCodePath);
 if(!codes.length)return {ok:true,codeFiles:[],contracts:0,failures:[]};
 if(!contracts.length)return {ok:false,codeFiles:codes,contracts:0,failures:["CODE_CHANGED_WITHOUT_VERBATIM_USER_CONTRACT"]};
 const covered=new Set(),records=[];
 for(const entry of contracts){
   if(!entry||typeof entry!=="object"||typeof entry.path!=="string"||!entry.path.startsWith(CONTRACT_DIR)||!entry.path.endsWith(".json")){
     failures.push("CONTRACT_NOT_UNDER_UNIQUE_USER_INTENT_PATH");continue;
   }
   const errors=validateContract(entry.data,{root,read});
   if(errors.length)failures.push(...errors.map(e=>entry.path+": "+e));
   records.push(entry);
   for(const file of entry.data?.changed_code_paths||[])covered.add(file);
 }
 for(const code of codes){
   if(!covered.has(code)){failures.push("CODE_FILE_NOT_DECLARED_IN_CONTRACT: "+code);continue;}
   const contract=records.find(x=>x.data.changed_code_paths.includes(code));
   const added=diffAdded[code]||[];
   if(HIGH_RISK_LANGUAGE.test(code)&&contract.data.mode==="DIRECT_IMPLEMENTATION"&&
     added.some(line=>SUBSTITUTE_TOKENS.test(line)&&!/^\s*(?:\/\/|#|\*|<!--)/.test(line))){
      failures.push("PROHIBITED_LATENT_OR_TOKEN_SUBSTITUTION_IN_DIRECT_LANGUAGE_ADAPTER: "+code);
   }
   if(ORIGINAL_MAZE_PATH.test(code)&&
      NULL_VALUE(contract.data.authorize_original_algorithm_replacement_quote)){
      failures.push("ORIGINAL_MAZE_ALGORITHM_MODIFIED_WITHOUT_SEPARATE_USER_AUTHORIZATION: "+code);
   }
 }
 return {ok:failures.length===0,codeFiles:codes,contracts:records.length,failures:[...new Set(failures)]};
}
function git(args){
 return execFileSync("git",args,{cwd:ROOT,encoding:"utf8",maxBuffer:16*1024*1024}).trim();
}
function parseDiffAdded(patch){
 const map={};let file=null;
 for(const line of patch.split("\n")){
   if(line.startsWith("+++ b/")){file=line.slice(6);map[file]??=[];}
   else if(line.startsWith("+++ /dev/null"))file=null;
   else if(file&&line.startsWith("+")&&!line.startsWith("+++"))map[file].push(line.slice(1));
 }
 return map;
}
export function auditGitDiff(base,head="HEAD"){
 if(!/^[A-Za-z0-9._/^~-]{3,160}$/.test(base)||!/^[A-Za-z0-9._/^~-]{3,160}$/.test(head))
   throw Error("Invalid Git base/head revision");
 const changed=git(["diff","--diff-filter=ACMR","--name-only",base+"..."+head]).split("\n").filter(Boolean);
 const newContractPaths=changed.filter(p=>p.startsWith(CONTRACT_DIR)&&p.endsWith(".json"));
 const contracts=newContractPaths.map(path=>{
   if(!existsFile(path))throw Error("Missing contract: "+path);
   return {path,data:JSON.parse(readFileSync(resolve(ROOT,path),"utf8"))};
 });
 const added=parseDiffAdded(git(["diff","--no-ext-diff","--unified=0",base+"..."+head,"--"]));
 return checkChangeSet({changedFiles:changed,diffAdded:added,contracts});
}
function runCLI(){
 const args=process.argv.slice(2);
 if(args.includes("--help")){
   console.log("Usage: node scripts/user-intent-gate.mjs --base <PR_BASE_SHA> [--head HEAD]");
   return;
 }
 const b=args.indexOf("--base"),h=args.indexOf("--head");
 const base=b>=0?args[b+1]:process.env.USER_INTENT_BASE_SHA;
 const head=h>=0?args[h+1]:"HEAD";
 if(!base){console.error("MISSING_PR_BASE: pass --base. Run on PR checkout with fetch-depth: 0.");process.exitCode=2;return;}
 const result=auditGitDiff(base,head);
 console.log(JSON.stringify({schema:"magicperspective.user-intent.regression-gate.v1",
   regression_guard:REGRESSION,release_verbatim:"BLOCKED",
   disclaimer:"Source quote and scope validation is structural, NOT an automatic proof of legitimate human authorization or behavioral equivalence.",
   ...result},null,2));
 if(!result.ok)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{runCLI()}catch(e){console.error("USER_INTENT_GUARD_ERROR:",e.stack||e);process.exitCode=2;}
}
