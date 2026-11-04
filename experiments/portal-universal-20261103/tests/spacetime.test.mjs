import test from 'node:test';
import assert from 'node:assert/strict';
import {AXES,PLANES,PLANE_NAMES,rotate5,project5,boundedWindow,timeCoord,
        graphHierarchy,lookupHierarchy} from '../web/spacetime-core.mjs';

const close=(a,b,eps=1e-10)=>assert.ok(Math.abs(a-b)<eps,`${a} !~= ${b}`);

test('exactly ten unique planes span five axes',()=>{
  assert.equal(AXES.length,5);assert.equal(PLANES.length,10);
  assert.equal(new Set(PLANE_NAMES).size,10);
  assert.ok(PLANE_NAMES.includes('WT'));
});

test('every 5D plane rotation preserves Euclidean norm',()=>{
  const original=[2.4,-.4,1.1,3.2,-1.7];
  const n=original.reduce((sum,x)=>sum+x*x,0);
  for(let k=0;k<10;k++){
    const angle=Array(10).fill(0);angle[k]=Math.PI/3;
    const rotated=rotate5(original,angle);
    close(rotated.reduce((sum,x)=>sum+x*x,0),n);
    const reverse=angle.map(x=>-x);
    const restored=rotate5(rotated,reverse);
    restored.forEach((v,i)=>close(v,original[i]));
  }
});

test('WT mixes time into visible spatial coordinates',()=>{
  const p=[0,0,0,0,1],a=Array(10).fill(0);
  const before=project5(p,{angles:a});
  a[PLANE_NAMES.indexOf('WT')]=Math.PI/2;
  const changed=project5(p,{angles:a});
  assert.ok(changed!==null);
  assert.ok(Math.abs(changed.x-before.x)+Math.abs(changed.y-before.y)<1e-8,
    'WT alone maps onto W and needs a further spatial rotation to show in 2D');
  // Combine WT and XW for a visible spatial influence.
  const xw=Array(10).fill(0);xw[PLANE_NAMES.indexOf('XW')]=Math.PI/4;
  const visible=project5(rotate5(rotate5(p,a),xw));
  assert.ok(Math.abs(visible.x-before.x)>0.1);
});

test('5D projection rejects invented coordinates and invalid camera',()=>{
  assert.throws(()=>rotate5([1,2,3,4]),/five finite/);
  assert.throws(()=>project5([0,0,0,0,1],{center:[0,0,0,0]}),/Invalid camera/);
  assert.equal(project5([0,0,0,0,100]),null);
});

test('time window navigates narrow to full history with inclusive ids',()=>{
  const meta={first:15,last:300,total:286};
  assert.deepEqual(boundedWindow(meta,15,1),{start:15,end:15,width:1});
  assert.deepEqual(boundedWindow(meta,300,30),{start:271,end:300,width:30});
  assert.deepEqual(boundedWindow(meta,200,1e30),{start:15,end:300,width:286});
  assert.equal(timeCoord(15,{start:15,end:300}),-2.25);
  assert.equal(timeCoord(300,{start:15,end:300}),2.25);
});

test('hierarchy merges only truly linked observed nodes',()=>{
  const nodes=[1,2,3,4].map(id=>({id,p4:[id,0,0,0]}));
  const levels=graphHierarchy(nodes,[{from:1,to:2,weight:10},{from:2,to:3,weight:1}],6);
  assert.ok(levels.length>=2);
  assert.equal(levels[0].nodes.length,4);
  const l1=levels[1];
  assert.equal(l1.nodes.length,3);
  assert.ok(l1.nodes.some(n=>n.members.join(',')==='1,2'));
  assert.ok(l1.nodes.some(n=>n.members.join(',')==='4'));
  const mapped=lookupHierarchy(l1);
  assert.equal(mapped.get(1),mapped.get(2));
  assert.notEqual(mapped.get(4),mapped.get(2));
  close(mapped.get(1).p4[0],1.5);
  assert.deepEqual(nodes[0].p4,[1,0,0,0]); // source not mutated
});
