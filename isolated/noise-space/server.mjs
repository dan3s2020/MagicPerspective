// Isolated local server: Node standard library, no writes outside this folder.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {experiment,analyzeEvents,readEvents,validate} from './engine.mjs';
import {realState,realCommand,closeRealWorker} from './v17_bridge.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),DIR=path.join(ROOT,'runs'),STATE=path.join(DIR,'latest.json');fs.mkdirSync(DIR,{recursive:true});
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8897);let busy=false,running=false,paused=false,series=[],source='synthetic';
let options={seed:11,n:1900,noise:.035,lag:5,draws:25},current=null,external=null;
const persist=()=>{const tmp=STATE+'.tmp';fs.writeFileSync(tmp,JSON.stringify({current,options,series,source,external},null,2));fs.renameSync(tmp,STATE);};
if(fs.existsSync(STATE)){try{const d=JSON.parse(fs.readFileSync(STATE,'utf8'));current=d.current||null;options=d.options||options;series=d.series||[];source=d.source||'synthetic';external=d.external||null;}catch(e){console.warn('Previous state unreadable:',e.message);}}
const json=(res,code,v)=>{const b=Buffer.from(JSON.stringify(v));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','Access-Control-Allow-Origin':'http://127.0.0.1:'+port});res.end(b);};
const parse=async req=>{let s='';for await(const chunk of req){s+=chunk;if(s.length>8e6)throw Error('Request too large');}return s?JSON.parse(s):{};};
const summary=()=>({options,source,running,paused,busy,series:series.slice(-100),current,external});
const train=(config,overwrite=false)=>{if(busy)throw Error('Training already running');busy=true;try{options=validate({...options,...config});const result=experiment(options);current=result;if(overwrite)series=[];series.push({seed:options.seed,r:result.scores.delay.r,geo:result.scores.learned_metric.r,rmse:result.scores.delay.rmse,geo_rmse:result.scores.learned_metric.rmse,ts:new Date().toISOString()});source='synthetic';persist();return result;}finally{busy=false;}};
const next=()=>{if(!running||paused){return;}if(busy){setTimeout(next,150);return;}try{train({...options,seed:options.seed+1});}catch(e){console.error('training error',e);running=false;}if(running)setTimeout(next,140);};
const respond=async(req,res)=>{const u=new URL(req.url,'http://127.0.0.1');try{
 if(req.method==='GET'&&u.pathname==='/api/v17')return json(res,200,realState());
 if(req.method==='POST'&&u.pathname==='/api/v17'){const data=await parse(req);realCommand(data);return json(res,202,{accepted:true,action:data.action});}
 if(req.method==='GET'&&u.pathname==='/language-actions.html'){const b=fs.readFileSync(path.join(ROOT,'language-actions.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});return res.end(b);}
 if(req.method==='GET'&&u.pathname==='/v17.html'){const b=fs.readFileSync(path.join(ROOT,'v17.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});return res.end(b);}
 if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{status:'ok',isolated:true,source,knownV17:realState().available,realTraining:realState().running,realError:realState().error});
 if(req.method==='GET'&&u.pathname==='/api/state')return json(res,200,summary());
 if(req.method==='POST'&&u.pathname==='/api/train'){if(running)throw Error('Stop continuous mode before one-shot training');const data=await parse(req);const r=train(data);return json(res,200,{status:'trained',scores:r.scores,options});}
 if(req.method==='POST'&&u.pathname==='/api/control'){const d=await parse(req);if(d.action==='start'){if(!running){running=true;paused=false;setTimeout(next,10);}}
 else if(d.action==='stop'){running=false;paused=false;persist();}
 else if(d.action==='pause'){paused=true;persist();}
 else if(d.action==='resume'){if(running){paused=false;setTimeout(next,10);}else throw Error('Not running');}
 else if(d.action==='save')persist();else if(d.action==='reset'){running=false;paused=false;series=[];current=null;external=null;persist();}else throw Error('Unknown action');return json(res,200,{status:'ok',running,paused,busy});}
 if(req.method==='POST'&&u.pathname==='/api/import'){if(running)throw Error('Stop training before importing');const d=await parse(req);const result=analyzeEvents(d.events||[]);external=result;source='external';persist();return json(res,200,{status:'imported',worlds:result.worlds,cross_world_state:result.cross_world_state});}
 if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/observatory.html'||u.pathname==='/synthetic.html')){const file=u.pathname==='/synthetic.html'?'index.html':'observatory.html';const b=fs.readFileSync(path.join(ROOT,file));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});return res.end(b);}
 return json(res,404,{error:'Not found'});
 }catch(e){return json(res,/Invalid|Need |Unknown|Event |Events |Refusing|Not running|Stop /.test(e.message)?400:409,{error:e.message});}};
if(process.argv.includes('--events')){const p=process.argv[process.argv.indexOf('--events')+1];try{external=readEvents(p);source='external';persist();console.log('Imported read-only:',p);}catch(e){console.error('Import rejected:',e.message);process.exitCode=2;}}
else if(!current){train(options);}
const srv=http.createServer(respond);srv.listen(port,host,()=>console.log(`MagicPerspective isolated noise-space: http://${host}:${port}/\nWorking directory: ${ROOT}\nOriginal V17 source and checkpoints unchanged.`));
process.on('SIGINT',()=>{running=false;persist();closeRealWorker();srv.close();});