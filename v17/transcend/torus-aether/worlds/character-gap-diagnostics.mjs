// V24: forensic diagnosis for an ORIGINAL V17 character maze.
 // No new planner, no oracle, no generated rule: this is READ-ONLY analysis
 // of the actual observed character-contrast evidence and real action walls.
const CHAR_PREFIX="__CHAR_XWORLD__:";
const codepoints=s=>Array.from(String(s));
export function explainCharacterGaps({
  start, goal, states, depth, allEvidence, admittedRules, interventions,
  transfer, minIndependentWorlds
}){
 const outgoing=new Map();
 for(const e of allEvidence){
  if(e.op!=="replace"||codepoints(e.from).length!==1||codepoints(e.to).length!==1)continue;
  const row=outgoing.get(e.from)||[];row.push(e);outgoing.set(e.from,row);
 }
 const admitted=new Set(admittedRules.map(r=>r.key));
 const realWalls=[];
 for(const [key,stat] of interventions){
  if(!(stat.blocked>0&&stat.blocked>=stat.accepted))continue;
  const at=key.lastIndexOf("|"+CHAR_PREFIX);
  if(at<0)continue;
  const action=key.slice(at+1);
  try{
   const parsed=JSON.parse(action.slice(CHAR_PREFIX.length));
   if(!Array.isArray(parsed)||!Number.isSafeInteger(parsed[1]))continue;
   realWalls.push({originalState:JSON.parse(key.slice(0,at)).join(""),
     at:parsed[1],operation:parsed[0],from:parsed[2],to:parsed[3],
     action,failedAttempts:stat.blocked,successes:stat.accepted});
  }catch{} // Other historical keys were not encoded as character actions.
 }
 const exactLocationBlockers=Object.entries(goal.charSlots).map(([at,wanted])=>{
  const position=Number(at),startChar=start[position]??null;
  const reached=[...new Set(states.map(s=>s[position]).filter(x=>x!==undefined))];
  const seen=new Map(),queue=[];
  if(startChar!==null){seen.set(startChar,[]);queue.push(startChar);}
  for(let cursor=0;cursor<queue.length&&cursor<5000;cursor++){
   const symbol=queue[cursor],chain=seen.get(symbol);
   if(chain.length>=32)continue;
   for(const r of outgoing.get(symbol)||[]){
    if(seen.has(r.to))continue;
    const info={operation:r.op,from:r.from,to:r.to,
      independentlyObservedPairs:r.sourcePairs.length,
      differentObservedContexts:r.wordContexts.length,
      distinctSourceDocuments:r.worlds.length,
      minimumIndependentWorlds:minIndependentWorlds,
      allowedByCurrentTransferPolicy:admitted.has(r.key),
      blockedByAblation:!transfer,
      actuallyVerifiedActionCount:r.accepted,
      observedFailedActionCount:r.blocked,
      evidenceSourceExamples:r.sourcePairs.slice(0,4)};
    seen.set(r.to,[...chain,info]);queue.push(r.to);
   }
  }
  const candidate=seen.get(wanted)||null;
  const blocked=realWalls.filter(r=>r.at===position).slice(0,32);
  const insufficient=candidate?.filter(e=>!e.allowedByCurrentTransferPolicy)||[];
  const status=startChar===wanted?"ALREADY_SATISFIES_THIS_CHARACTER":
     candidate===null?"NO_OBSERVED_CHARACTER_RULE_CHAIN":
     !transfer?"TRANSFER_ABLATED_IN_THIS_RUN":
     insufficient.length?"RULE_WITHOUT_SUFFICIENT_INDEPENDENT_CONTEXTS":
     blocked.length&&!reached.includes(wanted)?"REAL_WALL_OBSERVED_AT_THIS_POSITION":
     !reached.includes(wanted)?"STATE_TOPOLOGY_OR_SEARCH_BUDGET_PREVENTS_REACHING_CHARACTER":
     "CHARACTER_REACHED_BUT_JOINT_GOAL_MAY_REQUIRE_MORE_TRANSFORMATIONS";
  return {characterPosition:position,observedCurrentCharacter:startChar,
    targetCharacter:wanted,actuallyVisitedCharacterValues:reached,
    targetCharacterVisitedInAnActualCandidateState:reached.includes(wanted),
    observedEvidenceOnlySymbolChain:candidate,
    firstUnderSupportedRule:insufficient[0]||null,
    actualWallExamplesAtThisPosition:blocked,
    obstacleClassification:status,
    caution:"An observed-symbol chain is NOT an action-valid full-state solution or a hidden answer"};
 });
 const nearest=states.map((state,i)=>({
  index:i,depth:depth[i],
  missing:Object.entries(goal.charSlots).reduce((n,[at,val])=>
    n+Number(state[Number(at)]!==val),0)
 })).sort((a,b)=>a.missing-b.missing||a.depth-b.depth||a.index-b.index).slice(0,12)
 .map(x=>({...x,actualState:states[x.index].join(""),
   unmetConstraints:Object.entries(goal.charSlots).filter(([at,val])=>
     states[x.index][Number(at)]!==val).map(([at,val])=>({
      position:Number(at),wanted:val,actual:states[x.index][Number(at)]??null}))
 }));
 return {
  exactLocationBlockers,
  closestActuallyReachableStates:nearest,
  actualIndependentWorldWalls:realWalls.length,
  actualWallSamples:realWalls.slice(0,48),
  evidenceIsOnlyFromPreviouslyObservedWorlds:true,
  caution:"Do not infer unseen answer tokens from the goal verifier; analyze missing edges only"
 };
}
