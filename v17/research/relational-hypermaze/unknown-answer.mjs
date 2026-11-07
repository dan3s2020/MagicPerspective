// V23: Unknown-answer relational goal prediction. Uses ONLY the original
// V17 Discoverer.shape() to propagate goal attraction on observed text edges.
// A question supplies its source and goal PROPERTIES, never the answer entity.
import {Discoverer,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {words,readWorld,stateKey,makeHeldout,seededRng} from "./engine.mjs";

export const QUESTION_FORMS=[
 (s,p,c)=>"Starting from "+s[0]+" with phase "+s[1]+" charge "+s[2]+" at epoch "+s[3]+
  " which reachable entity first has phase "+p+" and charge "+c+"?",
 (s,p,c)=>"An explorer at "+s[0]+" phase "+s[1]+" charge "+s[2]+" time "+s[3]+
  " asks which reachable entity first obtains phase "+p+" with charge "+c+"."
];
const SLOTS=["S0","S1","S2","S3","P","C"];
export class LearnedQuestions {
 constructor(){this.patterns=new Map();this.experiences=0;}
 witness({text,source,phase,charge}){
  const t=words(text),v=[...source,phase,charge],used=new Set(),p=t.slice();
  if(v.length!==6)throw Error("Expected observed question slots");
  for(let i=0;i<v.length;i++){
   const j=t.findIndex((x,k)=>x===v[i]&&!used.has(k));
   if(j<0)throw Error("Incomplete question witness");
   used.add(j);p[j]="@"+SLOTS[i];
  }
  const key=JSON.stringify(p),e=this.patterns.get(key)||{tokens:p,count:0};
  e.count++;this.patterns.set(key,e);this.experiences++;
 }
 parse(text){
  const t=words(text),result=[];
  for(const e of this.patterns.values()){
   if(e.count<2||e.tokens.length!==t.length)continue;
   const a={};let match=true;
   for(let i=0;i<t.length;i++){
    if(e.tokens[i].startsWith("@"))a[e.tokens[i].slice(1)]=t[i];
    else if(e.tokens[i]!==t[i]){match=false;break;}
   }
   if(match)result.push({source:[a.S0,a.S1,a.S2,a.S3],
      predicate:{phase:a.P,charge:a.C}});
  }
  const uniq=new Map(result.map(x=>[JSON.stringify(x),x]));
  return uniq.size===1?[...uniq.values()][0]:null;
 }
}
export function trainQuestionForms(){
 const q=new LearnedQuestions();
 for(let f=0;f<2;f++)for(let i=0;i<6;i++){
  const source=["example"+f+"_"+i,"p"+f+"_"+i,"c"+f+"_"+i,"t"+f+"_"+i];
  const phase="goalPhase"+f+"_"+i,charge="goalCharge"+f+"_"+i;
  q.witness({text:QUESTION_FORMS[f](source,phase,charge),source,phase,charge});
 }
 return q;
}
export function predictUnknownEntity(grammar,questions,text,question,{seed=17,temperature=0}={}){
 const q=questions.parse(question);
 const fail=reason=>({found:false,answer:null,route:[],reason,
  method:"Discoverer.shape",beforeAction:true,answerEntityGiven:false});
 if(!q)return fail("UNKNOWN_QUESTION_PATTERN");
 // No answer entity is added: the caller passes the start twice to the
 // existing readWorld signature; only observed text creates other nodes.
 const map=readWorld(grammar,text,q.source,q.source);
 const targets=new Set(map.states.flatMap((x,i)=>
   x[1]===q.predicate.phase&&x[2]===q.predicate.charge?[i]:[]));
 if(!targets.size)return fail("NO_MATCHING_PROPERTY_IN_OBSERVED_STATES");
 if(targets.has(map.start))return {...fail("INITIAL_STATE_ALREADY_QUALIFIES"),
   found:true,answer:q.source,answerEntity:q.source[0],alreadyQualified:true,
   predicate:q.predicate};
 const kinds=map.states.map((_,i)=>i===map.start?KIND.self:
   targets.has(i)?KIND.target:KIND.floor);
 const actor=new Discoverer(seed);actor.temp=temperature;
 let values=[];
 const path=actor.shape(kinds,0,map.start,{
   neighbors:map.neighbors,conduct:()=>1,
   attract:k=>k===KIND.target?1:0,onField:x=>{values=x;}
 })||[];
 const finish=path.length?path.at(-1).to:map.start;
 const found=path.length>0&&targets.has(finish);
 return {found,answer:found?map.states[finish]:null,
   answerEntity:found?map.states[finish][0]:null,
   route:path.map(e=>({from:map.states[e.from],to:map.states[e.to],action:e.action})),
   beforeAction:true,method:"Discoverer.shape",answerEntityGiven:false,
   predicate:q.predicate,source:q.source,targetsFound:targets.size,
   parsedObservedEdges:map.observed,worldStates:map.states.length,
   values,seed,temperature};
}
export function unknownAnswerWorld(seed,{routeLength=7,distractors=90}={}){
 const w=makeHeldout(seed,{routeLength,distractors});
 const r=seededRng(seed+117);
 const target=[...w.oraclePath].reverse().find(s=>s[1]!==w.initial[1]||s[2]!==w.initial[2]);
 if(!target)throw Error("No nontrivial target");
 const form=QUESTION_FORMS[r.int(QUESTION_FORMS.length)];
 const predicate={phase:target[1],charge:target[2]};
 return {...w,question:form(w.initial,predicate.phase,predicate.charge),predicate};
}
export function independentAnswerScore(pred,w){
 const truthEdges=new Set(w.hiddenEdges.map(e=>stateKey(e.from)+"|"+e.action+"|"+stateKey(e.to)));
 const adj=new Map();
 for(const e of w.hiddenEdges){const k=stateKey(e.from),a=adj.get(k)||[];
   a.push(e);adj.set(k,a);}
 const start=stateKey(w.initial),Q=[start],dist=new Map([[start,0]]);
 let oracleDistance=Infinity;
 for(let i=0;i<Q.length;i++){
  const key=Q[i],s=JSON.parse(key),d=dist.get(key);
  if(s[1]===w.predicate.phase&&s[2]===w.predicate.charge){
   oracleDistance=d;break;
  }
  for(const edge of adj.get(key)||[]){
   const k=stateKey(edge.to);
   if(!dist.has(k)){dist.set(k,d+1);Q.push(k);}
  }
 }
 let cursor=start;
 for(const edge of pred.route||[]){
  if(cursor!==stateKey(edge.from)||!truthEdges.has(stateKey(edge.from)+"|"+edge.action+"|"+stateKey(edge.to)))
   return {correct:false,physicallyValid:false,shortest:false,oracleDistance};
  cursor=stateKey(edge.to);
 }
 const a=JSON.parse(cursor),correct=!!pred.found &&
  a[1]===w.predicate.phase&&a[2]===w.predicate.charge;
 return {correct,physicallyValid:true,shortest:correct&&(pred.route||[]).length===oracleDistance,
  oracleDistance,steps:(pred.route||[]).length};
}
