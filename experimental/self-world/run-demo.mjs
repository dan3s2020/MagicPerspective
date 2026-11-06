import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {SelfCodeWorld} from './code-world.mjs';
import {configureSealedLock,exploratoryTraining,measureEdit} from './causal-laboratory.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source=process.env.MP_ENGINE||path.join(dir,'reference/engine.mjs');
const repoRoot=process.env.MP_V17_ROOT;
const extra=repoRoot?[
  {path:path.join(repoRoot,'transcend/torus-aether/devour/brain.mjs'),label:'v17/brain.mjs'},
  {path:path.join(repoRoot,'transcend/torus-aether/devour/worker.mjs'),label:'v17/worker.mjs'},
  {path:path.join(repoRoot,'transcend/torus-aether/shared/experience.mjs'),label:'v17/shared-experience.mjs'},
].filter(v=>fs.existsSync(v.path)):[];
const sandbox=path.join(dir,'runtime-selfcode-sandbox');
const world=new SelfCodeWorld({sourceFiles:[{path:source,label:'v17/epistemic-text/engine.mjs'},...extra],sandbox,seed:20261106});
configureSealedLock(world);
// Make source nodes available as observations (brain is optional; use the bridge to connect the original Brain).
const first=world.atlas.nodes.find(n=>n.kind==='declaration');
world.perceive(first.id);
const probes=await exploratoryTraining(world,{rounds:12});
const audit=await world.unlockWithBlindChallenges();
const best=world.effectModel.probes.slice().sort((a,b)=>b.delta-a.delta)[0];
let promotion={status:'locked'};
if(best){
  const draft=world.previewCodeChange({id:best.slot,value:best.value});
  if(audit.unlocked){
    // A separate frozen regression and actual positive improvement is required to approve a draft.
    const held=await measureEdit(world,best.slot,best.value,{seed:77667,steps:2500});
    if(held.delta>0){
      promotion={status:'approved-sandbox-only',...world.commitSandboxDraft(draft.sha256,()=>true),heldoutGain:held.delta};
    }else promotion={status:'rejected-regression',heldoutGain:held.delta};
  }
}
const result={sourceSHA256:world.editor.sha256,graph:world.atlas.describe(),portal:world.portal.snapshot(),lock:world.lock.status(),audit,probes,promotion,
  unchanged:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')===world.editor.sha256,
  note:'The noise portals are learned local exploration, not physical spacetime portals. V17 does not yet learn general programming; edits are numerical allowlisted sandboxes.'};
fs.writeFileSync(path.join(dir,'experiment-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({nodes:result.graph.nodes.length,files:result.graph.files.length,portals:result.portal.used,probes:result.probes.length,lock:result.lock,promotion:result.promotion,originalUnchanged:result.unchanged},null,2));
