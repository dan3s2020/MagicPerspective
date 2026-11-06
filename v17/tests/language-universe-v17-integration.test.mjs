import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {TextPerspectives} from '../transcend/torus-aether/language-universe/perspectives.mjs';

test('original V17 Brain shares lived text and maze, then survives saving',()=>{
 const brain=new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false},c:{margin:.05,window:400,many:12},seed:11});
 const words=new TextPerspectives();
 brain.beginExercise();const sentence='the gate opens after a lever is pulled.';
 for(const y of sentence)brain.live(y.charCodeAt(0));
 words.observe(sentence);
 const played=brain.playMaze(true);
 assert.equal(typeof played.solved,'boolean');
 assert.ok(brain.align.mem.n>=sentence.length);
 assert.ok(words.seen>5);
 const p=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'mp-v17-lang-')),'brain.v8');
 try {brain.save(p);const loaded=Brain.load(p);assert.equal(loaded.align.mem.n,brain.align.mem.n);assert.equal(loaded.mazes.played,brain.mazes.played);}
 finally {fs.rmSync(path.dirname(p),{recursive:true,force:true});}
});
