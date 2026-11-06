// V17 native fourth world: the SAME Brain experiences its own source, selects
// code-space actions, and learns from independent executable counterfactuals.
// Candidate source changes never execute in the live V17 process.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';
import {SelfCodeWorld} from '../../../../experimental/self-world/code-world.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const ENGINE = path.join(ROOT, 'v17/transcend/epistemic-text/engine.mjs');
const finite = (x, d = 0) => Number.isFinite(x) ? x : d;
const clip = (x, a, b) => Math.min(b, Math.max(a, x));
const resultFile = f => f ? f + '.selfcode.json' : null;

// Deliberately learned action selection. The two options (move through actual
// source order, or spend a noise portal) compete using observed code novelty,
// the brain's own surprise, and actual causal source-edit feedback.
export class CodeActionPolicy {
  constructor(){this.q = {walk:0,portal:0};this.n = {walk:0,portal:0};this.last = null;}
  choose({random,remaining,context=0}) {
    if(remaining<=0)return 'walk';
    const t = clip(.25 + .15*context, .1, .55);
    const p = Math.exp(this.q.portal/t), w = Math.exp(this.q.walk/t);
    return random() < p/(p+w) ? 'portal' : 'walk';
  }
  learn(action,reward){
    if(!(action in this.q))throw Error('Unknown code-world action');
    const r=clip(finite(reward),-1,1);
    this.n[action]++;
    this.q[action]+= .15*(r-this.q[action]);
    this.last={action,reward:r,steps:this.n.walk+this.n.portal};
    return this.last;
  }
  serialize(){return {q:{...this.q},n:{...this.n},last:this.last};}
  restore(s){if(!s||!s.q||!s.n)return;
    for(const a of ['walk','portal']){
      if(!Number.isFinite(s.q[a])||!Number.isSafeInteger(s.n[a])||s.n[a]<0)throw Error('Bad action policy checkpoint');
      this.q[a]=clip(s.q[a],-1,1);this.n[a]=s.n[a];
    }this.last=s.last||null;
  }
}

