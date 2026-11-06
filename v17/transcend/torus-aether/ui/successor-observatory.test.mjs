import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.resolve(here,"../ui");
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const source=fs.readFileSync(path.join(dir,"successor-observatory.js"),"utf8");
const tabIDs=["tabTrain","tabEval","tabPS","tabMetrics","tabTransfer","tabLang","tabSuccessor"];
const noop=()=>{};
const canvasContext=()=>({
  beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,fill:noop,
  fillRect:noop,clearRect:noop,arc:noop,fillText:noop,setLineDash:noop
});
class Classes {
  constructor(){this.set=new Set();}
  add(...xs){for(const x of xs)this.set.add(x);}
  remove(...xs){for(const x of xs)this.set.delete(x);}
  contains(x){return this.set.has(x);}
}
class Element {
  constructor(id=""){
    this.id=id;this.value="";this.textContent="";
    this.listeners=new Map();this.children=[];this.dataset={};
    this.style={};this.classList=new Classes();this.width=640;this.height=360;
    this.disabled=false;
  }
  addEventListener(t,fn){(this.listeners.get(t)||this.listeners.set(t,[]).get(t)).push(fn);}
  async fire(t){for(const fn of this.listeners.get(t)||[])await fn({target:this,closest:()=>null});}
  append(...x){this.children.push(...x);}
  replaceChildren(...x){this.children=x.slice();}
  getContext(){return canvasContext();}
  closest(){return null;}
}
function makeFixture(){
 const nodes=[{id:0,kind:3,potential:.65,successorOccupancy:.6},
  {id:1,kind:0,potential:.75,successorOccupancy:.3},
  {id:2,kind:0,potential:.75,successorOccupancy:.8},
  {id:3,kind:2,potential:1,successorOccupancy:1}];
 const edges=[{from:0,to:1,character:"A",observedSupport:1},
  {from:0,to:2,character:"B",observedSupport:3},
  {from:1,to:3,character:"z",observedSupport:1},
  {from:2,to:3,character:"z",observedSupport:3}];
 const graph={nodes,edges};
 const base={steps:2,pathNodes:[0,1,3],output:"Az",graph,
   field:[.65,.75,.75,1],candidates:2,abstained:false,solvedKnownGoal:true};
 const hybrid={...base,pathNodes:[0,2,3],output:"Bz",successor:{
  enabled:true,mode:"hybrid",rootOccupancy:.6,globalTieBreaks:1,
  localTieBreaks:1,converged:true,gamma:.9
 },localAgreementRate:1,trace:[
  {step:1,source:0,target:2,character:"B",prefix:"B",potentialBefore:.65,
   potentialAfter:.75,successorBefore:.6,successorAfter:.8,
   transformation:"observed_character_transition",localChoices:2,agreesWithGlobal:true},
  {step:2,source:2,target:3,character:"z",prefix:"Bz",potentialBefore:.75,
   potentialAfter:1,successorBefore:.8,successorAfter:1,
   transformation:"observed_character_transition",localChoices:1,agreesWithGlobal:true}
 ]};
 const joined={protocol:"FROZEN_SAME_EXPERIENCED_TEXT_WORLD",
  original:base,hybrid,trainingMemory:{rowsObserved:21},
  sameWorkerSnapshot:true,referenceEnteredPlanner:false};
 const cases=[{prompt:"Question A",actual:"Az",expected:"Bz",equal:false}];
 const evalData={protocol:"FROZEN_HELDOUT_SAME_WORLD_ABLATION",
  heldoutRows:1,trainingRowsSeen:21,evaluatedAt:"2026-11-06T20:00:00.000Z",
  original:{exactRate:0,accuracy:0,cases},
  hybrid:{exactRate:1,accuracy:1,cases:[{...cases[0],actual:"Bz",equal:true}]},
  exactDelta:1,characterDelta:1,referenceEnteredPlanner:false};
 return {joined,evalData};
}
test("actual successor tab becomes visible, draws measured data and shows comparative frozen evaluation",async()=>{
 for(const id of [...tabIDs,"successorPane","scObserved","scSampleStatus","scPathCanvas",
  "scFieldCanvas","scEvaluate","scAnalyze","scExactDelta","scEdges"])
  assert.match(html,new RegExp('id="'+id+'"'),"Missing actual HTML control "+id);
 assert.match(html,/aside\.side\.successorOn #successorPane\{display:block\}/);
 assert.match(html,/src="successor-observatory\.js"/);
 const found=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 const elems=new Map(found.map(id=>[id,new Element(id)]));
 const byID=id=>elems.get(id)||null;
 byID("scGraphId").value="0";
 byID("scPrompt").value="";
 const side=new Element("side");
 side.querySelectorAll=()=>tabIDs.map(byID);
 const doc={
  hidden:false,
  getElementById:byID,
  querySelector:q=>q==="aside.side"?side:null,
  createElement:t=>new Element(t),
  addEventListener:noop
 };
 const location={hash:"",pathname:"/transcend/torus-aether/ui/index.html",search:"?live=1"};
 const history={replaceState:(_,__,url)=>{location.hash=url.includes("#")?url.slice(url.indexOf("#")):"";}};
 const calls=[];
 const {joined,evalData}=makeFixture();
 const fetch=async(url,opts={})=>{
  calls.push({url,opts});
  let body;
  if(url==="/graphs")body={world:"OpenThoughts",graphs:[{w:0,status:"antrenează",arm:"stable+many",chars:123456,
   gpu:{settings:{device:"cuda:0"}},test:{live:.6},maze:{test:{solved:1}}}],
   gpu:{device:"cuda:0"}};
  else if(url.startsWith("/telemetry?"))body={telemetry:{languageMaze:{
    rowsObserved:21,characterTransitionsObserved:210,knownGoalObservationCount:21,observedPositionalRules:2
   }}};
  else if(url.startsWith("/language-maze/observatory?"))body={
   protocol:"OBSERVED_TRAINING_TEXT_WORLD",available:false,observedPrompt:null};
  else if(url.startsWith("/language-maze/compare-last?"))body={available:false};
  else if(url==="/language-maze/analyze")body=joined;
  else if(url.startsWith("/language-maze/compare?"))body=evalData;
  else throw Error("Unexpected network request "+url);
  return {ok:true,status:200,json:async()=>body};
 };
 const context={document:doc,location,history,fetch,console,
  setInterval:()=>1,clearInterval:noop,Date,
  Number,String,Math,Array,Map,Set,JSON};
 vm.runInNewContext(source,context,{filename:"successor-observatory.js"});
 await byID("tabSuccessor").fire("click");
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(side.classList.contains("successorOn"),true,"Dedicated pane must actually be visible");
 assert.equal(byID("tabSuccessor").classList.contains("on"),true);
 assert.equal(byID("scRows").textContent,"21");
 assert.equal(byID("scTransitions").textContent,"210");
 assert.equal(byID("scGpu").textContent,"cuda:0");
 byID("scPrompt").value="Which path?";
 await byID("scAnalyze").fire("click");
 assert.equal(byID("scV").textContent,"0.65000");
 assert.equal(byID("scS").textContent,"0.60000");
 assert.equal(byID("scTies").textContent,"1 / 1");
 assert.equal(byID("scDivergence").textContent,"DIFERIT");
 assert.ok(byID("scEdges").children.length>=2,"Must render real alternative edges");
 assert.match(byID("scPathDiff").textContent,/Traseu|DIVERGENȚĂ/);
 await byID("scEvaluate").fire("click");
 assert.equal(byID("scExactOriginal").textContent,"0.00%");
 assert.equal(byID("scExactHybrid").textContent,"100.00%");
 assert.equal(byID("scExactDelta").textContent,"+100.00 pp");
 assert.equal(byID("scEvalRows").children.length,1);
 const analyzeCall=calls.find(c=>c.url==="/language-maze/analyze");
 assert.ok(analyzeCall);
 const request=JSON.parse(analyzeCall.opts.body);
 assert.deepEqual(request,{w:0,prompt:"Which path?"});
 assert.equal(Object.hasOwn(request,"answer"),false,"Never pass held-out reference into planner");
 await byID("tabTrain").fire("click");
 assert.equal(side.classList.contains("successorOn"),false);
});
