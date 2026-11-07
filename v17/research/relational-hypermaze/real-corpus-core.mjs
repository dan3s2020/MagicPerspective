// MagicPerspective V24 real-corpus topology. ORIGINAL Discoverer.shape() only.
// Observed Q/A transitions are facts; question similarity links are hypotheses.
// No next-character loss and no hidden validation answers during prediction.
import {Discoverer,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {projectObservedWorld} from "./real-hypergeometry.mjs";
const STOP=new Set("the a an and or but if then for from with about into to of on in at is are was were been be do does did can could should would what why who how where when which this that these those it its their they them we you your i my as by than have has had not no yes please explain give find there any between also more some all each".split(" "));
export const normalize=s=>String(s??"").normalize("NFC").toLowerCase().replace(/\s+/gu," ").trim();
export const terms=s=>[...new Set((normalize(s).match(/[\p{L}\p{M}\p{N}_]+/gu)||[]).filter(t=>t.length>1&&!STOP.has(t)))].slice(0,256);
export function scoreAnswer(a,b){
 const x=normalize(a),y=normalize(b);if(!x||!y)return {exact:0,wordF1:0};
 const aa=x.split(/\s+/),bb=y.split(/\s+/),freq=new Map();
 for(const t of bb)freq.set(t,(freq.get(t)||0)+1);
 let common=0;for(const t of aa){const n=freq.get(t)||0;if(n>0){common++;freq.set(t,n-1);}}
 return {exact:Number(x===y),wordF1:2*common/(aa.length+bb.length)};
}
export class RealTextAtlas{
 constructor({maxRecords=30000,maxAnswerChars=65536,minScore=.08,maxCandidates=10}={}){
  if(!Number.isInteger(maxRecords)||maxRecords<10||maxRecords>500000)throw Error("maxRecords must be 10..500000");
  if(!Number.isInteger(maxAnswerChars)||maxAnswerChars<256||maxAnswerChars>1000000)throw Error("Invalid answer bound");
  if(!(minScore>=0&&minScore<=1)||!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>32)throw Error("Invalid matching configuration");
  this.config={maxRecords,maxAnswerChars,minScore,maxCandidates};
  this.records=new Map();this.postings=new Map();this.nextId=0;
  this.stats={experienced:0,accepted:0,skipped:0,compacted:0,answerTooLong:0,charactersSeen:0};
 }
 _evict(id){const r=this.records.get(id);if(!r)return;
  for(const t of r.terms){const p=this.postings.get(t);p?.delete(id);if(p?.size===0)this.postings.delete(t);}
  this.records.delete(id);
 }
 observe(prompt,answer,{sourceRow=null}={}){
  this.stats.experienced++;
  if(typeof prompt!=="string"||typeof answer!=="string"||!prompt.trim()||!answer.trim()){
    this.stats.skipped++;return {accepted:false,reason:"INVALID_QA_ROW"};}
  if(answer.length>this.config.maxAnswerChars){this.stats.answerTooLong++;this.stats.skipped++;
    return {accepted:false,reason:"ANSWER_EXCEEDS_BOUND",chars:answer.length};}
  const tokens=terms(prompt);if(!tokens.length){this.stats.skipped++;return {accepted:false,reason:"NO_OBSERVABLE_TERMS"};}
  if(this.records.size>=this.config.maxRecords){
    for(let j=0,n=Math.max(1,Math.ceil(this.config.maxRecords*.04));j<n;j++){
      const id=this.records.keys().next().value;if(id===undefined)break;this._evict(id);this.stats.compacted++;
    }
  }
  const id=this.nextId++,r={id,prompt,answer,terms:tokens,sourceRow};this.records.set(id,r);
  for(const t of tokens){let p=this.postings.get(t);if(!p)this.postings.set(t,p=new Set());p.add(id);}
  this.stats.accepted++;this.stats.charactersSeen+=prompt.length+answer.length;
  return {accepted:true,id,observedAction:"witnessed:dialogue-response"};
 }
 candidates(prompt){
  const tokens=terms(prompt),n=this.records.size;if(!n||!tokens.length)return [];
  const idf=t=>Math.log(1+(n+1)/(1+(this.postings.get(t)?.size||0)));
  const overlap=new Map();let qnorm=0;
  for(const t of tokens){const w=idf(t)**2;qnorm+=w;
    for(const id of this.postings.get(t)||[])overlap.set(id,(overlap.get(id)||0)+w);}
  const out=[];
  for(const [id,shared] of overlap){const record=this.records.get(id);if(!record)continue;
    let norm=0;for(const t of record.terms)norm+=idf(t)**2;
    const score=shared/Math.sqrt(Math.max(1e-12,qnorm*norm));
    if(score>=this.config.minScore)out.push({id,score,record});}
  return out.sort((a,b)=>b.score-a.score||b.id-a.id).slice(0,this.config.maxCandidates);
 }
 predict(prompt,{seed=17,temperature=0,traceLimit=240}={}){
  if(typeof prompt!=="string"||prompt.length>200000)throw Error("Invalid question length");
  const c=this.candidates(prompt),empty=reason=>({found:false,reason,answer:"",route:[],
    nodes:[],edges:[],field:[],candidates:c.length,method:"Discoverer.shape",beforeAction:true});
  if(!c.length)return empty("NO_OBSERVED_RELATIONAL_ROUTE");
  const nodes=[{id:0,kind:"new-question",label:prompt.slice(0,256)}],neighbors=[[]],kinds=[KIND.self];
  const add=(kind,label,recordId=null)=>{const id=nodes.length;
    nodes.push({id,kind,label:String(label).slice(0,256),recordId});neighbors.push([]);
    kinds.push(kind==="observed-answer"?KIND.target:KIND.floor);return id;};
  const link=(i,j,action,verified,weight)=>neighbors[i].push({to:j,action,verified,
    transformation:{kind:action,verified,weight}});
  const top=c[0].score;
  for(const row of c){
    const penalty=Math.max(0,Math.min(5,Math.round(4*(top-row.score)/Math.max(1e-12,top))));
    let at=0;
    for(let j=0;j<penalty;j++){const k=add("hypothesized-perspective","similarity penalty");
      link(at,k,"hypothesis:perspective",false,row.score);at=k;}
    const question=add("observed-question",row.record.prompt,row.id);
    link(at,question,"hypothesis:question-similarity",false,row.score);
    const answer=add("observed-answer",row.record.answer,row.id);
    link(question,answer,"witnessed:dialogue-response",true,row.record.sourceRow);
  }
  const actor=new Discoverer(seed);actor.temp=Math.max(0,Number(temperature)||0);let field=[];
  const shape=actor.shape(kinds,0,0,{neighbors,conduct:()=>1,
    attract:k=>k===KIND.target?1:0,onField:v=>{field=v;}})||[];
  const node=nodes[shape.at(-1)?.to],record=node?.kind==="observed-answer"?this.records.get(node.recordId):null;
  const geometry=projectObservedWorld(nodes,field,this.records,this.nextId,terms);
  const route=shape.map(x=>({from:x.from,to:x.to,action:x.action,verified:!!x.verified,
    type:nodes[x.to].kind,label:nodes[x.to].label}));
  return {found:!!record,answer:record?.answer||"",
    reason:record?"WITNESSED_ANSWER_RETRIEVED":"NO_ASCENDING_ROUTE",
    answerPreviouslyObserved:true,method:"Discoverer.shape",beforeAction:true,
    selectedSourceRow:record?.sourceRow??null,candidates:c.length,
    learnedContexts:c.map(x=>({id:x.id,score:x.score,question:x.record.prompt.slice(0,140)})),
    route:route.slice(0,traceLimit),nodes:geometry.nodes.slice(0,traceLimit),
    dimensions:geometry.dimensions,axisLabels:geometry.axisLabels,
    axisProvenance:geometry.origin,
    edges:neighbors.flatMap((a,i)=>a.map(e=>({from:i,to:e.to,action:e.action,verified:e.verified}))).slice(0,traceLimit*2),
    field:field.slice(0,traceLimit),totalNodes:nodes.length};
 }
 atlasView({count=60}={}){
  if(!Number.isInteger(count)||count<1||count>120)throw Error("Invalid atlas size");
  const rs=[...this.records.values()].slice(-count),nodes=[],edges=[],shown=new Map();
  for(const r of rs){
   const question=nodes.length;
   nodes.push({id:question,kind:"observed-question",
    label:r.prompt.slice(0,256),recordId:r.id});
   const answer=nodes.length;
   nodes.push({id:answer,kind:"observed-answer",
    label:r.answer.slice(0,256),recordId:r.id});
   shown.set(r.id,question);
   edges.push({from:question,to:answer,action:"witnessed:dialogue-response",
    verified:true,sourceRow:r.sourceRow});
  }
  for(const r of rs){
   const from=shown.get(r.id);
   for(const candidate of this.candidates(r.prompt)){
    const to=shown.get(candidate.id);
    if(to==null||to===from)continue;
    if(candidate.score<Math.max(.1,this.config.minScore))continue;
    if(edges.some(e=>e.from===from&&e.to===to))continue;
    edges.push({from,to,action:"hypothesis:lexical-question-overlap",
      verified:false,score:candidate.score});
    // Limit unverified connections so visualization stays navigable.
    if(edges.filter(e=>e.from===from&&!e.verified).length>=2)break;
   }
  }
  const field=new Array(nodes.length).fill(0);
  const g=projectObservedWorld(nodes,field,this.records,this.nextId,terms);
  return {view:"observed-atlas",found:false,
   reason:"NO_GOAL_PREDICTION_IN_MEMORY_ATLAS",
   method:"observed memory only; no Discoverer.shape invoked",
   beforeAction:false,route:[],field,nodes:g.nodes,edges,
   dimensions:g.dimensions,axisLabels:g.axisLabels,
   totalNodes:nodes.length,observedEdges:edges.filter(e=>e.verified).length,
   hypothesizedEdges:edges.filter(e=>!e.verified).length,
   source:"Real corpus rows witnessed by this V24 process; NO synthetic path"};
 }
 summary(){return {config:this.config,stats:{...this.stats},activeRecords:this.records.size,
   distinctTerms:this.postings.size,nextId:this.nextId,
   method:"Original Discoverer.shape; hypothesis similarity, observed dialogue transformations"};}
 snapshot(){return {version:1,config:this.config,stats:{...this.stats},
   nextId:this.nextId,records:[...this.records.values()]};}
 static restore(saved){
  if(saved?.version!==1||!Array.isArray(saved.records))throw Error("Invalid RealTextAtlas checkpoint");
  const m=new RealTextAtlas(saved.config);
  for(const r of saved.records){
    if(!Number.isSafeInteger(r.id)||typeof r.prompt!=="string"||typeof r.answer!=="string"||!Array.isArray(r.terms))throw Error("Corrupt saved record");
    m.records.set(r.id,r);
    for(const t of r.terms){let p=m.postings.get(t);if(!p)m.postings.set(t,p=new Set());p.add(r.id);}
  }
  if(m.records.size>m.config.maxRecords)throw Error("Snapshot too big");
  m.nextId=saved.nextId;m.stats={...m.stats,...saved.stats};return m;
 }
}
