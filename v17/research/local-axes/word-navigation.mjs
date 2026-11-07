// Combines two genuine learned parts: native ConstructedTransitionGraph evidence
// of locally measured node frame transports and a learned vocabulary of unknown
// action WORDS. Both components are required to execute a pre-action symbolic
// goal-path in an unseen spatial configuration. Not general natural-language AI.
import {ConstructedTransitionGraph} from "../../transcend/torus-aether/worlds/constructed-paths.mjs";
import {apply,inverse,seeded,identity} from "./transport.mjs";

export function secretWords(D,seed=7){
 const words=["zen","ori","vek","sim","nul","ki","aro","lum","rav","pe","sot","eni","dax","sol","mer","val","tor","xen","iva","nop","zai","fir","elo","ren"];
 if(D>11)throw Error("Too many words");
 const out=words.slice(0,2*D),random=seeded(seed);
 for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 const commands=Array.from({length:2*D},(_,i)=>i<D?i+1:-(i-D+1));
 return new Map(out.map((word,i)=>[word,commands[i]]));
}
export const displacement=(w,u,v)=>{
 const differences=w.coords[u].map((x,i)=>w.coords[v][i]-x);
 const i=differences.findIndex(x=>x!==0);
 if(i<0||differences.filter(x=>x!==0).length!==1||Math.abs(differences[i])!==1)throw Error("Not a single observed transition");
 return Math.sign(differences[i])*(i+1);
};
export function physicalWordStep(world,hiddenWords,u,word){
 const local=hiddenWords.get(word);
 if(!local)throw Error("Unknown physical word");
 const global=apply(world.frames[u],local),axis=Math.abs(global)-1;
 const coordinate=world.coords[u][axis]+Math.sign(global);
 if(coordinate<0||coordinate>=world.side)return {from:u,to:u,blocked:true};
 const v=u+Math.sign(global)*world.powers[axis];
 return {from:u,to:world.adj[u].includes(v)?v:u,
   blocked:!world.adj[u].includes(v),physicalGlobalAction:global};
}
export class WordDrivenNavigator{
 constructor(frameModel,words){
   this.frameModel=frameModel;this.words=words.slice();
   this.w=frameModel.w;this.D=this.w.D;
   this.observations=new ConstructedTransitionGraph({maxStates:words.length+5});
   this.dictionary=new Map();
 }
 observeWord(from,word,to){
   if(!this.words.includes(word))throw Error("Unknown word vocabulary");
   if(!this.frameModel.inferred)this.frameModel.infer();
   const frame=this.frameModel.inferred[from];
   if(!frame)return false;
   const global=displacement(this.w,from,to);
   const local=apply(inverse(frame),global);
   this.observations.observe("word:"+word,"interpret","local:"+local);
   return true;
 }
 learnWords({minConfidence=.65}={}){
   const report=[];
   this.dictionary.clear();
   for(const word of this.words){
     const list=this.observations.choices("word:"+word);
     const evidence=list.find(x=>x.action==="interpret");
     const winner=evidence?.successors?.[0];
     const total=evidence?.total||0,confidence=winner?winner.seen/total:0;
     const local=winner?+winner.to.slice(6):null;
     const accepted=total>=1&&confidence>=minConfidence;
     if(accepted)this.dictionary.set(word,local);
     report.push({word,count:total,confidence,accepted});
   }
   return {knownWords:this.dictionary.size,totalWords:this.words.length,report};
 }
 textPlan(text,{ablation="none"}={}){
   // Input grammar is intentionally SMALL and explicit; the action semantics,
   // by contrast, are inferred from physical world outcomes.
   const match=String(text).match(/^\s*from\s*\(([\d,\s]+)\)\s*to\s*\(([\d,\s]+)\)\s*$/i);
   if(!match)return {ready:false,reason:"unsupported-goal-grammar"};
   const parse=s=>s.split(",").map(x=>+x.trim());
   const a=parse(match[1]),b=parse(match[2]);
   if(a.length!==this.D||b.length!==this.D)return {ready:false,reason:"wrong-dimensions"};
   const locate=pos=>this.w.coords.findIndex(c=>c.every((x,i)=>x===pos[i]));
   const start=locate(a),goal=locate(b);
   if(start<0||goal<0)return {ready:false,reason:"coordinates-out-of-world"};
   const path=this.frameModel.predictShape(start,goal,{ablation});
   if(!path.ready)return {...path,ready:false};
   const inverseWords=new Map([...this.dictionary].map(([word,axis])=>[axis,word]));
   const words=path.actions.map(action=>inverseWords.get(action)||null);
   return {...path,text,words,ready:words.every(Boolean),preaction:true,
     knownWords:this.dictionary.size,reason:words.every(Boolean)?null:"missing-learned-word-meaning"};
 }
}
export function executeTextRoute(world,hiddenWordMap,plan,{record=false}={}){
 if(!plan.ready)return {solved:false,exact:false,actions:0};
 let current=plan.start,correct=0;
 const events=[];
 for(let i=0;i<plan.words.length;i++){
   const before=current,actionWord=plan.words[i],moved=physicalWordStep(world,hiddenWordMap,current,actionWord);
   current=moved.to;correct+=+(current===plan.nodes[i+1]);
   if(record)events.push({step:i+1,before,word:actionWord,predictedState:plan.nodes[i+1],
     actualState:current,correct:current===plan.nodes[i+1],globalAction:moved.physicalGlobalAction||null});
 }
 return {solved:correct===plan.words.length&&current===plan.goal,
   exact:correct===plan.words.length,actions:plan.words.length,correct,final:current,
   trace:record?events:undefined};
}
export function observeWords(world,wordNav,hiddenWords,{repeats=1,noise=0,seed=177}={}){
 const rng=seeded(seed);
 const observed=[];
 for(const word of hiddenWords.keys()){
   let successful=0,attempts=0;
   while(successful<repeats&&attempts++<repeats*world.size*10){
     // Observe genuine legal transitions at varied training locations.
     const u=Math.floor(rng()*world.size),r=physicalWordStep(world,hiddenWords,u,word);
     if(r.blocked)continue;
     let v=r.to;
     if(rng()<noise){
       const other=world.adj[u][Math.floor(rng()*world.adj[u].length)];
       v=other;
     }
     if(wordNav.observeWord(u,word,v)){successful++;observed.push({u,word,v});}
   }
   if(successful<repeats)throw Error("Insufficient observable word actions");
 }
 return observed;
}
