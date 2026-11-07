import test from "node:test";
import assert from "node:assert/strict";
import {ascii,ALPHAS,mixedPrediction,scoreAxisPredictions} from "./graph0-heldout-axis-core.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {LivedField} from "../transcend/torus-aether/fractal.mjs";

test("mixing two distributions makes previously unreachable candidate selectable",()=>{
 const A=new Map([[88,1]]),F=new Array(128).fill(0);F[65]=1;
 assert.equal(mixedPrediction(A,F,0).top,88);
 assert.equal(mixedPrediction(A,F,1).top,65);
 assert.equal(mixedPrediction(A,F,0.75).top,65);
 assert.equal(mixedPrediction(A,null,1).top,88,"when FIELD missing, alignment remains usable");
 assert.equal(mixedPrediction(new Map(),F,0).top,65,"when alignment missing, FIELD remains usable");
 assert.equal(mixedPrediction(new Map(),null,0.5).top,32,"the original native default when every successor set is empty");
 assert.equal(ALPHAS.length,6);
});

test("heldout answer-only score respects true starting answer boundary",()=>{
 const bytes=ascii("Q: abc\nA: AAAA");
 const d=bytes.map(y=>new Map([[88,2]]));
 const F=bytes.map(()=>{const p=new Array(128).fill(0);p[65]=1;return p;});
 const answerStart=ascii("Q: abc\nA: ").length;
 const result=scoreAxisPredictions(bytes,answerStart,d,F);
 assert.equal(result["0"].answerCorrect,0);
 assert.equal(result["1"].answerCorrect,4);
 assert.equal(result["1"].answerTotal,4);
 assert.equal(result["1"].fieldCoverageFraction,1);
 assert.equal(result["0"].allTotal,bytes.length-4);
 assert.ok(result["0.25"].answerAccuracy>=0&&result["0.25"].answerAccuracy<=1);
});

test("native AligningGraph and native LivedField do not inspect the future byte before prediction",()=>{
 const corpus=("Q: alpha\nA: abcabbc!\n\nQ: beta\nA: abcbcab?\n\n").repeat(20);
 const a=new AligningGraph({g:8});
 a.imagineEvery=0;
 const place=y=>Array.from({length:5},(_,i)=>(((y*13+i*47)%101)+1)/103);
 const f=new LivedField({keep:15000,rebuildEvery:90000});
 for(const ch of corpus){
  const y=ch.charCodeAt(0);
  a.live(y);
  f.live(y,place);
 }
 a.mem.lazy=a.fmem.lazy=true;a.mem.ready(true);a.fmem.ready(true);
 const prefix=ascii("Q: alp\nA: ");
 const v1=prefix.concat(ascii("xy"));
 const v2=prefix.concat(ascii("zy"));
 const check=bytes=>{
  const snapshots=[];
  a.readFrozen(bytes,(i,y,g,d)=>snapshots[i]=new Map(d));
  const field=f.read(bytes,place);
  return {align:snapshots,field};
 };
 const x=check(v1),y=check(v2),i=prefix.length;
 assert.deepEqual([...x.align[i]], [...y.align[i]],"current true symbol not available before next-symbol choice");
 assert.deepEqual(x.field[i],y.field[i],"FIELD cannot read the unseen future symbol at the same position");
 assert.equal(mixedPrediction(x.align[i],x.field[i],0.25).top,
              mixedPrediction(y.align[i],y.field[i],0.25).top);
});
