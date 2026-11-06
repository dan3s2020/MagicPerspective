// REAL V17 train-first-page language labyrinth. No demo path, no fabricated
// answer. The GOLD line and the local cursor come from the original Brain's
// six learned context scales, captured BEFORE the current row is learned.
const E=id=>document.getElementById(id);
const truncate=(s,n=26)=>{const t=String(s??"").replace(/\n/g,"↵");return t.length>n?t.slice(0,n-1)+"…":t;};
const palette={gold:"#f5bc40",body:"#55b8ff",alternate:"#617e99",
  wrong:"#ff5479",replan:"#ba91f6",goal:"#55dba3",ink:"#daeaff"};
function arrow(g,a,b,color,width=2,dashed=false){
 if(!a||!b)return;
 g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dashed?[5,5]:[]);
 g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.setLineDash([]);
 const angle=Math.atan2(b.y-a.y,b.x-a.x),size=4+width;
 g.fillStyle=color;g.beginPath();g.moveTo(b.x,b.y);
 g.lineTo(b.x-size*Math.cos(angle-.5),b.y-size*Math.sin(angle-.5));
 g.lineTo(b.x-size*Math.cos(angle+.5),b.y-size*Math.sin(angle+.5));g.fill();
}
function dot(g,x,y,color,r=4){
 g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,7);g.fill();
}
function label(g,text,x,y,color="#b9d0e5",size=11){
 g.fillStyle=color;g.font=size+"px ui-monospace,monospace";
 g.fillText(truncate(text,33),x,y);
}
function percent(x){return Number.isFinite(x)?(100*x).toFixed(1)+"%":"—";}
export class InlineTextMaze {
 constructor(){
  this.canvas=E("textMazeCv");this.ctx=this.canvas.getContext("2d");
  this.snap=null;this.episode=null;this.epoch=-1;this.frame=0;
  this.playing=true;this.speed=320;this.lastAt=0;this.angle=0;
  this.plane="03";this.drag=null;
  E("textMazePlay").onclick=()=>{this.playing=true;this.lastAt=performance.now();};
  E("textMazePause").onclick=()=>{this.playing=false;};
  E("textMazePrev").onclick=()=>this.step(-1);
  E("textMazeNext").onclick=()=>this.step(1);
  E("textMazeRestart").onclick=()=>{this.playing=false;this.frame=0;this.showFrame();};
  E("textMazeScrub").oninput=e=>{this.playing=false;this.frame=+e.target.value;this.showFrame();};
  E("textMazeSpeed").oninput=e=>this.speed=+e.target.value;
  E("textMazeMode").onchange=()=>this.draw();
  E("textMazePlane").onchange=e=>{this.plane=e.target.value;this.draw();};
  this.canvas.addEventListener("pointerdown",e=>{
   this.drag=e.clientX;this.canvas.setPointerCapture?.(e.pointerId);});
  this.canvas.addEventListener("pointermove",e=>{
   if(this.drag==null)return;
   this.angle+=(e.clientX-this.drag)*.008;this.drag=e.clientX;this.draw();});
  this.canvas.addEventListener("pointerup",()=>this.drag=null);
  this.canvas.addEventListener("pointercancel",()=>this.drag=null);
 }
 // The first-page box is visible whenever the original graph has TEXT
 // selected. Waiting for learning must be visible, NOT silently hidden.
 update(snapshot,textEnabled){
  const box=E("textMazeBox");
  box.hidden=!textEnabled;
  if(!textEnabled){this.episode=null;this.epoch=-1;this.snap=null;return;}
  if(snapshot)this.snap=snapshot;
  const incoming=snapshot?.textMaze;
  if(!incoming)return;
  if(incoming.epoch!==this.epoch){
   this.epoch=incoming.epoch;this.episode=incoming;
   this.frame=0;this.playing=true;this.lastAt=performance.now();
   E("textMazeScrub").max=String(Math.max(0,(incoming.frames?.length||1)-1));
   E("textMazeScrub").value="0";
   this.showFrame();
  }
 }
 max(){return Math.max(0,(this.episode?.frames?.length||1)-1);}
 step(n){
  this.frame=Math.max(0,Math.min(this.max(),this.frame+n));
  this.showFrame();
  if(this.frame===this.max())this.playing=false;
 }
 tick(t){
  if(E("textMazeBox").hidden)return;
  if(this.playing&&this.episode?.ready&&t-this.lastAt>=this.speed){
   this.lastAt=t;
   if(this.frame<this.max())this.step(1);
  }
  if(!this.episode?.ready||this.frame%2===0)this.draw();
 }
 showFrame(){
  const t=this.episode,f=t?.frames?.[this.frame];
  E("textMazeScrub").value=String(this.frame);
  E("textMazeFrameNo").textContent=this.frame+" / "+this.max();
  if(!t?.ready){
   E("textMazeInfo").textContent="Lume TEXT · "+
     (t?.reason||"aștept observații reale")+" · nu inventez o formă înainte să existe tranziții.";
   E("textMazeFrame").textContent="Antrenamentul este activ. Niciun traseu anticipat nu a fost înregistrat încă.";
   return;
  }
  const oldRows=t.modelRowsBeforeNewObservation;
  E("textMazeInfo").textContent=
   "Episod REAL #"+t.epoch+" · rânduri învățate ÎNAINTE: "+oldRows+
   " · stări de context: "+t.graphStates+
   " · scară 1/2/4/8/16/32 · forma prezisă "+truncate(t.globalPrediction,40)+
   " · cursor "+t.bodyActions+" acțiuni · abateri "+t.divergences+
   " · recalculări "+t.replans+" · răspunsul curent ascuns predictorului";
  let out="PROIECȚIE GLOBALĂ ÎNGHEȚATĂ ÎNAINTE DE ACȚIUNE\n"+
   "Context: "+truncate(t.question,150)+"\n"+
   "Forma prezisă: "+truncate(t.globalPrediction,150)+"\n"+
   "Final EOS prezis: "+(t.originalGlobalFinished?"DA":"NU/limita pasilor")+
   "\n\nPERSPECTIVA CURSORULUI · CADRUL "+this.frame+"\n"+
   "Stare curentă: "+truncate(f?.state,110)+"\n";
  if(this.frame===0)out+="Încă nicio acțiune executată. Linia aurie este deja întreagă.";
  else{
   const a=f?.alternatives||[];
   out+="Char emis: "+JSON.stringify(f?.action)+"\n"+
    "Forma globală anticipa: "+JSON.stringify(f?.initialExpected?.slice(-1)||null)+"\n"+
    "Coincide cu forma inițială: "+(f?.alignedWithInitial?"DA":"NU — altă cale")+
    "\nPerspectivă: "+f?.perspective+"\n"+
    "Ramuri locale: "+a.map(v=>JSON.stringify(v.character)+
     " ("+percent(v.score)+")").join(", ")+
    "\nContext 1/2/4/8/16/32: "+(a[0]?.scales?.join(" / ")||"—")+
    "\nCalea recalculată: "+(f?.correctedShape?.map(x=>truncate(x,15)).join(" → ")||"neschimbată");
  }
  out+="\n\nAcțiunile sunt executate de politica locală în MODELUL TEXTUAL ÎNVĂȚAT; "+
   "nu este un evaluator semantic independent.";
  E("textMazeFrame").textContent=out;
 }
 // Prefix coordinates are computed from ACTUAL 5D symbol positions in
 // the original toroidal graph. The six context scales are observed state
 // windows; their projection is descriptive, not a trained 5D sentence
 // embedding. When no symbol has coordinates, use explicit graph-depth layout.
 contextVector(prefix) {
  const m=new Map(Array.isArray(this.snap?.U)?this.snap.U:[]);
  const suffix=String(prefix).slice(-32);
  if(!suffix)return null;
  const v=[];
  for(let d=0;d<5;d++){
   let re=0,im=0,n=0;
   for(const ch of suffix){
    const coord=m.get(ch.charCodeAt(0));
    if(!Array.isArray(coord)||!Number.isFinite(coord[d]))continue;
    const theta=coord[d]*Math.PI*2;
    re+=Math.cos(theta);im+=Math.sin(theta);n++;
   }
   v.push(n?Math.atan2(im,re)/Math.PI:null);
  }
  return v.some(x=>x!==null)?v.map(x=>x??0):null;
 }
 point(prefix,i,total,base,range,projection=true){
  const W=this.canvas.width;
  const depth=Math.max(1,total);
  const x=24+(W-48)*Math.min(1,i/depth);
  let y=base;
  if(projection){
   const q=this.contextVector(prefix);
   if(q){
    const a=+this.plane[0],b=+this.plane[1],theta=this.angle;
    const rot=q.slice(),c=Math.cos(theta),s=Math.sin(theta);
    rot[a]=q[a]*c-q[b]*s;rot[b]=q[a]*s+q[b]*c;
    y=base+rot[1]*range*.55+rot[3]*range*.28+rot[4]*range*.17;
   }
  }
  return {x,y};
 }
 draw(){
  if(E("textMazeBox").hidden)return;
  const c=this.canvas,g=this.ctx,W=c.width,H=c.height;
  g.clearRect(0,0,W,H);g.fillStyle="#04101b";g.fillRect(0,0,W,H);
  for(let i=0;i<=8;i++){
   g.strokeStyle="#1a3348";g.lineWidth=1;g.beginPath();
   g.moveTo(18,18+i*44);g.lineTo(W-14,18+i*44);g.stroke();
  }
  const t=this.episode;
  if(!t?.ready){
   label(g,"LUMEA TEXT · ȘASE SCĂRI DE CONTEXT",18,26,"#8fcee9",13);
   label(g,"Aștept să învețe primele tranziții reale de caractere.",32,140);
   label(g,"Niciun labirint fictiv nu este afișat.",32,160,"#8a9baa");
   this.showFrame();return;
  }
  const mode=E("textMazeMode").value;
  const shape=t.initialShape||[""],frames=t.frames||[],total=Math.max(1,t.bodyActions,shape.length-1);
  const globalPts=shape.map((v,i)=>this.point(v,i,total,106,78));
  const bodyPts=frames.map((v,i)=>this.point(v.state||"",i,total,289,60));
  if(mode!=="body"){
   label(g,"PERSPECTIVA GLOBALĂ · ÎNAINTE DE PRIMA MIȘCARE",14,20,"#fad081",12);
   for(let i=1;i<globalPts.length;i++)
    arrow(g,globalPts[i-1],globalPts[i],palette.gold,3);
   globalPts.forEach((p,i)=>{dot(g,p.x,p.y,i===globalPts.length-1?palette.goal:palette.gold,4);
    if(i===0||i===globalPts.length-1||i%4===0)
      label(g,i===0?"START":JSON.stringify(shape[i]?.slice(-1)),p.x+4,p.y-8,palette.gold,10);
   });
   label(g,"6 NIVELE: 1 / 2 / 4 / 8 / 16 / 32 • context și transformări",12,216,"#8daabd",10);
  }
  if(mode!=="global"){
   label(g,"PERSPECTIVA LOCALĂ · CORPUL/CURSORUL · EXECUȚIE",14,237,"#99d4ff",12);
   const last=Math.min(this.frame,frames.length-1);
   // Real learned alternative edges from each already EXECUTED state.
   for(let i=1;i<=last;i++){
    const f=frames[i],from=bodyPts[i-1],to=bodyPts[i];
    for(const [j,opt] of (f.alternatives||[]).slice(0,5).entries()){
     if(opt.state===f.state)continue;
     const p=this.point(opt.state,i,total,289,60);
     arrow(g,from,{x:p.x,y:p.y+((j%2)?1:-1)*(12+j*6)},palette.alternate,.9,true);
     if(j<2)label(g,JSON.stringify(opt.character),p.x+3,p.y-10,palette.alternate,9);
    }
    arrow(g,from,to,f.alignedWithInitial?palette.body:palette.wrong,3);
   }
   if(this.frame>0){
    const f=frames[this.frame];
    if(f?.correctedShape?.length>1){
     let cursor=bodyPts[this.frame];
     for(let k=1;k<f.correctedShape.length;k++){
      const p=this.point(f.correctedShape[k],this.frame+k,total,289,60);
      arrow(g,cursor,p,palette.replan,2,true);cursor=p;
     }
    }
   }
   if(bodyPts.length)dot(g,bodyPts[last].x,bodyPts[last].y,
     palette.body,8);
   label(g,"CURSOR: "+truncate(frames[last]?.state||"START",50),
     14,H-22,"#cae7fb",11);
  }
  // There is no oracle comparing semantic correctness. This annotation only
  // shows whether the local action diverged from the frozen predicted sequence.
  if(this.frame>0&&frames[this.frame]?.alignedWithInitial===false)
   label(g,"ABATERE REALĂ → REPLAN",W-210,H-23,palette.wrong,11);
  label(g,"DIN DATELE CREIERULUI, NU DIN DEMO",14,H-6,"#829bb0",9);
 }
}
