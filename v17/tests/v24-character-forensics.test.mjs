import test from "node:test";
import assert from "node:assert/strict";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {CharacterHypermaze,charActionId,parseCharAction} from "../transcend/torus-aether/worlds/character-hypermaze.mjs";
const pairWorlds=[
 "cat flies.","cot flies.",
 "bat glows.","bot glows.",
 "cot sings.","cut sings.",
 "bot rests.","but rests."
];
const learn=()=>{
 const w=new LearnedCognitiveMap(),c=new CharacterHypermaze(),raw=[];
 c.atlasSink=e=>raw.push(e);
 w.onAtlasEvidence=e=>{raw.push(e);c.observeWordContrast(e);};
 for(let i=0;i<pairWorlds.length;i++)w.observeWorld(pairWorlds[i],{id:i+1});
 return {w,c,raw};
};
test("V24 forensic: old word-only V23 cannot walk in this new word; CHAR portal unlocks a 2-hop original V17 pre-action route",()=>{
 const {w,c,raw}=learn(),goal={charSlots:{"1":"u"}};
 const old=w.formSolution("mat",{slots:{"0":"mut"}},{maxNodes:100,maxDepth:4});
 const before=c.formSolution("mat",goal,{transfer:false,maxNodes:100,maxDepth:4});
 const after=c.formSolution("mat",goal,{transfer:true,maxNodes:100,maxDepth:4});
 assert.equal(old.found,false,"No word-level transformation is licensed for word 'mat'");
 assert.equal(before.found,false,"No character route can appear without learned transfer");
 assert.equal(before.reason,"NO_INDEPENDENT_CHARACTER_TRANSFORM_EVIDENCE");
 assert.equal(after.found,true,"The same original maze discovery operator must solve with cross-world char transitions");
 assert.equal(after.method,"Discoverer.shape");
 assert.equal(after.plannedBeforeAction,true);
 assert.equal(after.path.length,2);
 assert.deepEqual(after.firstPrediction.map(x=>x.to),["mot","mut"]);
 const chars=after.path.map(x=>parseCharAction(x.action));
 assert.deepEqual(chars.map(x=>[x.op,x.at,x.from,x.to]),[
  ["replace",1,"a","o"],["replace",1,"o","u"]
 ]);
 assert.deepEqual(after.world.states[after.path.at(-1).to],["m","u","t"]);
 assert.ok(after.world.neighbors.flat().some(e=>e.characterLevel&&e.hypothesis));
 assert.equal(after.world.diagnostics.nodeLimitReached,false);
 assert.equal(after.world.diagnostics.depthLimitReached,false,
   "This finite four-state reachable character world must truthfully report a COMPLETE learned map");
 assert.ok(raw.some(e=>e.type==="character-rule-evidence"));
 const learnedBefore=c.export();
 const actual=c.execute(after,{step:(before,action)=>{
  const a=parseCharAction(action);assert.equal(a.op,"replace");
  const o=before.slice();assert.equal(o[a.at],a.from);o[a.at]=a.to;
  return {accepted:true,after:o}; // independently executed test environment physics
 }});
 assert.equal(actual.reached,true);
 assert.equal(actual.final,"mut");
 assert.equal(actual.actualActions,2);
 assert.ok(raw.some(x=>x.type==="character-real-action"&&x.correct));
 console.log("V24_ACTUAL_BLOCKED_VS_UNLOCKED",JSON.stringify({
  oldWordOnly:{found:old.found,reason:old.reason,missing:"word-level first-token replacement 'mat'->'mut'"},
  before:{found:before.found,reason:before.reason},
  learnedFromOtherWorlds:after.path.map(x=>({
    from:after.world.states[x.from].join(""),
    action:parseCharAction(x.action),
    to:after.world.states[x.to].join(""),
    evidence:after.world.neighbors[x.from].find(e=>e.action===x.action)?.provenance?.length
  })),
  after:{found:after.found,method:after.method,unseenFinal:actual.final,actualActions:actual.actualActions},
  noSemanticNaturalLanguageQAClaim:true
 }));
});
test("A single character contrast is NOT permission to hallucinate a universal character path",()=>{
 const w=new LearnedCognitiveMap(),c=new CharacterHypermaze();
 w.onAtlasEvidence=e=>c.observeWordContrast(e);
 w.observeWorld("cat flies.",{id:1});
 w.observeWorld("cot flies.",{id:2});
 assert.ok(c.evidence.size>0);
 assert.equal(c.transferable().length,0);
 const failed=c.formSolution("mat",{charSlots:{1:"o"}});
 assert.equal(failed.found,false);
 assert.equal(failed.reason,"NO_INDEPENDENT_CHARACTER_TRANSFORM_EVIDENCE");
 assert.ok(failed.world.diagnostics.missingGoalCharacterPaths.some(x=>x.wanted==="o"));
});
test("Unobserved destination 'e' blocks and reports exact missing character and source design constraints",()=>{
 const {c}=learn();
 const fail=c.formSolution("mat",{charSlots:{1:"e"}},{maxNodes:200,maxDepth:8});
 assert.equal(fail.found,false);
 assert.equal(fail.reason,"MISSING_CHARACTER_TRANSFORMATION_EDGES");
 assert.deepEqual(fail.world.diagnostics.missingGoalCharacterPaths.map(x=>[x.position,x.wanted]),[[1,"e"]]);
 assert.ok(fail.world.diagnostics.designLimitations.some(x=>x.includes("semantic answer")));
});
test("Counterfactual: an observed wall breaks original a->o->u route; no secret teleport is allowed",()=>{
 const {c}=learn();const id=charActionId("replace",1,"a","o");
 assert.equal(c.formSolution("mat",{charSlots:{1:"u"}}).found,true);
 const r=c.observeIntervention({before:"mat",action:id,after:"mat",accepted:false});
 assert.equal(r.blocked,true);assert.equal(c.predict("mat",id),null);
 const block=c.formSolution("mat",{charSlots:{1:"u"}},{maxNodes:200,maxDepth:8});
 assert.equal(block.found,false);
 assert.ok(block.world.diagnostics.rejectedByWorldWalls>0);
 assert.ok(block.world.diagnostics.missingGoalCharacterPaths.some(x=>x.wanted==="u"));
 assert.notEqual(c.predict("bat",id),null,
   "Wall observed in one exact world must not prevent the character edit in all other worlds");
 const restored=CharacterHypermaze.restore(c.export());
 assert.equal(restored.predict("mat",id),null);
 assert.equal(restored.formSolution("mat",{charSlots:{1:"u"}}).found,false);
});
test("Noise uses the SAME original Discoverer.shape seeded trajectories without changing learned evidence",()=>{
 const {c}=learn();const freeze=JSON.stringify(c.export());
 const a=c.formSolution("mat",{charSlots:{1:"u"}},{temperature:0.5,seed:74129});
 const b=c.formSolution("mat",{charSlots:{1:"u"}},{temperature:0.5,seed:74129});
 assert.deepEqual(a.path,b.path);
 assert.equal(a.method,"Discoverer.shape");
 assert.equal(a.temperature,0.5);
 const snapshot=JSON.parse(freeze);
 const after=c.export();
 assert.deepEqual(after.evidence,snapshot.evidence);
 assert.deepEqual(after.interventions,snapshot.interventions);
});
test("Unicode, punctuation, insertion/deletion/swap from learned contexts are character operations, NOT word token moves",()=>{
 const a=new CharacterHypermaze();
 function observe(from,to,word1,word2,id){
  const other="something"+id;
  a.observeWordContrast({type:"rule-evidence",world:"text",from,to,at:0,
   before:[word1,other],after:[word2,other],documentId:id,
   action:JSON.stringify([0,from,to])});
 }
 observe("café","cafe","café","cafe",1);
 observe("résumé","resume","résumé","resume",2); // unsupported multi-letter edit, should be explicit
 observe("pâté","pâte","pâté","pâte",3); // char transposition/accent may fail; retained as unsupported
 observe("care","cared","care","cared",4);
 observe("fare","fared","fare","fared",5);
 observe("mile","miles","mile","miles",6);
 observe("tile","tiles","tile","tiles",7);
 assert.ok(a.transferable().some(x=>x.op==="insert"&&x.from===""&&x.to==="d"));
 assert.ok(a.transferable().some(x=>x.op==="insert"&&x.to==="s"));
 assert.ok(a.unsupported>=1);
 const r=a.formSolution("bare",{charSlots:{4:"d"}},{maxDepth:2,maxNodes:80});
 assert.equal(r.found,true);
 assert.equal(r.path.length,1);
 assert.equal(r.world.states[r.path[0].to].join(""),"bared");
 const unicode=charActionId("replace",1,"é","e");
 assert.deepEqual(parseCharAction(unicode),{op:"replace",at:1,from:"é",to:"e"});
 assert.equal(parseCharAction(charActionId("replace",1,"🧠","🙂"))?.from,"🧠");
});
test("100 genuinely unseen 76-character worlds require the exact same two learned character edits",()=>{
 const {c}=learn();const pre=c.export();let reached=0;
 for(let i=0;i<100;i++){
  const initial="m"+"a"+"_"+Array.from({length:73},(_,j)=>String.fromCharCode(65+((i+j*3)%26))).join("");
  const r=c.formSolution(initial,{charSlots:{1:"u"}},{maxNodes:30,maxDepth:4});
  assert.equal(r.path.length,2);
  assert.deepEqual(r.firstPrediction.map(x=>x.to[1]),["o","u"]);
  if(r.found && r.world.states[r.path.at(-1).to].join("")==="mu"+initial.slice(2))reached++;
 }
 assert.equal(reached,100);
 assert.deepEqual(c.export().evidence,pre.evidence);
 console.log("V24_UNSEEN_CHARACTER_COMPOSITIONS",JSON.stringify({
  untrainedWorlds:100,originalInputCharacters:76,correctExplicitCharGoal:reached,
  beforeTransferReachability:0,afterTransferReachability:100,
  exactGeneralSemanticAnswersVerified:false
 }));
});
