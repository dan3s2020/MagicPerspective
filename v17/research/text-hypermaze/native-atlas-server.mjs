// V30 actual cross-world hypermaze atlas HTTP server.
// One persistent original V17 Brain. No substituted Q/A retriever, fake 4D
// positions, hidden reference answer or simulated answer-generation.
//
// Input is real OBSERVED before/action/after JSONL events. Plain Q/A alone
// does not prove a physical transformation and is rejected by this adapter.
// Example JSONL:
// {"episodeId":"world-A","action":"add-two","before":"Ana has 3 apples.","after":"Ana has 5 apples.","accepted":true}
//
// The server enumerates every admitted learned transition reachable within
// recorded maxDepth/maxStates bounds; every omitted *known* corridor is
// counted and shown in the global atlas. Unknown world actions remain unknown.
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {NativeCrossEpisodeTransfer} from "./cross-episode-native.mjs";
import {NativeWorldAtlas} from "./native-world-atlas.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

const dirname=path.dirname(fileURLToPath(import.meta.url));
const asInt=(v,min,max,label)=>{
 const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)
  throw Error(label+" must be an integer between "+min+" and "+max);
 return n;
};
function json(res,code,data){
 res.writeHead(code,{"content-type":"application/json; charset=utf-8",
  "cache-control":"no-store","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(data));
}
async function readBody(req,max=130000){
 let text="";
 for await(const data of req){
  text+=data;
  if(Buffer.byteLength(text)>max)throw Error("Request exceeds bounded input");
 }
 return text?JSON.parse(text):{};
}
async function fingerprint(file){
 const hash=crypto.createHash("sha256");
 for await(const part of fs.createReadStream(file))hash.update(part);
 return hash.digest("hex");
}
export class NativeAtlasRuntime{
 constructor(brain,{out,maxStates=256,maxDepth=8,saveEvery=250}={}){
  if(!(brain instanceof Brain))throw Error("Load a genuine original V17 Brain");
  this.brain=brain;this.engine=new NativeCrossEpisodeTransfer(brain,{maxStates,maxDepth});
  this.atlas=new NativeWorldAtlas(brain);
  this.out=path.resolve(out||path.join(dirname,"runtime-v30"));
  this.checkpoint=path.join(this.out,"original-brain-v30.v8");
  this.saveEvery=asInt(saveEvery,1,1000000,"saveEvery");
  this.state="idle";this.lastError=null;this.loading=null;this.savedAt=null;
  this.importState=brain.crossEpisodeImport||{file:null,sha256:null,
   processedLines:0,accepted:0,rejected:0,skippedEmpty:0};
  brain.crossEpisodeImport=this.importState;
 }
 save(){
  fs.mkdirSync(this.out,{recursive:true});
  const n=this.brain.save(this.checkpoint);
  this.savedAt=new Date().toISOString();
  return {saved:true,checkpoint:this.checkpoint,bytes:n,
   observedTotal:this.atlas.summary().witnessedEvents};
 }
 status(){
  const r=this.atlas.summary(),m=this.engine.summary();
  return {version:30,mode:this.state,error:this.lastError,
   originalBrain:true,originalShapeAlgorithm:"Discoverer.shapeGraph",
   training:{
    witnessedTransformations:m.observations,rejected:m.rejected,
    rules:m.actionsObserved,transferableRules:m.reusableActions,
    independentSourceWorlds:r.sourceWorlds,
    import:{...this.importState},
    original2DMazeEpisodes:this.brain.disc.episodes,
    originalTargetAttraction:this.brain.disc.attract(KIND.target),
    originalFloorConductance:this.brain.disc.conduct(KIND.floor)
   },
   atlas:r,
   originalNativeText:{
    source:"Existing V17/V29 ObservedTransformations in the SAME Brain",
    observations:this.brain.observedTransformations?.seen||0,
    learnedTextContrastOperators:this.brain.observedTransformations?.operators?.size||0,
    activeObservedTextStates:this.brain.observedTransformations?.records?.size||0,
    evictedTextStates:this.brain.observedTransformations?.evicted||0,
    fullPastRawTextStatesRetained:(this.brain.observedTransformations?.evicted||0)===0,
    contrastEdgesAreVerifiedCausalActions:false,
    contrastActionsAdmittedToV30Navigator:false,
    note:"Original real corpus contrasts are visible and preserved, but require independent action effects to become walkable physics"
   },
   frontierSemantics:"All known edges EXPANDED inside bounded graph, never entire natural language",
   geometry:{
    originalLearnedDimensions:this.brain.trace.geo.D,
    observedCoordinates:this.brain.trace.geo.U.size,
    generatedGeometry:false,
    native5DNotInvented:true
   },
   noise:{
    duringCrossWorldShape:"none",
    originalAgency:this.brain.noiseAgent?
      {sites:{...this.brain.noiseAgent.bySite}}:null,
    note:"No experimental noise comparison in V30; no fabricated noise impulses"
   },
   checkpoint:{file:this.checkpoint,savedAt:this.savedAt},
   design:{maxStates:this.engine.maxStates,maxDepth:this.engine.maxDepth,
    minIndependentWorlds:this.engine.minWorlds}};
 }
 observe(input,{origin="external-witness"}={}){
  const evidence=this.engine.observe(input);
  return {origin,evidence,metrics:this.engine.summary()};
 }
 plan(input){
  const p=this.engine.plan(input);
  const id=this.atlas.logAttempt(p,{episodeId:input.episodeId||"query",
   tag:"frozen-before-physical-execution"});
  return {id:id.id,found:p.found,predicted:p.predicted,
   firstShape:p.initialShape,reason:p.reason,
   originalMethod:p.algorithm,frontier:p.frontier,
   graph:p.graph,actionSequence:p.actions,
   evidence:"Cross-world witnessed action effects; held-out world not used",
   noOracleAnswerProvided:true,originalBrain:true};
 }
 recordExternallyObservedOutcome({id,frames,actualFinal,independentExternalPhysics=false}={}){
  // A browser cannot certify the independence of external physics; do NOT
  // accept an arbitrary client-supplied claim as validated ground truth.
  throw Error("External result cannot be called independently verified from an HTTP claim. Use NativeCrossEpisodeTransfer.execute(plan, externalWorldStep) in a trusted evaluator.");
 }
 async ingest(file){
  if(this.loading)throw Error("Already ingesting witnessed world events");
  const full=await fsp.realpath(file),digest=await fingerprint(full),imp=this.importState;
  if(imp.file&&(imp.file!==full||imp.sha256!==digest))
   throw Error("Refusing to resume events from a different or altered file");
  imp.file=full;imp.sha256=digest;
  this.state="running";this.lastError=null;
  this.loading=(async()=>{
   const rows=readline.createInterface({input:fs.createReadStream(full,{encoding:"utf8"}),
    crlfDelay:Infinity});
   let lineNo=0;
   try{
    for await(const raw of rows){
     const line=lineNo===0?raw.replace(/^\uFEFF/,""):raw;
     lineNo++;
     if(lineNo<=imp.processedLines)continue;
     if(!line.trim()){imp.processedLines=lineNo;imp.skippedEmpty++;continue;}
     let row;
     try{row=JSON.parse(line);}
     catch(e){throw Error("Bad witnessed JSONL at line "+lineNo+": "+e.message);}
     if(!row||typeof row!=="object"||Array.isArray(row)||
       typeof row.episodeId!=="string"||typeof row.action!=="string"||
       typeof row.before!=="string"||typeof row.after!=="string"||
       row.accepted!==true&&row.accepted!==false)
      throw Error("Line "+lineNo+" lacks an actual episode/action/before/after/accepted witness");
     const event=this.engine.observe(row);
     imp.processedLines=lineNo;
     imp.accepted+=Number(event.learned);
     imp.rejected+=Number(!event.learned);
     if(imp.processedLines%this.saveEvery===0)this.save();
     if(imp.processedLines%100===0)await new Promise(r=>setImmediate(r));
    }
    this.state="finished";
    this.save();
    return {rows:imp.processedLines,accepted:imp.accepted,rejected:imp.rejected};
   }catch(e){
    this.state="error";this.lastError=e.stack||e.message;
    // Preserve last valid snapshot. In-memory unsaved observations will be
    // re-read from the saved cursor when process restarts.
    throw e;
   }finally{this.loading=null;}
  })();
  return this.loading;
 }
}
export async function createAtlasServer(runtime,{port=8901,host="127.0.0.1"}={}){
 const html=await fsp.readFile(path.join(dirname,"native-atlas-live.html"),"utf8");
 const server=http.createServer(async(req,res)=>{
  if(!["127.0.0.1","localhost"].includes((req.headers.host||"").split(":")[0]))
   return json(res,403,{error:"Loopback only"});
  if(req.headers.origin&&req.headers.origin!=="http://"+req.headers.host)
   return json(res,403,{error:"Cross-origin control rejected"});
  const url=new URL(req.url,"http://127.0.0.1");
  try{
   if(req.method==="GET"){
    if(url.pathname==="/"||url.pathname==="/index.html"){
     res.writeHead(200,{"content-type":"text/html; charset=utf-8",
      "cache-control":"no-store","x-content-type-options":"nosniff",
      "content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"});
     res.end(html);return;
    }
    if(url.pathname==="/api/status")return json(res,200,runtime.status());
    if(url.pathname==="/api/global-topology")return json(res,200,
     runtime.atlas.globalTopology({
      nodeOffset:asInt(url.searchParams.get("nodeOffset")||0,0,Number.MAX_SAFE_INTEGER,"nodeOffset"),
      nodeLimit:asInt(url.searchParams.get("nodeLimit")||300,1,1000,"nodeLimit"),
      edgeOffset:asInt(url.searchParams.get("edgeOffset")||0,0,Number.MAX_SAFE_INTEGER,"edgeOffset"),
      edgeLimit:asInt(url.searchParams.get("edgeLimit")||600,1,2000,"edgeLimit")
     }));
    if(url.pathname==="/api/atlas")return json(res,200,
     runtime.atlas.page(url.searchParams.get("section")||"attempts",{
      offset:asInt(url.searchParams.get("offset")||0,0,Number.MAX_SAFE_INTEGER,"offset"),
      limit:asInt(url.searchParams.get("limit")||50,1,1000,"limit")}));
    if(url.pathname==="/api/attempt"){
     const id=asInt(url.searchParams.get("id"),1,Number.MAX_SAFE_INTEGER,"id");
     const detail=runtime.atlas.detail(id);
     return json(res,detail?200:404,detail||{error:"No recorded original plan with this ID"});
    }
    if(url.pathname==="/api/compare"){
     const id=asInt(url.searchParams.get("id"),1,Number.MAX_SAFE_INTEGER,"id");
     const found=runtime.atlas.explain(id);
     return json(res,found?200:404,found||{error:"No recorded failure or plan with this ID"});
    }
    if(url.pathname==="/api/rules")return json(res,200,runtime.engine.summary());
    return json(res,404,{error:"Unknown path"});
   }
   if(req.method==="POST"){
    const body=await readBody(req);
    if(url.pathname==="/api/plan"){
     const p=runtime.plan(body);
     runtime.save();
     return json(res,200,p);
    }
    if(url.pathname==="/api/observe"){
     if(runtime.loading)throw Error("Observation import running");
     const observed=runtime.observe(body);
     runtime.save();
     return json(res,200,observed);
    }
    if(url.pathname==="/api/save")return json(res,200,runtime.save());
    // No shortcut to fabricate independently verified physical feedback.
    return json(res,404,{error:"Unknown original Brain operation"});
   }
   return json(res,405,{error:"Method not supported"});
  }catch(e){return json(res,400,{error:e.message});}
 });
 await new Promise((resolve,reject)=>{
  server.once("error",reject);server.listen(port,host,resolve);
 });
 return server;
}
export async function main(argv=process.argv.slice(2)){
 const opt=(n,otherwise=null)=>{
  const i=argv.indexOf("--"+n);return i<0?otherwise:argv[i+1];
 };
 const out=path.resolve(opt("out",path.join(dirname,"runtime-v30")));
 const resume=argv.includes("--resume"),checkpoint=path.join(out,"original-brain-v30.v8");
 const input=opt("brain",null);
 if(resume&&!fs.existsSync(checkpoint))throw Error("Resume V30 checkpoint missing: "+checkpoint);
 if(!resume&&!input)throw Error("Use --brain ORIGINAL_V17.v8 or --resume. A blank untrained Brain would have no discovered maze target.");
 if(!resume&&fs.existsSync(checkpoint))throw Error("V30 original saved brain already exists; use --resume to protect it");
 const brain=resume?Brain.load(checkpoint):Brain.load(path.resolve(input));
 const runtime=new NativeAtlasRuntime(brain,{
  out,maxStates:asInt(opt("max-states",256),4,4000,"max-states"),
  maxDepth:asInt(opt("max-depth",8),1,16,"max-depth"),
  saveEvery:asInt(opt("save-every",250),1,1000000,"save-every")
 });
 await fsp.mkdir(out,{recursive:true});
 if(!resume)runtime.save(); // Only a new isolated V30 checkpoint, not original.
 const port=asInt(opt("port",8901),1024,65535,"port");
 const server=await createAtlasServer(runtime,{port});
 console.log("MAGICPERSPECTIVE_V30_REAL_ATLAS",JSON.stringify({
  url:"http://127.0.0.1:"+port,sourceBrain:input||checkpoint,
  storedBrain:runtime.checkpoint,sourceChanged:false,
  original5D:brain.trace.geo.D,
  sourceWorlds:runtime.atlas.summary().sourceWorlds,
  sourceActions:runtime.engine.summary().actionsObserved,
  currentLimits:runtime.status().design}));
 const events=opt("events");
 if(events)runtime.ingest(events).then(v=>
  console.log("V30_OBSERVED_EVIDENCE_INGESTED",JSON.stringify(v)))
  .catch(e=>{console.error("V30 world import FAILED:",e.stack||e.message);});
 return {server,runtime};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error("V30 startup failed:",e.stack||e.message);process.exitCode=1;});
