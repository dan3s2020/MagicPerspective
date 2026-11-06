// MagicPerspective opt-in self-code world V0.1.
// Real source is the sensory terrain. No production source or checkpoints are changed.
// The only allowed self-edits are exact-match numeric changes in a copy of a vetted source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const numeric = value => Number.isFinite(value) && Number.isSafeInteger(value * 1000);
const safePath = name => typeof name === 'string' && !name.includes('\0');
const SOURCE_PATTERNS = Object.freeze([
  {id:'observation-period', match:'this.episodes%112===0&&this.maxLag<4', stem:'this.episodes%', tail:'===0&&this.maxLag<4', min:28, max:448, integer:true},
  {id:'perspective-period', match:'this.episodes%28===0)this.reframe()', stem:'this.episodes%', tail:'===0)this.reframe()', min:7, max:224, integer:true},
  {id:'promotion-margin', match:'best.score>(old?.score??0)+.018', stem:'best.score>(old?.score??0)+', tail:'', min:0, max:0.2, integer:false},
  {id:'complexity-cost', match:'acc-.003*p.mask.toString', stem:'acc-', tail:'*p.mask.toString', min:0, max:0.04, integer:false},
]);
function findOnce(s, fragment) {const a=s.indexOf(fragment);if(a<0||s.indexOf(fragment,a+fragment.length)>=0)throw Error('The source differs from vetted edition: '+fragment);return a;}
function parseNodeGraph(filename, content) {
  const nodes=[];const lines=content.split(/\r?\n/);let current=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i], match=line.match(/\b(?:export\s+)?(?:class|function)\s+([A-Za-z_$][\w$]*)|^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if(match){const kind=match[1]?'declaration':'method';const name=match[1]||match[2];
      current={id:filename+':'+(i+1),file:filename,line:i+1,name,kind,preview:line.trim().slice(0,140)};
      nodes.push(current);
    }
  }
  if(!nodes.length)nodes.push({id:filename+':1',file:filename,line:1,name:'source',kind:'source',preview:lines[0]?.slice(0,140)||''});
  const imports=[...content.matchAll(/\bimport\s+(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(m=>m[1]);
  return {nodes,imports};
}

export class SourceUniverse {
  constructor(files) {
    if(!Array.isArray(files)||!files.length||files.length>32)throw Error('Supply 1–32 source files');
    this.sources=new Map();this.nodes=[];this.edges=[];
    for(const item of files){
      const filename=typeof item==='string'?item:item.path;
      if(!safePath(filename)||!fs.statSync(filename).isFile())throw Error('Invalid source file');
      const content=fs.readFileSync(filename,'utf8');if(content.length>4*1024*1024)throw Error('Source too large');
      const rel=(typeof item==='string'?path.basename(filename):item.label)||path.basename(filename);
      if(this.sources.has(rel))throw Error('Duplicate source label: '+rel);
      const parsed=parseNodeGraph(rel,content);this.sources.set(rel,{path:filename,hash:hash(content),content,imports:parsed.imports});
      this.nodes.push(...parsed.nodes);
      for(let i=1;i<parsed.nodes.length;i++)this.edges.push({from:parsed.nodes[i-1].id,to:parsed.nodes[i].id,kind:'next-in-source'});
    }
    if(this.nodes.length>2500)throw Error('Atlas too large');
    this.nodes.push({id:'self:locked-edit',file:'self',line:0,name:'UNKNOWN_LOCK',kind:'locked',preview:'A path to modifying the running engine; not yet available'});
    this.nodes.push({id:'self:noise-portal',file:'self',line:0,name:'NOISE_PORTAL',kind:'portal',preview:'A choice of exploratory jump from any code node'});
    this.edges.push({from:this.nodes[0].id,to:'self:locked-edit',kind:'locked-path'});
  }
  describe(){return{files:[...this.sources].map(([name,s])=>({name,sha256:s.hash,bytes:s.content.length,imports:s.imports})),nodes:this.nodes.map(x=>({...x,locked:x.kind==='locked'})),edges:this.edges};}
  inspect(id,radius=3){const n=this.nodes.find(n=>n.id===id);if(!n)throw Error('Unknown node');if(n.kind==='locked'||n.kind==='portal')return{...n,code:n.preview};
    const src=this.sources.get(n.file),lines=src.content.split(/\r?\n/),start=Math.max(0,n.line-1-Math.min(12,Math.max(0,radius)));
    return {...n,sourceSHA256:src.hash,code:lines.slice(start,n.line+radius).map((s,i)=>`${start+i+1}: ${s}`).join('\n')};
  }
  verify(){for(const [name,s] of this.sources)if(hash(fs.readFileSync(s.path,'utf8'))!==s.hash)throw Error('The code-world source changed under observation: '+name);return true;}
}

// A source-node-local bandit: the organism chooses whether/where to open portals.
// Noise adds exploration; utility comes from ACTUAL information gained, not invented scores.
export class PortalLearner {
  constructor({budget=40,seed=1,noise=0.22}={}){
    this.budget=budget;this.seed=seed>>>0;this.noise=noise;this.visits=new Map();this.records=[];this.used=0;
  }
  random(){let x=this.seed+=0x6D2B79F5;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;}
  record(nodeId,reward,cost=1){const v=this.visits.get(nodeId)||{n:0,value:0};v.n++;v.value+=Math.max(-1,Math.min(1,reward));this.visits.set(nodeId,v);this.records.push({nodeId,reward,cost});if(this.records.length>300)this.records.shift();}
  choose({from,nodes,uncertainty={}}){
    if(this.budget<1)return {type:'walk',from,to:nodes.find(n=>n.id!==from)?.id??from,reason:'portal-budget-exhausted'};
    const candidates=nodes.filter(n=>n.id!==from&&n.kind!=='locked'&&n.kind!=='portal');
    if(!candidates.length)return {type:'walk',from,to:from,reason:'no-destinations'};
    const total=[...this.visits.values()].reduce((s,v)=>s+v.n,0)+1;
    const rank=n=>{const v=this.visits.get(n.id)||{n:0,value:0};const u=Math.min(1,Math.max(0,uncertainty[n.id]??0.5));
      return (v.n?v.value/v.n:0)+.45*Math.sqrt(Math.log(total+1)/(v.n+1))+.35*u;};
    let to;
    if(this.random()<this.noise)to=candidates[Math.floor(this.random()*candidates.length)];
    else to=candidates.reduce((a,b)=>rank(a)>=rank(b)?a:b);
    this.budget--;this.used++;
    return {type:'noise-portal',from,to:to.id,cost:1,estimatedValue:rank(to),remainingBudget:this.budget};
  }
  snapshot(){return{noise:this.noise,budget:this.budget,used:this.used,nodesLearned:this.visits.size,records:this.records.slice(-10)}};
}

export class SandboxCode {
  constructor({original,directory,approvedSHA256=null}){
    if(!safePath(original)||!fs.statSync(original).isFile())throw Error('Missing code source');
    this.original=original;this.directory=directory;this.originalCode=fs.readFileSync(original,'utf8');
    this.sha256=hash(this.originalCode);
    if(approvedSHA256&&this.sha256!==approvedSHA256)throw Error('Original SHA256 mismatch');
    for(const slot of SOURCE_PATTERNS)findOnce(this.originalCode,slot.match);
    fs.mkdirSync(directory,{recursive:true});this.drafts=new Map();
  }
  patches(){return SOURCE_PATTERNS.map(({id,min,max,integer})=>({id,min,max,integer}));}
  makeDraft({id,value}){
    const slot=SOURCE_PATTERNS.find(x=>x.id===id);
    if(!slot)throw Error('Not a permitted code edit');
    if(typeof value!=='number'||!Number.isFinite(value)||value<slot.min||value>slot.max||(slot.integer&&!Number.isInteger(value))||(!slot.integer&&!numeric(value)))throw Error('Bad numeric patch value');
    if(hash(fs.readFileSync(this.original,'utf8'))!==this.sha256)throw Error('Original engine changed since lock was initialized');
    const v=String(value);const changed=this.originalCode.replace(slot.match,slot.stem+v+slot.tail);
    if(changed===this.originalCode)throw Error('No effective code change');
    const candidateSHA=hash(changed);const location=path.join(this.directory,'candidate-'+candidateSHA.slice(0,20)+'.mjs');
    // Exact string substitutions only; no user-supplied JS and never a write to original.
    fs.writeFileSync(location,changed,{flag:'w'});
    const syntax=spawnSync(process.execPath,['--check',location],{encoding:'utf8',timeout:5000});
    if(syntax.status!==0){fs.unlinkSync(location);throw Error('Candidate does not parse: '+syntax.stderr.slice(0,200));}
    const draft={id,value,sha256:candidateSHA,path:location,baseSHA256:this.sha256};this.drafts.set(candidateSHA,draft);
    return {...draft};
  }
  // Code-identity + functional checks only. This is not a secure OS sandbox against arbitrary modules;
  // it is safe here because changed bytes are restricted to a vetted numeric token in trusted code.
  approve(draftSHA,lock,validate){
    const draft=this.drafts.get(draftSHA);if(!draft)throw Error('Unknown candidate');
    if(!lock.unlocked)throw Error('CODE PATH LOCKED: demonstrate counterfactual understanding first');
    if(hash(fs.readFileSync(draft.path,'utf8'))!==draft.sha256)throw Error('Candidate tampered with');
    if(typeof validate!=='function'||validate(draft)!==true)throw Error('Regression or benefit test did not pass');
    const target=path.join(this.directory,'approved-'+draft.sha256.slice(0,20)+'.mjs');
    fs.copyFileSync(draft.path,target);return{path:target,sha256:draft.sha256,originalUnchanged:hash(fs.readFileSync(this.original,'utf8'))===this.sha256};
  }
}

// A challenge is scored by an internal evaluator on data not passed to the predictor.
// The learner supplies only a pre-outcome prediction. The lock never accepts an agent-supplied "actual".
export class CodeLock {
  #sealed;
  #oracle;
  #attempted=false;
  constructor({sealed=[],oracle,required=8,accuracy=0.75,margin=0.10}={}){
    if(!Number.isInteger(required)||required<4||required>100)throw Error('Invalid test count');
    if(!Array.isArray(sealed)||sealed.length<required||typeof oracle!=='function')throw Error('A sealed evaluator is required');
    this.#sealed=sealed.map(x=>structuredClone(x));this.#oracle=oracle;
    this.required=required;this.accuracy=accuracy;this.margin=margin;this.unlocked=false;this.audits=[];
  }
  async evaluate(predictor){
    if(typeof predictor!=='function')throw Error('Predictor function required');
    if(this.#attempted)throw Error('Sealed challenges already used; generate a fresh blind suite');
    this.#attempted=true;
    const attempts=[];
    for(const x of this.#sealed){
      // No held-out corpus, actual score, target label or private seed reaches the predictor.
      const visible=Object.freeze({id:x.id,slot:x.slot,value:x.value});
      const predictedDelta=await predictor(visible);
      if(typeof predictedDelta!=='number'||!Number.isFinite(predictedDelta))throw Error('Invalid prediction');
      const actualDelta=await this.#oracle(structuredClone(x));
      if(!Number.isFinite(actualDelta))throw Error('Invalid sealed evaluation');
      attempts.push({id:x.id,slot:x.slot,value:x.value,predictedDelta,actualDelta});
    }
    if(attempts.length<this.required||new Set(attempts.map(x=>x.id)).size!==attempts.length)throw Error('Missing or duplicate challenges');
    const sign=n=>n>1e-5?1:n< -1e-5?-1:0;
    const correct=attempts.filter(x=>sign(x.predictedDelta)===sign(x.actualDelta)).length;
    const baseline=attempts.filter(x=>sign(0)===sign(x.actualDelta)).length;
    const accuracy=correct/attempts.length,baselineAccuracy=baseline/attempts.length;
    const pass=accuracy>=this.accuracy&&accuracy>=baselineAccuracy+this.margin;
    this.unlocked ||= pass;
    const audit={challenges:attempts.length,accuracy,baseline:baselineAccuracy,pass,unlocked:this.unlocked,
      positivePredictions:attempts.filter(x=>x.predictedDelta>1e-5).length,
      actualImprovements:attempts.filter(x=>x.actualDelta>1e-5).length,
      attempts};
    this.audits.push(audit);return audit;
  }
  status(){return{locked:!this.unlocked,condition:'predict sealed counterfactual effects of source changes better than no-change baseline',last:this.audits.at(-1)?Object.fromEntries(Object.entries(this.audits.at(-1)).filter(([k])=>k!=='attempts')):null};}
}

// The organism's limited first coding skill: learned empirical model of how edits affect outcomes.
// It does NOT contain manually supplied answers to the hidden lock. It generalizes from probes.
export class CodeEffectModel {
  constructor(){this.probes=[];}
  observe({slot,value,delta,corpusId}){
    if(!Number.isFinite(value)||!Number.isFinite(delta)||typeof slot!=='string')throw Error('Invalid causal probe');
    this.probes.push({slot,value,delta,corpusId});
  }
  predict({slot,value}){
    const group=this.probes.filter(x=>x.slot===slot);
    if(!group.length)return 0;
    const ranked=group.map(x=>({...x,d:Math.abs(x.value-value)})).sort((a,b)=>a.d-b.d);
    const take=ranked.slice(0,Math.min(4,ranked.length));
    const weight=x=>1/(1+x.d);
    return take.reduce((s,x)=>s+x.delta*weight(x),0)/take.reduce((s,x)=>s+weight(x),0);
  }
  status(){return{probes:this.probes.length,slots:new Set(this.probes.map(x=>x.slot)).size};}
}

export class SelfCodeWorld {
  constructor({sourceFiles,sandbox,brain=null,seed=1,sourceSHA256=null}={}){
    this.atlas=new SourceUniverse(sourceFiles);this.portal=new PortalLearner({seed});
    const original=sourceFiles[0]?.path??sourceFiles[0];
    this.editor=new SandboxCode({original,directory:sandbox,approvedSHA256:sourceSHA256});
    this.lock=null;this.effectModel=new CodeEffectModel();this.brain=brain;this.history=[];
  }
  // Make real code available to the SAME Brain graph: symbolic characters, not a separate LLM.
  perceive(id){const event=this.atlas.inspect(id);this.experience({kind:'inspect',id,detail:event.code.slice(0,320)});return event;}
  experience(event){const encoded='\n[SELF-CODE-WORLD] '+JSON.stringify(event).slice(0,420)+'\n';this.history.push(event);if(this.history.length>128)this.history.shift();
    if(this.brain){if(typeof this.brain.live!=='function')throw Error('Expected original Brain.live');
      for(const ch of encoded){const n=ch.charCodeAt(0);this.brain.live(n>=32&&n<127||n===10?n:63,false);}
    }
  }
  explore(from,uncertainty={}){const a=this.portal.choose({from,nodes:this.atlas.nodes,uncertainty});
    if(a.type==='noise-portal'){this.atlas.edges.push({from:a.from,to:a.to,kind:'learned-noise-portal'});if(this.atlas.edges.length>3000)this.atlas.edges.splice(0,100);}
    this.experience({kind:a.type,from:a.from,to:a.to,remaining:a.remainingBudget});return a;}
  feedOutcome(id,informationGain){this.portal.record(id,informationGain);this.experience({kind:'portal-result',at:id,informationGain});}
  previewCodeChange(spec){const draft=this.editor.makeDraft(spec);this.experience({kind:'draft-experiment',slot:spec.id,value:spec.value,sha256:draft.sha256,locked:this.lock?.status().locked??true});return draft;}
  async unlockWithBlindChallenges(){if(!this.lock)throw Error('No sealed programming challenge configured');const outcome=await this.lock.evaluate(v=>this.effectModel.predict(v));this.experience({kind:'lock-attempt',accuracy:outcome.accuracy,baseline:outcome.baseline,pass:outcome.pass});return outcome;}
  commitSandboxDraft(sha,regressionCheck){if(!this.lock)throw Error('Lock has not been constructed');const applied=this.editor.approve(sha,this.lock,regressionCheck);this.experience({kind:'sandbox-edit',sha256:sha});return applied;}
  status(){return{atlas:this.atlas.describe(),portal:this.portal.snapshot(),lock:this.lock?.status()??{locked:true,condition:'sealed evaluation not configured'},effectModel:this.effectModel.status(),recent:this.history.slice(-8)};}
}

export async function evaluateV17Text({modulePath,corpus=null,steps=1500,limit=250}={}){
  if(!Number.isInteger(steps)||steps<1||steps>50000)throw Error('Unsafe step count');
  const mod=await import(pathToFileURL(modulePath).href);
  if(typeof mod.TextExperiment!=='function')throw Error('Not a V17 text experiment module');
  const t=new mod.TextExperiment(corpus?{corpus}:{}) ;t.step(steps);return t.evaluate(limit).accuracy.C;
}
