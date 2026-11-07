// Compact immutable source-identity index for the ORIGINAL one-Brain V17
// observed language-maze anchors. This is NOT a new model/decoder, and
// retains all witnessed motif/edge occurrences rather than approximating.
// v1 disk format is kept separately: this is a new isolated SQLite file,
// tested for observable 1:1 parity BEFORE any original worker switches over.
import fs from "node:fs";
import path from "node:path";

const MAX=Number.MAX_SAFE_INTEGER;
const okInt=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const idFormat=/^(\d+):([a-f0-9]{64})$/;
const keyOf=id=>{
 const match=typeof id==="string"?idFormat.exec(id):null;
 const width=match?Number(match[1]):-1;
 if(!okInt(width,128)||width<1)throw Error("Invalid exact original motif width/SHA256 ID");
 const out=Buffer.allocUnsafe(33);out[0]=width;
 Buffer.from(match[2],"hex").copy(out,1);
 return out;
};
const idOf=buffer=>{
 const b=Buffer.from(buffer||[]);
 if(b.length!==33||b[0]===0||b[0]>128)
  throw Error("Corrupt binary original motif SHA256 identity");
 return b[0]+":"+b.subarray(1).toString("hex");
};
const pageNum=(n,d,limit)=>okInt(n,MAX)?Math.min(n,limit):d;
const mapMotif=row=>row?{...row,id:idOf(row.id)}:null;
const mapEdge=row=>({...row,source:idOf(row.source),target:idOf(row.target)});

