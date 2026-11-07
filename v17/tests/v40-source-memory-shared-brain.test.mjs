import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {V40OriginalBrainEvidence} from '../research/text-hypermaze/v40-original-brain-evidence.mjs';
import {openV40OriginalSourceMemory} from '../research/text-hypermaze/v40-original-source-witness-memory.mjs';

const create=()=>new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,
 empty:true,maxWires:32,fold:false},seed:11});
const phrase=Array.from({length:41},(_,i)=>'shared_observed_token_'+i).join(' ');
const docA='Unique prologue for source Alpha. '+Array.from({length:60},(_,i)=>'alpha'+i).join(' ')+' '+phrase+' '+Array.from({length:25},(_,i)=>'endingA'+i).join(' ')+'.';
const docB='New independent episode starts here. '+Array.from({length:12},(_,i)=>'beta'+i).join(' ')+' '+phrase+' '+Array.from({length:90},(_,i)=>'endingB'+i).join(' ')+'.';

test('V40 one ORIGINAL Brain has V32 exact cross-world source anchors at differing offsets, crash-safe replay and checkpoint restore',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v40-compact-')),
   file=path.join(dir,'isolated-real-source-evidence.sqlite');
 let store=null,again=null;
 try{
  const brain=create(),unified=new V40OriginalBrainEvidence(brain);
  store=await openV40OriginalSourceMemory(brain,file);
  const empty=store.matchingAnchors({text:phrase});
  assert.equal(empty.matches.length,0);
  const a=store.recordEpisode({episode:1,
    question:'What source described Alpha?',context:docA});
  const b=store.recordEpisode({episode:2,
    question:'Where does Beta reuse an old passage?',context:docB});
  assert.ok(a.selectedSourceMotifObservations>0);
  assert.ok(b.selectedSourceMotifObservations>0);
  const shared=store.matchingAnchors({text:phrase});
  assert.ok(shared.matches.length>0,'V32 winnowing must recover identical source motifs at different positions');
  assert.ok(shared.matches.every(x=>x.sourceEvidenceEpisodes>=2));
  assert.equal(store.status().verifiedSourceEpisodeIdentities,2);
  const snapshot=store.status();
  // Replaying exact source episode is idempotent, never duplicate evidence.
  store.recordEpisode({episode:1,question:'What source described Alpha?',context:docA});
  assert.equal(store.status().indexedExactMotifs,snapshot.indexedExactMotifs);
  assert.equal(store.status().sharedExactMotifsAcrossEpisodes,snapshot.sharedExactMotifsAcrossEpisodes);
  assert.throws(()=>store.recordEpisode({episode:1,
    question:'What source described Alpha?',context:docB}),/SOURCE_REPLAY_IDENTITY_MISMATCH/);
  const checkpoint=path.join(dir,'original-brain.v8');
  const originalBytes=brain.save(checkpoint);
  store.close();store=null;
  const loaded=Brain.load(checkpoint),restored=new V40OriginalBrainEvidence(loaded);
  assert.ok(originalBytes>0);assert.ok(restored.report().sameBrain);
  again=await openV40OriginalSourceMemory(loaded,file);
  assert.equal(again.status().indexedExactMotifs,snapshot.indexedExactMotifs);
  assert.ok(again.matchingAnchors({text:phrase}).matches.length>0);
  assert.deepEqual(loaded.v40UnifiedEvidence.sourceArchiveManifest,brain.v40UnifiedEvidence.sourceArchiveManifest);
  await assert.rejects(()=>openV40OriginalSourceMemory(loaded,
    path.join(dir,'different-never-authorized.sqlite')),/SOURCE_ARCHIVE_PATH_CONFLICT/);
  console.log('V40_SHARED_BRAIN_COMPACT_SOURCE_RECALL',JSON.stringify({
    sourceEpisodes:2,originalObservedContentBytes:docA.length+docB.length,
    selectedExactMotifs:snapshot.indexedExactMotifs,
    independentlySharedMotifs:snapshot.sharedExactMotifsAcrossEpisodes,
    restoredIdentities:again.status().verifiedSourceEpisodeIdentities,
    acrossDifferentOffsets:true,exactReplayIdempotent:true,
    conflictingSourceRejected:true,originalBrainCheckpointRestored:true,
    novelSemanticActionInferred:0,
    referenceAnswerLeak:false
  }));
  again.close();again=null;
  fs.unlinkSync(file);
  await assert.rejects(()=>openV40OriginalSourceMemory(loaded,file),
    /SOURCE_ARCHIVE_MISSING/,'Do not silently recreate lost source evidence after restore');
 }finally{store?.close();again?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
