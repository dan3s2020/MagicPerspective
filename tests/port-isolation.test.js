import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

// Catch silent collisions between independently launched laboratories.
// These are deliberate, stable local ports; do not mutate a running model's storage.
const apps=[
 {name:'V4 Forge',server:'v4/server.mjs',launcher:'v4/run-termux.sh',port:3033},
 {name:'V5',server:'v5/server.mjs',launcher:'v5/run-termux.sh',port:3034},
 {name:'V6 Horizon',server:'v6/server.mjs',launcher:'v6/run-termux.sh',port:3035},
 {name:'V7',server:'v7/server.mjs',launcher:'v7/run-termux.sh',port:3036},
 {name:'V4 Escape',server:'v4/escape-server.mjs',launcher:'v4/run-escape-termux.sh',port:3037},
 {name:'Causal Text Lab',server:'experiments/causal-text/server.mjs',
  launcher:'experiments/causal-text/run-termux.sh',port:3038},
 {name:'Graph Dance',server:'experiments/graph-dance-20261103/server.mjs',
  launcher:'experiments/graph-dance-20261103/run-termux.sh',port:3040}
];
test('the seven local labs have unique ports',()=>{
 const ports=apps.map(a=>a.port);
 assert.equal(new Set(ports).size,ports.length);
});
test('every server default and every launcher advertises the correct unique port',async()=>{
 for(const app of apps){
  const server=await readFile(path.join(process.cwd(),app.server),'utf8');
  const launcher=await readFile(path.join(process.cwd(),app.launcher),'utf8');
  assert.match(server,new RegExp('process\\.env\\.PORT\\|\\|'+app.port+'\\b'),app.name+' server fallback');
  assert.match(launcher,new RegExp('http://127\\.0\\.0\\.1:'+app.port+'\\b'),app.name+' launch address');
  if(app.name!=='Graph Dance'){
   assert.match(launcher,new RegExp('PORT='+app.port+'\\s+node'),app.name+' explicit port');
  }
 }
});
