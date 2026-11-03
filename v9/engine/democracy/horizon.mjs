// V9 port of the OctopusV2 A11 temporal democracy (branch experiment/A11-CAUSAL-REWARD-DEMOCRACY-20261031,
// commit f030faed, isolated-graph/a11-ab-cell/a11-democratic-simultaneous-output.mjs). The economy and the social policy are
// the ORIGINAL modules, copied unchanged: ./a11-output-democracy-economy.mjs and ./a11-democratic-output-policy.mjs.
//
// Same contract as A11, applied to the shape of the solution instead of future characters:
//   - X independent organisms (the parliament's voters). Organism i OWNS horizon i: the i-th action ahead on the current route.
//   - All of them COMMIT their prediction for their own horizon simultaneously, from the same known past, before the world answers.
//   - Each one decides by itself, with its own learned policy, "solo" or "invite". A coalition exists only with bilateral opt-in.
//   - Inside a coalition an organism may adopt a partner's view of ITS horizon — only when its learned record of that partner
//     (evidence >= 3, reliability >= .65) says the partner is better there, exactly like A11's peer-conditional rule.
//   - The world is the referee: when the action is seen, every organism is paid for its OWN horizon, with the A11 convex team
//     bonus when several are right together, and exact Shapley path credit. Its social policy learns only from its own payout.
import {settleOutputDemocracy} from './a11-output-democracy-economy.mjs';
import {OutputOrganismPolicy,mutualCoalitions} from './a11-democratic-output-policy.mjs';
export const HORIZON_SCHEMA='v9-horizon-democracy-from-a11-v1';
const bucket=x=>Math.max(0,Math.min(4,Math.floor(x*5)));
export class HorizonDemocracy{
  constructor({organisms=5,seed=20261031,communication='learned'}={}){
    if(!['learned','all-consent-experiment','none'].includes(communication))throw Error('Invalid democratic protocol');
    this.communication=communication;this.ids=Array.from({length:organisms},(_,i)=>'horizon-'+i);
    this.policies=this.ids.map((id,i)=>new OutputOrganismPolicy({organismId:id,seed:seed+i*31,learningRate:.18,epsilon:.2}));
    this.peer=new Map();this.trials=0;this.graded=0;this.coalitionsFormed=0;this.adopted=0;this.last=null;this.history=[];}
  // proposals[i] = {link, p (organism i's own P(open)), ask(j) → organism j's P(open) for the same link}
  commit(proposals){
    const X=proposals.length,own=proposals.map((pr,i)=>({organismId:this.ids[i],slot:i,link:pr.link,p:pr.p,conf:Math.abs(pr.p-.5)*2,
      context:JSON.stringify(['h'+i,bucket(Math.abs(pr.p-.5)*2),bucket(pr.p)])}));
    const choices=own.map((o,i)=>this.policies[i].decide({context:o.context,peerOffers:own.filter((_,j)=>j!==i).map(x=>x.organismId)}));
    const voted=choices.map(c=>({...c,action:this.communication==='none'?'solo':this.communication==='all-consent-experiment'?'invite':c.action}));
    const coalitions=mutualCoalitions(voted),partners=new Map(coalitions.map(c=>[c.organismId,new Set(c.partners)]));
    if(coalitions.some(c=>c.partners.length))this.coalitionsFormed++;
    const emitted=own.map((o,i)=>{const mates=[...(partners.get(o.organismId)??[])].map(id=>this.ids.indexOf(id));
      const support=mates.map(j=>{const s=this.peer.get(`${i}:${j}`)??{n:0,ok:0},p=proposals[i].ask(j);return {j,p,conf:Math.abs(p-.5)*2,evidence:s.n,reliability:s.n?s.ok/s.n:0};})
        .filter(x=>x.evidence>=3&&x.reliability>=.65).sort((a,b)=>b.evidence*b.reliability-a.evidence*a.reliability);
      const helpful=support.find(x=>x.conf>o.conf+.03);
      return {slot:i,organismId:o.organismId,link:o.link,context:o.context,ownP:o.p,p:helpful?helpful.p:o.p,partner:helpful?this.ids[helpful.j]:null,
        asked:support.map(x=>({j:x.j,p:x.p})),allMates:mates.map(j=>({j,p:proposals[i].ask(j)})),
        firstActionId:`local:${this.trials}:${i}`,socialActionId:helpful?`message:${this.trials}:${this.ids[helpful.j]}->${i}`:null};});
    this.adopted+=emitted.filter(e=>e.partner).length;
    this.last={trial:this.trials++,choices:voted,coalitions,emitted};return this.last;}
  // A block stays committed (A11: no new forecasts before the previous block is judged) until all its horizons are seen,
  // or until `maxAge` moves have passed; then the horizons seen so far are judged and the rest are simply not paid.
  ready(truthOf,maxAge){const b=this.last;if(!b)return false;b.age=(b.age||0)+1;return b.emitted.every(e=>truthOf(e.link)!==null)||b.age>=maxAge;}
  reveal(pending,truthOf){
    if(!pending||pending!==this.last)return null;const judged=pending.emitted.filter(e=>truthOf(e.link)!==null);this.last=null;
    if(!judged.length)return null;const out=e=>e.p>=.5?'open':'closed',tgt=e=>truthOf(e.link)?'open':'closed';
    const slots=judged.map((e,k)=>{const path=[{actionId:e.firstActionId,organismId:e.organismId,cellId:'own-horizon:'+e.link}];
      if(e.socialActionId)path.push({actionId:e.socialActionId,organismId:e.partner,cellId:'peer-view:'+e.link});
      return {slot:k,organismId:e.organismId,output:out(e),target:tgt(e),feedbackAfterAction:true,path};});
    const replay=({slot,activeActionIds})=>{const e=judged[slot];if(!activeActionIds.includes(e.firstActionId))return false;
      const p=e.socialActionId&&activeActionIds.includes(e.socialActionId)?e.p:e.ownP;return (p>=.5?'open':'closed')===tgt(e);};
    const s=settleOutputDemocracy({slots,frozenCounterfactualReplay:replay});
    s.payouts.forEach((pay,k)=>{const e=judged[k],i=this.ids.indexOf(e.organismId);
      this.policies[i].observe(pending.choices[i],{ownPayout:pay.ownPayout,causalCredits:pay.causalPath.credits.filter(c=>c.organismId===e.organismId).reduce((a,c)=>a+c.credit,0)});
      // learned record of each coalition partner's view of THIS organism's horizon (A11 peer-conditional evidence)
      for(const m of e.allMates){const key=`${i}:${m.j}`,r=this.peer.get(key)??{n:0,ok:0};r.n++;if((m.p>=.5)===!!truthOf(e.link))r.ok++;this.peer.set(key,r);}});
    this.graded+=judged.length;this.history.push({trial:pending.trial,correct:s.correctCount,total:s.totalSlots,multiplier:+s.multiplier.toFixed(3),issued:+s.totalIssued.toFixed(3)});
    if(this.history.length>60)this.history.shift();return s;}
  wallets(){return this.policies.map(p=>+p.wallet.toFixed(2));}
  snapshot(){return {schema:HORIZON_SCHEMA,communication:this.communication,ids:this.ids,policies:this.policies.map(p=>p.snapshot()),peer:[...this.peer],
    trials:this.trials,graded:this.graded,coalitionsFormed:this.coalitionsFormed,adopted:this.adopted,history:this.history.map(h=>({...h}))};}
  static restore(s){if(s?.schema!==HORIZON_SCHEMA)throw Error('Invalid horizon democracy checkpoint');const d=new HorizonDemocracy({organisms:s.ids.length,communication:s.communication});
    d.policies=s.policies.map(p=>OutputOrganismPolicy.fromSnapshot(p));d.peer=new Map(s.peer);Object.assign(d,{trials:s.trials,graded:s.graded,coalitionsFormed:s.coalitionsFormed,adopted:s.adopted,history:(s.history||[]).map(h=>({...h}))});return d;}
}
