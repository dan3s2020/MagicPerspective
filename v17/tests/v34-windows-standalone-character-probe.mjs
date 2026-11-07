// Isolate character evidence extraction cost from the live trainer to
// distinguish a slow evidence algorithm from a busy original V17 worker.
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {v34LiveResearch} from "../research/text-hypermaze/v34-live-research.mjs";
const source=process.argv[2];if(!source)throw Error("Source original .v8 required");
const t=performance.now(),b=Brain.load(source);
const loadedMs=performance.now()-t;
const op=b.observedTransformations.operators.size;
const out=v34LiveResearch(b,{type:"character-status"});
const firstMs=performance.now()-t-loadedMs;
const repeat=v34LiveResearch(b,{type:"character-status"});
const repeatMs=performance.now()-t-loadedMs-firstMs;
const byteT=performance.now();
b.beginExercise();b.live(81,false);
const firstNativeByteMs=performance.now()-byteT;
const fullByteT=performance.now(),batchBytes=128;
for(let i=0;i<batchBytes;i++) {
 b.live(65+i%26,false);
 if((i+1)%32===0)console.log("V34_WINDOWS_NATIVE_FIRST_128_SYMBOLS_PROGRESS",
  JSON.stringify({symbols:i+1,elapsedMs:+(performance.now()-fullByteT).toFixed(1)}));
}
const first128NativeBytesMs=performance.now()-fullByteT;
console.log("V34_WINDOWS_ISOLATED_ORIGINAL_BRAIN_CHAR_PROBE",JSON.stringify({
 originalRecordedOperators:op,
 originalTextStates:b.observedTransformations.records.size,
 observedCharacterRules:out.acceptedMinimalOneCharacterContrasts,
 firstStatusMs:+firstMs.toFixed(1),identicalRepeatMs:+repeatMs.toFixed(1),
 incrementalNoReprocess:repeat.scannedOriginalSentencePairs===out.scannedOriginalSentencePairs,
 firstNativeTextByteMs:+firstNativeByteMs.toFixed(2),
 original128SubsequentByteMs:+first128NativeBytesMs.toFixed(2)
}));
if(firstMs>25000)throw Error("Standalone evidence extraction unresponsive even before live trainer");
