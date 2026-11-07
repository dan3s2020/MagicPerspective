// Persistent, evidence-based observability of the SAME original V17 Brain.
// Not a language model, second worker, oracle planner, or an invented UI graph.
// Plan/closure FIRST; a withheld reference can be supplied ONLY to audit()
// AFTER the plan has been frozen. All counts have explicit truncation flags.
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const tokens=t=>(String(t||"").match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu)||[]);
const chars=t=>Array.from(String(t??""));
const safeInt=(n,min,max,def)=>Number.isSafeInteger(n)?Math.min(max,Math.max(min,n)):def;

export function enumerateNativePaths(plan,{maxPaths=256,maxVisits=40000,maxSteps=16,maxDeadEnds=512}={}){
 const topology=plan?.topology;
 if(!topology?.nodes||!topology?.edges)
  throw Error("Native atlas requires real pre-action topology from original V17 Brain");
 const N=topology.nodes.length;
 const limit=safeInt(maxPaths,1,10000,256),
  visitsLimit=safeInt(maxVisits,1,1000000,40000),
  stepsLimit=safeInt(maxSteps,1,128,16),
  deadLimit=safeInt(maxDeadEnds,1,20000,512);
 const forward=Array.from({length:N},()=>[]);
 const operatorMap=new Map(),seenEdges=[];
 for(const [i,e] of topology.edges.entries()){
  if(!Number.isInteger(e.from)||e.from<0||e.from>=N||
     !Number.isInteger(e.to)||e.to<0||e.to>=N)
   throw Error("Original Brain topology contains invalid edge at "+i);
  const edge={from:e.from,to:e.to,kind:e.kind,
   key:e.learnedOperatorKey??null,
   sourceEvidence:e.learnedFrom??null,
   observedSupport:e.observedSupport||0,
   fromToken:e.fromToken??null,toToken:e.toToken??null,
   actionIndex:e.actionIndex??null,edgeIndex:i};
  forward[e.from].push(edge);
  seenEdges.push(edge);
  const k=edge.key||"unknown:"+i;
  const op=operatorMap.get(k)||{key:k,kind:edge.kind,
   fromToken:edge.fromToken,toToken:edge.toToken,examples:edge.sourceEvidence?[edge.sourceEvidence]:[],
   graphUses:0,sourceObservations:edge.observedSupport,chosenInInitialPath:0};
  op.graphUses++;
  if(!op.examples.length&&edge.sourceEvidence)op.examples.push(edge.sourceEvidence);
  operatorMap.set(k,op);
 }
 const original=plan?.topology?.initialShapeIds||[];
 const usedEdges=[],usedKeys=new Set();
 for(let i=1;i<original.length;i++){
  const edge=forward[original[i-1]].find(e=>e.to===original[i]);
  if(edge){usedEdges.push(edge);usedKeys.add(edge.key);
   const op=operatorMap.get(edge.key||"unknown:"+edge.edgeIndex);
   if(op)op.chosenInInitialPath++;
  }
 }
 const allPaths=[],deadEnds=[],cycleEdges=new Set(),frontierHits=new Set();
 const goalIds=new Set(topology.nodes.filter(n=>n.goal).map(n=>n.id));
 const frontier=new Map((topology.frontier||[]).map(f=>[f.node,f.reason]));
 const visited=new Set([topology.sourceId??0]);
 let expanded=0,truncated=false,truncationReason=null;
 const traverse=(at,route)=>{
  if(truncated)return;
  expanded++;
  if(expanded>visitsLimit){truncated=true;truncationReason="enumeration-visit-budget";return;}
  if(goalIds.has(at)){
   if(allPaths.length>=limit){truncated=true;truncationReason="enumeration-path-budget";return;}
   const nodes=[topology.sourceId??0,...route.map(e=>e.to)];
   allPaths.push({id:hash(nodes).slice(0,18),nodes,
    actions:route.map(e=>({from:e.from,to:e.to,key:e.key,
     kind:e.kind,fromToken:e.fromToken,toToken:e.toToken,
     sourceEvidence:e.sourceEvidence,observedSupport:e.observedSupport})),
    states:nodes.map(i=>topology.nodes[i]?.text||null),
    length:route.length,
    isInitialShape:nodes.length===original.length&&nodes.every((v,i)=>v===original[i])});
   return;
  }
  if(frontier.has(at)){
   frontierHits.add(at);
   if(deadEnds.length<deadLimit)deadEnds.push({
    at,text:topology.nodes[at]?.text,reason:frontier.get(at),via:route.map(x=>x.key)});
   return;
  }
  if(route.length>=stepsLimit){
   if(deadEnds.length<deadLimit)deadEnds.push({
    at,text:topology.nodes[at]?.text,reason:"path-depth-enumeration-limit",via:route.map(x=>x.key)});
   truncated=true;truncationReason ||= "enumeration-depth-budget";return;
  }
  let navigable=0;
  for(const edge of forward[at]){
   if(visited.has(edge.to)){
    cycleEdges.add(edge.edgeIndex);continue;
   }
   if(topology.nodes[edge.to]?.kind===1)continue;
   navigable++;
   visited.add(edge.to);
   traverse(edge.to,[...route,edge]);
   visited.delete(edge.to);
   if(truncated)return;
  }
  if(!navigable&&deadEnds.length<deadLimit)deadEnds.push({
   at,text:topology.nodes[at]?.text,
   reason:forward[at].length?"all-actions-blocked-or-cyclic":"no-learned-outgoing-transformations",
   via:route.map(x=>x.key)});
 };
 traverse(topology.sourceId??0,[]);
 const transforms=[...operatorMap.values()].sort((a,b)=>
  b.chosenInInitialPath-a.chosenInInitialPath||b.graphUses-a.graphUses||a.key.localeCompare(b.key));
 return {schema:"v17-native-observed-path-atlas-v1",
  originalBrain:true,originalNativeDiscoverer:true,
  plannedBeforeAction:plan.plannedBeforeFirstAction===true,
  referenceAvailableDuringPlanning:false,
  externalSemanticCorrectnessUnproven:true,
  topology:{states:N,edges:seenEdges.length,goalStates:goalIds.size,
   knownOperatorFamilies:operatorMap.size,
   closedUnderLearnedOperators:topology.closedUnderLearnedOperators===true,
   completeNaturalLanguage:false,
   source:topology.source||null,
   frontier:topology.frontier||[],
   frontierCount:topology.frontier?.length||0,
   cyclesDetected:cycleEdges.size},
  initialShape:{nodes:original,usedEdges,
   usedOperators:[...usedKeys].filter(Boolean),
   hasTarget:plan.found===true,predicted:plan.predicted??null},
  paths:allPaths,deadEnds,transformations:transforms,
  missedTransformations:transforms.filter(x=>!x.chosenInInitialPath),
  enumeration:{visitedSearchStates:expanded,pathCount:allPaths.length,
   deadEndsRecorded:deadEnds.length,cycles:cycleEdges.size,
   truncated:truncated||topology.closedUnderLearnedOperators!==true,
   enumerationTruncationReason:truncationReason,
   graphTruncationReasons:topology.incompleteReasons||[],
   allFiniteSimplePathsProven:!truncated&&topology.closedUnderLearnedOperators===true},
  failureReason:plan.failureReason||null,
  designLimits:plan.designLimits||null,
  possibleDesignBarriers:[
   ...(plan.designLimits?.rejectedLongObservations>0?["some-observations-exceeded-token-window"]:[]),
   ...(plan.designLimits?.evictedOldObservations>0?["historical-state-index-evictions"]:[]),
   ...(plan.designLimits?.droppedNewOperatorFamilies>0?["learned-operator-capacity-exhausted"]:[]),
   ...(topology.frontier?.length?["world-exploration-budget-reached"]:[])
  ]};
}

