// Experimental V23 — action-grounded temporal text hypermaze, built on the exact
// ORIGINAL V22 extension of V17 Discoverer.shape. No next-byte prediction.
// A learned event grammar is induced solely from observed before/action/after.
// The final answer token is never supplied as a goal. A terminal-time goal
// seeds original attraction; the final location comes from the executed path.
import {Discoverer,KIND} from "./exercise.mjs";

export const logTokens = text => String(text).normalize("NFC").match(/[\p{L}\p{M}\p{N}_]+(?:['’-][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu)||[];
const norm = t => t.toLocaleLowerCase("en-US");
const uniquePosition = (row,value) => {
  const hits=[]; for(let i=0;i<row.length;i++)if(row[i]===value)hits.push(i);
  return hits.length===1?hits[0]:-1;
};
const template = (tokens,positions) => tokens.map((t,i)=>positions.includes(i)?"*":norm(t));
const signature = pattern => pattern.join("\u001f");
const satisfies = (pattern,tokens) => pattern.length===tokens.length &&
  pattern.every((x,i)=>x==="*"||x===norm(tokens[i]));
const copy = v => JSON.parse(JSON.stringify(v));
const split = text => String(text).match(/[^.!?\n]+[.!?]?/gu)||[];

export class GroundedTemporalHypermaze {
  constructor({minimumEvidence=3}={}){
    if(!Number.isInteger(minimumEvidence)||minimumEvidence<2)throw Error("minimumEvidence must be >=2");
    this.minimumEvidence=minimumEvidence;
    this.actions=new Map();this.questions=new Map();
    this.trainingActions=0;this.trainingQuestions=0;
    this.rejectedEvents=new Set();
  }
  // Effect and role positions are DERIVED from supervised physical observations;
  // these are not hard-coded "from", "to", item labels or grammar rules.
  observeAction({sentence,item,before,after,accepted=true}={}){
    if(typeof sentence!=="string"||typeof item!=="string"||
       typeof before!=="string"||typeof after!=="string"||
       !item||!before||!after||before===after)throw Error("Grounded action requires before/item/after");
    const t=logTokens(sentence);
    const ix=uniquePosition(t,item),fx=uniquePosition(t,before),tx=uniquePosition(t,after);
    if(new Set([ix,fx,tx]).size!==3||Math.min(ix,fx,tx)<0)
      return {learned:false,reason:"AMBIGUOUS_ROLE_POSITIONS"};
    const pattern=template(t,[ix,fx,tx]);
    const id=signature(pattern)+"|"+[ix,fx,tx].join(",");
    if(!accepted){this.rejectedEvents.add(id);return {learned:false,reason:"BLOCKED_BY_PHYSICS"};}
    if(this.rejectedEvents.has(id))return {learned:false,reason:"CONTRADICTORY_PHYSICS"};
    const row=this.actions.get(id)||{id,pattern,ix,fx,tx,evidence:0};
    row.evidence++;this.actions.set(id,row);this.trainingActions++;
    return {learned:true,id,evidence:row.evidence};
  }
  // A question supplies ONLY an item (like a maze supplies a start/goal
  // CONDITION); it never supplies that item's unknown final location.
  observeQuestion({question,item}={}){
    if(typeof question!=="string"||typeof item!=="string"||!item)throw Error("Question example required");
    const t=logTokens(question),ix=uniquePosition(t,item);
    if(ix<0)return {learned:false,reason:"AMBIGUOUS_QUESTION"};
    const pattern=template(t,[ix]),id=signature(pattern)+"|"+ix;
    const row=this.questions.get(id)||{id,pattern,ix,evidence:0};
    row.evidence++;this.questions.set(id,row);this.trainingQuestions++;
    return {learned:true,id,evidence:row.evidence};
  }
  inferQuestion(question){
    const t=logTokens(question);
    const found=[];
    for(const row of this.questions.values())
      if(row.evidence>=this.minimumEvidence&&satisfies(row.pattern,t))found.push(t[row.ix]);
    const ids=[...new Set(found)];
    return ids.length===1?{found:true,item:ids[0]}:
      {found:false,reason:ids.length?"AMBIGUOUS_QUERY":"UNKNOWN_QUESTION_GRAMMAR"};
  }
  inferEvent(sentence){
    const t=logTokens(sentence),found=[];
    for(const row of this.actions.values())if(row.evidence>=this.minimumEvidence&&
      !this.rejectedEvents.has(row.id)&&satisfies(row.pattern,t)){
        const item=t[row.ix],from=t[row.fx],to=t[row.tx];
        if(item&&from&&to&&from!==to)found.push({item,from,to,sentence:sentence.trim(),
          sourceGrammar:row.id,support:row.evidence});
      }
    if(!found.length)return null;
    const unique=new Map(found.map(x=>[[x.item,x.from,x.to].join("\u001f"),x]));
    return unique.size===1?found[0]:null;
  }
  plan(text,question,{seed=74129,temperature=0}={}){
    const query=this.inferQuestion(question);
    if(!query.found)return {found:false,reason:query.reason,plannedBeforeAction:true};
    const sentences=split(text),all=[];
    for(let i=0;i<sentences.length;i++){
      const event=this.inferEvent(sentences[i]);
      if(event)all.push({...event,sourceIndex:i});
    }
    const rows=all.filter(e=>e.item===query.item);
    if(!rows.length)return {found:false,reason:"NO_GROUNDED_EVENTS_FOR_ITEM",
      item:query.item,plannedBeforeAction:true,recognizedEvents:all.length};
    // A world that says different holders for the same item without a
    // confirmed move is not silently "fixed" by invented edges.
    let location=rows[0].from;const chronology=[location];
    for(const e of rows){
      if(e.from!==location)return {found:false,reason:"CONTRADICTORY_EVENT_CHAIN",
        item:query.item,plannedBeforeAction:true,knownPrefix:chronology.length-1};
      location=e.to;chronology.push(location);
    }
    const count=rows.length;
    // Reverse topological indexing is exactly equivalent, while letting the
    // ORIGINAL V17 2*N wavefront converge in one sweep on this acyclic world.
    const states=chronology.map((holder,step)=>({holder,step,item:query.item})).reverse();
    const neighbors=Array.from({length:count+1},()=>[]);
    for(let i=1;i<=count;i++){
      const event=rows[count-i];
      neighbors[i].push({to:i-1,action:event.sentence,
        transformation:{kind:"observed-text-event",item:event.item,
          from:event.from,to:event.to,sourceIndex:event.sourceIndex,
          support:event.support,grammar:event.sourceGrammar}});
    }
    const kinds=states.map((_,i)=>i===0?KIND.target:i===count?KIND.self:KIND.floor);
    const disc=new Discoverer(seed);disc.temp=temperature;
    let values=[];
    const path=disc.shape(kinds,0,count,{neighbors,
      conduct:k=>k===KIND.wall?0:1,
      attract:k=>k===KIND.target?1:0,
      onField:field=>{values=field;}})||[];
    const found=path.length===count&&path.at(-1)?.to===0;
    return {found,plannedBeforeAction:true,originalMethod:"Discoverer.shape",
      question,queryItem:query.item,plannedAnswer:found?states[0].holder:null,
      // This is a relational/time graph, NOT evidence of intrinsic physical 5D.
      axes:["item","holder","event-order","observed-syntax","action-evidence"],
      field:values,states,path,recognition:{sentences:sentences.length,
        allEvents:all.length,selectedEvents:rows.length},
      goal:{type:"after-last-grounded-event",terminalStep:count,answerProvided:false},
      // Paths are frozen before the first actual environment step.
      source:"real complete event text + learned grounded action patterns"};
  }
  execute(plan,{step}={}){
    if(!plan?.found||typeof step!=="function")throw Error("Found plan and independent step callback required");
    let state=copy(plan.states.at(-1)),trace=[];
    for(const hop of plan.path){
      const predicted=plan.states[hop.to];
      const actual=step(copy(state),copy(hop.transformation),hop.action);
      if(!actual||typeof actual.accepted!=="boolean"||typeof actual.holder!=="string")
        throw Error("Independent environment must give accepted and holder");
      const correct=actual.accepted&&actual.holder===predicted.holder;
      trace.push({sourceIndex:hop.transformation.sourceIndex,action:hop.action,
        predicted:predicted.holder,actual:actual.holder,correct});
      if(!correct)break;
      state=copy(predicted);
    }
    const success=trace.length===plan.path.length&&trace.every(t=>t.correct);
    return {success,actualAnswer:success?state.holder:null,
      matchesFrozenAnswer:success&&state.holder===plan.plannedAnswer,
      predictedBeforeAct:plan.plannedAnswer,steps:trace.length,trace};
  }
  export(){return {version:1,minimumEvidence:this.minimumEvidence,
    actions:[...this.actions],questions:[...this.questions],
    trainingActions:this.trainingActions,trainingQuestions:this.trainingQuestions,
    rejectedEvents:[...this.rejectedEvents]};}
  static restore(o){
    if(o?.version!==1)throw Error("Incompatible grounded temporal model");
    const m=new GroundedTemporalHypermaze({minimumEvidence:o.minimumEvidence});
    m.actions=new Map(o.actions);m.questions=new Map(o.questions);
    m.trainingActions=o.trainingActions;m.trainingQuestions=o.trainingQuestions;
    m.rejectedEvents=new Set(o.rejectedEvents);return m;
  }
}
