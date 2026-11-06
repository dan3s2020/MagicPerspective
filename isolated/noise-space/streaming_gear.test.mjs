import test from 'node:test';
import assert from 'node:assert/strict';
import {NestedTextGears} from './nested_text_gears.mjs';
test('long training text creates observed submaze windows',()=>{
 const g=new NestedTextGears();
 const answer='The person walks across the city to discover why the road bends and moves through several different doors toward tomorrow';
 const n=g.observeAnswer(answer);
 assert.ok(n>0,'long natural sentences must not be silently dropped');
 assert.ok(g.examples.some(x=>x.length>=3&&x.length<=9));
});
test('streaming gear continues after 6,000 learned episodes without unbounded memory',()=>{
 const g=new NestedTextGears();
 for(let i=0;i<6030;i++)g.observeSentence('alpha z'+i+' omega');
 assert.equal(g.observed,6030);
 assert.equal(g.examples.length,6000);
 assert.ok(g.operators.size<=10000);
 assert.ok(g.signatures.size<=18000);
 assert.equal(g.observeSentence('alpha neverbefore omega'),true);
 assert.equal(g.observed,6031);
});
test('original v1 checkpoints remain readable; v2 persists observed operators',()=>{
 const g=new NestedTextGears();for(const s of ['She is happy','She is tired','He is tired','He is calm'])g.observeSentence(s);
 const stored=g.export();
 assert.equal(stored.version,2);
 const restored=NestedTextGears.restore(stored);
 assert.equal(restored.cursor('He is tired',{0:'She',2:'calm'}).output,'She is calm.');
 const older=NestedTextGears.restore({version:1,examples:stored.examples});
 assert.equal(older.cursor('He is tired',{0:'She',2:'calm'}).output,'She is calm.');
});
