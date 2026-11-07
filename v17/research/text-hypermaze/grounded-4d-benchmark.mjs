// Independent generated-world TEST HARNESS for native goal-text-navigator.mjs.
// The navigator does not import or know any of this ground-truth world physics.
// Six training sentence orders, six UNSEEN test orders; 4D routes before action.
// These are synthetic structured facts, NOT unrestricted natural-language QA.
import {SIDE,DIM,N,ACTIONS,SOURCES,rng,enc,dec,move,TextWorldNavigator}
 from "../../transcend/torus-aether/worlds/goal-text-navigator.mjs";
const key=a=>a.join(',');
const choice=(R,n)=>Math.floor(R()*n);
const shuffled=(a,R)=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=choice(R,i+1);[b[i],b[j]]=[b[j],b[i]]}return b};
const evec=(i,v)=>Array.from({length:DIM},(_,d)=>d===i?v:0);
export const physics=shuffled(Array.from({length:DIM},(_,d)=>[evec(d,1),evec(d,-1)]).flat(),rng(7017));
export const perform=(state,action)=>move(state,physics[ACTIONS.indexOf(action)]);
export const SAY={
 open:['the chamber permits passage','the gate is traversable','a traveler may cross here','the corridor is open','this position can be entered','movement through this point is allowed','nothing prevents entry here','the tile is passable'],
 closed:['the chamber forbids passage','the gate is impassable','a traveler may not cross here','the corridor is sealed','this position cannot be entered','movement through this point is blocked','something prevents entry here','the tile is obstructed']
};
export const TEMPLATES=[
 (source,p,claim)=>source+' logs at ('+key(p)+'): '+claim+'.',
 (source,p,claim)=>'('+key(p)+') is listed by '+source+', stating that '+claim+'.',
 (source,p,claim)=>'From the '+source+' observer: '+claim+' at locus ('+key(p)+').',
 (source,p,claim)=>'For ('+key(p)+'), '+claim+', says the archival report of '+source+'.',
 (source,p,claim)=>'At location ('+key(p)+') there is this entry in '+source+': '+claim+'.',
 (source,p,claim)=>'According to '+source+', the point ('+key(p)+') has this property: '+claim+'.',
 (source,p,claim)=>'The latest '+source+' message about ('+key(p)+') reads: '+claim+'.',
 (source,p,claim)=>'Statement about ('+key(p)+'): '+claim+'. This was from '+source+'.',
 (source,p,claim)=>'A note says '+claim+'; its source is '+source+' and it concerns ('+key(p)+').',
 (source,p,claim)=>'The location ('+key(p)+') is described as follows: '+claim+'. Witness: '+source+'.',
 (source,p,claim)=>'For a reader of '+source+', ('+key(p)+') means '+claim+'.',
 (source,p,claim)=>'On the other page is ('+key(p)+'), reported by '+source+'; '+claim+'.'
];
export function train(seed){
 const R=rng(seed),a=new TextWorldNavigator();
 for(let i=0;i<80;i++)for(let k=0;k<8;k++){
  const before=choice(R,N),next=move(before,physics[k]);
  const actual=R()<0.18?move(before,physics[choice(R,8)]):next;
  a.observeAction(before,ACTIONS[k],actual);
 }
 for(let i=0;i<8000;i++){
  const claim=i%2===0,phrase=SAY[claim?'open':'closed'][choice(R,8)],
   template=TEMPLATES[choice(R,6)],source=SOURCES[choice(R,3)],p=dec(choice(R,N));
  a.learnClaim(template(source,p,phrase).replace(new RegExp('\\b'+source+'\\b','ig'),' ')
   .replace('('+key(p)+')',' '),claim);
  const truth=R()<.5;let quoted=truth;
  if(source==='dream'&&R()<.36)quoted=!quoted;
  if(source==='rumor'&&R()<.55)quoted=!quoted;
  a.observeReliability(source,quoted,truth);
 }
 return a;
}
function rawPath(start,goal,cells){
 const queue=[start],prev=new Int32Array(N).fill(-1),seen=new Uint8Array(N);seen[start]=1;
 for(let i=0;i<queue.length;i++){
  const s=queue[i];if(s===goal)break;
  for(const v of physics.map(d=>move(s,d))){
   if(seen[v]||!cells[v])continue;seen[v]=1;prev[v]=s;queue.push(v);
  }
 }
 if(!seen[goal])return null;
 const path=[];for(let v=goal;v!==start;v=prev[v])path.push(v);return path.reverse();
}
export function world(seed,{adversarial=false,outOfVocabulary=false}={}){
 const R=rng(seed),cells=new Uint8Array(N);for(let i=0;i<N;i++)cells[i]=+(R()>.22);
 let start=null,goal=null,oracle=null;
 for(let i=0;i<300;i++){
  const s=choice(R,N),g=choice(R,N);if(s===g||!cells[s]||!cells[g])continue;
  const p=rawPath(s,g,cells);if(p?.length>=5){start=s;goal=g;oracle=p;break}
 }
 if(start===null)throw Error('No long route in generated world');
 const statements=[];
 for(let cell=0;cell<N;cell++)for(const source of SOURCES){
  let quoted=!!cells[cell];if(source==='dream'&&R()<.36)quoted=!quoted;
  if(source==='rumor'&&R()<.55)quoted=!quoted;
  if(adversarial&&source==='ledger'&&R()<.34)quoted=!quoted;
  let phrase=SAY[quoted?'open':'closed'][choice(R,8)];
  if(outOfVocabulary)phrase=quoted?'the passage invites passage':'the passage rejects passage';
  const template=TEMPLATES[6+choice(R,TEMPLATES.length-6)];
  statements.push(template(source,dec(cell),phrase));
 }
 for(let i=0;i<350;i++)statements.push('General unrelated field note '+i+
 ': illuminated patterns beyond the recursive torus signal changing perspectives, but no claim about any specific chamber is recorded.');
 return {seed,start,goal,cells,oracle,document:shuffled(statements,R).join('\n')};
}
export function benchmark({seed=17,count=64}={}){
 const agent=train(seed),before=agent.frozenFingerprint();
 const summary={seed,count,learned:0,correctInitial:0,optimal:0,rank2:0,slippedFixed:0,
  slippedRepair:0,distributionShift:0,outOfVocabulary:0,
  sourceTrust:Object.fromEntries(SOURCES.map(s=>[s,agent.trust(s)])),
  documents:0,facts:0,contradictions:0};
 for(let i=0;i<count;i++){
  const w=world(seed*100003+i*37+419);
  const prediction=agent.predictShape(w.document,w.start,w.goal,{seed:seed+i});
  const outcome=agent.execute(w,prediction,{physics:perform});
  summary.correctInitial+=+outcome.solved;
  summary.optimal+=+(outcome.solved&&prediction.shape.length===w.oracle.length);
  summary.documents+=w.document.length;summary.facts+=prediction.observations;
  summary.contradictions+=prediction.uncertain;
  summary.rank2+=+agent.execute(w,agent.predictShape(w.document,w.start,w.goal,{rank:2}),{physics:perform}).solved;
  const chanceSeed=seed*991+i*11;
  summary.slippedFixed+=+agent.execute(w,prediction,{chance:.25,seed:chanceSeed,physics:perform}).solved;
  summary.slippedRepair+=+agent.execute(w,prediction,{chance:.25,seed:chanceSeed,replan:true,physics:perform}).solved;
  const shifted=world(seed*100003+i*37+419,{adversarial:true});
  const ps=agent.predictShape(shifted.document,shifted.start,shifted.goal);
  summary.distributionShift+=+agent.execute(shifted,ps,{physics:perform}).solved;
  const unknown=world(seed*100003+i*37+419,{outOfVocabulary:true});
  const pu=agent.predictShape(unknown.document,unknown.start,unknown.goal);
  summary.outOfVocabulary+=+agent.execute(unknown,pu,{physics:perform}).solved;
  if(i===0)summary.firstExample={chars:w.document.length,preAction:prediction.initialActions,
   start:dec(w.start),goal:dec(w.goal)};
 }
 summary.learned=ACTIONS.filter((name,i)=>key(agent.effect(name))===key(physics[i].map(x=>(x+SIDE)%SIDE))).length;
 summary.frozen=before===agent.frozenFingerprint();
 return summary;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split(/[\\/]/).at(-1))){
 const runs=[17,29,47].map(seed=>benchmark({seed,count:64}));
 const sum=(key)=>runs.reduce((n,r)=>n+r[key],0);
 console.log(JSON.stringify({research:'lexical grounded 4D first-action prediction',runs,
  aggregate:{worlds:192,correctInitial:sum('correctInitial'),optimal:sum('optimal'),
   rank2:sum('rank2'),chanceFixed:sum('slippedFixed'),chanceRepair:sum('slippedRepair'),
   shiftedSource:sum('distributionShift'),unknownLexicon:sum('outOfVocabulary'),
   totalDocumentCharacters:sum('documents'),frozen:runs.every(r=>r.frozen)}},null,2));
}
