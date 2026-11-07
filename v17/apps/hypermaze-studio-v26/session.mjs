// Live experiment controller. Every graph/field/path comes from the learned
// native V17 Discoverer shape; no replay animation is created by a fake model.
// Both train and eval use real corpus spans, explicit controlled action physics.
import fs from "node:fs/promises";
import path from "node:path";
import {EventEmitter} from "node:events";
import {ObservedEffects,planShape,executeShape,seeded,clamp} from "./engine.mjs";
import {loadCorpus,DEFAULT_CORPUS,chooseAxisPhysics,makeTask,
  applyIndependentPhysics,makeAnswerAfterPlan} from "./corpus.mjs";

const exact=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
  a.every((v,i)=>v===b[i]);
const preview=(t,n=2400)=>Array.isArray(t)?t.join(" ").slice(0,n):"";
const defaults={axes:6,words:1024,noise:.22,batch:4,seed:74129,
  recordEvery:3,evalEvery:40,maxReadMB:32};
const finiteNum=(x,lo,hi,fallback)=>Number.isFinite(Number(x))?
  clamp(x,lo,hi):fallback;
const bounded=(c)=>({
  axes:Math.trunc(finiteNum(c.axes,2,10,6)),
  words:Math.trunc(finiteNum(c.words,128,8192,1024)),
  noise:finiteNum(c.noise,0,1,.22),
  batch:Math.trunc(finiteNum(c.batch,1,64,4)),
  seed:Math.trunc(finiteNum(c.seed,1,2147483647,74129)),
  recordEvery:Math.trunc(finiteNum(c.recordEvery,1,100,3)),
  evalEvery:Math.trunc(finiteNum(c.evalEvery,10,1000,40)),
  maxReadMB:Math.trunc(finiteNum(c.maxReadMB,1,128,32))
});
const stats0=()=>({
  episodes:0,plansFound:0,exactInitialShapes:0,
  exactExecuted:0,actionsObserved:0,predictedActions:0,
  correctPredictedActions:0,trainTokenVisits:0,trainBytes:0,
  trainWorlds:0,holdoutWorlds:0,holdoutFound:0,
  holdoutExactShape:0,holdoutExecutedExact:0,holdoutFrozen:0,
  wallCollisions:0,modelUpdates:0,worldStatesPeak:0,
  errors:0,lastError:null,startedAt:0,pausedAt:0
});
const logError=e=>String(e?.stack||e).slice(0,400);
export class StudioSession extends EventEmitter {
  constructor({corpusPath=DEFAULT_CORPUS,checkpointDir=path.resolve("V26_CHECKPOINTS"),
    config={}}={}){
    super();this.config=bounded({...defaults,...config});
    this.corpusPath=corpusPath;this.checkpointDir=checkpointDir;
    this.corpus=null;this.effects=[];this.model=null;
    this.stats=stats0();this.last=null;this.lastRaw=null;this.sequence=0;
    this.running=false;this.busy=false;this.evalBusy=false;
    this.phase="initializing";this.logs=[];this.recent=[];
    this.random=seeded(this.config.seed);
    this.sessionId="V26-"+Date.now().toString(36);
    this.lastReport=Date.now();this.bytesAtReport=0;this.lastRate=0;
  }
  message(level,text){
    const event={time:new Date().toISOString(),level,text:String(text).slice(0,500)};
    this.logs.push(event);if(this.logs.length>100)this.logs.shift();
    this.emit("update");return event;
  }
  async initialize(file=this.corpusPath,{reset=true}={}){
    if(this.running||this.evalBusy)throw Error("Pause and finish evaluation before loading corpus");
    const next=await loadCorpus(file,{maxReadBytes:this.config.maxReadMB*1024*1024});
    const effects=chooseAxisPhysics(next,this.config.axes);
    this.corpus=next;this.corpusPath=next.path;this.effects=effects;
    if(reset){this.model=new ObservedEffects({maxRules:this.config.axes});
      this.stats=stats0();this.last=null;this.lastRaw=null;this.recent=[];
      this.random=seeded(this.config.seed);}
    this.phase="ready";
    this.message("info","Loaded actual corpus: "+next.trainTokens+
      " train and "+next.testTokens+" heldout tokens, "+effects.length+" physical action axes");
    this.emit("update");return this.snapshot();
  }
  configure(patch={}){
    if(!this.corpus)throw Error("Load corpus before configuration");
    const next=bounded({...this.config,...patch});
    if(next.axes!==this.config.axes){
      if(this.stats.episodes>0||this.model.rules.size>0)
        throw Error("Changing learned axes requires Reset, preserving old checkpoint separately");
      this.effects=chooseAxisPhysics(this.corpus,next.axes);
      this.model=new ObservedEffects({maxRules:next.axes});
    }
    if(next.seed!==this.config.seed){
      if(this.stats.episodes>0)throw Error("Seed change requires Reset");
      this.random=seeded(next.seed);
    }
    this.config=next;this.message("info","Training settings updated");
    return this.snapshot();
  }
  _recordEpisode(task,plan,out,expected,{kind,learned=0,sourceBytes=0}={}){
    const graph=plan.graph||null;
    const record={id:++this.sequence,kind,time:new Date().toISOString(),
      inputWords:task.tokens.length,sourceSplit:task.sourceSplit,
      collisionWords:task.collidingCorpusWords||0,
      goal:task.goal.requires.slice(),requiredAxes:task.required.slice(),
      found:!!plan.found,reason:plan.reason,algorithm:"Discoverer.shape",
      completeBeforeAction:plan.completeBeforeAction,
      learnedAxes:plan.learnedAxes||0,
      initialPathExact:!!plan.found&&exact(plan.final,expected),
      executedExact:!!out?.exactFullShape&&exact(out.actual,expected),
      planLength:plan.path?.length||0,actualSteps:out?.trace?.length||0,
      modelUpdates:learned,nativeFieldAtStart:plan.fieldAtStart||0,
      graphNodes:plan.worldNodes||0,graphEdges:plan.worldEdges||0,
      sourceBytes,positions:task.positions.slice(),
      before:preview(task.tokens,5500),plannedText:preview(plan.final,5500),
      executedText:preview(out?.actual,5500),expectedText:preview(expected,5500),
      graph,trace:out?.trace||[],
      initialPath:(plan.path||[]).map((h,i)=>({step:i+1,
        from:h.from,to:h.to,action:h.action,
        axis:h.transformation?.axis,
        observedSource:h.transformation?.from,
        predictedTarget:h.transformation?.to,
        position:h.transformation?.position})),
      caveat:"Controlled corpus-derived token actions; not semantic open-ended QA"};
    this.last=record;
    this.lastRaw={before:task.tokens.slice(),predicted:plan.final?.slice()||null,
      executed:out?.actual?.slice()||null,expected:expected.slice(),
      split:task.sourceSplit,fullLength:task.tokens.length};
    this.recent.push({
      id:record.id,kind,exact:record.initialPathExact,
      found:record.found,words:record.inputWords,actions:record.planLength});
    if(this.recent.length>60)this.recent.shift();
    return record;
  }
  _experiment(kind="train",{record=false,random=null}={}){
    if(!this.corpus||!this.model)throw Error("No corpus/model; initialize first");
    const R=random||this.random;
    const task=makeTask(this.corpus,this.effects,{
      kind:kind==="holdout"?"holdout":"train",length:this.config.words,rng:R});
    const before=JSON.stringify(this.model.export());
    const seed=this.config.seed+this.stats.episodes*7919+
      (kind==="holdout"?91823:0);
    // Model has ONLY the effects observed in PRIOR physical encounters.
    const plan=planShape(this.model,task.tokens,task.goal,{
      seed,noise:this.config.noise,maxAxes:this.config.axes,includeGraph:record});
    if(JSON.stringify(this.model.export())!==before)
      throw Error("Regression: plan modified learned physics before first action");
    // The reference is constructed independently AFTER the plan was frozen.
    const expected=makeAnswerAfterPlan(task,this.effects);
    const physics=(state,action)=>applyIndependentPhysics(state,action,this.effects);
    const out=plan.found?executeShape(plan,task.tokens,physics):null;
    let learned=0;
    if(kind==="train"){
      // The real independently executed action is experienced after pre-action
      // guessing. Learn its causal effect from before/action/after, no labels.
      // One action per episode gives a measurable cold-start learning curve.
      const act=this.effects[this.stats.episodes%this.effects.length];
      const outcome=physics(task.tokens,act.action);
      const obs=this.model.observe({before:task.tokens,action:act.action,
        after:outcome.after,accepted:outcome.accepted});
      learned=Number(obs.learned);
      this.stats.modelUpdates+=learned;
    }
    const textBytes=Buffer.byteLength(task.tokens.join(" "),"utf8");
    if(kind==="train"){
      const s=this.stats;s.episodes++;s.trainWorlds++;
      s.trainBytes+=textBytes;s.trainTokenVisits+=task.tokens.length;
      s.plansFound+=Number(plan.found);
      s.exactInitialShapes+=Number(plan.found&&exact(plan.final,expected));
      s.exactExecuted+=Number(out?.exactFullShape&&exact(out.actual,expected));
      s.predictedActions+=out?.trace?.length||0;
      s.correctPredictedActions+=out?.trace?.filter(x=>x.accurate).length||0;
      s.actionsObserved+=Number(learned);
      s.worldStatesPeak=Math.max(s.worldStatesPeak,plan.worldNodes||0);
    }else{
      const s=this.stats;s.holdoutWorlds++;
      s.holdoutFound+=Number(plan.found);
      s.holdoutExactShape+=Number(plan.found&&exact(plan.final,expected));
      s.holdoutExecutedExact+=Number(out?.exactFullShape&&exact(out.actual,expected));
      s.holdoutFrozen++;
    }
    if(record)this._recordEpisode(task,plan,out,expected,{
      kind,learned,sourceBytes:textBytes});
    return {task,plan,out,expected,learned,textBytes};
  }
  step(){
    if(this.running||this.evalBusy)throw Error("Pause training before single step");
    if(!this.corpus)throw Error("Load corpus first");
    const x=this._experiment("train",{record:true});
    this.phase="paused";this.emit("update");return x;
  }
  start(){
    if(!this.corpus)throw Error("Load corpus first");
    if(this.evalBusy)throw Error("Frozen evaluation already running");
    if(this.running)return this.snapshot();
    this.running=true;this.phase="running";
    if(!this.stats.startedAt)this.stats.startedAt=Date.now();
    this.message("info","LIVE causal-action training started; original native solution shape");
    this._schedule();
    return this.snapshot();
  }
  pause(){
    this.running=false;if(this.phase==="running")this.phase="paused";
    this.stats.pausedAt=Date.now();
    this.message("info","Training paused without deleting observations");
    return this.snapshot();
  }
  _schedule(){
    if(this.busy||!this.running)return;
    setImmediate(()=>this._tick());
  }
  _tick(){
    if(this.busy||!this.running)return;
    this.busy=true;const start=Date.now();
    try{
      let i=0;
      while(this.running&&i<this.config.batch&&(Date.now()-start)<45){
        const record=(this.stats.episodes%this.config.recordEvery)===0;
        this._experiment("train",{record});
        i++;
        if(this.stats.episodes%this.config.evalEvery===0)
          this._experiment("holdout",{record:true,random:seeded(this.config.seed+this.stats.episodes*991)});
      }
      if(Date.now()-this.lastReport>=400){
        const now=Date.now(),bytes=this.stats.trainBytes-this.bytesAtReport;
        this.lastRate=bytes*1000/Math.max(1,now-this.lastReport);
        this.lastReport=now;this.bytesAtReport=this.stats.trainBytes;
        this.emit("update");
      }
    }catch(e){
      this.running=false;this.phase="error";this.stats.errors++;
      this.stats.lastError=logError(e);
      this.message("error",e.message||e);
    }finally{this.busy=false;}
    if(this.running)this._schedule();
  }
  async evaluate(count=100){
    if(!this.corpus)throw Error("Load corpus first");
    if(this.evalBusy)throw Error("Frozen evaluation already running");
    const wasRunning=this.running;this.running=false;this.evalBusy=true;
    this.phase="evaluating";
    const before=JSON.stringify(this.model.export());
    const base=this.stats.holdoutWorlds;
    const n=Math.trunc(clamp(count,1,10000));
    try{
      for(let i=0;i<n;i++){
        // Seed and state sampling derived separately from training progression.
        const R=seeded(this.config.seed+5700001+(base+i)*104729);
        this._experiment("holdout",{record:i===n-1||i%40===0,random:R});
        if(i%8===7){
          this.emit("update");
          await new Promise(resolve=>setImmediate(resolve));
        }
      }
      if(JSON.stringify(this.model.export())!==before)
        throw Error("Frozen evaluation leaked into learner");
      this.message("success","Frozen holdout: "+n+
        " real unseen text-state tasks, zero learning mutations");
    }catch(e){
      this.stats.errors++;this.stats.lastError=logError(e);
      this.message("error",e.message||e);throw e;
    }finally{
      this.evalBusy=false;this.phase=wasRunning?"running":"paused";
      this.running=wasRunning;if(wasRunning)this._schedule();
      this.emit("update");
    }
    return this.snapshot();
  }
  async reset(){
    this.running=false;
    if(this.evalBusy)throw Error("Finish frozen evaluation before reset");
    this.model=new ObservedEffects({maxRules:this.config.axes});
    this.stats=stats0();this.recent=[];this.last=null;this.lastRaw=null;this.sequence=0;
    this.random=seeded(this.config.seed);this.phase="ready";
    this.message("warn","In-memory training reset; saved checkpoint files untouched");
    return this.snapshot();
  }
  async save(){
    if(!this.corpus)throw Error("Load corpus before saving");
    const state={version:1,sessionId:this.sessionId,
      createdAt:new Date().toISOString(),source:{path:this.corpus.path,
      fingerprint:this.corpus.fingerprint,sizeBytes:this.corpus.sizeBytes},
      config:this.config,stats:this.stats,sequence:this.sequence,
      rngState:this.random.state(),model:this.model.export(),effects:this.effects,
      last:this.last,lastRaw:this.lastRaw,recent:this.recent};
    await fs.mkdir(this.checkpointDir,{recursive:true});
    const name="v26-"+Date.now()+"-"+this.stats.episodes+".json";
    const dest=path.join(this.checkpointDir,name);
    const tmp=dest+".tmp";
    await fs.writeFile(tmp,JSON.stringify(state,null,2),"utf8");
    await fs.rename(tmp,dest);
    this.message("success","Actual checkpoint saved: "+dest);
    return {saved:true,path:dest,bytes:Buffer.byteLength(JSON.stringify(state))};
  }
  async restore(file){
    if(this.running||this.evalBusy)throw Error("Pause training before loading checkpoint");
    const saved=JSON.parse(await fs.readFile(path.resolve(file),"utf8"));
    if(saved.version!==1||saved.source?.fingerprint!==this.corpus?.fingerprint)
      throw Error("Checkpoint incompatible with currently loaded corpus split");
    const model=ObservedEffects.restore(saved.model);
    if(!Array.isArray(saved.effects)||saved.effects.length!==saved.config?.axes)
      throw Error("Invalid checkpoint physical observation metadata");
    this.config=bounded(saved.config);
    this.model=model;this.effects=saved.effects;this.stats=saved.stats;
    this.sequence=saved.sequence||0;
    // A full random generator snapshot is required because each task consumes
    // multiple draws; episode count alone cannot reproduce its hidden state.
    this.random=seeded(this.config.seed);
    if(!Number.isInteger(saved.rngState))throw Error("Checkpoint lacks exact RNG state");
    this.random.restore(saved.rngState);
    this.phase="paused";this.last=saved.last||null;
    this.lastRaw=saved.lastRaw||null;this.recent=saved.recent||[];
    this.message("success","Restored checkpoint without modifying V17 weights");
    return this.snapshot();
  }
  fullExport(){
    return {...this.snapshot(),fullText:this.lastRaw,
      learnerCheckpoint:this.model?.export()||null,
      sourceBytesIncluded:false,
      note:"Full latest text tokens, learned evidence and graph; not an export of the original corpus file"};
  }
  snapshot(){
    const s=this.stats,rate=n=>Number((n||0).toFixed(5));
    return {version:"V26",sessionId:this.sessionId,phase:this.phase,
      running:this.running,evaluating:this.evalBusy,config:{...this.config},
      source:this.corpus?{path:this.corpus.path,sizeBytes:this.corpus.sizeBytes,
        sampledBytes:this.corpus.sampledBytes,trainTokens:this.corpus.trainTokens,
        testTokens:this.corpus.testTokens,split:this.corpus.splitDescription,
        fingerprint:this.corpus.fingerprint}:null,
      hardware:{planner:"original V17 Discoverer.shape",device:"CPU (Node.js)",
        cudaVerified:false},
      stats:{...s,trainFirstShapeRate:rate(s.exactInitialShapes/Math.max(1,s.trainWorlds)),
        trainAnswerRate:rate(s.exactExecuted/Math.max(1,s.trainWorlds)),
        holdoutFirstShapeRate:rate(s.holdoutExactShape/Math.max(1,s.holdoutWorlds)),
        holdoutAnswerRate:rate(s.holdoutExecutedExact/Math.max(1,s.holdoutWorlds)),
        trainMBs:rate(this.lastRate/1e6),
        totalMB:rate(s.trainBytes/1e6),
        learnedActionRules:this.model?.rules?.size||0},
      learned:[...(this.model?.rules?.values()||[])].map(x=>({
        action:x.action,from:x.from,to:x.to,count:x.count,
        observedPositions:x.observedPositions,ambiguous:x.ambiguous})),
      physicsAxes:this.effects.map(x=>({action:x.action,from:x.from,to:x.to})),
      last:this.last,recent:this.recent.slice(-30),logs:this.logs.slice(-25),
      caveat:"REAL measured corpus-state navigation with CONTROLLED token-edit physics. No unrestricted semantic QA or CUDA proof."};
  }
}
