import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Discoverer,playExercise,makeMaze,SEEDS,seedOf,KIND} from '../transcend/torus-aether/worlds/exercise.mjs';
import {retinaForWorld,heapWeightedField,greedyFromField,replayOriginalShape} from '../research/science/native-field-mechanics.mjs';
test('research ONLY: original trained Discoverer vs exact heap-weighted field over growing unseen labyrinths',()=>{
  const D=new Discoverer(211);D.temp=0;D.noise=0;
  for(let i=0;i<160;i++)playExercise(makeMaze(seedOf(SEEDS.train,i),i%2?9:7),D,()=>{},{record:false});
  assert.equal(D.self(),KIND.self);
  const record=[];
  for(const n of [9,21,41]){
    let nativeMs=0,heapMs=0,maxAbsError=0,exactPaths=0,goalOriginal=0,goalHeap=0;
    for(let i=0;i<20;i++){
      const w=makeMaze(seedOf(SEEDS.test,880017+n*113+i),n);
      const ret=retinaForWorld(w),me=ret.indexOf(D.self());
      const att=[0,1,2,3].map(k=>D.attract(k)),cond=[0,1,2,3].map(k=>D.conduct(k));
      let original,alt,field;
      const start=performance.now();
      original=D.shape(ret,n,me);
      nativeMs+=performance.now()-start;
      const mid=performance.now();
      field=heapWeightedField(ret,n,me,att,cond);
      alt=greedyFromField(field,ret,n,me,att);
      heapMs+=performance.now()-mid;
      const reference=replayOriginalShape(D,ret,n,me,{keepFrames:false});
      assert.deepEqual(original,reference.path,'Original research trace diverged');
      maxAbsError=Math.max(maxAbsError,...field.map((x,j)=>Math.abs(x-reference.field[j])));
      exactPaths+=Number(JSON.stringify(original)===JSON.stringify(alt));
      let a=me,b=me;
      for(const o of original||[])a+=[-n,1,n,-1][o];
      for(const o of alt||[])b+=[-n,1,n,-1][o];
      goalOriginal+=Number(a===w.goal);goalHeap+=Number(b===w.goal);
    }
    assert.ok(maxAbsError<1e-9,'Heap field does not match native original: '+maxAbsError);
    assert.equal(goalOriginal,goalHeap,'Heap candidate changes goal-reaching success');
    const row={n,worlds:20,nativeMs,heapMs,speedRatio:nativeMs/heapMs,maxAbsError,
      exactPaths,goalOriginal,goalHeap};
    console.log('SCIENCE_HEAP_COMPARISON',JSON.stringify(row));
    record.push(row);
  }
  // No claim of speedup is authorized without evidence and total route parity.
  assert.ok(record.every(x=>x.worlds===20));
});
