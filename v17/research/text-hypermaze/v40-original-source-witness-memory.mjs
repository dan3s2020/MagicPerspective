// V40 read-only-in-inference source witness memory derived from exact original
// V32 compact archival implementation. Separate SQLite sidecar backed by
// SAME original V34 Brain.v8 manifest. Never infer semantic transformation from
// two similar source strings; these are source-provenance anchors only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Brain} from '../../transcend/torus-aether/devour/brain.mjs';
import {sourceTokens} from './real-squad-evidence-paths.mjs';
import {selectAnchors} from './winnow-token-anchors.mjs';
import {openCompactNativeMotifArchive} from './native-motif-compact-archive.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const witnessId=(tokens,at,width)=>width+':'+sha(
 JSON.stringify(tokens.slice(at,at+width)));
const norm=s=>String(s).normalize('NFC');

export async function openV40OriginalSourceMemory(brain,filename){
 if(!(brain instanceof Brain))throw Error('Actual original Brain required');
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.sqlite'))
  throw Error('Absolute isolated SQLite source archive path required');
 const original=brain.v40UnifiedEvidence;
 if(!original?.version||original.version!==1)
  throw Error('V40 one-Brain evidence must be initialized before source memory');
 const manifest=original.sourceArchiveManifest;
 if(manifest?.file&&manifest.file!==filename)
  throw Error('SOURCE_ARCHIVE_PATH_CONFLICT: restore the original source archive; never switch silently');
 if(manifest?.file&&!fs.existsSync(filename))
  throw Error('SOURCE_ARCHIVE_MISSING: checkpoint cannot invent old witnessed paths');
 const archive=await openCompactNativeMotifArchive(filename);
 const status=archive.status();
 if(manifest?.indexedEpisodes&&status.verifiedSourceEpisodeIdentities<manifest.indexedEpisodes){
  archive.close();
  throw Error('SOURCE_ARCHIVE_EVIDENCE_MISSING: old source episodes absent after checkpoint restore');
 }
 const keep=()=>{
  const s=archive.status();
  original.sourceArchiveManifest={
   version:1,file:filename,indexedEpisodes:s.verifiedSourceEpisodeIdentities,
   indexedExactMotifs:s.indexedExactMotifs,sourceEvidenceOnly:true
  };
  return s;
 };
 keep();
 let closed=false;
 return {
  recordEpisode({episode,question,context}={}){
   if(closed)throw Error('Original source archive closed');
   if(!Number.isSafeInteger(episode)||episode<1||
      typeof question!=='string'||typeof context!=='string')
    throw Error('Real complete source question and passage required');
   if(question.length>200000||context.length>200000)
    throw Error('Explicit source length budget exceeded; no partial silent source');
   const identity=sha(JSON.stringify([norm(question),norm(context)]));
   archive.beginEpisode(episode,identity);
   let motifs=0,edges=0;
   try{
    // Native V32's source role vocabulary has "question" and "answer":
    // here "answer" labels the *observed passage only*, NOT a gold label.
    // This index never records reference answer spans for frozen DEV data.
    for(const [role,s] of [['question',question],['answer',context]]){
     const tokens=sourceTokens(s).map(t=>norm(t.text));
     let prior=null,index=0;
     for(const width of [5,12])for(const a of selectAnchors(tokens,{width,window:16})){
      const id=witnessId(tokens,a.at,width);
      archive.motif({id,width,role,at:a.at,
       example:tokens.slice(a.at,a.at+width).join(' ')});
      motifs++;
      if(prior){
       archive.edge({from:prior,to:id,role:'observed-QA-source-order',ordinal:index});
       edges++;
      }
      prior=id;index++;
     }
    }
    archive.commitEpisode();
    const current=keep();
    return {episode,sourceSha256:identity,
     selectedSourceMotifObservations:motifs,
     observedSourceOrderEdges:edges,
     archivedEpisodes:current.verifiedSourceEpisodeIdentities,
     verifiedSemanticTransformations:0,
     referenceAnswerRead:false};
   }catch(err){archive.rollbackEpisode();throw err}
  },
  matchingAnchors({text,minIndependentSourceEpisodes=2}={}){
   if(closed)throw Error('Original source archive closed');
   if(typeof text!=='string'||text.length>200000)
    throw Error('Explicit full text required for source recall');
   const tokens=sourceTokens(text).map(t=>norm(t.text));
   const found=[];
   for(const width of [5,12])for(const at of selectAnchors(tokens,{width,window:16})){
    const id=witnessId(tokens,at.at,width),old=archive.lookupMotif(id);
    if(old&&old.episodes>=minIndependentSourceEpisodes)
     found.push({id,width,sourceEvidenceEpisodes:old.episodes,
      firstEpisode:old.firstEpisode,lastEpisode:old.lastEpisode,
      independentSemanticActionVerification:false,
      tokenOffset:at.at});
   }
   return {matches:found,matchedExactOriginalMotifs:found.length,
    sourceOnly:true,semanticGoalInferenceProved:false};
  },
  inspect(options){return archive.inspect(options)},
  status:()=>archive.status(),
  close(){if(closed)return;keep();archive.close();closed=true}
 };
}
