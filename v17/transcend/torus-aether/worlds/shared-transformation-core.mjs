// MagicPerspective V17: one compact, persistent LEARNED action/effect graph.
// The graph grows from REAL observed maze movements and REAL text-edit pairs.
// It does not store one node per word occurrence, Q/A pair or maze cell.
// Domain-specific sensors remain in the ORIGINAL Brain and are NOT replaced.
// The same learned weight vector ranks candidate actions in BOTH worlds.
// No semantic equivalence or correct language answer is assumed.
const clip=(v,a,b)=>Math.min(b,Math.max(a,v));
const TYPES=new Set(['move','insert','delete','replace','transform','other']);
const safeString=v=>String(v??'').slice(0,96);
function kindOf(action){
  const k=typeof action==='object'?action.kind:String(action||'').split(':')[0];
  return TYPES.has(k)?k:/^(move|output)$/.test(k)?'move':'other';
}
function actualOutcome({progress,changed,terminal,blocked}){
  if(blocked)return 'blocked';
  if(terminal)return 'terminal';
  if(progress>0)return 'progress';
  if(progress<0)return 'regress';
  return changed?'changed':'stable';
}
function soft(z){return z>25?1:z< -25?0:1/(1+Math.exp(-z));}
export class SharedTransformationCore {
  constructor(){
    this.version=1;
    // RULE NODES are types/effects, NOT copies of raw sentences or coordinates.
    this.nodes=new Map([['self',{kind:'self',count:0}],['goal',{kind:'goal',count:0}]]);
    this.edges=new Map();
    this.rules=new Map();
    // ONE transferable outcome policy; every actual world updates SAME weights.
    this.weights=[0,0,0,0,0,0]; // bias, progress, evidence, uncertainty, novelty, terminal
    this.updates=0;
    this.byWorld={maze:0,text:0,transform:0};
    this.hits=0;this.predictions=0;
    this.last=null;
  }
  _node(id,kind){
    if(!this.nodes.has(id))this.nodes.set(id,{kind,count:0});
    this.nodes.get(id).count++;
  }
  _edge(from,to){
    const key=from+'>'+to;this.edges.set(key,(this.edges.get(key)||0)+1);
  }
  _features({progress=0,support=0,uncertainty=0,novelty=1,terminal=0}={}){
    return [1,clip(Number(progress)||0,-1,1),
      clip(Number(support)||0,0,1),-clip(Number(uncertainty)||0,0,1),
      clip(Number(novelty)||0,0,1),clip(Number(terminal)||0,0,1)];
  }
  _estimate(features){
    return soft(features.reduce((sum,x,i)=>sum+x*this.weights[i],0));
  }
  observe({world,action,changed,blocked=false,terminal=false,progress=null,
    support=0,uncertainty=0,novelty=1,source='observed-action'}={}){
    if(!Object.hasOwn(this.byWorld,world))throw Error('Unknown real world for transition evidence');
    if(!['observed-action','observed-corpus-difference','observed-blind-action'].includes(source))
      throw Error('Unverified action evidence cannot train shared core');
    if(typeof changed!=='boolean'||typeof blocked!=='boolean'||typeof terminal!=='boolean')
      throw Error('Observed real action and result are required');
    const type=kindOf(action),numericProgress=Number.isFinite(progress)?clip(progress,-1,1):0;
    const result=actualOutcome({progress:numericProgress,changed,blocked,terminal});
    const kind='action:'+type,effect='effect:'+result,domain='world:'+world;
    for(const [id,role] of [[domain,'world'],[kind,'action'],[effect,'effect']])this._node(id,role);
    this._edge('self',domain);this._edge(domain,kind);this._edge(kind,effect);
    if(terminal)this._edge(effect,'goal');
    const old=this.rules.get(kind)||{kind:type,seen:0,changed:0,blocked:0,progress:0,terminal:0,
      worlds:{maze:0,text:0,transform:0}};
    old.seen++;old.changed+=Number(changed);old.blocked+=Number(blocked);
    old.progress+=Number(numericProgress>0);old.terminal+=Number(terminal);
    old.worlds[world]++;this.rules.set(kind,old);
    this.byWorld[world]++;
    // The prediction is computed BEFORE the current observation updates the
    // shared action-effect weights. Text gives structural confirmation, not a
    // semantic reward. Maze uses only an actually observed move/no-move.
    const features=this._features({progress:numericProgress,support,
      uncertainty,novelty,terminal:Number(terminal)});
    const guessed=this._estimate(features);
    const target=blocked?0:Number(changed);
    const delta=clip(target-guessed,-1,1)*.03;
    for(let i=0;i<this.weights.length;i++)this.weights[i]=clip(this.weights[i]+delta*features[i],-7,7);
    this.updates++;this.predictions++;this.hits+=Number((guessed>=.5)===Boolean(target));
    this.last={world,kind:type,outcome:result,changed,terminal,blocked,
      predictedEffectBeforeObservation:Number(guessed.toFixed(5)),
      progressMeasuredAfterAction:Number(numericProgress.toFixed(5)),
      source};
    return {learned:true,...this.last};
  }
  // No hidden answer: a candidate is a possible effect produced by the
  // original observed text-operator generator or the maze BELIEF map.
  score({world,action,progress=0,support=0,uncertainty=0,novelty=1,terminal=0}={}){
    const type=kindOf(action),r=this.rules.get('action:'+type);
    if(!this.updates)return 0;
    const f=this._features({progress,support,uncertainty,novelty,terminal});
    const linear=f.reduce((sum,x,i)=>sum+x*this.weights[i],0);
    const viability=r?(r.changed+1)/(r.seen+2):.5;
    const confidence=r?r.seen/(r.seen+8):0;
    // Explicitly small correction: existing learned world-specific semantics,
    // goal constraints and field remain primary, universal effect comes next.
    return clip(.25*linear + .50*(viability-.5)*confidence,-1.5,1.5);
  }
  scoreText(before,after,action,required=[]){
    if(!Array.isArray(before)||!Array.isArray(after))throw Error('Text state arrays required');
    const beforeN=required.filter(t=>before.includes(t)).length;
    const afterN=required.filter(t=>after.includes(t)).length;
    const progress=required.length?(afterN-beforeN)/required.length:0;
    const support=(action?.observedSupport||0)/((action?.observedSupport||0)+4);
    const terminal=required.length>0&&afterN===required.length;
    return this.score({world:'text',action,progress,support,terminal:Number(terminal),
      novelty:Math.max(0,1-support),uncertainty:1-support});
  }
  scoreMaze({progress=0,support=0,uncertainty=0,novelty=1,terminal=0}={}){
    return this.score({world:'maze',action:'move',progress,support,uncertainty,novelty,terminal});
  }
  observeMazeRet(before,after,action){
    if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length||!before.length)
      return {learned:false,reason:'non-retina'};
    const old=before.indexOf(3),now=after.indexOf(3);
    if(old<0||now<0)return {learned:false,reason:'self-not-observable'};
    const changed=old!==now,goal=before.indexOf(2),n=Math.sqrt(before.length);
    let progress=null,terminal=false;
    if(Number.isInteger(n)&&goal>=0){
      const dist=p=>Math.abs(p%n-goal%n)+Math.abs(Math.floor(p/n)-Math.floor(goal/n));
      progress=clip(dist(old)-dist(now),-1,1);
      terminal=changed&&now===goal;
    }
    return this.observe({world:'maze',action:'move',changed,blocked:!changed,
      progress,terminal,support:1,uncertainty:0,novelty:1,
      source:'observed-action'});
  }
  observeBlindMaze({action,moved,progress=0,terminal=false,uncertainty=0}={}){
    if(typeof moved!=='boolean')return {learned:false,reason:'missing-action-result'};
    return this.observe({world:'maze',action:'move',changed:moved,blocked:!moved,
      progress,terminal,support:1-uncertainty,uncertainty,novelty:1,
      source:'observed-blind-action'});
  }
  observeTextEdit({before,after,action}={}){
    if(!Array.isArray(before)||!Array.isArray(after)||!action||!TYPES.has(action.kind)||
      !['insert','replace','delete'].includes(action.kind))return {learned:false,reason:'not-observed-edit'};
    const a=before.join('\u001f'),b=after.join('\u001f');
    if(a===b)return {learned:false,reason:'no-effect'};
    return this.observe({world:'text',action,changed:true,
      progress:null,terminal:false,support:1,novelty:1,uncertainty:0,
      source:'observed-corpus-difference'});
  }
  report({top=48}={}){
    const data=[...this.nodes].slice(0,top).map(([id,x])=>({id,...x}));
    const edges=[...this.edges].slice(0,top*3).map(([id,count])=>{
      const sep=id.indexOf('>');return {from:id.slice(0,sep),to:id.slice(sep+1),count};
    });
    const rules=[...this.rules].map(([id,r])=>({id,seen:r.seen,changed:r.changed,
      blocked:r.blocked,progress:r.progress,terminal:r.terminal,worlds:{...r.worlds}}));
    return {version:this.version,observed:{...this.byWorld},updates:this.updates,
      policy:this.weights.map(x=>Number(x.toFixed(6))),rules,nodes:data,edges,
      structuralNodes:this.nodes.size,structuralEdges:this.edges.size,
      predictedOutcomeAccuracy:this.predictions?this.hits/this.predictions:null,
      last:this.last,rawPhraseNodes:0,semanticReasoningVerified:false,
      languageCausalGeneralizationVerified:false};
  }
}
