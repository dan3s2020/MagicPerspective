// Local-only durable telemetry bridge for the ORIGINAL Portal4D engine.
// Receives ONLY actual 4D measured events. Does NOT generate any experiences.
// Does not read/write original training checkpoints.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ExperienceJournal} from './journal.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
const origins=new Set(['http://127.0.0.1:8788','http://localhost:8788',
 'http://127.0.0.1:8791','http://localhost:8791']);
const assets=new Map([
 ['/','growth-index.html'],['/growth-app.mjs','growth-app.mjs'],
 ['/growth-view.mjs','growth-view.mjs'],['/growth.mjs','growth.mjs'],
 ['/geometry.mjs','geometry.mjs'],['/viewer.mjs','viewer.mjs'],
 ['/viewer.css','viewer.css']
]);
const safeNumber=(v,def,min,max)=>{
 const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:def;
};
const json=(res,status,data)=>{
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(data));
};
async function getBody(req,max=1024*1024){
 let size=0,parts=[];
 for await(const chunk of req){
  size+=chunk.length;if(size>max)throw Object.assign(
   new Error('An observed training event exceeds the 1 MiB size limit'),{status:413});
  parts.push(chunk);
 }
 if(!parts.length)throw Error('Missing original training event payload');
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}
 catch(e){throw Error('Invalid JSON event: '+e.message)}
}
export async function createGrowthServer({
 port=8791,host='127.0.0.1',folder=join(ROOT,'data','evidence'),
 checkpointEvery=50
}={}){
 if(host!=='127.0.0.1')throw Error('Growth telemetry is restricted to loopback');
 const journal=new ExperienceJournal(folder,{checkpointEvery});
 await journal.open();
 const recent=[];
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&!origins.has(origin))return json(res,403,{error:'Untrusted event sender origin'});
  if(origin){
   res.setHeader('Access-Control-Allow-Origin',origin);
   res.setHeader('Vary','Origin');
   res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
  }
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  let url;try{url=new URL(req.url,'http://localhost')}catch{
   return json(res,400,{error:'Invalid URL'});
  }
  try{
   if(req.method==='GET'&&url.pathname==='/api/v7/status'){
    // READ-ONLY local connection check. A reachable page does not prove
    // training is running or that this is the actual V7 source.
    try{
     const response=await fetch('http://127.0.0.1:8788/',{
      signal:AbortSignal.timeout(1800),redirect:'manual'
     });
     return json(res,200,{reachable:response.status>=200&&response.status<500,
      httpStatus:response.status,url:'http://127.0.0.1:8788/',
      originalBackendIntegrated:false,trainingState:'UNKNOWN',
      note:'V7 is accessed via its original embedded UI, not a fake START API.'});
    }catch(e){
     return json(res,200,{reachable:false,trainingState:'UNKNOWN',
      originalBackendIntegrated:false,error:e.message,
      url:'http://127.0.0.1:8788/'});
    }
   }
   if(req.method==='GET'&&url.pathname==='/api/exercises'){
    // The persistent graph.events map includes EVERY event signature
    // received (not just the last 120 frames in the UI). This is
    // paginated read-only, no fabricated exercise/test records.
    const after=safeNumber(url.searchParams.get('after'),0,0,Number.MAX_SAFE_INTEGER);
    const limit=safeNumber(url.searchParams.get('limit'),30,1,100);
    const total=journal.graph.events.size;
    const records=[];let index=0;
    const problemsSeen=new Set();
    for(const [id,encoded] of journal.graph.events){
     let e;
     try{e=JSON.parse(encoded)}catch{
      throw Error('Corrupt persisted event '+id);
     }
     const isNew=!problemsSeen.has(e.problem_id);
     problemsSeen.add(e.problem_id);
     index++;
     if(index<=after)continue;
     if(records.length>=limit)break;
     records.push({
      sequence:index,event_id:id,problem_id:e.problem_id,
      domain:e.domain,step:e.step,unique_problem_first_seen:isNew,
      reward:e.reward,model_update:e.model_update,
      observed_nodes:e.nodes.length,reported_edges:e.edges.length,
      source:e.source
     });
    }
    return json(res,200,{total_records:total,
     unique_problems:journal.stats().unique_problems,
     original_v7_connected:false,after,
     records,next_after:after+records.length,
     has_more:after+records.length<total});
   }
   if(req.method==='GET'&&url.pathname==='/api/health')
    return json(res,200,{ok:true,source_connected:journal.stats().sequence>0,
     original_v7_backend_verified:false,persistent:true,
     read_only_original_v7:true,stats:journal.stats()});
   if(req.method==='GET'&&url.pathname==='/api/graph'){
    const maxNodes=safeNumber(url.searchParams.get('maxNodes'),1500,1,5000);
    const maxEdges=safeNumber(url.searchParams.get('maxEdges'),6000,1,15000);
    return json(res,200,journal.view({maxNodes,maxEdges}));
   }
   if(req.method==='GET'&&url.pathname==='/api/events'){
    const after=safeNumber(url.searchParams.get('after'),0,0,Number.MAX_SAFE_INTEGER);
    const oldest=recent[0]?.sequence??journal.stats().sequence+1;
    const pending=recent.filter(x=>x.sequence>after);
    return json(res,200,{sequence:journal.stats().sequence,
     dropped:Math.max(0,oldest-after-1),
     events:pending.slice(0,16),has_more:pending.length>16});
   }
   if(req.method==='GET'&&url.pathname==='/api/history')
    return json(res,200,{stats:journal.stats(),
     history:journal.graph.history.map(x=>({sequence:x.sequence,stats:x.stats}))});
   if(req.method==='POST'&&url.pathname==='/api/experience'){
    const input=await getBody(req);
    const result=await journal.ingest(input);
    if(result.accepted){
     recent.push({sequence:result.sequence,growth:result.growth,
      stats:result.stats,frame:result.frame});
     if(recent.length>160)recent.shift();
    }
    return json(res,200,{accepted:result.accepted,duplicate:!result.accepted,
     sequence:result.sequence,stats:result.stats,growth:result.growth??null});
   }
   if(req.method==='POST'&&url.pathname==='/api/checkpoint'){
    await journal.checkpoint();
    return json(res,200,{saved:true,stats:journal.stats()});
   }
   if(req.method==='GET'&&assets.has(url.pathname)){
    const asset=assets.get(url.pathname);
    const body=await readFile(join(ROOT,asset));
    res.writeHead(200,{'Content-Type':asset.endsWith('.css')?
     'text/css; charset=utf-8':asset.endsWith('.mjs')?
     'application/javascript; charset=utf-8':'text/html; charset=utf-8',
     'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(body);return;
   }
   return json(res,404,{error:'Not found'});
  }catch(error){
   return json(res,error.status??400,{error:error.message});
  }
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,host,resolve);
 });
 const address=server.address();
 let closed=false;
 const close=async()=>{
  if(closed)return;closed=true;
  await new Promise(resolve=>server.close(resolve));
  await journal.checkpoint();
 };
 return {server,journal,port:address.port,url:'http://'+host+':'+address.port,close};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=safeNumber(process.env.PORT,8791,1024,65535);
 const folder=process.env.PORTAL4D_GROWTH_DATA||
  join(ROOT,'data','evidence');
 const app=await createGrowthServer({port,folder});
 console.log('PORTAL4D_REAL_GROWTH http://127.0.0.1:'+app.port);
 console.log('Waiting for ORIGINAL training engine evidence; zero fake nodes.');
 let closing=false;
 const stop=async()=>{
  if(closing)return;closing=true;
  try{await app.close();process.exitCode=0}
  catch(e){console.error('Evidence checkpoint failed:',e);process.exitCode=1}
 };
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
