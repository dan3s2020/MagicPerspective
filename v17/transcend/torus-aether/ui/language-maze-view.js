// Real original MagicPerspective V17 learner -> 5D projection / route replay.
// The topology, initial predicted path and body outcomes come exclusively from
// the ORIGINAL Brain's /language-maze and /graph endpoints. The renderer never
// invents paths, "quantum" computations, correct answers or model updates.
const $=id=>document.getElementById(id);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const safeNum=n=>finite(n)?n:0;
const fmt=n=>finite(n)?n.toLocaleString("ro-RO",{maximumFractionDigits:2}):"—";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const tok=s=>String(s||"").match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu)||[];
const colors={
  edge:"rgba(104,151,184,.35)",observed:"#6ed5ca",unknown:"#6a7c90",
  gold:"#ffbf43",body:"#59aaff",deviation:"#ff527a",goal:"#69df9c",txt:"#d4e9fb"
};
function uniq(arr){return [...new Set(arr)];}
function measuredWorld(episode,snapshot){
 const nodes=new Map(),edges=[],edgeSeen=new Set();
 const add=(name,{observed=false,role="candidate",depth=0}={})=>{
  if(!name||typeof name!=="string")return;
  const prev=nodes.get(name);
  if(prev){prev.observed=prev.observed||observed;
    if(role==="goal"||role==="origin")prev.role=role;return;}
  nodes.set(name,{id:name,label:name,observed,role,depth});
 };
 const edge=(from,to,{kind="learned",support=0,observed=false}={})=>{
  if(!from||!to)return;
  add(from);add(to);
  const key=from+"→"+to;
  if(edgeSeen.has(key))return;
  edgeSeen.add(key);
  edges.push({from,to,kind,support,observed});
 };
 const ops=snapshot?.observedTransformations?.topOperators||[];
 if(episode?.search?.nodes){
  for(const n of episode.search.nodes)add(n.id,{
   observed:n.observed,role:n.role,depth:n.depth});
  for(const e of episode.search.edges||[])edge(e.from,e.to,{kind:e.kind,
   support:e.observedSupport,observed:e.allowed!==false});
 }
 // Live observation graph is displayed WITHOUT a solution target if the user
 // has not asked the organism to anticipate one.
 for(const op of ops.slice(0,24))for(const ex of op.examples||[])
  edge(ex.from,ex.to,{kind:op.kind,support:op.observedSupport,observed:true});
 if(episode?.initialShape){
  const P=episode.initialShape;
  for(let i=0;i<P.length;i++)add(P[i],{role:i===0?"origin":i===P.length-1?"goal":"shape"});
  for(let i=1;i<P.length;i++)edge(P[i-1],P[i],{kind:"global-plan"});
 }
 for(const f of episode?.body?.frames||[]){
  if(f.before&&f.after)edge(f.before,f.after,{kind:"body-choice",
   support:f.chosen?.observedSupport||0});
  for(const name of f.correctedShape||[])add(name,{role:"correction"});
  for(const a of f.alternatives||[])add(a.state,{role:"alternative"});
  if(f.plannedNext)add(f.plannedNext,{role:"shape"});
 }
 const root=episode?.start||null;
 if(root)add(root,{role:"origin",observed:true});
 if(episode?.predicted)add(episode.predicted,{role:"goal",
   observed:episode.unseen===false});
 // Bound background evidence. Priority: search, prediction and actual path.
 const priority=new Set([root,episode?.predicted,
  ...(episode?.initialShape||[]),
  ...(episode?.body?.frames||[]).flatMap(f=>[f.before,f.after])]);
 if(nodes.size>320)for(const k of nodes.keys()){
  if(nodes.size<=320)break;
  if(!priority.has(k))nodes.delete(k);
 }
 const keep=edges.filter(x=>nodes.has(x.from)&&nodes.has(x.to)).slice(0,850);
 return {nodes:[...nodes.values()],edges:keep};
}
function torusLocations(nodes,positions) {
 const map=new Map(Array.isArray(positions)?positions:[]);
 let knownNodes=0;
 const out=nodes.map(n=>{
  const chars=[...n.label],v=[];
  let hits=0;
  for(let d=0;d<5;d++){
   let re=0,im=0,count=0;
   for(const ch of chars){
    const q=map.get(ch.charCodeAt(0));
    if(!q||!finite(q[d]))continue;
    const angle=2*Math.PI*q[d];
    re+=Math.cos(angle);im+=Math.sin(angle);count++;
   }
   if(d===0)hits=count;
   v.push(count?Math.atan2(im,re)/Math.PI:null);
  }
  if(hits>=Math.max(2,chars.length*.32))knownNodes++;
  return v;
 });
 if(knownNodes<nodes.length*.65)return null;
 // This is an explicitly derived aggregate over genuine V17 learned symbol
 // phases. It is NOT an independently learned sentence-state embedding.
 return out.map(row=>row.map(x=>x??0));
}
// Genuine high-dimensional observed text-state feature geometry. PCA/MDS uses
// only the real text contents in the learner's search and observed sentences.
// No pseudo-random points. Five axes are mathematical projections, not
// hidden semantic axes invented for this interface.
function textPca(nodes){
 const n=nodes.length;
 if(n===0)return [];
 if(n===1)return [[0,0,0,0,0]];
 const sets=nodes.map(q=>{
  const terms=tok(q.label.toLowerCase());
  const out=new Map();
  for(const t of terms)out.set(t,(out.get(t)||0)+1);
  return out;
 });
 const df=new Map();
 for(const map of sets)for(const term of map.keys())df.set(term,(df.get(term)||0)+1);
 const rows=sets.map(m=>{
  const a=new Map();let length=0;
  for(const [term,count] of m){
   const weight=(1+Math.log(count))*Math.log((n+1)/(df.get(term)+1)+1);
   a.set(term,weight);length+=weight*weight;
  }
  const denom=Math.sqrt(length)||1;
  for(const [term,x] of a)a.set(term,x/denom);
  return a;
 });
 const K=Array.from({length:n},()=>new Float64Array(n));
 for(let i=0;i<n;i++)for(let j=i;j<n;j++){
  const [a,b]=rows[i].size<=rows[j].size?[rows[i],rows[j]]:[rows[j],rows[i]];
  let dot=0;
  for(const [term,w] of a)dot+=w*(b.get(term)||0);
  K[i][j]=dot;K[j][i]=dot;
 }
 const means=K.map(r=>r.reduce((a,b)=>a+b,0)/n);
 const grand=means.reduce((a,b)=>a+b,0)/n;
 for(let i=0;i<n;i++)for(let j=0;j<n;j++)K[i][j]-=means[i]+means[j]-grand;
 const axes=[],coords=Array.from({length:n},()=>[0,0,0,0,0]);
 for(let k=0;k<5;k++){
  let vec=Float64Array.from({length:n},(_,i)=>Math.cos((i+1)*(k+1)*1.173)+
    Math.sin((i+1)*(k+2)*.391));
  for(let iteration=0;iteration<31;iteration++){
   const next=new Float64Array(n);
   for(let i=0;i<n;i++)for(let j=0;j<n;j++)next[i]+=K[i][j]*vec[j];
   for(const previous of axes){
    let dot=0;for(let i=0;i<n;i++)dot+=next[i]*previous[i];
    for(let i=0;i<n;i++)next[i]-=dot*previous[i];
   }
   const norm=Math.hypot(...next);
   if(norm<1e-10)break;
   vec=next.map(x=>x/norm);
  }
  let eigen=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)eigen+=vec[i]*K[i][j]*vec[j];
  axes.push(vec);
  const scale=Math.sqrt(Math.max(0,eigen));
  for(let i=0;i<n;i++)coords[i][k]=vec[i]*scale;
 }
 return coords;
}
function normalizeCoords(coords){
 const n=coords.length;if(!n)return coords;
 const center=Array.from({length:5},(_,k)=>coords.reduce((a,x)=>a+(x[k]||0),0)/n);
 let max=0;
 for(const v of coords)for(let k=0;k<5;k++)max=Math.max(max,Math.abs((v[k]||0)-center[k]));
 const denom=Math.max(max,.00001);
 return coords.map(v=>v.map((x,k)=>((x||0)-center[k])/denom));
}
function line(ctx,a,b,col,width=1,dashed=false){
 ctx.strokeStyle=col;ctx.lineWidth=width;ctx.setLineDash(dashed?[6,5]:[]);
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 const ang=Math.atan2(b.y-a.y,b.x-a.x);
 const r=clamp(width*3,4,11);
 ctx.beginPath();ctx.moveTo(b.x,b.y);
 ctx.lineTo(b.x-r*Math.cos(ang-.47),b.y-r*Math.sin(ang-.47));
 ctx.lineTo(b.x-r*Math.cos(ang+.47),b.y-r*Math.sin(ang+.47));ctx.closePath();ctx.fillStyle=col;ctx.fill();
}
function label(ctx,s,x,y,color="#cbdfee",size=12,max=43) {
 ctx.font=size+"px ui-monospace,monospace";ctx.fillStyle=color;
 const text=String(s||"");ctx.fillText(text.length>max?text.slice(0,max-1)+"…":text,x,y);
}
export class LanguageMazeViewer {
 constructor(){
  this.canvas=$("languageMazeCv");this.ctx=this.canvas.getContext("2d");
  this.episode=null;this.snapshot=null;this.frame=0;this.playing=false;
  this.active=false;this.lastTick=0;this.zoom=1.0;
  this.angles={"01":-.20,"02":.14,"03":.12,"14":-.10,"34":.05};
  this.graph={nodes:[],edges:[]};this.coords=new Map();
  this.coordSource="fără stări";
  this.geometryKey="";this.lastGeometryAt=0;this.lastPointer=null;
  this.setupControls();this.bindCamera();
  this._loop=timestamp=>{
   if(!this.active){this._raf=null;return;}
   if(this.playing&&timestamp-this.lastTick>=+($("languageMazeSpeed").value||450)){
    this.step(1);this.lastTick=timestamp;
   }
   this.draw();
   this._raf=requestAnimationFrame(this._loop);
  };
 }
 bindCamera(){
  this.canvas.addEventListener("pointerdown",e=>{
   this.lastPointer={x:e.clientX,y:e.clientY};
   this.canvas.setPointerCapture?.(e.pointerId);
  });
  this.canvas.addEventListener("pointermove",e=>{
   if(!this.lastPointer)return;
   const dx=e.clientX-this.lastPointer.x,dy=e.clientY-this.lastPointer.y;
   const plane=$("languageMazeRotation").value;
   this.angles[plane]=(this.angles[plane]||0)+dx*.007;
   this.angles["02"]=(this.angles["02"]||0)+dy*.006;
   this.lastPointer={x:e.clientX,y:e.clientY};
  });
  const done=()=>{this.lastPointer=null;};
  this.canvas.addEventListener("pointerup",done);
  this.canvas.addEventListener("pointercancel",done);
  this.canvas.addEventListener("wheel",e=>{
   if(!this.active)return;
   e.preventDefault();
   this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.35,5.5);
  },{passive:false});
 }
 setupControls(){
  $("languageMazePlay").onclick=()=>this.play();
  $("languageMazePause").onclick=()=>this.pause();
  $("languageMazePrev").onclick=()=>this.step(-1);
  $("languageMazeNext").onclick=()=>this.step(1);
  $("languageMazeRestart").onclick=()=>this.rewind();
  $("languageMazeScrub").oninput=e=>{this.pause();this.setFrame(+e.target.value);};
  $("languageMazeRecenter").onclick=()=>{
   this.zoom=1;this.angles={"01":-.20,"02":.14,"03":.12,"14":-.10,"34":.05};
   this.draw();
  };
  $("languageMazePerspective").onchange=()=>this.draw();
  $("languageMazeSlice").onchange=()=>this.draw();
 }
 reset(){
  this.pause();this.episode=null;this.snapshot=null;this.frame=0;
  this.geometryKey="";this.history=null;this.build();
  $("languageMazeScrub").value="0";$("languageMazeScrub").max="0";
  this.renderInfo();
 }
 setActive(value){
  const active=!!value;
  this.active=active;this.canvas.hidden=!active;
  if(!active)this.playing=false;
  if(active&&!this._raf)this._raf=requestAnimationFrame(this._loop);
 }
 setGraph(snap){
  if(!snap)return;
  const newKey=JSON.stringify([
   snap.observedTransformations?.learnedOperators||0,
   snap.U?.length||0,
   this.episode?.predicted||"",
   this.episode?.search?.nodes?.length||0
  ]);
  this.snapshot=snap;
  const now=performance.now();
  if(this.geometryKey!==newKey||now-this.lastGeometryAt>5000){
   this.geometryKey=newKey;this.lastGeometryAt=now;this.build();
  }
 }
 setEpisode(episode){
  this.episode=episode||null;this.pause();this.frame=0;
  this.geometryKey="";this.build();
  const max=this.maxFrame();
  $("languageMazeScrub").max=String(max);
  $("languageMazeScrub").value="0";
  this.renderInfo();
  this.draw();
 }
 build(){
  this.graph=measuredWorld(this.episode,this.snapshot);
  const N=this.graph.nodes;
  const original=torusLocations(N,this.snapshot?.U);
  const coords=normalizeCoords(original||textPca(N));
  this.coordSource=original?
   "Coordonate 5D DERIVATE prin media circulară a pozițiilor simbolurilor în torul V17; propozițiile NU au încă embeddings 5D antrenați separat.":
   "Proiecție PCA în 5D din vectorii termenilor OBSERVAȚI. Este geometrie descriptivă a datelor, NU latentul PyTorch sau o hartă semantică 5D deja învățată.";
  this.coords=new Map(N.map((node,i)=>[node.id,coords[i]||[0,0,0,0,0]]));
  $("languageMazeGeometry").textContent=this.coordSource+
   " Rotește cu mouse-ul; felia W/V filtrează doar afișarea, nu modifică modelul.";
 }
 maxFrame(){return Math.max(0,(this.episode?.body?.frames?.length||1)-1);}
 play(){if(!this.episode?.body?.frames?.length)return;
  if(this.frame>=this.maxFrame())this.setFrame(0);
  this.playing=true;this.lastTick=performance.now();
 }
 pause(){this.playing=false;}
 rewind(){this.pause();this.setFrame(0);}
 step(delta){
  if(!this.episode?.body)return;
  const next=clamp(this.frame+delta,0,this.maxFrame());
  this.setFrame(next);
  if(next===this.maxFrame())this.pause();
 }
 setFrame(next) {
  this.frame=clamp(Math.trunc(next),0,this.maxFrame());
  $("languageMazeScrub").value=String(this.frame);
  $("languageMazeFrameNo").textContent=this.frame+" / "+this.maxFrame();
  this.renderInfo();this.draw();
 }
 renderInfo(){
  const E=this.episode,stats=$("languageMazeMetrics");
  const metric=(label,value)=>{
    const box=document.createElement("div"),small=document.createElement("small"),
      big=document.createElement("b");
    small.textContent=label;big.textContent=value;
    box.append(small,big);return box;
  };
  if(!E){
   stats.replaceChildren(metric("Noduri actuale",fmt(this.graph.nodes.length)),
    metric("Muchii actuale",fmt(this.graph.edges.length)));
   $("languageMazeStatus").textContent=
    "Vizualizare LIVE a observațiilor. Fără obiectiv nu există încă o «linie» prezisă.";
   $("languageMazeFrame").textContent=
    "Introduce un obiectiv sau selectează o lume de text. Nodurile și conexiunile de fundal provin din transformările trăite.";
   $("languageMazePath").textContent=
    "Încă nu există o predicție globală înghețată. Nu desenez un traseu spre o țintă nealeasă.";
   return;
  }
  const B=E.body||{},F=B.frames?.[this.frame]||B.frames?.[0]||null;
  stats.replaceChildren(
   metric("Noduri în căutarea reală",fmt(E.search?.nodes?.length)),
   metric("Ramuri explorate",fmt(E.search?.edges?.length)),
   metric("Forma inițială",E.found?fmt((E.initialShape?.length||1)-1)+" pași":"negăsită"),
   metric("Traseul corpului",B.attempted?fmt(B.executed)+" pași":"neexecutat"),
   metric("Abateri reale",fmt(B.alternateMoves)),
   metric("Recalculări după abatere",fmt(B.corrections))
  );
  $("languageMazeStatus").textContent=
   "GRAF ORIGINAL #"+(E.w??"?")+" · căutare reală "+fmt(E.expanded)+
   " stări · forma calculată ÎNAINTE de primul pas "+
   (E.found?"DA":"NU")+" · propoziție predusă nevăzută "+
   (E.unseen===true?"DA":E.unseen===false?"NU":"NEDEMONSTRAT")+
   " · obiectiv = "+JSON.stringify(E.goal?.required||[]);
  $("languageMazeFrameNo").textContent=this.frame+" / "+this.maxFrame();
  if(!E.found){
   $("languageMazeFrame").textContent="Nu a găsit o cale către obiectiv în modelul învățat. "+
    (E.reason||"")+"\nStări căutate: "+fmt(E.expanded)+
    ". Nu desenez o predicție care nu există.";
   $("languageMazePath").textContent=
    "Căutarea a explorat "+fmt(E.search?.nodes?.length)+
    " stări, dar nu a găsit un traseu valid în memoria curentă.";
   return;
  }
  const gold=(E.initialShape||[]).map((s,i)=>i+". "+s).join("\n");
  let frameText="PERSPECTIVA DE SUS — ÎNAINTE DE MIȘCARE\n"+
   "Ținta ca restricții: "+JSON.stringify(E.goal?.required||[])+
   "\nForma prezisă: "+E.predicted+
   "\n\nLINIA ÎNGHEȚATĂ:\n"+gold+"\n\n";
  if(F){
    frameText+="PERSPECTIVA CORPULUI · CADRUL "+this.frame+
      "\nLocul actual: "+(F.state||"necunoscut")+
      "\nStare: "+F.stage;
    if(this.frame>0){
      frameText+="\nPredicția locală: "+(F.plannedNext??"fără linie")+
       "\nAcțiune: "+(F.chosen?.kind||"—")+" "+
       (F.chosen?.from??"")+" → "+(F.chosen?.to??"")+
       "\nNoua stare executată: "+(F.after||"nereușită")+
       "\nRezultat vs linie: "+(F.predictionMatched?"ALINIAT":"ALT TRASEU")+
       "\nEfectul acțiunii: "+(F.causalEffectMatched?"confirmat în model":"neconfirmat")+
       "\nDecizia locală: "+(F.why||"—")+
       "\nZgomot autonom: "+(F.noise?.site||"niciunul")+
       "\nReproiectare globală: "+(F.correctedShape?.join(" → ")||
        (F.correctedPathExists===false?"fără drum găsit":"nemodificată"));
    }else{
      frameText+="\nCursorul încă NU s-a mișcat. Aurul arată forma anticipată integral.";
    }
  }
  $("languageMazeFrame").textContent=frameText;
  const executed=(B.frames||[]).slice(1,this.frame+1).map((f,i)=>{
    const mark=f.predictionMatched?"✓":"↻";
    return mark+" "+(i+1)+": "+(f.before||"")+" —["+
     (f.chosen?.from||"")+"→"+(f.chosen?.to||"")+"]→ "+
     (f.after||"EȘEC")+
     (f.alternativePath?" (replan)":"");
  }).join("\n");
  $("languageMazePath").textContent=
   "AURIU · FORMA ÎNAINTE DE MIȘCARE:\n"+gold+
   "\n\nALBASTRU · PAȘII EXECUTAȚI PÂNĂ LA CADRU:\n"+(executed||"Încă nu s-a mișcat")+
   "\n\nRAMURI CAUZAL OBSERVATE: "+fmt(E.search?.edges?.length)+
   "\nSursa efectelor: "+(B.effectSource||"—")+
   "\nVerificare semantică independentă: "+
   (B.semanticValidation?"DA":"NU — efecte ale modelului învățat");
 }
 // Rotate genuine 5D coordinates through selectable 2D hyperplanes, then
 // perspective-project the 3 visible axes. Rendering is a PROJECTION, not
 // a fabricated fifth-dimensional learned solution representation.
 projected(name,centerX,centerY,unit) {
  const q=(this.coords.get(name)||[0,0,0,0,0]).slice();
  for(const [key,angle] of Object.entries(this.angles)){
   const i=+key[0],j=+key[1];
   const c=Math.cos(angle),s=Math.sin(angle),a=q[i],b=q[j];
   q[i]=a*c-b*s;q[j]=a*s+b*c;
  }
  const scale=clamp(2.65/(2.65+q[2]*.8),.65,2.4);
  return {x:centerX+q[0]*unit*scale*this.zoom,
    y:centerY+q[1]*unit*scale*this.zoom,
    depth:q[2],w:q[3],v:q[4]};
 }
 isVisible(point){
  const slice=$("languageMazeSlice").value;
  if(slice==="all")return true;
  return Math.abs(slice==="w"?point.w:point.v)<.43;
 }
 arrow(ctx,a,b,color,width=1,dash=false){
  if(!a||!b)return;
  line(ctx,a,b,color,width,dash);
 }
 overview(ctx,W,height){
  const graph=this.graph,N=graph.nodes;
  const top=30,bottom=height-20;
  const centerX=W*.50,centerY=(top+bottom)/2,unit=Math.min(W*.34,(bottom-top)*.38);
  const positions=new Map(N.map(n=>[n.id,this.projected(n.id,centerX,centerY,unit)]));
  const current=this.episode?.body?.frames?.[this.frame]?.state||
    this.episode?.start||null;
  label(ctx,"PERSPECTIVĂ GLOBALĂ · STĂRI ȘI CĂI ALE MODELULUI",16,23,"#b4d5f5",12,60);
  if(!N.length){
   label(ctx,"Niciun traseu de transformare observat încă.",W*.20,height*.47,"#91a4b5",13);
   return;
  }
  for(const e of graph.edges){
   const a=positions.get(e.from),b=positions.get(e.to);
   if(!a||!b||!this.isVisible(a)||!this.isVisible(b))continue;
   line(ctx,a,b,e.observed?"rgba(102,184,178,.44)":colors.edge,
     e.observed?1.1:.8,e.observed===false);
  }
  const route=this.episode?.initialShape||[];
  // Gold is ALWAYS the path predicted before the first actual step.
  for(let i=1;i<route.length;i++){
   const a=positions.get(route[i-1]),b=positions.get(route[i]);
   if(a&&b&&this.isVisible(a)&&this.isVisible(b))
    line(ctx,a,b,colors.gold,3.8,false);
  }
  // The action sequence may diverge: this blue line is ONLY the first N
  // executed actual learned actions, not the frozen global hypothesis.
  const frames=this.episode?.body?.frames||[];
  for(let i=1;i<=this.frame&&i<frames.length;i++){
   const f=frames[i],a=positions.get(f.before),b=positions.get(f.after);
   if(!a||!b||!this.isVisible(a)||!this.isVisible(b))continue;
   line(ctx,a,b,f.alternativePath?colors.deviation:colors.body,3.4,false);
  }
  // A revised hypothesis after an actual deviation is distinct from the
  // original gold path and must never replace it retroactively.
  const corrected=[...frames.slice(1,this.frame+1)].reverse().find(f=>f.correctedShape?.length);
  if(corrected)for(let i=1;i<corrected.correctedShape.length;i++){
   const a=positions.get(corrected.correctedShape[i-1]),b=positions.get(corrected.correctedShape[i]);
   if(a&&b)line(ctx,a,b,"#c69af5",2.1,true);
  }
  // Real observed states and actual candidate nodes, with distinct goal,
  // original start, active cursor and proposed-unseen states.
  for(const n of N){
   const p=positions.get(n.id);
   if(!p||!this.isVisible(p))continue;
   const first=n.id===this.episode?.start,goal=n.id===this.episode?.predicted;
   const now=n.id===current;
   const radius=now?9:goal?7:first?6:3;
   ctx.beginPath();ctx.arc(p.x,p.y,radius,0,2*Math.PI);
   ctx.fillStyle=now?colors.body:goal?colors.goal:first?colors.gold:
     n.observed?colors.observed:colors.unknown;
   ctx.fill();
   if(now||goal||first||route.includes(n.id)){
    label(ctx,n.label,p.x+radius+4,p.y-6,now?"#a6daff":goal?colors.goal:colors.txt,
     now?13:11,35);
   }
  }
  label(ctx,"AURIU: formă inițială  •  ALBASTRU: acțiuni  •  ROȘU: alt traseu  •  VIOLET: replan",
    13,height-8,"#b0bfd5",10,100);
 }
 bodyView(ctx,W,top,height){
  const current=this.episode?.body?.frames?.[this.frame]||null;
  const next=this.episode?.body?.frames?.[Math.min(this.frame+1,this.maxFrame())]||null;
  ctx.fillStyle="#091726";ctx.fillRect(2,top,W-4,height-2);
  ctx.strokeStyle="#30475f";ctx.beginPath();ctx.moveTo(2,top);ctx.lineTo(W-2,top);ctx.stroke();
  label(ctx,"PERSPECTIVA CORPULUI · CURSORUL ȘI ALEGERILE LOCALE",12,top+19,"#b7ddf8",12,63);
  if(!current){
   label(ctx,"Nicio acțiune reală planificată: așteaptă un obiectiv.",22,top+height*.48,"#91a4b5",11,67);
   return;
  }
  const cx=W*.5,cy=top+height*.47,options=(next?.alternatives||current?.alternatives||[]).slice(0,8);
  const radius=Math.min(W*.26,height*.26);
  for(let i=0;i<options.length;i++){
   const o=options[i],angle=Math.PI*2*i/Math.max(1,options.length)-Math.PI/2;
   const x=cx+Math.cos(angle)*radius*1.65,y=cy+Math.sin(angle)*radius;
   const chosen=o.state===next?.after;
   line(ctx,{x:cx,y:cy},{x,y},chosen?"#52b9fb":"#476c8b",chosen?2.6:1.2);
   ctx.fillStyle=chosen?"#52b9fb":"#27435c";ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fill();
   label(ctx,o.action?.from+"→"+o.action?.to,x+5,y-7,
     chosen?"#8ccdfa":"#a2b9cd",10,22);
  }
  ctx.fillStyle="#f1b948";ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.fill();
  label(ctx,String(current.state||"").slice(0,47),cx-110,cy+27,"#e8f3ff",12,45);
  label(ctx,"VĂD "+fmt(options.length)+" acțiuni posibile în modelul învățat",
    11,top+height-17,"#9ab7ca",10,65);
 }
 draw(){
  if(!this.active)return;
  const css=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const W=Math.max(350,Math.floor(css.width*dpr)),H=Math.max(420,Math.floor(css.height*dpr));
  if(this.canvas.width!==W||this.canvas.height!==H){this.canvas.width=W;this.canvas.height=H;}
  const ctx=this.ctx;ctx.fillStyle="#050d16";ctx.fillRect(0,0,W,H);
  const mode=$("languageMazePerspective").value;
  if(mode==="body"){
   this.bodyView(ctx,W,0,H);
  }else if(mode==="global"){
   this.overview(ctx,W,H);
  }else{
   const boundary=Math.floor(H*.66);
   this.overview(ctx,W,boundary);
   this.bodyView(ctx,W,boundary,H-boundary);
  }
 }
}
