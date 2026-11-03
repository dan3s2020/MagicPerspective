#!/usr/bin/env node
// Verifies saved Verbatim text, stable chronology, and the version-implementation mirror.
// This is an integrity check, NOT proof that the entire conversation was retrieved.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
export function auditMirror(){
 const problems=[];
 const recent=read('verbatim/recent-user-messages.json');
 const chronology=read('verbatim/continuation-index.json');
 const mirror=read('verbatim/implementation-mirror.json');
 const messages=recent.messages;
 if(messages.length!==chronology.entries.length)problems.push('Chronology count differs from user ledger');
 for(let i=0;i<messages.length;i++){
   const m=messages[i],c=chronology.entries[i];
   if(!c||c.ref!==m.ref||c.order!==i+1||m.order_in_recoverable_user_sequence!==i+1)
     problems.push('Order or reference mismatch at '+(i+1));
   if(m.role!=='USER'||!m.text||!m.text.length)problems.push('Missing original user text at '+(i+1));
   if(m.source_path){
     const p=resolve(root,m.source_path);
     if(!existsSync(p))problems.push('Missing source file for '+m.ref);
     else if(readFileSync(p,'utf8')!==m.text)problems.push('Source text differs from ledger: '+m.ref);
   }
 }
 for(const req of mirror.requirements){
   const source=messages.find(m=>m.ref===req.source_ref);
   if(!source)problems.push('Requirement has unknown verbatim source: '+req.id);
   else if(!source.text.includes(req.exact_source_span))problems.push('Requirement quote does not match original message: '+req.id);
   if(req.status==='VERIFIED'){
     if(!req.code_paths?.length||!req.test_paths?.length||!req.measured_result)
       problems.push('VERIFIED claim lacks code, tests or measurements: '+req.id);
     for(const path of [...(req.code_paths||[]),...(req.test_paths||[])])
       if(!existsSync(resolve(root,path)))problems.push('VERIFIED claim references missing path: '+req.id+' '+path);
   }
 }
 for(const v of mirror.versions){
   if(v.in_repo&&!existsSync(resolve(root,v.path)))problems.push('Missing version directory: '+v.path);
   if(v.state==='VERIFIED_CONFORMANT'&&!v.verified_requirement_ids?.length)
     problems.push('Version marked conformant without verified requirements: '+v.id);
 }
 if(chronology.full_native_transcript_verified!==false)
   problems.push('Native transcript must not be declared complete without source evidence');
 if(mirror.full_implementation_conformity_verified!==false)
   problems.push('Implementation conformity must not be falsely declared complete');
 return {integrity:problems.length?'FAIL':'PASS',gate:'BLOCKED',messages:messages.length,versions:mirror.versions.length,requirements:mirror.requirements.length,problems};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=auditMirror();console.log(JSON.stringify(a,null,2));
 if(a.integrity!=='PASS'||process.argv.includes('--gate'))process.exitCode=1;
}
