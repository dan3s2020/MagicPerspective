import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphTrace} from './trace.mjs';

test('live V17 text trajectory only includes genuine tagged text actions',()=>{
 const T=new GraphTrace();
 T.steps=91;
 T.observeTextAction({actual:65,predicted:66,chainPrediction:66,source:'chain-gpu-replay'});
 T.steps=92;
 T.observeTextAction({actual:66,predicted:66,chainPrediction:65,source:'align-online'});
 const S=T.snapshot(false);
 assert.deepEqual(S.textSteps,[[91,65,66,66,'chain-gpu-replay'],[92,66,66,65,'align-online']]);
 assert.ok(Array.isArray(S.U));
 assert.equal(S.textSteps[0][1],65,'observed symbol must not be overwritten by predicted symbol');
});
