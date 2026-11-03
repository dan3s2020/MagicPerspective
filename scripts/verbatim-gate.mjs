#!/usr/bin/env node
// Literal Verbatim audit. It NEVER infers implementation from matching feature names.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
export function audit(){
  const lock=read('verbatim/coverage.json'),original=readFileSync(resolve(root,lock.source.path));
  const sha=createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex');
  const parsed=[...original.toString('utf8').matchAll(/^### Mesajul (\d+) — (USER|ASSISTANT)(?:[^\n]*)$/gm)]
    .map(m=>({id:Number(m[1]),role:m[2]}));
  const errors=[];
  if(sha!==lock.source.git_blob_sha)errors.push('Original transcript changed since ledger lock');
  if(parsed.length!==lock.source.message_count)errors.push('Message count mismatch');
  if(parsed.some((m,i)=>m.id!==i+1))errors.push('Archived message numbering is not consecutive');
  if(parsed.length!==lock.messages.length)errors.push('Some archived messages not indexed');
  for(let i=0;i<parsed.length;i++){
    const e=lock.messages[i],s=parsed[i];
    if(!e||e.id!==s.id||e.role!==s.role){errors.push('Missing verbatim entry at message '+s.id);continue;}
    if(e.coverage==='VERIFIED'){
      if(!e.evidence?.length||!e.tests?.length)errors.push('Missing proof for #'+s.id);
      for(const p of [...(e.evidence||[]),...(e.tests||[])])if(typeof p!=='string'||!existsSync(resolve(root,p)))errors.push('Nonexistent evidence for #'+s.id);
    }else if(!['UNVERIFIED','BLOCKED'].includes(e.coverage))errors.push('Invalid coverage state at #'+s.id);
  }
  const fullyCertified=lock.source.complete_export_verified===true
    &&Object.values(lock.claim_policy).every(v=>v===true)
    &&lock.messages.every(m=>m.coverage==='VERIFIED')
    &&errors.length===0;
  if(!lock.source.complete_export_verified)errors.push('Original complete conversation NOT certified');
  if(!lock.claim_policy.atomic_clause_index_complete)errors.push('Individual words/clauses have no complete implementation map');
  if(!lock.claim_policy.all_implementations_verified)errors.push('Implementation tests do not cover entire original transcript');
  if(!lock.claim_policy.full_transcript_source_available)errors.push('Full transcript source missing');
  return {status:fullyCertified?'VERBATIM_COMPLETE_VERIFIED':'VERBATIM_INCOMPLETE',
    gate:fullyCertified?'PASS':'BLOCKED',indexed:lock.messages.length,
    verified:lock.messages.filter(m=>m.coverage==='VERIFIED').length,
    lastArchived:parsed.at(-1)?.id??null,originalGitBlobSha:sha,
    sourceMatches:sha===lock.source.git_blob_sha,errors};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=audit();
  if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
  else{
    console.log('MagicPerspective '+result.status+' — '+result.indexed+' messages indexed; '+result.verified+' verified');
    for(const problem of result.errors)console.log('BLOCKED: '+problem);
  }
  if(process.argv.includes('--gate')&&result.gate!=='PASS')process.exitCode=1;
}
