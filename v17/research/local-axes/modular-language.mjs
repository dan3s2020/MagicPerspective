// Experimental math language: infer symbolic ACTION TRANSFORMS from observed data,
// then predict a complete multi-step solution shape BEFORE executing an unseen goal.
// Unknown words correspond to actual arithmetic actions over Z_p. This is a
// constrained mathematical language, NOT unconstrained natural language or LLM.
// Original V17 ConstructedTransitionGraph is used as observed-action evidence.
import {ConstructedTransitionGraph} from "../../transcend/torus-aether/worlds/constructed-paths.mjs";
import {seeded} from "./transport.mjs";

export const mod=(x,p)=>((x%p)+p)%p;
export function inverseMod(x,p){
  const a=mod(x,p);
  for(let k=1;k<p;k++)if(mod(a*k,p)===1)return k;
  return null;
}
export const evaluate=(rule,x,p)=>mod(rule.a*x+rule.b,p);
export function generateHiddenWorld({p=101,seed=2026}={}){
  if(p!==101)throw Error("Research test requires the prime field Z_101");
  const rand=seeded(seed);
  const names=["or","ka","li","ve"];
  const hidden=[{a:1,b:1},{a:1,b:-1},{a:2,b:0},{a:inverseMod(2,p),b:0}];
  for(let i=names.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  return {p,actions:names,hidden:new Map(names.map((a,i)=>[a,hidden[i]]))};
}
export function observeWorld(w,model,{perAction=16,noise=0,seed=819}={}){
  const rng=seeded(seed),sampled=new Set();
  // Use the SAME x for all unknown operators, held-out start x are excluded.
  const visited=new Set();while(visited.size<perAction)visited.add(Math.floor(rng()*w.p));
  for(const x of visited)sampled.add(x);
  for(const action of w.actions)for(const x of visited){
    const correct=evaluate(w.hidden.get(action),x,w.p);
    const y=rng()<noise?Math.floor(rng()*w.p):correct;
    model.observe(x,action,y);
  }
  return sampled;
}
export class ObservedMathNavigator{
  constructor({p=101,actions=[]}={}){
    this.p=p;this.actions=actions.slice();
    this.evidence=new ConstructedTransitionGraph({maxStates:p*2});
    this.rows=new Map(actions.map(a=>[a,[]]));
    this.rules=new Map();
  }
  observe(x,word,y){
    if(!this.rows.has(word))throw Error("Unknown training action symbol");
    this.rows.get(word).push({x:mod(x,this.p),y:mod(y,this.p)});
    this.evidence.observe("state:"+x,"word:"+word,"state:"+y);
  }
  infer({minFraction=.55}={}){
    this.rules.clear();
    const reports=[];
    for(const [word,rows] of this.rows){
      let best=null,hits=-1;
      // Exhaustively infer an affine action using two DIFFERENT observed inputs,
      // score it against ALL examples; mathematically no oracle coefficients.
      for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
        const dx=mod(rows[j].x-rows[i].x,this.p),inv=inverseMod(dx,this.p);
        if(inv===null)continue;
        const a=mod((rows[j].y-rows[i].y)*inv,this.p);
        const b=mod(rows[i].y-a*rows[i].x,this.p);
        const correct=rows.reduce((n,r)=>n+(evaluate({a,b},r.x,this.p)===r.y),0);
        if(correct>hits){best={a,b};hits=correct;}
      }
      const fit=rows.length?hits/rows.length:0,accepted=fit>=minFraction;
      if(accepted&&best)this.rules.set(word,best);
      reports.push({word,samples:rows.length,fit,accepted});
    }
    return {rules:this.rules.size,allRules:this.actions.length,reports};
  }
  shape(start,goal){
    const p=this.p,a=mod(start,p),target=mod(goal,p);
    const parent=Array(p).fill(-1),moves=Array(p).fill(null),queue=[a];
    parent[a]=a;
    for(let i=0;i<queue.length&&parent[target]===-1;i++){
      const x=queue[i];
      for(const word of this.actions){
        const formula=this.rules.get(word);if(!formula)continue;
        const y=evaluate(formula,x,p);
        if(parent[y]!==-1)continue;
        parent[y]=x;moves[y]=word;queue.push(y);
        if(y===target)break;
      }
    }
    if(parent[target]===-1)return {ready:false,start:a,goal:target,nodes:[a],actions:[],
      preaction:true,reason:"no-learned-route"};
    const nodes=[target],words=[];
    while(nodes.at(-1)!==a){const x=nodes.at(-1);words.push(moves[x]);nodes.push(parent[x]);}
    nodes.reverse();words.reverse();
    return {ready:true,start:a,goal:target,nodes,actions:words,
      preaction:true,executable:true,learnedOperators:this.rules.size,
      evidence:this.evidence.observations};
  }
  parseAndPlan(prompt){
    const match=String(prompt).match(/^\s*(?:from|de la)\s+(\d+)\s+(?:to|la)\s+(\d+)\s*$/i);
    if(!match)return {ready:false,reason:"unsupported mathematical-language grammar"};
    return {...this.shape(+match[1],+match[2]),prompt};
  }
}
export function executeWorld(w,plan,{trace=false}={}){
  if(!plan.ready)return {solved:false,exact:false,steps:0};
  let current=plan.start,matched=0;
  const events=[];
  for(let i=0;i<plan.actions.length;i++){
    const action=plan.actions[i],trueRule=w.hidden.get(action),before=current;
    if(!trueRule)throw Error("Unknown physical action");
    current=evaluate(trueRule,current,w.p);
    matched+=+(current===plan.nodes[i+1]);
    if(trace)events.push({step:i+1,before,action,predicted:plan.nodes[i+1],real:current,
      predictionMatches:current===plan.nodes[i+1]});
  }
  return {solved:current===plan.goal&&matched===plan.actions.length,
    exact:matched===plan.actions.length,steps:plan.actions.length,
    final:current,events:trace?events:undefined};
}
