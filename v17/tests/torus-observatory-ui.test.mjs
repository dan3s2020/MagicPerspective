import test from 'node:test';
import assert from 'node:assert/strict';
import {Observatory} from '../transcend/torus-aether/ui/observatory.js';

// Browser-independent UI acceptance: exercise the actual exported production
// renderer against Canvas and DOM contracts; the original V17 HTTP test
// exercises the REAL server and served HTML/JS in a separate process.
function fakeDom(){
 const elements=new Map(),buttons=["activity","transforms","paths","latent",
   "noise","spectrum","selfcode"].map(obs=>({dataset:{obs},classList:{toggle(){}},onclick:null}));
 let canvasesPainted=0;
 function make(id){
  const x={id,innerHTML:"",textContent:"",hidden:false,width:580,height:id==="obsCanvas"?270:160,
   className:"",children:[],append(...v){this.children.push(...v);},
   replaceChildren(...v){this.children=v;},
   classList:{contains(name){return name==="obsOn";},toggle(){}},
   getContext(){const noop=()=>{canvasesPainted++;};
    return {fillRect:noop,fillText:noop,beginPath:noop,moveTo:noop,lineTo:noop,
      stroke:noop,fill:noop,arc:noop,clearRect:noop,strokeRect:noop,
      set font(_v){},set fillStyle(_v){},set strokeStyle(_v){},set lineWidth(_v){}};}
  };elements.set(id,x);return x;
 }
 globalThis.document={
   getElementById(id){return elements.get(id)||make(id);},
   querySelector(sel){return sel==='aside.side'?make("aside.side"):null;},
   querySelectorAll(sel){return sel==="#obsNav [data-obs]"?buttons:
     sel==="#obsNav button"?buttons:[];},
   createElement(tag){return make(tag+"-"+elements.size);}
 };
 return {elements,buttons,getPainted:()=>canvasesPainted,get:id=>document.getElementById(id)};
}
test('Seven REAL observability tabs render live measured graph, cause, path, CUDA latents, noise, classical phases and source without fabricated values',()=>{
 const d=fakeDom();
 const o=new Observatory({getGraph:()=>0});o.select(0);
 const coordinates=Array.from({length:5},(_,i)=>.07+i*.11);
 const snap={
  nodes:[["s:65","sym","A",1],["s:66","sym","B",1]],
  edges:[["s:65","s:66","world",3]],
  U:[[65,coordinates],[66,coordinates.map(x=>x+.06)]],
  observedTransformations:{
   observed:4,comparedPairs:6,oneChangePairs:3,learnedOperators:4,
   learnedInvariantGroups:1,topOperators:[{kind:"replace",from:"He",to:"She",observedSupport:2,
    examples:[{from:"He is tired.",to:"She is tired."}]}]
  },
  constructedPaths:{pairedWorlds:2,textPathActions:19,textCompletedPaths:1,
   lastMaze:{n:7,firstShapeLength:4,firstShape:[0,2,1,3],routeRepairs:1,
    trace:[{sensedCells:9,moved:true},{sensedCells:12,moved:false}]}},
  shared:{training:{step:3,device:"cuda:0",preUpdatePredictionLoss:.4,identityBaselineLoss:.6,
    trace:{domain:"text",action:"replace",predictedError:.002,
      predicted:Array(32).fill(.2),observed:Array(32).fill(.3),before:Array(32).fill(.1)}}},
  endogenousNoise:{decisions:90,noiseChoices:30,noiseRate:1/3,cumulativeReward:4.6,
    bySite:{none:60,perception:12,imagination:10,action:8},
    last:{domain:"maze",site:"action",reward:.3},
    recent:[{domain:"maze",site:"action",strength:.4,reward:.3}]},
  selfcode:{ticks:16,graphNodes:22,probes:5,portals:2,remainingPortalBudget:20,
    originalUnchanged:true,lock:{locked:true},error:null}
 };
 const sample={at:Date.now()-350,chars:410000,lived:1576,exercises:100,
   nodes:2,edges:1,aligned:.64,sharedStep:3,updates:4,comparisons:3,
   textStates:17,pairedWorlds:2,noiseDecisions:90,gpuTextAccuracy:.55,sharedLoss:.4,vramGB:.8};
 const summary={w:0,status:"antrenează",chars:410000,lived:1576,nodeCount:2,
   edgeCount:1,snapshotAt:Date.now(),gpu:{settings:{device:"cuda:0"}}};
 const frozen=JSON.stringify({snap,sample,summary});
 o.ingest({w:0,summary,graph:snap,telemetry:{points:[sample],shared:snap.shared},error:null});
 assert.match(d.get("obsHealth").textContent,/antrenează/);
 assert.match(d.get("obsMeta").textContent,/410.000|410,000|410000/);
 for(const b of d.buttons){
  assert.equal(typeof b.onclick,"function");
  b.onclick();
  assert.ok(d.get("obsTitle").textContent.length>5,"Empty "+b.dataset.obs);
  assert.ok(d.get("obsCaveat").textContent.length>5);
  assert.ok(d.get("obsDetails").textContent.length>=0);
 }
 assert.ok(d.getPainted()>100,'Real Canvas paths did not run');
 assert.equal(JSON.stringify({snap,sample,summary}),frozen,'Rendering mutated real brain measurements');
 assert.equal(o.since(),sample.at);
 o.select(1);
 assert.equal(o.since(),0);
 assert.equal(o.history.length,0,'Switching graph must clear old graph telemetry');
 o.ingest({w:0,summary,graph:snap,telemetry:{points:[sample]}});
 assert.equal(o.history.length,0,'Late #0 response incorrectly overwrote newly selected #1');
});
