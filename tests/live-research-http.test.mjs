// CI transport smoke only: no user-facing demo/benchmark results from this fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=path.join(repo,'ci-research-parquet');
test('REAL original worker emits research through HTTP and original UI displays an active tab',{timeout:45000},async()=>{
  assert.ok(fs.existsSync(path.join(fixture,'records.parquet')),'CI only Parquet fixture was not generated');
  const port=await new Promise((resolve,reject)=>{
    const srv=createServer();srv.on('error',reject);srv.listen(0,'127.0.0.1',()=>{
      const p=srv.address().port;srv.close(()=>resolve(p));
    });
  });
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'mp-original-live-'));
  const script=path.join(repo,'v17/transcend/torus-aether/devour/devour.mjs');
  const args=[script,'--workers','1','--arms','stable+many','--mem','2',
    '--every','1000','--chars','1400','--data',fixture,'--out',out,
    '--port',String(port),'--worlds','text,maze','--maze-every','150',
    '--research','--research-every','2','--research-eval','2','--start','--gpu','off'];
  const child=spawn(process.execPath,args,{cwd:path.join(repo,'v17'),env:{...process.env}});
  let log='';
  for(const name of ['stdout','stderr'])child[name].on('data',chunk=>{
    log=(log+chunk.toString()).slice(-18000);
  });
  let crashed=false;child.on('exit',()=>{crashed=true;});
  try{
    const deadline=Date.now()+38000;
    let telemetry=null;
    while(Date.now()<deadline){
      if(crashed)throw Error('V17 server exited before real research telemetry: '+log.slice(-4000));
      try{
        const res=await fetch('http://127.0.0.1:'+port+'/research?w=0');
        const data=await res.json();
        if(data.enabled&&data.attempts>=1&&data.last){
          telemetry=data;break;
        }
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    assert.ok(telemetry,'No worker-fed research status in 38 seconds: '+log.slice(-6000));
    assert.equal(telemetry.realTraining,true);
    assert.equal(telemetry.heldoutNeverTrained,true);
    assert.equal(telemetry.last.type,'prequential-before-observe');
    assert.ok(telemetry.totals.nativeCalls>=1);
    assert.ok(Array.isArray(telemetry.history));
    assert.ok(telemetry.last.graph.nodes.length>=1);
    assert.ok(telemetry.last.navigation?.native?.frames.length>=1,
      'Actual native shape replay frames missing');
    assert.ok(telemetry.last.navigation?.successor?.frames.length>=1,
      'SR actor trace missing');
    assert.ok(telemetry.characterTelemetry?.seen>0,
      'Original Brain.live per-character predictions are missing from CPU text training');
    assert.ok(telemetry.characterTelemetry?.recent.length>0);
    assert.ok(telemetry.characterTelemetry.recent.every(x=>
      Number.isInteger(x.actual)&&Number.isInteger(x.guess)));

    for (const policy of ['native','successor']) {
      const t=telemetry.last.navigation[policy];
      assert.equal(t.summary.steps,t.frames.length-1);
      assert.equal(t.summary.recomputations,t.frames.length);
      assert.equal(t.frames[0].actual,null);
      for(const fr of t.frames.slice(1))
        assert.ok(t.edges.some(e=>e.from===fr.from&&e.to===fr.actual&&e.action===fr.action),
          'No invented actor movement');
      assert.equal(t.factualLimits.inventedEdges,false);
    }
    const rootUrl='http://127.0.0.1:'+port+'/transcend/torus-aether/ui/';
    for(const [file,required] of [
      ['index.html?live=1','id="researchShapeMap"'],
      ['app.js','setupResearchTab'],
      ['research-panel.mjs',"'/research?w='"],
      ['research-charts.mjs','function canvas'],
      ['research-replay.mjs','setupShapeReplay'],
      ['research-replay-draw.mjs','drawGlobalShape'],
      ['research-character-replay.mjs','setupCharacterReplay']
    ]){
      const res=await fetch(rootUrl+file);
      assert.equal(res.status,200,file+' not served from original V17');
      const t=await res.text();
      assert.ok(t.includes(required),file+' missing required UI/controller code');
    }
  }finally{
    child.kill('SIGTERM');
    fs.rmSync(out,{recursive:true,force:true});
  }
});
