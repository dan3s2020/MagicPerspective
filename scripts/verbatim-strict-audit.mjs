#!/usr/bin/env node
/**
 * Strict SOURCE-to-code coverage audit for MagicPerspective.
 *
 * This script DOES NOT claim to semantically understand every user sentence.
 * It verifies literal provenance and explicit evidence references for every
 * currently archived message, and it makes missing source/code/test evidence
 * visible. A green Node/Python test suite is NOT proof of the full Verbatim.
 * --report diagnoses without failure, --gate fails on noncompliance.
 */
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REPO=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=(root,path)=>resolve(root,path);
const readJson=(root,path)=>JSON.parse(readFileSync(file(root,path),'utf8'));
const safePath=(root,path)=>{
 if(typeof path!=='string'||!path.trim())return false;
 const target=file(root,path),back=relative(root,target);
 return back!==''&&!back.startsWith('..')&&!isAbsolute(back)&&existsSync(target);
};
const isValidSpan=(text,span)=>typeof span==='string'&&span.length>0&&text.includes(span);
const hasEvidence=(req)=>Boolean(req.code_paths?.length&&req.test_paths?.length&&
 typeof req.measured_result==='string'&&req.measured_result.trim()&&
 typeof req.regression_check==='string'&&req.regression_check.trim());

