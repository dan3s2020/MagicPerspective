// MagicPerspective research: a COMPLETE 4D world atlas reconstructed from
// fragmented causal observations. Standalone, not the production V17 Brain.
// No oracle transition function is imported or accessed by the learner.
export const SIDE=4, DIMS=4, STATES=SIDE**DIMS;
export const ACTIONS=['fold','echo','lift','drift','phase','curl','arc','sweep'];
export const encode=p=>p.reduce((v,x)=>v*SIDE+x,0);
export const decode=s=>{const p=Array(DIMS);for(let i=DIMS-1;i>=0;i--){p[i]=s%SIDE;s=Math.floor(s/SIDE)}return p;};
export const seeded=seed=>{let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}};
const deltaCode=d=>d.join(',');
const transitionKey=(s,a)=>s+':'+a;
export const move=(state,delta)=>encode(decode(state).map((v,d)=>(v+delta[d]+SIDE)%SIDE));
export const normDelta=(from,to)=>decode(to).map((v,d)=>(v-decode(from)[d]+SIDE)%SIDE);
const chooseMode=(samples)=>{const tally=new Map();for(const x of samples)tally.set(x,(tally.get(x)||0)+1);return [...tally].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;};

export class CausalAtlas4D {
  constructor(){this.events=[];this.model=new Map();this.exact=new Map();this.worlds=new Map();this.version=1;}
  observe({world,from,action,to,id}){
    if(!Number.isInteger(from)||from<0||from>=STATES||!Number.isInteger(to)||to<0||to>=STATES||!ACTIONS.includes(action))throw Error('invalid transition observation');
    const e={id:id??this.events.length,world,from,action,to,delta:deltaCode(normDelta(from,to))};
    this.events.push(e);this.worlds.set(world,(this.worlds.get(world)||0)+1);
    let row=this.exact.get(transitionKey(from,action));if(!row){row=[];this.exact.set(transitionKey(from,action),row);}row.push(e);
  }
  fit(){
    this.model.clear();
    for(const action of ACTIONS){
      const events=this.events.filter(x=>x.action===action),candidates=[];
      if(!events.length){this.model.set(action,{ready:false,reason:'action-never-observed',candidates:[]});continue;}
      const constant=chooseMode(events.map(x=>x.delta));
      candidates.push({kind:'fixed',axis:null,classes:[constant],errors:events.filter(x=>x.delta!==constant).length});
      for(let axis=0;axis<DIMS;axis++){
        const groups=[[],[]];for(const e of events)groups[decode(e.from)[axis]%2].push(e.delta);
        if(groups.some(x=>x.length===0))continue;
        const classes=groups.map(chooseMode);
        const errors=events.filter(e=>e.delta!==classes[decode(e.from)[axis]%2]).length;
        candidates.push({kind:'conditional',axis,classes,errors});
      }
      candidates.sort((a,b)=>a.errors-b.errors||+(a.kind==='conditional')-+(b.kind==='conditional')||(a.axis??-1)-(b.axis??-1));
      const selected=candidates[0], runner=candidates[1];
      this.model.set(action,{ready:!!selected,kind:selected.kind,axis:selected.axis,classes:selected.classes,
        errors:selected.errors,support:events.length,confidence:1-selected.errors/events.length,
        margin:(runner?.errors??events.length)-selected.errors,
        candidates:candidates.map(c=>({...c})),
        eventIds:events.map(e=>e.id),worlds:[...new Set(events.map(e=>e.world))]});
    }
    return this;
  }
  predict(from,action){
    const model=this.model.get(action);
    if(!model?.ready)return {known:false,reason:model?.reason||'unfitted-action',action,from};
    const code=model.classes[model.kind==='fixed'?0:decode(from)[model.axis]%2];
    if(!code)return {known:false,reason:'missing-conditional-class',action,from};
    const delta=code.split(',').map(Number),to=move(from,delta),direct=this.exact.get(transitionKey(from,action))||[];
    return {known:true,from,to,action,delta,mode:model.kind,contextAxis:model.axis,
      source:direct.some(e=>e.to===to)?'directly-observed':'inferred-from-other-worlds',
      evidenceIds:direct.filter(e=>e.to===to).map(e=>e.id),modelEvidenceCount:model.support,
      modelWorlds:model.worlds,confidence:model.confidence,alternativeRules:model.candidates.slice(1,4).map(c=>({kind:c.kind,axis:c.axis,errors:c.errors}))};
  }
  completeAtlas(blocked=null){
    if(ACTIONS.some(a=>!this.model.get(a)?.ready))throw Error('cannot complete atlas: some actions unobserved');
    const edges=[];for(let s=0;s<STATES;s++)for(const a of ACTIONS){const e=this.predict(s,a);edges.push({...e,traversable:!blocked||!!blocked[e.to],blockReason:blocked&&!blocked[e.to]?'wall':null});}
    return {dimensions:DIMS,side:SIDE,states:STATES,possibleEdges:edges.length,edges,
      observedExact:edges.filter(e=>e.source==='directly-observed').length,
      inferred:edges.filter(e=>e.source==='inferred-from-other-worlds').length,
      transforms:[...this.model].map(([action,m])=>({action,kind:m.kind,axis:m.axis,classes:m.classes,support:m.support,errors:m.errors,confidence:m.confidence,evidenceWorlds:m.worlds}))};
  }
  route(start,goal,passable,{rank=4,maximum=STATES}={}){
    if(!passable||passable.length!==STATES)throw Error('complete maze map of 256 cells REQUIRED');
    if(!passable[start]||!passable[goal])return {found:false,reason:'start-or-goal-blocked',trace:[],frontier:[]};
    const q=[start],seen=new Uint8Array(STATES),prev=new Array(STATES),frontier=[];seen[start]=1;
    for(let head=0;head<q.length&&head<maximum;head++){
      const s=q[head];if(s===goal)break;
      for(const action of ACTIONS){const predicted=this.predict(s,action);
        if(!predicted.known){frontier.push({at:s,action,reason:predicted.reason});continue;}
        if(rank<4&&predicted.delta.slice(rank).some(x=>x!==0)){frontier.push({at:s,action,reason:'axis-hidden-by-ablation'});continue;}
        const to=predicted.to;
        if(!passable[to]){frontier.push({at:s,action,to,reason:'wall'});continue;}
        if(seen[to])continue;
        seen[to]=1;prev[to]={from:s,edge:predicted};q.push(to);
      }
    }
    if(!seen[goal])return {found:false,reason:'no-route-in-learned-atlas',trace:[],frontier,visited:q.length};
    const trace=[];for(let s=goal;s!==start;s=prev[s].from)trace.push(prev[s].edge);
    trace.reverse();return {found:true,trace,frontier,visited:q.length,shape:trace.map(e=>e.action),length:trace.length,preAction:true};
  }
  snapshot(){return {version:this.version,events:this.events.map(e=>({world:e.world,from:e.from,action:e.action,to:e.to,id:e.id}))};}
  static restore(obj){if(obj?.version!==1||!Array.isArray(obj.events))throw Error('bad atlas checkpoint');let a=new CausalAtlas4D();for(const e of obj.events)a.observe(e);return a.fit();}
}
