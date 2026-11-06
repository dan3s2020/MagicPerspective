// One ORIGINAL V17 worker/Brain, one observed text graph, actual usage counters.
// This is ONLINE prequential evaluation: predict BEFORE this example is observed.
// The held-out corpus is read in a separate evaluation-only call. No score
// counts a stored training answer as a correct answer without checking truth.
import {ObservedQAAtlas,wordF1} from './atlas.mjs';
import {inspectNativeVsSuccessor} from './multipath.mjs';
import {repeatedWindowFraction} from './repetition.mjs';

export class LiveResearch {
  constructor({maxEntries=3000,candidates=8,reportEvery=5,loopWindow=24,loopPenalty=4,
    gamma=.9,characterLimit=160}={}){
    this.atlas=new ObservedQAAtlas({maxEntries});
    this.config={maxEntries,candidates,reportEvery,loopWindow,loopPenalty,gamma,characterLimit};
    this.observed=0;this.attempts=0;this.tested=0;this.cumulative={native:0,sr:0,lexical:0,char:0,guarded:0};
    this.exacts={native:0,sr:0,lexical:0,char:0,guarded:0};
    this.repeat={original:0,guarded:0};
    this.usages={nativeCalls:0,srCalls:0,actualTies:0,changedDecisions:0,
      noGraph:0,goalReachedNative:0,goalReachedSR:0};
    this.history=[];this.last=null;this.error=null;this.heldout=null;this.progress=null;this.trainingChars=0;
  }
  static restore(saved,config={}){
    if(saved?.version!==1)throw Error('Unsupported live research checkpoint');
    const a=new LiveResearch({...saved.config,...config});
    a.atlas=ObservedQAAtlas.restore(saved.atlas);
    for(const k of ['observed','attempts','tested','cumulative','exacts','repeat','usages',
      'history','last','heldout','trainingChars'])if(saved[k]!==undefined)a[k]=saved[k];
    a.atlas.maxEntries=Math.max(a.atlas.maxEntries,a.config.maxEntries);
    return a;
  }
  save(){
    return {version:1,config:this.config,atlas:this.atlas.snapshot(),
      observed:this.observed,attempts:this.attempts,tested:this.tested,
      cumulative:this.cumulative,exacts:this.exacts,repeat:this.repeat,
      usages:this.usages,history:this.history,last:this.last,
      heldout:this.heldout,trainingChars:this.trainingChars};
  }
  // This is a frozen comparison, not a new language learner. It uses the
  // exact same original Brain that experiences maze and characters.
  candidate(question,brain,{includeChar=true,trace=false}={}){
    const g=this.atlas.build(question,{candidates:this.config.candidates});
    const nativePath=brain.disc.shape(g.nodes.map(x=>x.kind),0,0,g.adj);
    this.usages.nativeCalls++;
    let at=0,path=[0];
    if(nativePath)for(const a of nativePath){
      at=g.adj[at]?.[a];
      if(!Number.isInteger(at))throw Error('Original shape returned an invalid corpus edge');
      path.push(at);
    }
    const nativeOk=g.nodes[at]?.kind===2;
    if(nativeOk)this.usages.goalReachedNative++;
    let multi=null,srOk=false,sr='',srPath=[0];
    if(g.matched){
      multi=inspectNativeVsSuccessor(g,brain.disc,{gamma:this.config.gamma});
      this.usages.srCalls++;
      this.usages.actualTies+=multi.successorTie.actualTieSteps;
      this.usages.changedDecisions+=multi.successorTie.changedSteps;
      srOk=multi.successorTie.reached;
      if(srOk)this.usages.goalReachedSR++;
      srPath=multi.successorTie.path;
      const end=g.nodes[srPath.at(-1)];
      sr=String(srOk?end?.completeAnswer||'':'');
    }else this.usages.noGraph++;
    const native=String(nativeOk?g.nodes[at]?.completeAnswer||'':'');
    const lexical=String(this.atlas.similarities(question,1)[0]?.answer||'');
    let char='',guarded='';
    if(includeChar&&brain.align){
      const bytes=s=>Array.from(String(s),ch=>{const code=ch.charCodeAt(0);
        return code===9||code===10||(code>=32&&code<127)?code:63;});
      const prompt=bytes('Q: '+question+'\nA: ');
      const original=brain.align.write(prompt,{max:this.config.characterLimit,T:0});
      const resistant=brain.align.write(prompt,{max:this.config.characterLimit,T:0,
        loopPenalty:this.config.loopPenalty,loopWindow:this.config.loopWindow});
      char=String.fromCharCode(...original);
      guarded=String.fromCharCode(...resistant);
    }
    return {native,sr,lexical,char,guarded,
      graph:trace?g:null,
      nativePath:path,srPath,
      multi:multi?{
        shortestPathCount:multi.shortest.count,
        shortestDistance:multi.shortest.length,
        successorsAtStart:multi.successor.start,
        actualTies:multi.successorTie.actualTieSteps,
        changedDecisions:multi.successorTie.changedSteps,
        goalReachedNative:multi.native.reached,
        goalReachedSR:multi.successorTie.reached
      }:null};
  }
  // Observe the question only AFTER making its prediction. The answer was not
  // in atlas/Brain when these results were produced.
  experience({index,question,answer,characters},brain){
    if(!String(question).trim()||!String(answer).trim())return null;
    const predicted=this.candidate(question,brain,{includeChar:true,trace:true});
    const truth=String(answer).slice(0,this.config.characterLimit);
    const scores={
      native:wordF1(truth,predicted.native.slice(0,this.config.characterLimit)),
      sr:wordF1(truth,predicted.sr.slice(0,this.config.characterLimit)),
      lexical:wordF1(truth,predicted.lexical.slice(0,this.config.characterLimit)),
      char:wordF1(truth,predicted.char),
      guarded:wordF1(truth,predicted.guarded)
    };
    for(const [k,v] of Object.entries(scores)){
      this.cumulative[k]+=v;
      this.exacts[k]+=Number(predicted[k].slice(0,this.config.characterLimit).trim()===truth.trim());
    }
    this.attempts++;
    const repOrig=repeatedWindowFraction(predicted.char,this.config.loopWindow);
    const repGuard=repeatedWindowFraction(predicted.guarded,this.config.loopWindow);
    this.repeat.original+=repOrig;this.repeat.guarded+=repGuard;
    const sample={
      type:'prequential-before-observe',index,at:this.observed,
      question:String(question).slice(0,380),reference:truth,
      scores,answers:Object.fromEntries(Object.entries(predicted)
        .filter(([k])=>['native','sr','lexical','char','guarded'].includes(k))
        .map(([k,v])=>[k,v.slice(0,this.config.characterLimit)])),
      path:{original:predicted.nativePath,successor:predicted.srPath,...predicted.multi},
      graph:{
        nodes:predicted.graph.nodes.slice(0,140).map((v,i)=>({id:i,kind:v.kind,label:String(v.label).slice(0,100)})),
        edges:predicted.graph.adj.slice(0,140).flatMap((xs,i)=>xs.filter(to=>to<140).map(to=>[i,to]))
      },
      repetition:{original:repOrig,guarded:repGuard}
    };
    this.last=sample;
    // The ORIGINAL V17 brain continues to ingest the FULL text. Limit only
    // compact graph evidence, so a 60 KB answer cannot fill the atlas alone.
    this.observed+=Number(this.atlas.observe(String(question).slice(0,1500),
      String(answer).slice(0,2400),index));
    this.trainingChars+=Number(characters)||0;
    const rate=this.rate();
    this.history.push({sample:this.attempts,rows:this.observed,
      ...rate,sourceIndex:index,
      nativeCalls:this.usages.nativeCalls,srCalls:this.usages.srCalls,
      changedDecisions:this.usages.changedDecisions});
    if(this.history.length>300)this.history.shift();
    return sample;
  }
  rate(){
    if(!this.attempts) return {native:null,sr:null,lexical:null,char:null,guarded:null,
      repeatOriginal:null,repeatGuarded:null,exactNative:null,exactSr:null};
    const n=this.attempts;
    return {native:this.cumulative.native/n,sr:this.cumulative.sr/n,
      lexical:this.cumulative.lexical/n,char:this.cumulative.char/n,guarded:this.cumulative.guarded/n,
      repeatOriginal:this.repeat.original/n,repeatGuarded:this.repeat.guarded/n,
      exactNative:this.exacts.native/n,exactSr:this.exacts.sr/n};
  }
  evaluateHeldout(items,brain){
    const reports=[];
    for(const it of items){
      if(this.atlas.examples.some(x=>x.sourceIndex===it.index))throw Error('Held-out index leaked into training');
      // Held-out answer only used after all predictions have been calculated.
      const pred=this.candidate(it.prompt,brain,{includeChar:true,trace:false});
      const truth=String(it.answer).slice(0,this.config.characterLimit);
      const scores=Object.fromEntries(['native','sr','lexical','char','guarded'].map(k=>
        [k,wordF1(truth,String(pred[k]).slice(0,this.config.characterLimit))]));
      reports.push({index:it.index,scores,shortest:pred.multi?.shortestPathCount||'0',
        changed:pred.multi?.changedDecisions||0});
    }
    const m=reports.length;
    this.tested+=m;
    this.heldout={samples:m,afterObserved:this.observed,
      mean:Object.fromEntries(['native','sr','lexical','char','guarded'].map(k=>
        [k,m?reports.reduce((s,p)=>s+p.scores[k],0)/m:null])),
      reports,at:new Date().toISOString()};
    return this.heldout;
  }
  status(extra={}){
    return {
      enabled:true,observed:this.observed,attempts:this.attempts,
      observedCharacters:this.trainingChars,graphEntries:this.atlas.examples.length,
      source:'real OpenThoughts3 Parquet, current V17 worker Brain',
      workerModel:'Original V17 Brain plus an isolated Q/A evidence atlas in the SAME worker; the SR planner is an evaluated extension, not the next-character learning engine',
      goalIsTrainingAnswer:true,semanticsProven:false,
      rates:this.rate(),totals:{...this.usages},
      history:this.history.slice(-120),last:this.last,heldout:this.heldout,
      error:this.error,progress:this.progress,config:this.config,...extra
    };
  }
}
