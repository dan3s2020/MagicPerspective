// A separately trainable, independently owned social policy for every
// prospective output organism. No future target/reward is used at decision
// time; values only change after the output referee has judged a trial.
// This RESEARCH reference currently runs on CPU. It is NOT the A11 GPU motor.
export const ORGANISM_POLICY_SCHEMA="a11-democratic-output-policy-v1";
const ACTIONS=["solo","invite"];
const key=(context,action)=>JSON.stringify([context,action]);
function assertContext(c){
 if(typeof c!=="string"||!c||c.length>256)
   throw Error("Context must be a bounded, target-free observation key");
}
export class OutputOrganismPolicy{
 constructor({organismId,seed=1,learningRate=.15,epsilon=.12}={}){
  if(typeof organismId!=="string"||!organismId||
   !Number.isSafeInteger(seed)||seed<1||seed>0xffffffff ||
   !Number.isFinite(learningRate)||learningRate<=0||learningRate>1 ||
   !Number.isFinite(epsilon)||epsilon<0||epsilon>1)
   throw Error("Invalid independent output organism learning parameters");
  this.organismId=organismId;this.seed=seed>>>0;
  this.learningRate=learningRate;this.epsilon=epsilon;
  this.values=new Map();this.counts=new Map();
  this.wallet=0;this.learningEvents=0;this.lastDecision=null;
 }
 random(){
  let x=this.seed;
  x^=(x<<13);x^=x>>>17;x^=(x<<5);
  this.seed=x>>>0||1;
  return this.seed/0x100000000;
 }
 value(context,action){
  assertContext(context);
  if(!ACTIONS.includes(action))throw Error("Unknown social action");
  return this.values.get(key(context,action))??0;
 }
 decide({context,peerOffers=[]}={}){
  assertContext(context);
  // An organism may inspect public peer invitations; it may NOT see their
  // targets, hidden correctness, reward or post-action CUDA results.
  if(!Array.isArray(peerOffers)||peerOffers.some(x=>typeof x!=="string"))
   throw Error("Peer offers must contain public organism identifiers only");
  const offers=[...new Set(peerOffers.filter(x=>x!==this.organismId))].sort();
  const informationKey=JSON.stringify([context,offers]);
  const solo=this.value(informationKey,"solo"),invite=this.value(informationKey,"invite");
  const greedy=invite>solo?"invite":"solo";
  const action=this.random()<this.epsilon?
    ACTIONS[Math.floor(this.random()*ACTIONS.length)]:greedy;
  const decision={organismId:this.organismId,context:informationKey,
    action,publicOffers:offers,valuesBefore:{solo,invite},
    evidence:(this.counts.get(key(informationKey,action))??0)};
  this.lastDecision=decision;
  return decision;
 }
 observe(decision,{ownPayout,causalCredits=0}={}){
  if(decision?.organismId!==this.organismId ||
     !ACTIONS.includes(decision.action) ||
     typeof decision.context!=="string")
    throw Error("Cannot train output organism on another organism's action");
  for(const [n,name] of [[ownPayout,"own payout"],[causalCredits,"causal path credits"]]){
   if(typeof n!=="number"||!Number.isFinite(n)||n<0)
    throw Error("Invalid externally measured "+name);
  }
  const reward=ownPayout+causalCredits,ctx=decision.context;
  const k=key(ctx,decision.action),previous=this.values.get(k)??0;
  this.values.set(k,previous+this.learningRate*(reward-previous));
  this.counts.set(k,(this.counts.get(k)??0)+1);
  this.wallet+=reward;this.learningEvents++;
  return{organismId:this.organismId,action:decision.action,
    reward,learnedValue:this.values.get(k),wallet:this.wallet,
    source:"measured post-action slot payout and verified causal credit"};
 }
 snapshot(){
  return{schema:ORGANISM_POLICY_SCHEMA,organismId:this.organismId,
    seed:this.seed,learningRate:this.learningRate,epsilon:this.epsilon,
    values:[...this.values],counts:[...this.counts],
    wallet:this.wallet,learningEvents:this.learningEvents,
    lastDecision:this.lastDecision};
 }
 static fromSnapshot(s){
  if(s?.schema!==ORGANISM_POLICY_SCHEMA ||
    !Number.isSafeInteger(s.learningEvents)||s.learningEvents<0)
   throw Error("Invalid independent-output-organism checkpoint");
  const o=new OutputOrganismPolicy(s);
  o.values=new Map(s.values);o.counts=new Map(s.counts);
  if([...o.values.values()].some(x=>!Number.isFinite(x)||x<0)||
     !Number.isFinite(s.wallet)||s.wallet<0)
   throw Error("Invalid saved organism credit values");
  o.wallet=s.wallet;o.learningEvents=s.learningEvents;o.lastDecision=s.lastDecision;
  return o;
 }
}
export function mutualCoalitions(decisions){
 if(!Array.isArray(decisions))throw Error("Decisions must be a set of independent ballots");
 const ids=new Set(decisions.map(x=>x.organismId));
 if(ids.size!==decisions.length)throw Error("Cannot vote twice for an output organism");
 const voting=decisions.filter(x=>x.action==="invite");
 const inviteIds=new Set(voting.map(x=>x.organismId));
 // A democratic alliance requires EACH member to opt in, and the requested
 // public peer offers to contain the counterpart. It cannot be forced by C.
 return voting.map(x=>({
   organismId:x.organismId,
   partners:x.publicOffers.filter(id=>id!==x.organismId&&
     inviteIds.has(id)&&voting.some(v=>v.organismId===id&&
       v.publicOffers.includes(x.organismId)))
 }));
}
