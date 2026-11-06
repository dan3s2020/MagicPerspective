/**
 * Hierarchical composition of the SAME V17 goal-attraction equation.
 *
 * A 112,000-character answer cannot be solved by a single .97^112000 field:
 * original V17 uses a 1e-12 update tolerance; the global attraction is too
 * small beyond ~900 links. Instead, a character world is grouped into
 * successive submazes and those submazes into higher-scale portal mazes.
 * Every layer uses shapeOnLearnedTopology, unchanged scalar law.
 *
 * Plans on ALL levels are built BEFORE any character action. Execution then
 * follows local neighbor observations and the REMEMBERED field at each level.
 *
 * This is a compositional re-navigation of a prior observed answer path,
 * NOT a proof that a novel semantic answer is known.
 */
import {shapeOnLearnedTopology} from "./shape-topology.mjs";
import {KIND} from "../worlds/exercise.mjs";

const FANOUT=256;
function grouped(items,size=FANOUT){
 const result=[];for(let i=0;i<items.length;i+=size)result.push(items.slice(i,i+size));
 return result;
}
function makeTree(chars){
 let items=chars.map((character,index)=>({kind:"character",character,index}));
 let levels=0,groups=0;
 while(items.length>1){
  items=grouped(items).map(children=>({kind:"group",children,field:null,planned:null}));
  groups+=items.length;levels++;
 }
 return {root:items[0]||null,levels,groups};
}
function createPortalWorld(children){
 const kinds=[KIND.self,...children.map(()=>KIND.floor)];
 if(children.length)kinds.at(-1);
 if(children.length)kinds[kinds.length-1]=KIND.target;
 const neighbors=Array.from({length:kinds.length},()=>[]);
 for(let i=0;i<children.length;i++)neighbors[i].push({
  to:i+1,action:children[i].kind==="character"?children[i].character:"enter_submaze",
  character:children[i].kind==="character"?children[i].character:null,
  transformation:children[i].kind==="character"?
    "observed_character_transition":"recursive_mystic_perspective_portal"
 });
 return {kinds,neighbors};
}
function prepare(node,conduct,attract){
 if(node.kind==="character")return;
 const world=createPortalWorld(node.children);
 const field=shapeOnLearnedTopology({...world,start:0,conduct,attract});
 if(field.path?.length!==node.children.length)
  throw Error("No complete learned goal path through this recursive submaze");
 node.world=world;node.field=field;node.planned=field.path.map(e=>e.to);
 for(const child of node.children)prepare(child,conduct,attract);
}
export function travelHierarchicalLanguage(chars,{conduct,attract,maxReplay=256,source="observed_training_path"}={}){
 if(!Array.isArray(chars)||chars.length===0||chars.some(c=>typeof c!=="string"))
  throw Error("Expected a nonempty observed character sequence");
 if(typeof conduct!=="function"||typeof attract!=="function")throw Error("Missing original V17 conduct/attract");
 if(!Number.isInteger(maxReplay)||maxReplay<0||maxReplay>10000)throw Error("Invalid replay cap");
 const tree=makeTree(chars);
 // This recursively computes all global/layer plans BEFORE beginning execution.
 if(tree.root.kind==="group")prepare(tree.root,conduct,attract);
 const initialShape=chars.slice(),emitted=[],trace=[],pathNodes=[0],graphNodes=[
  {id:0,kind:KIND.self,state:"body",lastCharacter:null,potential:1}
 ],graphEdges=[],values=[1];
 let agreement=0,macroMoves=0,blocked=0;
 const follow=node=>{
  if(node.kind==="character"){
   emitted.push(node.character);
   const i=emitted.length;
   if(i<=maxReplay){
    pathNodes.push(i);
    graphNodes.push({id:i,kind:i===chars.length?KIND.target:KIND.floor,state:"character",
      lastCharacter:node.character,potential:1});
    graphEdges.push({from:i-1,to:i,character:node.character});
   }
   return;
  }
  let position=0;const seen=new Set([0]),F=node.field,V=F.values;
  for(let i=0;i<node.children.length;i++){
   const local=node.world.neighbors[position];let chosen=null,bestValue=V[position];
   for(const edge of local){
    if(!seen.has(edge.to)&&V[edge.to]>bestValue){chosen=edge;bestValue=V[edge.to];}
   }
   if(!chosen){blocked++;return false;}
   const reference=F.path[i]?.to;
   agreement+=Number(chosen.to===reference);
   macroMoves++;
   const previous=position;
   position=chosen.to;seen.add(position);
   const child=node.children[position-1];
   if(child.kind==="character"&&trace.length<maxReplay){
    trace.push({step:emitted.length+1,source:emitted.length,target:emitted.length+1,
      character:child.character,prefix:emitted.join("")+child.character,
      potentialBefore:V[previous],potentialAfter:V[position],
      observed:"real_learned_character_submaze",
      transformation:"observed_character_transition",
      localChoices:local.length,predictedCharacter:chars[emitted.length],
      agreesWithGlobal:child.character===chars[emitted.length],
      globalShapeLength:chars.length,localRemaining:chars.length-emitted.length-1,
      policy:"local_neighbor_hillclimb_of_remembered_global_field",
      hierarchyLevels:tree.levels});
   }
   follow(child);
  }
  return true;
 };
 if(tree.root.kind==="character"){
  // Degenerate one-character observed world is still a one-cell submaze.
  const only={kind:"group",children:[tree.root]};
  prepare(only,conduct,attract);follow(only);
 }else follow(tree.root);
 const complete=emitted.length===chars.length&&blocked===0;
 return {
  protocol:"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS",
  frozen:true,trainingMutated:false,
  output:emitted.join(""),solvedKnownGoal:complete,abstained:!complete,
  reason:complete?"RECURSIVE_ORIGINAL_MAZE_SHAPE":"BLOCKED_SUBMAZE",
  steps:chars.length,locallyExecutedSteps:emitted.length,
  localAgreementRate:macroMoves?agreement/macroMoves:null,localBlockedSteps:blocked,
  bodyPolicy:"local_neighbor_hillclimb_of_remembered_global_field",
  initialShape,trace,pathNodes,field:values,
  graph:{nodes:graphNodes,edges:graphEdges,goals:[{node:pathNodes.at(-1),source}],
    hitLimit:chars.length>maxReplay,partialPreview:chars.length>maxReplay},
  candidates:1,validity:"Reached a PRIORLY OBSERVED learned response through nested original V17 mazes. Correctness of a NEW input is not demonstrated.",
  hierarchy:{levels:tree.levels,groups:tree.groups,fanout:FANOUT,originalCharacters:chars.length,
    plannedBeforeFirstAction:true,allLevelsUseOriginalAttractionLaw:true},
  propagation:"RECURSIVE_ORIGINAL_V17_ATTRACTION_ON_EXPERIENCED_PORTALS",
  limitations:[
   "The whole text is recursively planned by the original attraction formula, no latent predictors.",
   "This reuses an already observed response path; open-ended semantic correct-answer inference remains unproven.",
   "The graph returned to the UI contains only a replay prefix; all characters are nevertheless executed by local policy.",
   "This hierarchical portal topology does not establish a learned physical 4D/5D embedding."
  ]
 };
}