function changedCharacterAudit(predicted,reference){
 const p=chars(predicted),g=chars(reference),max=Math.max(p.length,g.length);
 const mismatches=[],matches=[];
 let right=0,firstMismatch=-1;
 for(let i=0;i<max;i++){
  const got=p[i]??null,expected=g[i]??null,correct=got===expected;
  if(correct){right++;matches.push(i);}else{
   if(firstMismatch<0)firstMismatch=i;
   mismatches.push({index:i,predicted:got,expected,
    reason:got===null?"no-generated-character":
     expected===null?"extra-generated-character":"wrong-codepoint-at-position"});
  }
 }
 return {unit:"Unicode-code-point",referenceCodepoints:g.length,
  predictedCodepoints:p.length,comparedPositions:max,correctPositions:right,
  accuracy:max?right/max:1,firstMismatch,
  correctCharacterPositions:matches,incorrectCharacters:mismatches,
  indexAlignmentNote:"Position aligned; insert/delete may shift later positions. No edit-distance claim."};
}
function missingTokenEdits(predicted,reference,operators){
 const p=tokens(predicted),t=tokens(reference);
 // Edit distance with explicit alignment. This is POSTMORTEM ONLY;
 // it never enters the prior goal search, learns no new operator.
 const n=p.length,m=t.length;
 if(n>1024||m>1024)return {analyzed:false,reason:"audit-token-budget",p:n,t:m};
 const cost=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=0;i<=n;i++)cost[i][0]=i;
 for(let j=0;j<=m;j++)cost[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)
  cost[i][j]=Math.min(cost[i-1][j]+1,cost[i][j-1]+1,
   cost[i-1][j-1]+(p[i-1]===t[j-1]?0:1));
 const edits=[];let i=n,j=m;
 while(i||j){
  if(i&&j&&p[i-1]===t[j-1]){i--;j--;continue;}
  if(i&&j&&cost[i][j]===cost[i-1][j-1]+1){
   edits.push({kind:"replace",index:i-1,from:p[i-1],to:t[j-1]});i--;j--;
  }else if(i&&cost[i][j]===cost[i-1][j]+1){
   edits.push({kind:"delete",index:i-1,from:p[i-1],to:null});i--;
  }else{edits.push({kind:"insert",index:i,from:null,to:t[j-1]});j--;}
 }
 const known=[...operators];
 for(const x of edits){
  const matching=known.filter(o=>o.kind===x.kind&&o.from===x.from&&o.to===x.to);
  x.learnedOperatorExists=matching.length>0;
  x.matchingEvidence=matching.slice(0,4).map(o=>({key:o.key,
   sourceObservations:o.sourceObservations,evidence:o.evidence?.[0]||null}));
  x.gapReason=matching.length?"known-operator-but-path-constraint-or-search":
   "operator-transition-never-observed";
 }
 return {analyzed:true,tokenEdits:edits.reverse(),minimumTokenEditDistance:cost[n][m],
  gapCategories:edits.reduce((a,x)=>(a[x.gapReason]=(a[x.gapReason]||0)+1,a),{})};
}
export function auditNativePath({plan,atlas,reference,brain}){
 if(!plan?.plannedBeforeFirstAction||plan.referenceAnswerProvided!==false)
  throw Error("Frozen ORIGINAL pre-action path must exist before revealing reference");
 if(typeof reference!=="string")throw Error("Audit requires withheld real reference text");
 const predicted=String(plan.predicted??""),referenceHash=hash(reference);
 const exact=predicted===reference;
 const charAudit=changedCharacterAudit(predicted,reference);
 const referenceWasEnumerated=!!plan.topology?.nodes?.some(x=>x.text===reference);
 const alternativeRouteToReference=!!atlas?.paths?.some(x=>x.states.at(-1)===reference);
 const operatorGap=missingTokenEdits(predicted,reference,
  brain?.observedTransformations?.operators?.values()||[]);
 const categories=[];
 if(!plan.found)categories.push(plan.failureReason||"no-global-shape");
 if(atlas?.topology?.frontierCount)categories.push("search-frontier-not-fully-explored");
 if(!exact){
  for(const c of Object.keys(operatorGap.gapCategories||{}))categories.push(c);
  if(plan.found){
   categories.push("predicted-different-complete-text");
   if(alternativeRouteToReference)categories.push("correct-reference-route-present-but-not-selected");
   else categories.push("goal-constraints-do-not-uniquely-identify-reference");
  }
 }
 if(exact)categories.push("first-try-exact-structured-target");
 return {schema:"v17-frozen-postmortem-v1",planId:hash([plan.start,plan.required,plan.initialShape]).slice(0,20),
  planningFinishedBeforeReference:true,referenceWasUsedForPlanning:false,
  frozen:true,referenceSHA256:referenceHash,
  referenceUTF8Bytes:Buffer.byteLength(reference),predictedUTF8Bytes:Buffer.byteLength(predicted),
  completeTextExactFirstTry:exact,
  scoreIsExternalSemanticAnswer:false,
  charAudit,operatorGap,failureCategories:[...new Set(categories)],
  referenceWasEnumerated,alternativeRouteToReference,
  possibleDesignBarriers:atlas?.possibleDesignBarriers||[],
  // The scorer is an independent observer. It NEVER calls
  // model.observeSentence(), Brain.live() or policy.learnTransferable().
  notUsedToTrainOriginalBrain:true,
  graphClosure:atlas?.topology?.closedUnderLearnedOperators===true,
  frontierCount:atlas?.topology?.frontierCount||0,
  originalKnownOperators:brain?.observedTransformations?.operators?.size||0};
}

