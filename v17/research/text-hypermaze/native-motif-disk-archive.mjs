// Persistent, indexed SOURCE EVIDENCE for the ORIGINAL one-Brain
// MagicPerspective long-language maze. No predictor, separate AI, training
// objective, oracle answer, or promotion of lexical adjacency into physics.
//
// SQLite is a disk-backed exact index, supported by node:sqlite on Node >=22.
// Active memory can evict a five-token motif; the disk record and its exact
// episode/position witness remain searchable on the NEXT language exercise.
// The source question/answer data is observed ONLY by the actual native Q/A
// training path, never by the frozen heldout evaluator.
import fs from "node:fs";
import path from "node:path";

const POS_MAX=Number.MAX_SAFE_INTEGER;
const safeCount=(n,d,max)=>Number.isSafeInteger(n)&&n>=0?
 Math.min(n,max):d;
export async function openNativeMotifArchive(filename){
 if(typeof filename!=="string"||!filename.trim()||
    !path.isAbsolute(filename))
  throw Error("Original motif archive requires an explicit absolute disk path");
 let DatabaseSync;
 try{({DatabaseSync}=await import("node:sqlite"));}
 catch(err){throw Error("Native indexed phrase-memory disk archive requires Node.js >=22 with node:sqlite. Original training remains unchanged; upgrade Node to enable exact recall. "+String(err?.message||err));}
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 try{
  db.exec(`
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=FULL;
   CREATE TABLE IF NOT EXISTS motif(
    id TEXT PRIMARY KEY,
    width INTEGER NOT NULL,
    example TEXT NOT NULL,
    first_episode INTEGER NOT NULL,
    last_episode INTEGER NOT NULL,
    distinct_episodes INTEGER NOT NULL DEFAULT 1,
    occurrences INTEGER NOT NULL DEFAULT 1
   );
   CREATE TABLE IF NOT EXISTS motif_occurrence(
    episode INTEGER NOT NULL, role TEXT NOT NULL,
    token_index INTEGER NOT NULL, width INTEGER NOT NULL,
    motif_id TEXT NOT NULL,
    PRIMARY KEY(episode,role,token_index,width)
   );
   CREATE INDEX IF NOT EXISTS motif_occurrence_by_id
    ON motif_occurrence(motif_id,episode);
   CREATE TABLE IF NOT EXISTS motif_edge(
    from_id TEXT NOT NULL,to_id TEXT NOT NULL,role TEXT NOT NULL,
    first_episode INTEGER NOT NULL,last_episode INTEGER NOT NULL,
    distinct_episodes INTEGER NOT NULL DEFAULT 1,
    occurrences INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(from_id,to_id,role)
   );
   CREATE TABLE IF NOT EXISTS motif_edge_occurrence(
    episode INTEGER NOT NULL,role TEXT NOT NULL,
    edge_ordinal INTEGER NOT NULL,
    from_id TEXT NOT NULL,to_id TEXT NOT NULL,
    PRIMARY KEY(episode,role,edge_ordinal)
   );
   CREATE INDEX IF NOT EXISTS motif_edge_from ON motif_edge(from_id);
  `);
  return new NativeMotifArchive(db,filename);
 }catch(err){db.close();throw err;}
}
export class NativeMotifArchive{
 constructor(db,filename){
  this.db=db;this.filename=filename;
  this.get=db.prepare("SELECT id,width,example,first_episode AS firstEpisode,last_episode AS lastEpisode,distinct_episodes AS episodes,occurrences FROM motif WHERE id=?");
  this.insertOccurrence=db.prepare("INSERT OR IGNORE INTO motif_occurrence(episode,role,token_index,width,motif_id) VALUES(?,?,?,?,?)");
  this.insert=db.prepare("INSERT INTO motif(id,width,example,first_episode,last_episode,distinct_episodes,occurrences) VALUES(?,?,?,?,?,1,1)");
  this.update=db.prepare("UPDATE motif SET distinct_episodes=distinct_episodes+CASE WHEN last_episode<>? THEN 1 ELSE 0 END,last_episode=?,occurrences=occurrences+1 WHERE id=?");
  this.insertEdgeOccurrence=db.prepare("INSERT OR IGNORE INTO motif_edge_occurrence(episode,role,edge_ordinal,from_id,to_id) VALUES(?,?,?,?,?)");
  this.insertEdge=db.prepare("INSERT INTO motif_edge(from_id,to_id,role,first_episode,last_episode,distinct_episodes,occurrences) VALUES(?,?,?,?,?,1,1)");
  this.updateEdge=db.prepare("UPDATE motif_edge SET distinct_episodes=distinct_episodes+CASE WHEN last_episode<>? THEN 1 ELSE 0 END,last_episode=?,occurrences=occurrences+1 WHERE from_id=? AND to_id=? AND role=?");
  this.getEdge=db.prepare("SELECT from_id AS source,to_id AS target,role,distinct_episodes AS episodes,occurrences,last_episode AS lastEpisode FROM motif_edge WHERE from_id=? AND to_id=? AND role=?");
  this.byFrom=db.prepare("SELECT from_id AS source,to_id AS target,role,distinct_episodes AS episodes,occurrences,last_episode AS lastEpisode FROM motif_edge WHERE from_id=? ORDER BY distinct_episodes DESC,to_id LIMIT ?");
  this.page=db.prepare("SELECT id,width,example,first_episode AS firstEpisode,last_episode AS lastEpisode,distinct_episodes AS episodes,occurrences FROM motif ORDER BY first_episode,id LIMIT ? OFFSET ?");
  this.size=db.prepare("SELECT COUNT(*) AS n FROM motif");
  this.shared=db.prepare("SELECT COUNT(*) AS n FROM motif WHERE distinct_episodes>=2");
  this.edges=db.prepare("SELECT COUNT(*) AS n FROM motif_edge");
  this.episode=null;
  this.recallsAfterEviction=0;
  this.insertedMotifs=0;
  this.duplicateOccurrencesSkipped=0;
  this.edgeObservations=0;
  this.closed=false;
 }
 beginEpisode(episode){
  if(this.episode!==null||this.closed)throw Error("Motif disk transaction already open or closed");
  if(!Number.isSafeInteger(episode)||episode<1)throw Error("Real original Q/A episode ordinal required");
  this.db.exec("BEGIN IMMEDIATE");this.episode=episode;
 }
 motif({id,width,role,at,example}={}){
  if(this.episode===null)throw Error("Disk motif cannot be observed outside training episode");
  if(typeof id!=="string"||!/^\d+:[a-f0-9]{64}$/.test(id)||
    !Number.isSafeInteger(width)||width<1||width>128||
    !["question","answer"].includes(role)||
    !Number.isSafeInteger(at)||at<0)
   throw Error("Invalid source motif identity or occurrence provenance");
  const old=this.get.get(id);
  const wasDifferentEpisode=!!old&&old.lastEpisode!==this.episode;
  const duplicate=this.insertOccurrence.run(this.episode,role,at,width,id).changes===0;
  if(duplicate){this.duplicateOccurrencesSkipped++;
   return {...(old||{}),fromPreviousEpisode:wasDifferentEpisode,
    repeatedExactPosition:true};}
  if(!old){this.insert.run(id,width,String(example||"").slice(0,120),this.episode,this.episode);
   this.insertedMotifs++;
  }else this.update.run(this.episode,this.episode,id);
  const now=this.get.get(id);
  return {...now,fromPreviousEpisode:wasDifferentEpisode,
   repeatedExactPosition:false,restoredFromDisk:!!old};
 }
 edge({from,to,role,ordinal}={}){
  if(this.episode===null)throw Error("Disk source edge outside real training episode");
  if(typeof from!=="string"||typeof to!=="string"||
    typeof role!=="string"||!role||
    !Number.isSafeInteger(ordinal)||ordinal<0)
   throw Error("Invalid observed source-order edge");
  const fresh=this.insertEdgeOccurrence.run(
   this.episode,role,ordinal,from,to).changes!==0;
  if(!fresh)return {newWitness:false,sourceOnly:true};
  const old=this.getEdge.get(from,to,role);
  if(old)this.updateEdge.run(this.episode,this.episode,from,to,role);
  else this.insertEdge.run(from,to,role,this.episode,this.episode);
  this.edgeObservations++;
  return {newWitness:true,sourceOnly:true};
 }
 commitEpisode(){
  if(this.episode===null)throw Error("No motif training transaction to commit");
  this.db.exec("COMMIT");this.episode=null;
 }
 rollbackEpisode(){
  if(this.episode!==null){this.db.exec("ROLLBACK");this.episode=null;}
 }
 lookupMotif(id){return this.get.get(id)||null;}
 related(id,{limit=100}={}){
  if(typeof id!=="string"||!id.trim())return [];
  return this.byFrom.all(id,Math.min(200,Math.max(1,safeCount(limit,100,200))));
 }
 inspect({view="motifs",offset=0,limit=50}={}){
  const n=Math.min(200,Math.max(1,safeCount(limit,50,200))),
   pos=safeCount(offset,0,POS_MAX);
  if(!["motifs","related"].includes(view))
   throw Error("Unsupported actual on-disk motif evidence view");
  if(view==="motifs"){
   const total=this.size.get().n,rows=this.page.all(n,pos);
   return {source:"original-native-Brain-long-language-observations",
    realSqliteDiskArchive:true,view,rows,total,offset:pos,limit:n,
    nextOffset:pos+n<total?pos+n:null,
    physicallyVerifiedSemanticActions:0,
    onlyObservedLexicalSourceEvidence:true};
  }
  throw Error("Related motif edges require a source id through related()");
 }
 status(){
  return {enabled:true,databaseFile:this.filename,
   indexedExactMotifs:this.size.get().n,
   sharedExactMotifsAcrossEpisodes:this.shared.get().n,
   observedSourceOnlyEdgeTypes:this.edges.get().n,
   reencounteredExactSourceMotifs:this.recallsAfterEviction,
   duplicateSourceRowsSkipped:this.duplicateOccurrencesSkipped,
   sourceOnlyNoSemanticPhysics:true,
   activeTransaction:this.episode!==null};
 }
 close(){
  if(this.closed)return;
  this.rollbackEpisode();
  this.db.close();this.closed=true;
 }
}