export function auditClause(req,sourceText,root=REPO){
 const sourceExists=typeof sourceText==='string';
 const problems=[];
 if(!sourceExists)problems.push('SOURCE_REF_MISSING');
 else if(!isValidSpan(sourceText,req.exact_source_span))problems.push('EXACT_SPAN_MISSING');
 if(!req.code_paths?.length)problems.push('NO_CODE_PATHS');
 if(!req.test_paths?.length)problems.push('NO_TEST_PATHS');
 if(!req.measured_result)problems.push('NO_MEASURED_RESULT');
 if(!req.regression_check)problems.push('NO_REGRESSION_GUARD');
 for(const path of req.code_paths||[])if(!safePath(root,path))problems.push('CODE_PATH_MISSING: '+path);
 for(const path of req.test_paths||[])if(!safePath(root,path))problems.push('TEST_PATH_MISSING: '+path);
 return {
  id:req.id,source_ref:req.source_ref,status:req.status??'UNVERIFIED',
  source_exact:sourceExists&&isValidSpan(sourceText,req.exact_source_span),
  evidence_complete:hasEvidence(req)&&problems.length===0,
  independently_verified:req.status==='VERIFIED'&&problems.length===0,
  problems
 };
}
export function auditConformity(root=REPO){
 const historical=readJson(root,'verbatim/coverage.json');
 const current=readJson(root,'verbatim/recent-user-messages.json');
 const chronology=readJson(root,'verbatim/continuation-index.json');
 const mirror=readJson(root,'verbatim/implementation-mirror.json');
 const errors=[];
 const records=[],byRef=new Map();
 const referenceFiles=new Set();
 if(current.messages.length!==chronology.entries.length)
  errors.push('MESSAGE_CHRONOLOGY_LENGTH_MISMATCH');
 for(const [i,m] of current.messages.entries()){
  if(byRef.has(m.ref))errors.push('DUPLICATE_MESSAGE_REF: '+m.ref);
  byRef.set(m.ref,m);
  const index=chronology.entries[i];
  if(m.role!=='USER'||index?.ref!==m.ref||index?.order!==i+1||
   m.order_in_recoverable_user_sequence!==i+1)
   errors.push('MESSAGE_ORDER_MISMATCH: '+m.ref);
  const validFile=safePath(root,m.source_path);
  const original=validFile?readFileSync(file(root,m.source_path),'utf8'):null;
  if(!validFile||original!==m.text)errors.push('LITERAL_USER_SOURCE_NOT_EXACT: '+m.ref);
  referenceFiles.add(m.source_path);
  records.push({ref:m.ref,source_path:m.source_path,role:m.role,
   source_exact:validFile&&original===m.text});
 }
 // A requirement is not a meaningful proof unless its quote is literally
 // present, and its existing implementation AND test files are named.
 const ids=new Set(),requirements=[];
 for(const req of mirror.requirements){
  if(ids.has(req.id))errors.push('DUPLICATE_REQUIREMENT_ID: '+req.id);
  ids.add(req.id);
  requirements.push(auditClause(req,byRef.get(req.source_ref)?.text,root));
 }
 const covered=new Set(requirements.map(r=>r.source_ref));
 const uncovered=records.filter(r=>!covered.has(r.ref)).map(r=>r.ref);
 const extraUserFiles=[];
 // Detect original USER source files not even indexed in the recent ledger.
 // The historic 56-message archive is tracked separately.
 for(const name of readdirSync(file(root,'verbatim'))){
  if(!name.includes('-USER-VERBATIM.txt'))continue;
  const p='verbatim/'+name;
  if(!referenceFiles.has(p))extraUserFiles.push(p);
 }
 const badClauses=requirements.filter(r=>r.problems.length>0);
 const legacyUnverified=(historical.messages||[]).filter(x=>x.coverage!=='VERIFIED').length;
 const declaredComplete=Boolean(historical.source?.complete_export_verified&&
  historical.claim_policy&&Object.values(historical.claim_policy).every(Boolean)&&
  mirror.full_implementation_conformity_verified===true&&
  chronology.full_native_transcript_verified===true&&
  chronology.complete_original_transcript===true);
 // The strict release contract ALSO requires every archived USER message
 // mapped to one or more atomic clauses and each declared VERIFIED with tests.
 const allRequirementVerified=requirements.length>0&&requirements.every(r=>r.independently_verified);
 const allMessageMapped=uncovered.length===0&&extraUserFiles.length===0;
 const integrityOk=errors.length===0&&badClauses.every(r=>r.source_exact);
 const compliant=declaredComplete&&allRequirementVerified&&allMessageMapped&&
  integrityOk&&legacyUnverified===0&&badClauses.length===0;
 return {
  schema:'magicperspective.verbatim.strict-audit.v1',
  outcome:compliant?'CONFORMITY_VERIFIED':'NOT_VERIFIED',
  release_gate:compliant?'PASS':'BLOCKED',
  important:'Structural source/path evidence is NOT semantic or behavioral proof. A full original transcript and independent held-out system tests remain mandatory.',
  source:{historic_indexed:historical.messages.length,
   historic_unverified:legacyUnverified,
   full_native_transcript_verified:declaredComplete,
   recent_literal_user_messages:records.length,
   indexed_assistant_replies_complete:false,
   media_originals_complete:false},
  requirements:{
   tracked:requirements.length,
   with_literal_source_span:requirements.filter(r=>r.source_exact).length,
   with_code_tests_and_evidence:requirements.filter(r=>r.evidence_complete).length,
   independently_verified:requirements.filter(r=>r.independently_verified).length,
   missing_atomic_message_mapping:uncovered,
   unindexed_user_source_files:extraUserFiles,
   incomplete_evidence:badClauses,
   not_verified:requirements.filter(r=>!r.independently_verified).map(r=>r.id)
  },
  integrity:{status:integrityOk?'PASS':'FAIL',errors},
  scientifically_open:[
   {source:'toroid.py: solid_torus4_position(label)',
    issue:'4D coordinates are deterministic SHA-256 layout, not learned 4D spatial organization',
    status:'NOT_VERIFIED'},
   {source:'engine.py: MAX_NODES=32768',
    issue:'Fixed graph capacity is not unlimited self-directed structural growth',
    status:'NOT_VERIFIED'},
   {source:'perspective.py: PerspectiveLearner.contrast',
    issue:'Matched-action sensitivity estimator is not verified emergence of a self/world boundary',
    status:'NOT_VERIFIED'},
   {source:'engine.py: text_world',
    issue:'text_world eight-option byte-choice task is not free-form conversational language ability',
    status:'NOT_VERIFIED'},
   {source:'engine.py + VERBATIM user requirements',
    issue:'14 million different completed exercises and positive cross-domain solution-shape transfer not demonstrated',
    status:'NOT_VERIFIED'},
   {source:'portal-v7-hypercube-4d/growth-server.mjs',
    issue:'Standalone torus telemetry is not automatically connected to the original V7 CUDA or V14 brain',
    status:'NOT_VERIFIED'},
   {source:'verbatim/SOURCE_POLICY.md',
    issue:'The entire original chronological conversation, assistant turns and all media have not been recovered',
    status:'BLOCKED_SOURCE_INCOMPLETE'}
  ]
 };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=auditConformity();
 if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
 else{
  console.log('MAGICPERSPECTIVE: '+result.outcome+' ('+result.release_gate+')');
  console.log('Recent original USER messages: '+result.source.recent_literal_user_messages);
  console.log('Tracked atomic clauses: '+result.requirements.tracked);
  console.log('Message refs without atomic mapping: '+result.requirements.missing_atomic_message_mapping.length);
  console.log('Requirements missing source/code/test/evidence: '+result.requirements.incomplete_evidence.length);
  console.log('Verified clauses: '+result.requirements.independently_verified);
  for(const q of result.scientifically_open)console.log('OPEN: '+q.issue);
  for(const s of result.requirements.missing_atomic_message_mapping)console.log('UNMAPPED: '+s);
  for(const f of result.requirements.unindexed_user_source_files)console.log('NOT INDEXED: '+f);
  for(const q of result.requirements.incomplete_evidence)
   console.log('INCOMPLETE '+q.id+': '+q.problems.join(', '));
  console.log('The full transcript and independent behavior tests are mandatory.');
 }
 if(process.argv.includes('--gate')&&result.release_gate!=='PASS')process.exitCode=1;
}
