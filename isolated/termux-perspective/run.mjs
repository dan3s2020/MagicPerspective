#!/usr/bin/env node
// Termux/Node zero-dependency runner; never imports CUDA or writes V17 checkpoints.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {runExperiment} from './engine.mjs';

const home=path.dirname(fileURLToPath(import.meta.url));
const outDir=path.join(home,'runs');
const parseArgs=args=>{
 const opts={train:320,test:64,seed:29,size:11,noise:0,port:8765,serve:true};
 const fields={train:'int',test:'int',seed:'int',size:'int',noise:'float',port:'int'};
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--no-serve'){opts.serve=false;continue;}
  if(arg==='--help'||arg==='-h'){opts.help=true;continue;}
  if(!arg.startsWith('--')||!(arg.slice(2) in fields))throw Error('Unknown argument '+arg+'; run --help');
  if(i+1>=args.length)throw Error('Missing value for '+arg);
  const key=arg.slice(2),raw=args[++i],n=Number(raw);
  if(!Number.isFinite(n)||(fields[key]==='int'&&!Number.isInteger(n)))throw Error('Invalid '+key+': '+raw);
  opts[key]=n;
 }
 if(opts.port<1024||opts.port>65535)throw Error('Port must be 1024–65535');
 return opts;
};
function printSummary(s){
 const asPct=v=>v===null?'n/a':(v*100).toFixed(1)+'%';
 const fmt=v=>v===null?'n/a':v.toFixed(2);
 console.log('\n================ HELD-OUT RESULTS ================');
 console.log('Calibration examples:',s.learned.examples,'learned directional mapping:',asPct(s.learned.accuracy));
 console.log('Previously unseen test mazes:',s.metadata.test,'/ size:',s.metadata.size);
 console.log('CONTROL (no transform): success',asPct(s.baseline.successRate),'extra steps (solved only)',fmt(s.baseline.meanExtraStepsSolved));
 console.log('LEARNED frame transform: success',asPct(s.trained.successRate),'extra steps (solved only)',fmt(s.trained.meanExtraStepsSolved));
 console.log('Success-rate difference:',s.improvement.successRatePoints.toFixed(1),'percentage points');
 console.log('Localization accuracy:',asPct(s.baseline.localizationAccuracy),'→',asPct(s.trained.localizationAccuracy));
 console.log('Orientation accuracy:',asPct(s.baseline.orientationAccuracy),'→',asPct(s.trained.orientationAccuracy));
 console.log('Map visibility during TEST: 1 initial overhead glance; then only egocentric 5x5 observations');
 console.log('Teacher during TEST: NONE. Teacher during calibration: frame ID + physical displacement.');
 console.log('V17 Brain trained in this isolated experiment: NO (original generator reused, model kept separate).');
 console.log('VERDICT:',s.verdict);
 console.log('==================================================\n');
}
function serve(result,port){
 const viewer=fs.readFileSync(path.join(home,'viewer.html'));
 const report=Buffer.from(JSON.stringify(result));
 const app=createServer((req,res)=>{
  if(req.method!=='GET'){res.writeHead(405);return res.end('GET only');}
  if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(viewer);}
  if(req.url==='/api/report'){res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});return res.end(report);}
  res.writeHead(404);res.end('Not found');
 });
 app.on('error',err=>{console.error('SERVER_ERROR',err.code||'',err.message);process.exitCode=1;});
 app.listen(port,'127.0.0.1',()=>{
  console.log('OPEN ON THIS PHONE: http://127.0.0.1:'+port+'/');
  console.log('Ctrl+C to stop the viewer. Results are already saved on disk.');
 });
 return app;
}
const help=[
 'MagicPerspective: global-map → body-perspective learning on Termux (zero dependencies)',
 '  node isolated/termux-perspective/run.mjs [--train 320] [--test 64] [--seed 29]',
 '       [--size 11] [--noise 0] [--port 8765] [--no-serve]',
 'Training observes true body frame + displacement (supervised calibration).',
 'Unseen test navigates from one overhead map glimpse plus local 5x5 views only.',
 'Outputs isolated/termux-perspective/runs/perspective-*.json and latest.json.'
].join('\n');
try{
 const opts=parseArgs(process.argv.slice(2));
 if(opts.help){console.log(help);process.exit(0);}
 console.log('=== MagicPerspective / GLOBAL → BODY learning ===');
 console.log('Engine: original V17 maze generator; calibration and navigation: isolated Node.js.');
 console.log('Phases: supervised calibration → independent learning-curve validation → frozen held-out test.');
 const started=performance.now();
 const result=runExperiment({...opts,onProgress:p=>{
  if(p.sample)console.log('[CALIBRATE]',p.sample,'/',opts.train,'examples',p.examples,'map→body mapping',(p.accuracy*100).toFixed(1)+'%');
  if(p.test)console.log('[HELDOUT]',p.test,'/',opts.test,
   'baseline success',(p.successBefore*100).toFixed(1)+'%',
   'learned success',(p.successAfter*100).toFixed(1)+'%');
 }});
 result.metadata.totalSeconds=(performance.now()-started)/1000;
 printSummary(result);
 fs.mkdirSync(outDir,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const file=path.join(outDir,'perspective-'+stamp+'.json');
 fs.writeFileSync(file,JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(outDir,'latest.json'),JSON.stringify(result,null,2));
 console.log('SAVED:',file);
 if(opts.serve)serve(result,opts.port);
}catch(err){console.error('EXPERIMENT_FAILED:',err.stack||err);process.exitCode=1;}
