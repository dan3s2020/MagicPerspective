import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveResearch} from './live-research.mjs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
function originalBrain() {
  const brain=new Brain({rules,c:{margin:.05,window:400},seed:11});
  for(let i=0;i<30;i++)brain.playMaze(false);
  assert.ok(brain.disc.attract(2)>.2);
  return brain;
}
test('online research scores BEFORE a new real V17 learning step; no heldout answer enters atlas',()=>{
  const brain=originalBrain(),r=new LiveResearch({maxEntries:64,reportEvery:1,characterLimit:60});
  assert.equal(r.observed,0);
  r.experience({index:0,question:'Where is the archive?',answer:'In the library.',characters:120},brain);
  assert.equal(r.last.path.shortestPathCount??'0','0');
  assert.equal(r.observed,1);
  for(const y of Array.from('Q: Where is the archive?\nA: In the library.\n\n',x=>x.charCodeAt(0)))brain.live(y);
  r.experience({index:1,question:'Where is the archive located?',answer:'Inside the library building.',characters:130},brain);
  assert.ok(r.usages.nativeCalls>1);
  assert.equal(r.attempts,2);
  assert.equal(r.atlas.examples.some(x=>x.sourceIndex===9),false);
  const held=r.evaluateHeldout([{index:9,prompt:'Where is the archive?',answer:'In the library.'}],brain);
  assert.equal(held.samples,1);
  assert.equal(r.atlas.examples.some(x=>x.sourceIndex===9),false);
  const saved=r.save();
  const resumed=LiveResearch.restore(saved);
  assert.equal(resumed.observed,2);
  assert.equal(resumed.attempts,2);
  assert.equal(resumed.history.length,2);
  assert.equal(resumed.atlas.examples.length,2);
});
test('research does not manufacture successful answers for disconnected questions',()=>{
  const brain=originalBrain(),r=new LiveResearch({maxEntries:64});
  r.experience({index:0,question:'Where is the archive?',answer:'Inside the library.',characters:90},brain);
  const before=r.candidate('quantum entanglement of silicon transistors',brain,{trace:true});
  assert.equal(before.native,'');
  assert.equal(before.sr,'');
  assert.equal(before.multi,null);
});
test('research status exposes true counters and no-semantic-proof flag',()=>{
  const r=new LiveResearch();
  assert.equal(r.status().semanticsProven,false);
  assert.equal(r.status().attempts,0);
  assert.equal(r.status().observed,0);
  assert.equal(r.status().totals.changedDecisions,0);
});
