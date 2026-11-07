// MagicPerspective V23 multiscale extension: run the SAME original V17/V22
// Discoverer.shape at every spatial/temporal scale. No replacement planner.
// Without hierarchy, scalar 0.97 attenuation + 1e-12 update threshold loses
// valid connected plans past ~900 hops. Hierarchical learned-event composition
// preserves the entire path BEFORE any action, without changing the original
// field law, thresholds, implementation or V17 maze behavior.
import {Discoverer,KIND} from "./exercise.mjs";
import {GroundedTemporalHypermaze} from "./grounded-temporal-hypermaze.mjs";

const split = text => String(text).match(/[^.!?\n]+[.!?]?/gu)||[];
const snapshot = x => JSON.parse(JSON.stringify(x));
export class MultiscaleGroundedHypermaze {
  constructor(model,{chunkSize=128}={}){
    if(!(model instanceof GroundedTemporalHypermaze))throw Error("Grounded event learner required");
    if(!Number.isInteger(chunkSize)||chunkSize<4||chunkSize>256)
      throw Error("chunkSize must be between 4 and 256");
    this.model=model;this.chunkSize=chunkSize;
  }
  plan(text,question,{seed=74129,temperature=0}={}){
    const query=this.model.inferQuestion(question);
    if(!query.found)return {found:false,reason:query.reason,plannedBeforeAction:true};
    const sentences=split(text),events=[];
    for(let i=0;i<sentences.length;i++){
      const e=this.model.inferEvent(sentences[i]);
      if(e&&e.item===query.item)events.push({...e,sourceIndex:i});
    }
    if(!events.length)return {found:false,reason:"NO_GROUNDED_EVENTS_FOR_ITEM",
      item:query.item,plannedBeforeAction:true};
    let holder=events[0].from;
    for(let i=0;i<events.length;i++){
      const e=events[i];
      if(e.from!==holder)return {found:false,reason:"CONTRADICTORY_EVENT_CHAIN",
        item:query.item,atEvent:i,plannedBeforeAction:true};
      holder=e.to;
    }
    const frozen=JSON.stringify(this.model.export());
    const levels=[],allActions=[];
    const shapeRange=(lo,hi,depth)=>{
      const len=hi-lo,size=len<=this.chunkSize?1:Math.ceil(len/this.chunkSize);
      const groups=[];
      for(let a=lo;a<hi;a+=size)groups.push({lo:a,hi:Math.min(hi,a+size)});
      const count=groups.length;
      const states=new Array(count+1),neighbors=Array.from({length:count+1},()=>[]);
      states[0]={holder:events[hi-1].to,globalStep:hi};
      for(let i=1;i<=count;i++){
        const g=groups[count-i],first=events[g.lo],last=events[g.hi-1];
        states[i]={holder:first.from,globalStep:g.lo};
        neighbors[i].push({to:i-1,action:"observed-range:"+g.lo+":"+g.hi,
          transformation:{fromIndex:g.lo,toIndex:g.hi,
            item:query.item,from:first.from,to:last.to,
            macro:g.hi-g.lo>1,physicalSupport:g.hi-g.lo}});
      }
      const kinds=states.map((_,i)=>i===0?KIND.target:i===count?KIND.self:KIND.floor);
      const original=new Discoverer((seed+lo*7919+depth*1013)>>>0);
      original.temp=temperature;
      let field=[];
      const path=original.shape(kinds,0,count,{neighbors,
        conduct:k=>k===KIND.wall?0:1,
        attract:k=>k===KIND.target?1:0,
        onField:v=>{field=v;}})||[];
      levels.push({depth,fromStep:lo,toStep:hi,originalMethod:"Discoverer.shape",
        groups:count,fieldAtStart:field[count]??0,
        values:field,originalPathNodes:[count,...path.map(x=>x.to)]});
      if(path.length!==count||path.at(-1)?.to!==0)
        throw Error("Original Discoverer could not propagate complete scale "+depth+" "+lo+".."+hi);
      for(const hop of path){
        const g=groups[count-hop.from];
        if(g.hi-g.lo>1)shapeRange(g.lo,g.hi,depth+1);
        else {
          const e=events[g.lo];
          allActions.push({fromStep:g.lo,toStep:g.hi,action:e.sentence,
            sourceIndex:e.sourceIndex,item:e.item,
            from:e.from,to:e.to,grammar:e.sourceGrammar,support:e.support});
        }
      }
    };
    try{shapeRange(0,events.length,0);}catch(err){
      return {found:false,reason:"ORIGINAL_SHAPE_AT_SCALE_FAILED",
        details:err.message,plannedBeforeAction:true,levels};
    }
    if(JSON.stringify(this.model.export())!==frozen)
      throw Error("A frozen multi-scale plan mutated learned action memory");
    if(allActions.length!==events.length)
      throw Error("Source action count differs from planned leaf actions");
    for(let i=0;i<allActions.length;i++){
      const e=allActions[i],original=events[i];
      if(e.action!==original.sentence||e.from!==original.from||e.to!==original.to)
        throw Error("A decomposed macro changed learned physical chronology at "+i);
    }
    return {found:true,plannedBeforeAction:true,originalMethod:"Discoverer.shape",
      recursiveOriginalCalls:levels.length,maximumLocalNodes:Math.max(...levels.map(x=>x.groups+1)),
      levels,path:allActions,question,item:query.item,
      plannedAnswer:events.at(-1).to,
      goal:{type:"terminal-event-time",step:events.length,answerProvided:false},
      axes:["item","holder","temporal-step","learned-event-syntax","observed-support"],
      recognition:{totalSentences:sentences.length,chosenEvents:events.length},
      numericMethod:"hierarchical V17 attraction field, no changed 0.97 or 1e-12 tolerance"};
  }
  execute(plan,{step}={}){
    if(!plan?.found||typeof step!=="function")throw Error("Frozen plan and independent physical callback required");
    let holder=plan.path[0].from;const trace=[];
    for(const edge of plan.path){
      if(edge.from!==holder)throw Error("Internal shape missed contiguous physical state");
      const response=step({item:plan.item,holder},snapshot(edge),edge.action);
      if(!response||typeof response.accepted!=="boolean"||typeof response.holder!=="string")
        throw Error("The world must return real accepted and holder");
      const accurate=response.accepted&&response.holder===edge.to;
      trace.push({step:edge.fromStep,sourceIndex:edge.sourceIndex,
        predicted:edge.to,actual:response.holder,accepted:response.accepted,accurate});
      if(!accurate)break;
      holder=response.holder;
    }
    const success=trace.length===plan.path.length&&trace.every(t=>t.accurate);
    return {success,plannedBeforeAction:true,actualAnswer:success?holder:null,
      matchesFrozenAnswer:success&&holder===plan.plannedAnswer,
      stepsExecuted:trace.length,trace};
  }
}