export function appendNativeAtlasLedger(filename,entry){
 if(typeof filename!=="string"||!filename.trim())
  throw Error("Original Brain atlas ledger requires a file path");
 // All past attempts are append-only. This never overwrites prior traces
 // or the pretrained V17 .v8 / TinyStories .npz checkpoint.
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 fs.appendFileSync(filename,JSON.stringify(entry)+"\n",{encoding:"utf8"});
}

export function readNativeAtlasLedger(filename,{cursor=0,limit=20}={}){
 const rows=safeInt(limit,1,100,20),offset=safeInt(cursor,0,Number.MAX_SAFE_INTEGER,0);
 if(!fs.existsSync(filename))return {rows:[],nextCursor:offset,end:true};
 const size=fs.statSync(filename).size;
 if(offset>size)throw Error("Ledger cursor beyond file size");
 const fd=fs.openSync(filename,"r");
 const chunk=Buffer.alloc(64*1024);
 let pos=offset,pending=Buffer.alloc(0),records=[],readBytes=0;
 try{
  while(pos<size&&records.length<rows&&readBytes<16*1024*1024){
   const n=fs.readSync(fd,chunk,0,Math.min(chunk.length,size-pos),pos);
   if(!n)break;pos+=n;readBytes+=n;
   pending=Buffer.concat([pending,chunk.subarray(0,n)]);
   let cut;
   while((cut=pending.indexOf(10))>=0&&records.length<rows){
    const raw=pending.subarray(0,cut).toString("utf8");
    pending=pending.subarray(cut+1);
    if(raw.trim())records.push(JSON.parse(raw));
   }
  }
 }finally{fs.closeSync(fd);}
 const nextCursor=pos-pending.length;
 return {rows:records,nextCursor,end:nextCursor>=size,
  totalLedgerBytes:size,recordedEventsAreAppendOnly:true,
  pageLimitedByBytes:records.length<rows&&nextCursor<size};
}