export class NativeSelfCodeWorld {
  constructor({brain,saveFile=null,seed=11,enableEvaluator=true,evalWorkerFactory=null}={}) {
    if(!brain||typeof brain.live!=='function'||!brain.trace)throw Error('Native V17 Brain required');
    const files=[
      {path:ENGINE,label:'self/epistemic-text/engine.mjs'},
      {path:path.join(HERE,'brain.mjs'),label:'self/brain.mjs'},
      {path:path.join(HERE,'worker.mjs'),label:'self/worker.mjs'},
      {path:path.join(HERE,'trace.mjs'),label:'self/trace.mjs'},
    ];
    const scratch=saveFile?path.join(path.dirname(saveFile),'selfcode-sandbox-'+path.basename(saveFile)):
      path.join(ROOT,'v17/runtime-native-selfcode','sandbox-'+seed);
    this.world=new SelfCodeWorld({sourceFiles:files,sandbox:scratch,brain,seed});
    this.brain=brain;this.seed=seed;this.saveFile=resultFile(saveFile);
    this.policy=new CodeActionPolicy();
    this.nodes=this.world.atlas.nodes.filter(n=>n.kind!=='locked'&&n.kind!=='portal');
    this.cursor=0;this.ticks=0;this.inflight=false;this.probeNumber=0;this.probeAction=null;
    this.lockAttempts=0;this.lockStatus={locked:true,reason:'Not independently qualified'};
    this.lastProbe=null;this.lastError=null;this.reported=0;this.worker=null;this.suspended=false;this.pending=[];
    this.sourceHash=this.world.editor.sha256;
    this.restore();
    this.drawInitial();
    if(enableEvaluator) {
      try {
        const factory=evalWorkerFactory||(()=>new Worker(new URL('./selfcode-evaluator.mjs',import.meta.url),
          {workerData:{seed,source:ENGINE,sandbox:scratch}}));
        this.worker=factory();
        this.worker.on('message',msg=>this.onEvaluation(msg));
        this.worker.on('error',err=>{this.inflight=false;this.lastError='Evaluator error: '+err.message;});
        this.worker.on('exit',code=>{this.inflight=false;this.worker=null;if(code!==0)this.lastError='Evaluator exit '+code;});
      }catch(err){this.lastError='Evaluator unavailable: '+err.message;}
    }
  }
  drawInitial(){
    const t=this.brain.trace;
    t.node('code:unknown','self','CODE • LOCKED');
    t.node('code:portal','self','PORTAL • NOISE');
    t.setEdge('o:self','code:unknown','self-code-locked',1);
  }
  graphNode(id){
    const n=this.nodes.find(x=>x.id===id);if(!n)return;
    const mapped='code:'+id;
    this.brain.trace.node(mapped,'self',n.name.slice(0,34));
    this.brain.trace.fire(mapped);
    return mapped;
  }
  step(){
    if(!this.nodes.length)return this.status();
    // Budget replenishment is a resource law; spending it is the organism's action.
    if(this.ticks%6===0)this.world.portal.budget=Math.min(40,this.world.portal.budget+1);
    const from=this.nodes[this.cursor%this.nodes.length],seen=this.world.portal.visits;
    const action=this.policy.choose({random:()=>this.world.portal.random(),remaining:this.world.portal.budget,
      context:this.nodes.length?seen.size/this.nodes.length:0});
    let target,move;
    if(action==='portal'){
      const uncertainties=Object.fromEntries(this.nodes.map(n=>[n.id,1/(1+(seen.get(n.id)?.n||0))]));
      move=this.world.explore(from.id,uncertainties);
      target=this.nodes.find(n=>n.id===move.to)||from;
    }else{
      target=this.nodes[(this.cursor+1)%this.nodes.length];
      move={type:'walk',from:from.id,to:target.id};
      this.world.experience({kind:'walk',from:from.id,to:target.id});
    }
    const old=seen.get(target.id)?.n||0;
    const p=typeof this.brain.predict==='function'?this.brain.predict():null;
    const inspected=this.world.perceive(target.id);
    // One actual observed code-state transition enters the existing V17 shared
    // PyTorch queue too (when enabled). No source-edit oracle/held-out answer.
    if(typeof this.brain.observeShared==='function'){
      const before=this.world.atlas.inspect(from.id).code.slice(0,320);
      this.brain.observeShared({domain:'selfcode',before,after:inspected.code.slice(0,320),
        action:action==='portal'?'portal-jump':'source-walk',context:from.name+'->'+target.name});
    }
    const first=(inspected.code||' ')[0].charCodeAt(0);
    const prob=Array.isArray(p)||ArrayBuffer.isView(p)?finite(p[first],0):0;
    const surprise=clip(-Math.log(Math.max(1/100000,prob))/Math.log(128),0,1);
    const novelty=old===0?1:1/(1+old);
    const reward=clip(.75*novelty+.2*surprise-(action==='portal'?.25:.05),-1,1);
    this.policy.learn(action,reward);
    this.world.feedOutcome(target.id,reward);
    const a=this.graphNode(from.id),b=this.graphNode(target.id);
    if(a&&b)this.brain.trace.setEdge(a,b,action==='portal'?'self-code-portal':'self-code-walk',Math.max(.05,reward+0.3));
    if(b)this.brain.trace.setEdge(b,'code:unknown','self-code-seeks',this.lockStatus.locked ? 0.4 : 0.05);
    this.cursor=this.nodes.indexOf(target);this.ticks++;
    if(this.worker&&!this.inflight&&this.ticks%8===0)this.launchProbe();
    if(this.ticks%20===0)this.save();
    return this.status();
  }
  // Practice probes are independent executed edits on a copy, evaluated by a
  // separate worker. Outcomes are never supplied before the source edit trial.
  launchProbe(){
    if(!this.worker||this.inflight)return;
    const slots=this.world.editor.patches(),r=()=>this.world.portal.random();
    const values=slots.map(s=>s.integer?[s.min,Math.floor((s.min+s.max)/2),s.max]:[s.min,+(s.max/5).toFixed(3),s.max]);
    // Choose by estimated effect + genuine exploration, not sequential demo slots.
    const ranked=[];
    for(let i=0;i<slots.length;i++)for(const v of values[i]){
      const p=this.world.effectModel.predict({slot:slots[i].id,value:v});
      const visits=this.world.effectModel.probes.filter(x=>x.slot===slots[i].id&&x.value===v).length;
      ranked.push({slot:slots[i].id,value:v,score:p+.06/Math.sqrt(1+visits)+.03*r()});
    }
    ranked.sort((a,b)=>b.score-a.score);
    const selected=r()<.20?ranked[Math.floor(r()*ranked.length)]:ranked[0];
    this.inflight=true;this.probeAction=this.policy.last?.action||'walk';
    this.worker.postMessage({kind:'probe',index:++this.probeNumber,slot:selected.slot,value:selected.value});
    this.world.experience({kind:'code-experiment-requested',slot:selected.slot,value:selected.value});
  }
  pause(){this.suspended=true;}
  resume(){this.suspended=false;for(const msg of this.pending.splice(0))this.onEvaluation(msg);}
  onEvaluation(msg){
    if(this.suspended){this.pending.push(msg);return;}
    this.inflight=false;
    if(!msg||msg.error){this.lastError=String(msg?.error||'Evaluator gave empty result');return;}
    if(msg.kind==='probe'){
      this.world.effectModel.observe({slot:msg.slot,value:msg.value,delta:msg.delta,corpusId:'practice-'+msg.index});
      this.lastProbe={index:msg.index,slot:msg.slot,value:msg.value,delta:msg.delta};
      this.world.experience({kind:'measured-source-change',slot:msg.slot,value:msg.value,delta:msg.delta});
      this.policy.learn(this.probeAction||'walk',clip(msg.delta*8,-1,1));this.probeAction=null;
      this.brain.trace.node('code:effect:'+msg.slot,'self',msg.slot);
      this.brain.trace.setEdge('code:effect:'+msg.slot,'code:unknown','counterfactual',Math.max(.1,Math.abs(msg.delta)));
      if(this.probeNumber>=24&&this.probeNumber%24===0&&this.lockAttempts<this.probeNumber/24)this.launchLock();
    }else if(msg.kind==='lock'){
      this.lockAttempts++;this.lockStatus={locked:!msg.unlocked,accuracy:msg.accuracy,baseline:msg.baseline,
        attempts:msg.attempts,promotion:msg.promotion??null};
      this.world.experience({kind:'hidden-lock-assessment',accuracy:msg.accuracy,baseline:msg.baseline,unlocked:msg.unlocked});
      this.brain.trace.node('code:unknown','self','CODE • LOCKED').label=msg.unlocked?'CODE • QUALIFIED':'CODE • LOCKED';
      this.brain.trace.fire('code:unknown');
    }
    this.save();
  }
  launchLock(){
    if(!this.worker||this.inflight)return;
    this.inflight=true;
    const data=this.world.effectModel.probes.map(x=>({slot:x.slot,value:x.value,delta:x.delta,corpusId:x.corpusId}));
    this.worker.postMessage({kind:'lock',probes:data,index:this.lockAttempts+1});
  }
  restore(){
    if(!this.saveFile||!fs.existsSync(this.saveFile))return;
    try{
      const s=JSON.parse(fs.readFileSync(this.saveFile,'utf8'));
      if(s.version!==1||s.sourceHash!==this.sourceHash)throw Error('Checkpoint source hash differs; refusing unsafe restore');
      this.cursor=clip(s.cursor|0,0,this.nodes.length-1);this.ticks=Math.max(0,s.ticks|0);
      this.policy.restore(s.policy);
      this.probeNumber=Math.max(0,s.probeNumber|0);this.lockAttempts=Math.max(0,s.lockAttempts|0);
      this.lockStatus={locked:true,reason:'Needs fresh independent evaluation after resume'};
      this.world.effectModel.probes=(s.probes||[]).filter(x=>typeof x.slot==='string'&&Number.isFinite(x.delta)&&Number.isFinite(x.value)).slice(-1000);
      for(const [id,n,value] of (s.visits||[]))if(typeof id==='string'&&Number.isSafeInteger(n)&&n>0&&Number.isFinite(value))this.world.portal.visits.set(id,{n,value});
      this.world.portal.used=Math.max(0,s.used|0);this.world.portal.budget=clip(s.budget|0,0,40);
      if(Number.isSafeInteger(s.rng))this.world.portal.seed=s.rng>>>0;
    }catch(err){this.lastError='Self-code checkpoint recovery refused: '+err.message;}
  }
  save(){
    if(!this.saveFile)return;
    const obj={version:1,sourceHash:this.sourceHash,cursor:this.cursor,ticks:this.ticks,policy:this.policy.serialize(),
      probeNumber:this.probeNumber,lockAttempts:this.lockAttempts,probes:this.world.effectModel.probes.slice(-1000),
      visits:[...this.world.portal.visits].map(([id,v])=>[id,v.n,v.value]),used:this.world.portal.used,budget:this.world.portal.budget,rng:this.world.portal.seed>>>0};
    const tmp=this.saveFile+'.tmp';fs.mkdirSync(path.dirname(this.saveFile),{recursive:true});
    fs.writeFileSync(tmp,JSON.stringify(obj));fs.renameSync(tmp,this.saveFile);
  }
  status(){let originalUnchanged=false;try{originalUnchanged=this.world.atlas.verify();}catch(err){this.lastError='Source verification failed: '+err.message;}
    return {world:'native V17 self-code',ticks:this.ticks,sourceFiles:this.world.atlas.sources.size,
    graphNodes:this.world.atlas.nodes.length,portals:this.world.portal.used,remainingPortalBudget:this.world.portal.budget,
    policy:this.policy.serialize(),probes:this.world.effectModel.probes.length,lastProbe:this.lastProbe,
    lock:this.lockStatus,inflight:this.inflight,originalUnchanged,error:this.lastError};}
  async close(){this.save();if(this.worker){await this.worker.terminate();this.worker=null;}}
}
