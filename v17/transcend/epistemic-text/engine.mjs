// Isolated research-only text trainer: next-byte prediction with NO oracle access to the next byte.
// A = independent bit cells, B = nested local/context predictors,
// C = adaptive acquisition + generated, validation-selected context perspectives.
export const TEXT_SCHEMA="octopus-epistemic-text-v1";
const TRAIN=[
"the red cat runs. the blue dog sleeps. the small bird sings.",
"the blue cat sleeps. the red dog runs. the small fox jumps.",
"a quiet river flows. a bright moon shines. a green tree grows.",
"the small cat jumps. the green bird sings. a blue fox runs.",
"a bright bird sings. a quiet dog sleeps. a red fox jumps.",
"the green cat runs. a small moon shines. a quiet tree grows.",
"the bright cat sleeps. a green river flows. the red bird sings.",
"a small dog jumps. a blue river flows. a quiet fox sleeps."
];
const HELD=[
"the quiet cat runs. a bright river flows. the blue bird sings.",
"the green dog sleeps. a small tree grows. the red fox jumps."
];
const bytes=s=>Array.from(s,c=>c.charCodeAt(0));
const sequence=lines=>bytes(lines.join("\n")+"\n");
const context=(data,i)=>Array.from({length:4},(_,j)=>data[(i-j-1+data.length)%data.length]);
const txt=a=>a.map(x=>String.fromCharCode(x)).join("");
const rate=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export function splitCorpus(s){
 if(typeof s!=="string"||s.length<100||s.length>100000||!(/^[\x09\x0a\x0d\x20-\x7e]+$/).test(s))
   throw Error("Paste 100..100000 ASCII characters. UTF-8 is not enabled in this test.");
 const lines=s.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>=16);
 if(lines.length<5)throw Error("At least five substantial lines are required for separate held-out lines");
 const train=[],held=[];lines.forEach((v,i)=>(i%5===4?held:train).push(v));
 return {train,held};
}
class BitCells{
 constructor(){this.table=Array.from({length:8},()=>[[1,1],[1,1]]);this.updates=0;}
 predict(ctx){let result=0;for(let i=0;i<8;i++){
   const counts=this.table[i][(ctx[0]>>i)&1];if(counts[1]>counts[0])result|=1<<i;
 }return result;}
 update(ctx,y){for(let i=0;i<8;i++)this.table[i][(ctx[0]>>i)&1][(y>>i)&1]++;this.updates++;}
 serialize(){return{table:this.table,updates:this.updates};}
 static restore(s){const r=new BitCells();r.table=s.table;r.updates=s.updates;return r;}
}
class Counter{
 constructor(){this.entries=new Map();this.total=Array(128).fill(0);this.updates=0;}
 prior(){let k=32,b=0;for(let i=0;i<128;i++)if(this.total[i]>b){b=this.total[i];k=i;}return k;}
 predict(key,fallback=this.prior(),minimum=2){
   const row=this.entries.get(key);if(!row||row.n<minimum)return fallback;
   let k=fallback,b=-1;for(let i=0;i<128;i++)if(row.val[i]>b){b=row.val[i];k=i;}return k;
 }
 update(key,y){let row=this.entries.get(key);
   if(!row){row={n:0,val:Array(128).fill(0)};this.entries.set(key,row);}
   row.val[y]++;row.n++;this.total[y]++;this.updates++;
 }
 serialize(){return{entries:[...this.entries],total:this.total,updates:this.updates};}
 static restore(s){const c=new Counter();c.entries=new Map(s.entries);c.total=s.total;c.updates=s.updates;return c;}
}
export class HierarchicalText{
 constructor(){this.cells=new BitCells();this.local=new Counter();this.higher=new Counter();this.updates=0;}
 predict(ctx,{ablate=false}={}){
   const fallback=this.cells.predict(ctx);
   if(!ablate){const k=txt(ctx.slice(0,2)),r=this.higher.entries.get(k);
     if(r?.n>=3)return this.higher.predict(k,fallback,3);
   }
   return this.local.predict(txt(ctx.slice(0,1)),fallback,3);
 }
 update(ctx,y){this.cells.update(ctx,y);this.local.update(txt(ctx.slice(0,1)),y);
   this.higher.update(txt(ctx.slice(0,2)),y);this.updates++;}
 serialize(){return{cells:this.cells.serialize(),local:this.local.serialize(),
   higher:this.higher.serialize(),updates:this.updates};}
 static restore(s){const b=new HierarchicalText();b.cells=BitCells.restore(s.cells);
   b.local=Counter.restore(s.local);b.higher=Counter.restore(s.higher);b.updates=s.updates;return b;}
}
const category=n=>n===32?"space":n===10?"line":n>=48&&n<=57?"num":
 n>=65&&n<=90?"upper":n>=97&&n<=122?"lower":"other";