export async function openCompactNativeMotifArchive(filename){
 if(typeof filename!=="string"||!filename.trim()||!path.isAbsolute(filename))
  throw Error("Compact native original Brain disk index requires absolute file");
 let DatabaseSync;
 try{({DatabaseSync}=await import("node:sqlite"))}
 catch(error){throw Error("Compact native original source index requires Node 22+ node:sqlite "+error.message)}
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 try{
  db.exec(`
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=FULL;
   PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS source_episode(
    episode INTEGER PRIMARY KEY,
    source_sha256 TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS source_role(
    id INTEGER PRIMARY KEY,
    label TEXT UNIQUE NOT NULL
   );
   CREATE TABLE IF NOT EXISTS motif(
    id BLOB PRIMARY KEY,
    width INTEGER NOT NULL,
    example TEXT NOT NULL,
    first_episode INTEGER NOT NULL,
    last_episode INTEGER NOT NULL,
    distinct_episodes INTEGER NOT NULL DEFAULT 1,
    occurrences INTEGER NOT NULL DEFAULT 1
   ) WITHOUT ROWID;
   CREATE TABLE IF NOT EXISTS motif_occurrence(
    episode INTEGER NOT NULL,role INTEGER NOT NULL,
    token_index INTEGER NOT NULL,width INTEGER NOT NULL,
    motif_id BLOB NOT NULL,
    PRIMARY KEY(episode,role,token_index,width)
   ) WITHOUT ROWID;
   CREATE INDEX IF NOT EXISTS motif_occurrence_by_id
    ON motif_occurrence(motif_id,episode);
   CREATE TABLE IF NOT EXISTS motif_edge(
    from_id BLOB NOT NULL,to_id BLOB NOT NULL,role INTEGER NOT NULL,
    first_episode INTEGER NOT NULL,last_episode INTEGER NOT NULL,
    distinct_episodes INTEGER NOT NULL DEFAULT 1,
    occurrences INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(from_id,to_id,role)
   ) WITHOUT ROWID;
   CREATE TABLE IF NOT EXISTS motif_edge_occurrence(
    episode INTEGER NOT NULL,role INTEGER NOT NULL,edge_ordinal INTEGER NOT NULL,
    from_id BLOB NOT NULL,to_id BLOB NOT NULL,
    PRIMARY KEY(episode,role,edge_ordinal)
   ) WITHOUT ROWID;
  `);
  return new CompactNativeMotifArchive(db,filename);
 }catch(error){db.close();throw error}
}
export class CompactNativeMotifArchive{
 constructor(db,filename){
  this.db=db;this.filename=filename;
  this.get=db.prepare("SELECT id,width,example,first_episode AS firstEpisode,last_episode AS lastEpisode,distinct_episodes AS episodes,occurrences FROM motif WHERE id=?");
  this.insert=db.prepare("INSERT INTO motif(id,width,example,first_episode,last_episode,distinct_episodes,occurrences) VALUES(?,?,?,?,?,1,1)");
  this.update=db.prepare("UPDATE motif SET distinct_episodes=distinct_episodes+CASE WHEN last_episode<>? THEN 1 ELSE 0 END,last_episode=?,occurrences=occurrences+1 WHERE id=?");
  this.insertOccurrence=db.prepare("INSERT OR IGNORE INTO motif_occurrence(episode,role,token_index,width,motif_id) VALUES(?,?,?,?,?)");
  this.getRole=db.prepare("SELECT id FROM source_role WHERE label=?");
  this.addRole=db.prepare("INSERT OR IGNORE INTO source_role(label) VALUES(?)");
  this.getSourceEpisode=db.prepare("SELECT source_sha256 AS sourceSHA256 FROM source_episode WHERE episode=?");
  this.addSourceEpisode=db.prepare("INSERT INTO source_episode(episode,source_sha256) VALUES(?,?)");
  this.unfingerprinted=db.prepare("SELECT EXISTS(SELECT 1 FROM motif_occurrence WHERE episode=? LIMIT 1) AS wasObserved");
  this.totalEpisodes=db.prepare("SELECT COUNT(*) AS n FROM source_episode");
  this.getEdge=db.prepare("SELECT from_id AS source,to_id AS target,role,distinct_episodes AS episodes,occurrences,last_episode AS lastEpisode FROM motif_edge WHERE from_id=? AND to_id=? AND role=?");
  this.addEdge=db.prepare("INSERT INTO motif_edge(from_id,to_id,role,first_episode,last_episode,distinct_episodes,occurrences) VALUES(?,?,?,?,?,1,1)");
  this.updateEdge=db.prepare("UPDATE motif_edge SET distinct_episodes=distinct_episodes+CASE WHEN last_episode<>? THEN 1 ELSE 0 END,last_episode=?,occurrences=occurrences+1 WHERE from_id=? AND to_id=? AND role=?");
  this.insertEdgeOccurrence=db.prepare("INSERT OR IGNORE INTO motif_edge_occurrence(episode,role,edge_ordinal,from_id,to_id) VALUES(?,?,?,?,?)");
  this.byFrom=db.prepare("SELECT e.from_id AS source,e.to_id AS target,r.label AS role,e.distinct_episodes AS episodes,e.occurrences,e.last_episode AS lastEpisode FROM motif_edge e JOIN source_role r ON r.id=e.role WHERE e.from_id=? ORDER BY e.distinct_episodes DESC,e.to_id LIMIT ?");
  this.page=db.prepare("SELECT id,width,example,first_episode AS firstEpisode,last_episode AS lastEpisode,distinct_episodes AS episodes,occurrences FROM motif ORDER BY first_episode,id LIMIT ? OFFSET ?");
  this.size=db.prepare("SELECT COUNT(*) AS n FROM motif");
  this.shared=db.prepare("SELECT COUNT(*) AS n FROM motif WHERE distinct_episodes>=2");
  this.edges=db.prepare("SELECT COUNT(*) AS n FROM motif_edge");
  this.episode=null;this.closed=false;this.recallsAfterEviction=0;
  this.insertedMotifs=0;this.duplicateOccurrencesSkipped=0;
  this.edgeObservations=0;this.rejectedDifferentSourceReplays=0;
  this.unverifiedLegacyEpisodesBlocked=0;
 }
 roleId(label){
  if(typeof label!=="string"||!label||label.length>120)
   throw Error("Invalid original source-order edge role");
  let old=this.getRole.get(label);
  if(old)return old.id;
  this.addRole.run(label);old=this.getRole.get(label);
  return old.id;
 }
 beginEpisode(episode,sourceSHA256=null){
  if(this.episode!==null||this.closed)throw Error("Original compact motif transaction already open or closed");
  if(!Number.isSafeInteger(episode)||episode<1)
   throw Error("Real source episode ordinal required");
  const identity=sourceSHA256===null?"legacy-unit-test-episode:"+episode:sourceSHA256;
  if(sourceSHA256!==null&&!/^[a-f0-9]{64}$/.test(sourceSHA256))
   throw Error("Original real Q/A source identity must be canonical SHA256");
  this.db.exec("BEGIN IMMEDIATE");
  try{
   const old=this.getSourceEpisode.get(episode);
   if(old&&old.sourceSHA256!==identity){
    this.rejectedDifferentSourceReplays++;
    throw Error("SOURCE_REPLAY_IDENTITY_MISMATCH: changed original source after checkpoint replay");
   }
   if(!old){
    if(this.unfingerprinted.get(episode)?.wasObserved){
     this.unverifiedLegacyEpisodesBlocked++;
     throw Error("UNVERIFIED_LEGACY_SOURCE_REPLAY: missing old original source identity");
    }
    this.addSourceEpisode.run(episode,identity);
   }
   this.episode=episode;
  }catch(error){this.db.exec("ROLLBACK");throw error}
 }
 motif({id,width,role,at,example}={}){
  if(this.episode===null)throw Error("Motif observation requires original episode transaction");
  const key=keyOf(id);
  if(key[0]!==width||!["question","answer"].includes(role)||
   !Number.isSafeInteger(at)||at<0)
   throw Error("Invalid original motif scale, role, or exact token offset");
  const old=this.lookupMotif(id),code=role==="question"?0:1;
  const fresh=this.insertOccurrence.run(this.episode,code,at,width,key).changes!==0;
  if(!fresh){
   this.duplicateOccurrencesSkipped++;
   return {...(old||{}),fromPreviousEpisode:!!old&&old.lastEpisode!==this.episode,
    repeatedExactPosition:true};
  }
  if(!old){
   this.insert.run(key,width,String(example??"").slice(0,120),this.episode,this.episode);
   this.insertedMotifs++;
  }else this.update.run(this.episode,this.episode,key);
  return {...this.lookupMotif(id),fromPreviousEpisode:!!old&&old.lastEpisode!==this.episode,
   repeatedExactPosition:false,restoredFromDisk:!!old};
 }
 edge({from,to,role,ordinal}={}){
  if(this.episode===null)throw Error("Source edge witness outside original training transaction");
  if(!Number.isSafeInteger(ordinal)||ordinal<0)
   throw Error("Invalid observed source edge ordinal");
  const source=keyOf(from),target=keyOf(to),code=this.roleId(role);
  const fresh=this.insertEdgeOccurrence.run(this.episode,code,ordinal,source,target).changes!==0;
  if(!fresh)return {newWitness:false,sourceOnly:true};
  const old=this.getEdge.get(source,target,code);
  if(old)this.updateEdge.run(this.episode,this.episode,source,target,code);
  else this.addEdge.run(source,target,code,this.episode,this.episode);
  this.edgeObservations++;
  return {newWitness:true,sourceOnly:true};
 }
 commitEpisode(){
  if(this.episode===null)throw Error("No original source transaction to commit");
  this.db.exec("COMMIT");this.episode=null;
 }
 rollbackEpisode(){
  if(this.episode!==null){this.db.exec("ROLLBACK");this.episode=null}
 }
 lookupMotif(id){return mapMotif(this.get.get(keyOf(id)))}
 related(id,{limit=100}={}){
  if(typeof id!=="string"||!id.trim())return [];
  const n=Math.min(200,Math.max(1,pageNum(limit,100,200)));
  return this.byFrom.all(keyOf(id),n).map(mapEdge);
 }
 inspect({view="motifs",offset=0,limit=50}={}){
  const n=Math.min(200,Math.max(1,pageNum(limit,50,200)));
  const pos=pageNum(offset,0,MAX);
  if(view!=="motifs")throw Error("Compact original source archive supports motif paging only; use related(id) for observed edges");
  const total=this.size.get().n,rows=this.page.all(n,pos).map(mapMotif);
  return {source:"original-native-Brain-long-language-observations",
   realSqliteDiskArchive:true,view,rows,total,offset:pos,limit:n,
   nextOffset:pos+n<total?pos+n:null,physicallyVerifiedSemanticActions:0,
   onlyObservedLexicalSourceEvidence:true};
 }
 status(){
  return {enabled:true,databaseFile:this.filename,
   indexedExactMotifs:this.size.get().n,
   sharedExactMotifsAcrossEpisodes:this.shared.get().n,
   observedSourceOnlyEdgeTypes:this.edges.get().n,
   reencounteredExactSourceMotifs:this.recallsAfterEviction,
   duplicateSourceRowsSkipped:this.duplicateOccurrencesSkipped,
   verifiedSourceEpisodeIdentities:this.totalEpisodes.get().n,
   rejectedDifferentSourceReplays:this.rejectedDifferentSourceReplays,
   unverifiedLegacyEpisodesBlocked:this.unverifiedLegacyEpisodesBlocked,
   sourceOnlyNoSemanticPhysics:true,
   activeTransaction:this.episode!==null};
 }
 close(){if(this.closed)return;this.rollbackEpisode();this.db.close();this.closed=true}
}
