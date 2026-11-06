import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import {observedLayout,frozenTextLayout,project4D,routeDivergence} from "./hypermaze-geometry.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,"index.html"),"utf8");
const source=fs.readFileSync(path.join(here,"text-hypermaze.js"),"utf8")
 .replace(/^import \{observedLayout,frozenTextLayout,project4D,routeDivergence\} from "\.\/hypermaze-geometry\.mjs";\n/,"");

function graphic(){
 const calls=[];
 const fn=n=>(...args)=>{calls.push({n,args});};
 const g={calls};
 for(const n of ["clearRect","fillRect","beginPath","moveTo","lineTo","stroke","arc","fill",
  "fillText","setLineDash"])g[n]=fn(n);
 return g;
}
class E{
 constructor(id){this.id=id;this.listeners=new Map();this.children=[];
  this.style={};this.value="";this.textContent="";this.disabled=false;
  this.hidden=id==="hmOverlay";this.checked=false;
  this.width=id==="hmCanvas"?1200:0;this.height=id==="hmCanvas"?760:0;
  this.canvas=graphic();}
 addEventListener(t,f){const v=this.listeners.get(t)||[];v.push(f);this.listeners.set(t,v);}
 async fire(t,extra={}){for(const f of this.listeners.get(t)||[])await f({target:this,...extra});}
 click(){return this.fire("click");}
 getContext(){return this.canvas;}
 getBoundingClientRect(){return {width:1150,height:710};}
 setPointerCapture(){}
 append(...n){this.children.push(...n);}
 replaceChildren(){this.children.length=0;}
}
test("the full 4D viewer opens on actual V18 learned topology and replays step-by-step without simulated edges",async()=>{
 assert.match(html,/id="hmOverlay"/);
 assert.match(html,/id="hmUseCurrent"/);
 assert.match(html,/id="hmExercise"/);
 assert.match(source,/\/language-maze\/observatory/);
 assert.match(source,/\/language-maze\/analyze/);
 assert.match(source,/magicperspective:text-frozen-evaluation/);
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 const EMap=new Map(ids.map(id=>[id,new E(id)]));
 const $=id=>{assert.ok(EMap.has(id),"Missing actual control "+id);return EMap.get(id);};
 const document={getElementById:$,body:{style:{}},createElement:t=>new E(t)};
 const events=new Map(),window={
  devicePixelRatio:1,addEventListener:(t,fn)=>events.set(t,fn),
  dispatchEvent:e=>events.get(e.type)?.(e),
 };
 const observed={
  protocol:"FROZEN_SAME_EXPERIENCED_TEXT_WORLD",referenceEnteredPlanner:false,
  original:{globalPlanNodes:[0,1,3],pathNodes:[0,1,3],output:"az"},
  hybrid:{
   graph:{nodes:[
    {id:0,kind:3,potential:.6,successorOccupancy:.6},
    {id:1,kind:0,potential:.8,successorOccupancy:.8},
    {id:2,kind:0,potential:.8,successorOccupancy:.4},
    {id:3,kind:2,potential:1,successorOccupancy:1}],
    edges:[{from:0,to:1,character:"a",observedSupport:3},
      {from:0,to:2,character:"b",observedSupport:1},
      {from:1,to:3,character:"z",observedSupport:3}],
    goals:[{node:3,source:"real_training_answer"}]},
   globalPlanNodes:[0,1,3],pathNodes:[0,1,3],
   trace:[{step:1,source:0,target:1,character:"a",predictedCharacter:"a",
    agreesWithGlobal:true,localChoices:2,transformation:"observed_character_transition",
    potentialBefore:.6,potentialAfter:.8,successorBefore:.6,successorAfter:.8,prefix:"a"},
    {step:2,source:1,target:3,character:"z",predictedCharacter:"z",
    agreesWithGlobal:true,localChoices:1,transformation:"observed_character_transition",
    potentialBefore:.8,potentialAfter:1,successorBefore:.8,successorAfter:1,prefix:"az"}],
   solvedKnownGoal:true,viewpointEvidence:{actualRepropagationAfterEachMove:false}
  }
 };
 const frozen={source:"unseen_open_thoughts",lived:12345,exercises:[
  {n:8,a0:3,rows:[[81,81],[58,58],[10,10],[65,66],[66,66]],
   shape:"AB",shapeSame:.5,answer:.5},
  {n:6,a0:3,rows:[[81,81],[58,58],[10,10],[67,68]],
   shape:"D",shapeSame:0,answer:0}
 ]};
 const calls=[];
 const fetch=async(url,options={})=>{
  calls.push({url,options});
  const payload=url.startsWith("/language-maze/observatory")?{
   protocol:"OBSERVED_TRAINING_TEXT_WORLD",observedPrompt:"What is the route?"}:
   url==="/language-maze/analyze"?observed:
   url==="/eval"?frozen:null;
  if(!payload)throw Error("Unexpected endpoint "+url);
  return {ok:true,status:200,json:async()=>payload};
 };
 const ctx={document,window,location:{hash:"",search:"?live=1"},
  URLSearchParams,console,fetch,observedLayout,frozenTextLayout,project4D,routeDivergence,
  Math,JSON,Number,String,Array,Set,Map,Date,
  setInterval:()=>1,clearInterval:()=>{},cancelAnimationFrame:()=>{}};
 vm.runInNewContext(source,ctx,{filename:"text-hypermaze.js"});
 await $("tabHypermaze").fire("click");
 assert.equal($("hmOverlay").hidden,false);
 assert.ok($("hmCanvas").canvas.calls.some(c=>c.n==="fillText"));
 await $("hmLoadObserved").fire("click");
 assert.equal($("hmInitial").textContent,"2");
 assert.equal($("hmExecuted").textContent,"2");
 assert.match($("hmMeaning").textContent,/observată la antrenare/);
 assert.match($("hmProvenance").textContent,/NU este o topologie 4D învățată/);
 assert.ok($("hmCanvas").canvas.calls.some(c=>c.n==="stroke"));
 await $("hmNext").fire("click");
 assert.match($("hmStepDetails").textContent,/Caracter\/acțiune: "a"/);
 assert.equal($("hmScrub").value,"1");
 assert.equal($("hmRevisions").textContent,"NEIMPLEMENTAT");
 await $("hmUnseen").fire("click");
 assert.match($("hmMeaning").textContent,/Trei secvențe, NU trei drumuri/);
 assert.equal($("hmExercise").children.length,2);
 assert.equal($("hmDeviation").textContent,"50.0%");
 await $("hmNext").fire("click");
 assert.match($("hmStepDetails").textContent,/Predicție nouă după prefixul REAL/);
 $("hmExercise").value="1";
 await $("hmExercise").fire("change");
 assert.equal($("hmDeviation").textContent,"0.0%");
 assert.equal($("hmInitial").textContent,"1");
 // Existing /eval result from original app.js can update this inspector
 // without running an unrelated evaluation or replacing original UI.
 window.dispatchEvent({type:"magicperspective:text-frozen-evaluation",
  detail:{w:0,result:frozen}});
 assert.equal($("hmExercise").children.length,2);
 await $("hmClose").fire("click");
 assert.equal($("hmOverlay").hidden,true);
 assert.equal(calls.filter(c=>c.url==="/eval").length,1);
 assert.equal(calls.filter(c=>c.url==="/language-maze/analyze").length,1);
 assert.equal(Object.hasOwn(JSON.parse(calls.find(c=>c.url==="/language-maze/analyze").options.body),"answer"),false);
});