const feature=(n,kind)=>kind==="class"?category(n):kind==="fold"?
 String.fromCharCode(n>=65&&n<=90?n+32:n):String.fromCharCode(n);
export function candidates(lag){const a=[];for(let mask=1;mask<(1<<lag);mask++)
 for(const kind of ["exact","fold","class"])a.push({mask,kind,id:kind+":"+mask});
 return a;}
const key=(ctx,p)=>{const out=[];for(let i=0;i<4;i++)if(p.mask&(1<<i))
 out.push(feature(ctx[i],p.kind));return out.join("|");};
export class EpistemicText{
 constructor(){
   this.maxLag=1;this.wallet=200;this.cost=0;this.models={};this.base=new Counter();
   this.active="exact:1";this.episodes=0;this.validation=[];this.events=[];
   this.discoveries=[];this.recent=[];this.meta={probes:0,reframes:0,promotions:0};
 }
 model(p){return this.models[p.id]||(this.models[p.id]=new Counter());}
 predictCandidate(ctx,p){const m=this.models[p.id];
   return m?m.predict(key(ctx,p),this.base.prior(),2):this.base.prior();}
 predict(ctx,{ablate=false}={}){
   const id=ablate?"class:1":this.active;
   const p=candidates(this.maxLag).find(x=>x.id===id)||candidates(this.maxLag)[0];
   return this.predictCandidate(ctx,p);
 }
 observe(ctx,y){
   this.episodes++;
   // Only purchased past positions are exposed. Probing does not rewrite old experiences.
   const observed=ctx.slice(0,this.maxLag).concat(Array(4-this.maxLag).fill(-1));
   const programs=candidates(this.maxLag);
   const predictions=programs.map(p=>({id:p.id,value:this.predictCandidate(observed,p)}));
   const predicted=this.predict(observed),correct=predicted===y;
   this.recent.push(Number(correct));if(this.recent.length>100)this.recent.shift();
   if(this.episodes%7===0){
     this.validation.push({predictions,y});if(this.validation.length>100)this.validation.shift();
   }else{
     this.base.update("*",y);
     for(const p of programs)this.model(p).update(key(observed,p),y);
   }
   if(this.episodes%112===0&&this.maxLag<4){
     const before=this.maxLag;this.maxLag++;this.cost+=1;this.wallet-=1;this.meta.probes++;
     this.events.push({episode:this.episodes,type:"new-observation",before,after:this.maxLag});
     this.validation=[];
   }
   if(this.episodes%28===0)this.reframe();
   if(this.events.length>40)this.events.shift();
   return {predicted,correct,visible:observed,active:this.active};
 }
 reframe(){
   if(this.validation.length<8)return;
   this.meta.reframes++;
   const scores=candidates(this.maxLag).map(p=>{
     const compatible=this.validation.filter(x=>x.predictions.some(v=>v.id===p.id));
     const acc=rate(compatible.map(x=>Number(x.predictions.find(z=>z.id===p.id).value===x.y)));
     return {p,acc,score:acc-.003*p.mask.toString(2).replaceAll("0","").length};
   });
   scores.sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
   const best=scores[0],old=scores.find(s=>s.p.id===this.active);
   if(best.p.id!==this.active&&best.score>(old?.score??0)+.018&&best.acc>=.2){
     const event={episode:this.episodes,type:"perspective-promoted",from:this.active,to:best.p.id,
       validationBefore:old?.acc??null,validationAfter:best.acc,
       note:"Internal validation only, not external heldout"};
     this.active=best.p.id;this.discoveries.push(event);this.events.push(event);this.meta.promotions++;
   }
 }
 snapshot(){return{episodes:this.episodes,representation:this.active,lag:this.maxLag,
   candidateCount:candidates(this.maxLag).length,
   successLast100:rate(this.recent),wallet:this.wallet,cost:this.cost,meta:this.meta,
   discoveries:this.discoveries.slice(-10),events:this.events.slice(-12)};}
 serialize(){return{maxLag:this.maxLag,wallet:this.wallet,cost:this.cost,
   models:Object.entries(this.models).map(([k,v])=>[k,v.serialize()]),
   base:this.base.serialize(),active:this.active,episodes:this.episodes,
   validation:this.validation,events:this.events,discoveries:this.discoveries,
   recent:this.recent,meta:this.meta};}
 static restore(s){const c=new EpistemicText();c.models=Object.fromEntries(
   s.models.map(([k,v])=>[k,Counter.restore(v)]));c.base=Counter.restore(s.base);
   for(const k of ["maxLag","wallet","cost","active","episodes","validation",
     "events","discoveries","recent","meta"])c[k]=s[k];
   if(c.maxLag<1||c.maxLag>4||!c.active||c.episodes<0)throw Error("Bad C state");
   return c;}
}
export class TextExperiment{
 constructor({seed=20261030,corpus=null}={}){
   this.seed=seed;this.corpus=corpus||{train:TRAIN,held:HELD};
   this.training=sequence(this.corpus.train);this.holdout=sequence(this.corpus.held);
   this.a=new BitCells();this.b=new HierarchicalText();this.c=new EpistemicText();
   this.episodes=0;this.cursor=4;this.recent={A:[],B:[],C:[]};
   this.traces=[];this.curves=[];this.last=null;
 }
 step(n=1){
   if(!Number.isInteger(n)||n<1||n>5000)throw Error("Bad step count");
   for(let t=0;t<n;t++){
     const idx=this.cursor%this.training.length,ctx=context(this.training,idx),y=this.training[idx];
     const A=this.a.predict(ctx),B=this.b.predict(ctx),C=this.c.predict(ctx);
     const trace={episode:this.episodes+1,context:txt([...ctx].reverse()),actual:y,
       outputs:{A,B,C},correct:{A:A===y,B:B===y,C:C===y},representation:this.c.active};
     this.a.update(ctx,y);this.b.update(ctx,y);this.c.observe(ctx,y);
     this.episodes++;this.cursor++;this.last=trace;this.traces.push(trace);
     if(this.traces.length>80)this.traces.shift();
     for(const id of ["A","B","C"]){this.recent[id].push(Number(trace.correct[id]));
       if(this.recent[id].length>100)this.recent[id].shift();}
     if(this.episodes%100===0){this.curves.push({episode:this.episodes,
       A:rate(this.recent.A),B:rate(this.recent.B),C:rate(this.recent.C)});
       if(this.curves.length>250)this.curves.shift();}
   }
   return this.snapshot();
 }
 evaluate(limit=300){
   if(!Number.isInteger(limit)||limit<1||limit>2000)throw Error("Bad evaluation size");
   const hits={A:0,B:0,C:0,CWithoutRepresentation:0,BWithoutHigherSelf:0};
   let n=0;for(let i=4;i<this.holdout.length&&n<limit;i++,n++){
     const ctx=context(this.holdout,i),y=this.holdout[i];
     hits.A+=Number(this.a.predict(ctx)===y);hits.B+=Number(this.b.predict(ctx)===y);
     hits.C+=Number(this.c.predict(ctx)===y);
     hits.BWithoutHigherSelf+=Number(this.b.predict(ctx,{ablate:true})===y);
     hits.CWithoutRepresentation+=Number(this.c.predict(ctx,{ablate:true})===y);
   }
   return {heldout:true,frozen:true,samples:n,
     accuracy:Object.fromEntries(Object.entries(hits).map(([k,v])=>[k,v/n])),
     note:"Different sentences, shared language and vocabulary; no unseen-language claim."};
 }
 setCorpus(raw){this.corpus=splitCorpus(raw);this.training=sequence(this.corpus.train);
   this.holdout=sequence(this.corpus.held);this.cursor=4;this.recent={A:[],B:[],C:[]};
   this.traces=[];this.curves=[];this.last=null; // preserve learned weights
 }
 snapshot(){return{schema:TEXT_SCHEMA,episodes:this.episodes,seed:this.seed,
   A:rate(this.recent.A),B:rate(this.recent.B),C:rate(this.recent.C),
   c:this.c.snapshot(),last:this.last,traces:this.traces.slice(-60),
   curves:this.curves.slice(-200),trainingCharacters:this.training.length,
   heldoutCharacters:this.holdout.length,trainingLines:this.corpus.train.length,
   heldoutLines:this.corpus.held.length};}
 serialize(){return{schema:TEXT_SCHEMA,seed:this.seed,corpus:this.corpus,
   a:this.a.serialize(),b:this.b.serialize(),c:this.c.serialize(),
   episodes:this.episodes,cursor:this.cursor,recent:this.recent,traces:this.traces,
   curves:this.curves,last:this.last};}
 static restore(s){
   if(s?.schema!==TEXT_SCHEMA||!Number.isSafeInteger(s.episodes)||s.episodes<0)
     throw Error("Bad text checkpoint");
   const e=new TextExperiment({seed:s.seed,corpus:s.corpus});e.a=BitCells.restore(s.a);
   e.b=HierarchicalText.restore(s.b);e.c=EpistemicText.restore(s.c);
   for(const k of ["episodes","cursor","recent","traces","curves","last"])e[k]=s[k];
   if(e.c.episodes!==e.episodes||e.a.updates!==e.episodes||e.b.updates!==e.episodes)
     throw Error("Corrupt training counters");
   return e;
 }
}
