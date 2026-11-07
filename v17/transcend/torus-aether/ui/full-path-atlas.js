// Native V17 Real Path Atlas viewer — no fabricated graph, no separate demo.
// Displays BOTH: complete finite xD maze (all 128 physical states, legal
// corridors, walls, learned action bindings, planned/executed/missed edges)
// and all six persistent native language context-scale graphs, paged from
// the actual original Brain + append-only per-exercise prediction error log.
const by=id=>document.getElementById(id);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const num=n=>finite(n)?n.toLocaleString("ro-RO"):"—";
const percent=n=>finite(n)?(n*100).toFixed(1)+"%":"—";
const cc={bg:"#07121e",text:"#dcebf7",muted:"#8299ad",
  gold:"#f5bd50",blue:"#59b9f3",red:"#fc687d",green:"#5cdaa5",
  gray:"#405366",violet:"#b89af9"};
const crop=(text,len=70)=>String(text??"—").replace(/\n/g,"↵").slice(0,len);
const dash=(ctx,x1,y1,x2,y2,color,width=1,dashed=false)=>{
 ctx.save();ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
 if(dashed)ctx.setLineDash([4,5]);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
};
const circle=(ctx,x,y,r,color)=>{
 ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
};
const setText=(id,text)=>{const e=by(id);if(e)e.textContent=text;};
const canvas=(id)=>{const cv=by(id);if(!cv)return null;
 const ratio=window.devicePixelRatio||1,w=Math.max(300,Math.floor(cv.clientWidth*ratio)),
 h=Math.max(180,Math.floor(cv.clientHeight*ratio));
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 const ctx=cv.getContext("2d");ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle=cc.bg;ctx.fillRect(0,0,w,h);
 return {cv,ctx,w,h,ratio};
};
export class NativeFullPathAtlasView{
 constructor({getWorker}={}){
  this.getWorker=getWorker||(()=>0);
  this.worker=null;this.text=null;this.xd=null;this.xdFrame=0;
  this.playing=true;this.lastTick=0;this.lastWorld="";
  this.page=null;this.pageHistory=[];this.scale=0;this.pageOffset=0;
  this.logOffset={text:0,xd:0};this.logRecent={text:[],xd:[]};this.pending=false;
  this.activeXDEval=false;this.gated=null;
  this.setup();
 }
 setup(){
  const click=(id,fn)=>by(id)?.addEventListener("click",fn);
  click("atlasXdPlay",()=>{this.playing=true;});
  click("atlasXdPause",()=>{this.playing=false;});
  click("atlasXdBack",()=>{this.playing=false;this.xdFrame=Math.max(0,this.xdFrame-1);this.draw();});
  click("atlasXdForward",()=>{this.playing=false;this.xdFrame=Math.min(this.xdSteps(),this.xdFrame+1);this.draw();});
  click("atlasXdReset",()=>{this.xdFrame=0;this.playing=true;this.draw();});
  by("atlasXdScrub")?.addEventListener("input",e=>{this.playing=false;this.xdFrame=+e.target.value;this.draw();});
  click("atlasXdEval",()=>this.testXD());
  click("atlasGatedGo",()=>this.testGatedText());
  click("atlasPageNext",()=>this.loadPage(this.page?.nextOffset??0));
  click("atlasPagePrev",()=>this.loadPage(this.pageHistory.pop()??0,false));
  by("atlasScale")?.addEventListener("change",e=>{this.scale=e.target.value==="edits"?"edits":+e.target.value;this.pageHistory=[];
    this.loadPage(0);});
  click("atlasPageExport",()=>this.exportFile("original-native-scale-"+this.scale+"-offset-"+this.pageOffset+".json",this.page));
  click("atlasLogMore",()=>this.loadLog());
  click("atlasXdExport",()=>this.exportFile("full-xd-world-atlas.json",this.xd?.last));
  click("atlasTextFrozenEval",()=>this.testFrozenText());
  click("atlasTextExport",()=>this.exportFile("native-text-episode-path-analysis.json",this.text?.last));
  by("atlasXdCanvas")?.addEventListener("pointermove",e=>this.hoverXD(e));
  window.addEventListener("resize",()=>this.draw());
 }
 update(graph){
  if(!by("fullAtlasPanel")||!graph)return;
  const worker=this.getWorker();
  if(worker!==this.worker){
    this.worker=worker;this.page=null;this.pageHistory=[];this.pageOffset=0;this.logOffset=0;
    this.lastWorld="";this.xdFrame=0;this.playing=true;this.logOffset={text:0,xd:0};this.logRecent={text:[],xd:[]};
    setText("atlasPageText","Așteaptă încărcarea paginii reale a grafului...");
    this.loadPage(0);
  }
  this.text=graph.nativePathAtlas||null;
  this.xd=graph.xdAtlas||null;
  const present=!!this.text||!!this.xd;
  by("fullAtlasPanel").hidden=!present;
  if(!present)return;
  const t=this.text||{};
  setText("atlasTextTotals","Exerciții analizate înainte de antrenarea răspunsului: "+
   num(t.episodes)+" · caractere evaluate "+num(t.explainedChars)+
   " · potrivire pe prefix observat "+percent(t.preUpdateAccuracy)+
   " · răspunsuri libere exacte "+num(t.freeRunExact));
  const faults=Object.entries(t.missedByReason||{}).map(([name,n])=>name+" = "+num(n));
  setText("atlasTextMissing","DIRECȚII CARE LIPSESC / CANDIDAȚI RESPINȘI: "+
    (faults.join(" · ")||"Fără observații încă"));
  const last=t.last;
  if(last){
    const top=last.frames?.slice(0,24)||[];
    setText("atlasTextReason","Exercițiul "+last.episode+" · predicția INIȚIALĂ "+
      crop(last.preActionPrediction,140)+"\n"+"Răspunsul observat DUPĂ predicție: "+
      crop(last.actualAnswerPreview,140)+"\n"+"Prima divergență: "+
      last.firstDivergence+" · "+last.teacherForcedCorrect+"/"+last.teacherForcedTotal+
      " (teacher-forced, separat de răspunsul liber)\n"+
      top.map(f=>"#"+f.position+" "+crop(f.predicted,9)+" → "+
        crop(f.actual,9)+" · "+f.reason+" · suport pe 6 scale: "+
        f.evidence.map(s=>s.observedTransitions).join("/")).join("\n"));
  }else setText("atlasTextReason","Așteptă primul răspuns REAL înainte de a arăta cauzele erorilor.");
  const x=this.xd||{},world=x.last?.atlas?.fullWorld,record=x.last||{};
  setText("atlasXdTotals","Lumi finite trăite "+num(x.trainedWorlds)+
    " · lumi nevăzute testate "+num(x.testedWorlds)+
    " · efecte ale acțiunilor învățate "+num(x.actions?.length)+
    " · încercări "+num(x.predictedEdges)+" · acțiuni confirmate "+
    num(x.correctEdges)+
    "\nUltimul: "+(record.dimensions??"—")+"D ambient / "+
    (record.activeRank??"—")+" axe active / "+
    (world?.finiteStateCount??128)+" stări din lumea FINITĂ COMPLETĂ"+
    " · "+(record.solved?"ȚINTĂ ATINSĂ":"CALE INCOMPLETĂ / NECONFIRMATĂ"));
  if(record.dimensions!=null){
    const serial=record.seed+":"+record.dimensions+":"+record.planningReason;
    if(serial!==this.lastWorld){this.lastWorld=serial;this.xdFrame=0;this.playing=true;}
  }
  const plan=record.atlas,execution=record.execution;
  setText("atlasXdMissing",plan?
    "CONEXIUNI COMPLETE FIZICE: "+num(plan.allKnownPhysicalEdges?.length)+
    " · acțiuni accesibile învățate "+num(plan.candidateActionEdges)+
    " · frontiere fără transformare învățată "+num(plan.allMissingActionEdges?.length)+
    " · ziduri "+num(plan.blockedWalls?.length)+
    "\nAxe inaccesibile din design/experiențe: "+
    (plan.missingAxes?.join(", ")||"niciuna")+
    "\nDe ce: "+plan.reason+
    " · lungime forma anticipată "+(plan.pathLength??"—")+
    " · acțiuni executate "+(execution?.attempted??"—")+
    " · erori fizice "+((execution?.attempted||0)-(execution?.correct||0))+
    "\nAvertisment: aceste lumi NU au toate 2^D stări ale hipercubului; au 7 axe active.":
    "Nicio lume xD antrenată sau evaluată în acest Brain încă.");
  if(world)by("atlasXdCanvas").hidden=false;
  this.draw();
 }
 xdSteps(){return this.xd?.last?.execution?.frames?.length||0;}
 tick(now){
  if(!this.playing||!this.xd?.last||now-this.lastTick<340)return;
  this.lastTick=now;
  if(this.xdFrame<this.xdSteps()){this.xdFrame++;this.draw();}
  else this.playing=false;
 }
 draw(){
  this.drawXD();
  this.drawText();
  this.drawNativePage();
  this.drawGatedText();
 }
 drawXD(){
  const cvs=canvas("atlasXdCanvas");if(!cvs)return;
  const {ctx:c,w,h}=cvs,rec=this.xd?.last||{},atlas=rec.atlas,world=atlas?.fullWorld;
  if(!world){c.fillStyle=cc.muted;c.font="14px monospace";
    c.fillText("Așteaptă antrenamentul V17 pe o lume xD FINITĂ completă.",15,35);return;}
  const width=w-60,height=h-78;
  const layout=node=>{
    const bits=node.mask;return [
      32+(bits&15)*width/15,
      36+(bits>>4)*height/7
    ];
  };
  const positions=new Map(world.vertices.map(v=>[v.id,layout(v)]));
  const colorLine=(from,to,color,width=1,pattern=false)=>{
    const a=positions.get(from),b=positions.get(to);
    if(a&&b)dash(c,a[0],a[1],b[0],b[1],color,width,pattern);
  };
  for(const e of world.links)colorLine(e.from,e.to,"#23384c",1);
  for(const e of (atlas.allExploredEdges||[]))colorLine(e.from,e.to,"#466d69",1);
  for(const e of (atlas.allMissingActionEdges||[]))colorLine(e.from,e.to,cc.red,1,true);
  const planned=atlas.path||[];
  for(const p of planned)colorLine(p.from,p.to,cc.gold,3);
  for(const p of rec.execution?.frames?.slice(0,this.xdFrame)||[])
    colorLine(p.from,p.observedAfter,p.correct?cc.blue:cc.red,5);
  const current=this.xdFrame>0?rec.execution?.frames?.[this.xdFrame-1]?.observedAfter:
    world.start;
  for(const v of world.vertices){
    const xy=positions.get(v.id);if(!xy)continue;
    circle(c,xy[0],xy[1],v.wall?3.5:2.7,v.wall?"#803342":"#7b8fa5");
  }
  for(const name of [world.start,world.goal]){
    const p=positions.get(name);
    if(p)circle(c,p[0],p[1],6,name===world.goal?cc.green:cc.gold);
  }
  const p=positions.get(current);if(p)circle(c,p[0],p[1],7,cc.blue);
  c.fillStyle=cc.text;c.font="12px monospace";
  c.fillText("HARTA FINITĂ COMPLETĂ "+world.ambientDimensions+"D · "+
    world.activeRank+" axe active · toate "+world.vertices.length+
    " stările și "+world.links.length+" legăturile posibile",12,15);
  c.fillStyle=cc.muted;c.font="10px monospace";
  c.fillText("Aur = traseu calculat înainte · albastru = acțiuni reale · roșu punctat = operator lipsă · roșu nod = zid",12,h-12);
  const slider=by("atlasXdScrub");if(slider){
    slider.max=this.xdSteps();slider.value=this.xdFrame;
  }
  setText("atlasXdStep","Acțiune "+this.xdFrame+"/"+this.xdSteps()+
    " · "+(this.xdFrame>0?JSON.stringify(rec.execution?.frames?.[this.xdFrame-1]||{}):
      "forma soluției a fost construită înainte de mișcare"));
 }
 drawText(){
  const cvs=canvas("atlasTextCanvas");if(!cvs)return;
  const {ctx:c,w,h}=cvs,t=this.text?.last;
  if(!t){c.fillStyle=cc.muted;c.font="14px monospace";
    c.fillText("Așteptă predicții din graful NATIV deja antrenat pe corpus.",15,35);return;}
  const frames=t.frames||[],n=Math.min(frames.length,64);
  if(!n)return;
  const left=30,usable=w-50,step=usable/Math.max(1,n-1);
  const y1=h*.26,y2=h*.67;
  c.fillStyle=cc.gold;c.font="11px monospace";
  c.fillText("CE A ALES modelul NATIV înaintea noului caracter",14,20);
  c.fillStyle=cc.blue;c.fillText("CE A FOST ÎN RĂSPUNSUL OBSERVAT",14,h*.49);
  for(let i=0;i<n;i++){
    const f=frames[i],x=left+i*step,col=f.correct?cc.green:cc.red;
    if(i<n-1){
      dash(c,x,y1,x+step,y1,cc.gold,2);
      dash(c,x,y2,x+step,y2,cc.blue,2);
    }
    circle(c,x,y1,3,cc.gold);circle(c,x,y2,3,col);
    if(!f.correct)dash(c,x,y1+5,x,y2-5,col,1,true);
    if(i%Math.max(1,Math.ceil(n/12))===0){
      c.fillStyle=cc.text;c.font="10px monospace";
      c.fillText(crop(f.predicted,3),x-7,y1-12);
      c.fillText(crop(f.actual,3),x-7,y2+17);
    }
  }
  c.fillStyle=cc.muted;c.font="10px monospace";
  c.fillText("Corect = verde · lipsește muchia / clasament greșit = roșu · numai prefixul analizat, nu semantică demonstrată",10,h-10);
 }
 drawNativePage(){
  const cvs=canvas("atlasGraphCanvas");if(!cvs)return;
  const {ctx:c,w,h}=cvs,page=this.page;
  if(!page){c.fillStyle=cc.muted;c.font="13px monospace";
    c.fillText("Caută graful real din checkpoint: alege scara și încarcă pagina.",14,33);return;}
  if(page.kind==="native-observed-edit-transformations"){
    const ops=page.entries||[],n=Math.min(ops.length,90);
    if(!n)return;
    c.fillStyle=cc.text;c.font="11px monospace";
    c.fillText("ORIGINAL NATIVE EDIT OPERATORS · "+page.totalOperators+
      " păstrate · pagină "+page.offset+".."+(page.offset+page.returned),12,17);
    for(let i=0;i<n;i++){
      const op=ops[i],y=35+i*(h-55)/Math.max(1,n),
        x1=22+(i%3)*Math.max(1,w-95)/4,x2=x1+Math.max(80,w/4);
      dash(c,x1,y,x2,y,op.support>1?cc.green:cc.gold,Math.min(4,1+Math.log1p(op.support)));
      circle(c,x1,y,3,cc.blue);circle(c,x2,y,3,cc.violet);
      if(n<=28){c.fillStyle=cc.muted;c.font="9px monospace";
        c.fillText(crop(op.from,8)+"→"+crop(op.to,8),x1+8,y-4);}
    }
    c.fillStyle=cc.muted;c.font="10px monospace";
    c.fillText("Fiecare săgeată = editare observată; numai în contexte compatibile cu ancorele originale",12,h-9);
    return;
  }
  const entries=(page.entries||[]).slice(0,90);
  const p=new Map(entries.map((e,i)=>[e.from,{
    x:27+(i%10)*(w-54)/9,y:36+Math.floor(i/10)*(h-80)/Math.max(1,Math.ceil(entries.length/10)-1)
  }]));
  let drawn=0,offPage=0;
  for(const entry of entries){
    const a=p.get(entry.from);
    for(const action of entry.actions||[])for(const target of action.destinations||[]){
      const b=p.get(target.to);
      if(!b){offPage++;continue;}
      dash(c,a.x,a.y,b.x,b.y,"#385e70",Math.min(2,1+Math.log1p(target.observations)/6));
      drawn++;
    }
  }
  for(const [name,pos] of p){
    circle(c,pos.x,pos.y,3.5,cc.gold);
    c.fillStyle=cc.muted;c.font="9px monospace";c.fillText(crop(name,12),pos.x+6,pos.y-4);
  }
  c.fillStyle=cc.text;c.font="11px monospace";
  c.fillText("GRAF NATIV: "+page.contextTokens+" tokenuri / context · "+page.totalStates+
    " stări TOTALE (paginate, fără înlocuire)",12,15);
  c.fillStyle=cc.muted;c.fillText("Muchii vizibile în această pagină: "+drawn+
    " · destinații din alte pagini: "+offPage,12,h-10);
 }
 hoverXD(e){
  const cv=by("atlasXdCanvas"),world=this.xd?.last?.atlas?.fullWorld;
  if(!cv||!world)return;
  const rect=cv.getBoundingClientRect(),x=(e.clientX-rect.left)*cv.width/rect.width,
    y=(e.clientY-rect.top)*cv.height/rect.height,w=cv.width,h=cv.height;
  let nearest=null,dist=Infinity;
  for(const v of world.vertices){
    const pos=[32+(v.mask&15)*(w-60)/15,36+(v.mask>>4)*(h-78)/7],
      d=Math.hypot(x-pos[0],y-pos[1]);
    if(d<dist){nearest=v;dist=d;}
  }
  if(dist<16&&nearest)setText("atlasXdHover","Celula reală "+nearest.id+
    " · coordonate nenule ["+nearest.coordinates.join(",")+"] · "+
    (nearest.wall?"ZID":"CORIDOR ACCESIBIL")+
    " · toate dimensiunile omise din proiecția 2D rămân în starea numerică.");
 }
 async loadPage(offset=0,remember=true){
  if(this.pending)return;
  this.pending=true;setText("atlasPageText","Se citesc nodurile și TOATE muchiile din memoria originală V17...");
  try{
    const old=this.pageOffset,requestedWorker=this.getWorker();
    const family=this.scale==="edits"?"edits":"scales";
    const u="/atlas-graph?w="+requestedWorker+"&family="+family+
      "&scale="+(family==="edits"?0:this.scale)+
      "&offset="+offset+"&limit=70";
    const r=await fetch(u),result=await r.json();
    if(result.error)throw Error(result.error);
    if(requestedWorker!==this.getWorker())return;
    if(remember&&this.page&&offset!==0)this.pageHistory.push(old);
    this.page=result;this.pageOffset=offset;
    if(result.kind==="native-observed-edit-transformations"){
      setText("atlasPageText","ORIGINAL V17 · "+result.totalOperators+
        " editări învățate · "+result.droppedOriginalOperators+
        " operatori refuzați de bugetul de memorie ORIGINAL"+
        "\nPagina offset "+offset+" · "+result.returned+" operatori; fiecare păstrează exemplele sursă.\n"+
        (result.entries||[]).map(op=>op.kind+" @"+op.index+": "+
          crop(op.from,24)+" → "+crop(op.to,24)+
          " · ancore "+crop(op.left,16)+" / "+crop(op.right,16)+
          " · susținere "+op.support+
          " · exemple "+JSON.stringify(op.evidence)).join("\n"));
    }else{
      setText("atlasPageText","Scara "+result.contextTokens+
        " · "+result.totalStates+" stări memorate · pagina de la "+offset+
        " conține "+result.returned+" stări reale\n"+
        (result.entries||[]).slice(0,10).map(x=>crop(x.from,70)+
          " → "+x.actions.map(a=>a.action+":"+a.total).slice(0,6).join(", ")).join("\n")+
        "\n(următoarea pagină: "+(result.nextOffset??"sfârșit")+
        "; toate stările există în Brain, nu numai cele desenate)");
    }
    this.drawNativePage();
  }catch(err){setText("atlasPageText","Atlasul nu a răspuns: "+err.message+
    " · procesul poate fi ocupat cu CUDA");}
  finally{this.pending=false;}
 }
 async loadLog(){
  const kind=by("atlasLogKind")?.value==="xd"?"xd":"text";
  const worker=this.getWorker(),offset=this.logOffset[kind]||0;
  try{
    const r=await fetch("/atlas-log?w="+worker+"&kind="+kind+
      "&offset="+offset+"&limit=6");
    const result=await r.json();
    if(result.error)throw Error(result.error);
    if(worker!==this.getWorker())return;
    this.logOffset[kind]=result.nextOffset??offset;
    const summary=(result.entries||[]).map(e=>kind==="xd"?{
      episode:e.episode,atChars:e.atChars,
      trainedDimensions:e.training?.dimensions,
      trainedSolved:e.training?.execution?.solved,
      unseenDimensions:e.heldout?.dimensions,
      unseenSolved:e.heldout?.execution?.solved,
      missingAxes:e.heldout?.plan?.missingAxes,
      physicalEdges:e.heldout?.plan?.allKnownPhysicalEdges?.length,
      triedEdges:e.heldout?.plan?.allExploredEdges?.length,
      path:e.heldout?.plan?.initialPredictedSolution,
      execution:e.heldout?.execution?.frames?.map(x=>({
        action:x.action,correct:x.correct,
        predicted:x.predictedAfter,observed:x.observedAfter,
        origin:x.evidence?.worlds
      }))
    }:{
      episode:e.episode,question:crop(e.question,100),
      correct:e.teacherForcedCorrect,total:e.teacherForcedTotal,
      missing:e.missingEdges,wrongRanking:e.wrongRanking,
      firstDivergence:e.firstDivergence,
      allCandidateEdges:e.allPreActionCandidateEdges?.length,
      failedPositions:e.frames?.filter(f=>!f.correct)
        .map(f=>({pos:f.position,expected:f.actual,predicted:f.predicted,
          reason:f.reason,trueRank:f.trueActionRank,
          scaleEvidence:f.evidence}))
    });
    this.logRecent[kind].push(...summary);
    this.logRecent[kind]=this.logRecent[kind].slice(-24);
    setText("atlasLogText","JURNAL "+(kind==="xd"?"xD":"TEXT")+
      " · byte cursor="+this.logOffset[kind]+
      " / "+(result.totalBytes??"—")+" bytes"+
      " · "+this.logRecent[kind].length+" episoade în fereastra UI"+
      " · nicio înlocuire a fișierului de pe disc\n"+
      this.logRecent[kind].map(x=>JSON.stringify(x)).join("\n")+
      "\n" +(result.moreAvailable?
        "Există alte episoade: apasă «Încarcă următoarele».":
        "Sfârșitul temporar al jurnalului; pot apărea alte episoade la antrenare."));
  }catch(err){setText("atlasLogText",
    "Nu se pot citi episoadele vechi: "+err.message);}
 }
 async testFrozenText(){
  const out=by("atlasTextFrozenResult"),w=this.getWorker();
  if(out)out.textContent="Evaluez modelul NATIV pe exemple reale nevăzute, fără actualizare...";
  try{
    const r=await fetch("/native-atlas-eval?w="+w+"&count=6",
      {method:"POST"});
    const d=await r.json();
    if(d.error)throw Error(d.error);
    if(this.getWorker()!==w)return;
    if(out)out.textContent=[
      "TEXT NEVĂZUT, GRAF V17 ÎNGHEȚAT",
      "Exerciții: "+d.rows+"; caractere evaluate "+d.characters,
      "Răspunsuri libere EXACTE: "+d.exactFreeRun+"/"+d.rows+
        " ("+percent(d.freeRunExactRate)+")",
      "Caractere corecte cu prefixul REAL observat: "+
        d.teacherForcedCorrect+"/"+d.characters+
        " ("+percent(d.teacherForcedAccuracy)+")",
      "Transformări lipsă: "+d.missingEdges+
        " · alternative prezente dar clasate greșit: "+d.wrongRanking,
      "Modelul nativ nemodificat: "+d.nativeGraphUnchanged,
      "Atlasul de antrenare înainte/după test: "+
        d.trainingAtlasEpisodesBefore+"/"+d.trainingAtlasEpisodesAfter,
      ...(d.examples||[]).slice(0,4).map(x=>
        "ÎNTREBARE: "+crop(x.prompt,160)+
        "\nFORMA PREDISĂ: "+crop(x.predicted,140)+
        "\nRĂSPUNS REAL: "+crop(x.actual,140)+
        "\nPRIMA EROARE: "+x.firstDivergence+
        " · muchii lipsă "+x.missingEdges+" · clasare greșită "+x.wrongRanking)
    ].join("\n\n");
  }catch(err){if(out)out.textContent="Evaluarea nativă a eșuat: "+err.message;}
 }
 async testGatedText(){
  const w=this.getWorker(),start=by("atlasGatedStart")?.value?.trim(),
    goal=by("atlasGatedGoal")?.value?.trim();
  if(!start||!goal){
    setText("atlasGatedResult","Cerință: propoziție observată + condiții de țintă (nu întregul răspuns).");
    return;
  }
  setText("atlasGatedResult","Analizează operatorii originali, ancorele stricte și dovezile de independență...");
  try{
    const u="/evidence-gated-text-path?w="+w+"&start="+encodeURIComponent(start)+
      "&required="+encodeURIComponent(goal);
    const response=await fetch(u,{method:"POST"});
    const result=await response.json();
    if(result.error)throw Error(result.error);
    if(w!==this.getWorker())return;
    const r=result.result;
    this.gated=r;this.drawGatedText();
    const notes=(r.everyExecutedInternalStep||[]).map((e,i)=>
      "#"+i+" "+crop(e.from,80)+" → "+crop(e.to,80)+
      "\n  "+(e.strictOriginalPermitted?"PERMIS de V17":"INTERZIS de V17, dar SUSȚINUT de bridge observat")+
      " · suport real "+e.originalOperatorSupport+
      " · sursă "+JSON.stringify(e.observedEvidence)).join("\n");
    setText("atlasGatedResult",
      "STRICT original: "+(r.strictFound?"CALE GĂSITĂ":"NU EXISTĂ CALE PERMISĂ")+
      " · EXPANSIUNE CU DOVEZI: "+(r.found?"CALE GĂSITĂ":"NU A FOST GĂSITĂ")+
      "\nMotiv: "+r.reason+
      "\nCoordonate/axe acceptate: "+JSON.stringify(r.evidenceAxes)+
      "\nConexiuni nou accesibile de la START: "+
        JSON.stringify(r.previouslyForbiddenFromStart)+
      "\nProbă fizică/observațională propusă (NEVERIFICATĂ): "+
        JSON.stringify(r.bridgeProbeSuggestion)+
      "\nPlan inițial ÎNAINTE de acțiune: "+
        JSON.stringify(r.gated?.states||[])+
      "\n\n"+notes+
      "\nAtenție: succesul navigării în modelul intern nu demonstrează corectitudine semantică.");
  }catch(err){setText("atlasGatedResult","EROARE verificare: "+err.message);}
 }
 drawGatedText(){
  const d=canvas("atlasGatedCanvas");if(!d)return;
  const {ctx:c,w,h}=d,r=this.gated,steps=r?.everyExecutedInternalStep||[];
  c.fillStyle=cc.text;c.font="12px monospace";
  c.fillText("CONDIȚIILE CELE MAI STRÂNSE vs. AXELE PERMISE DE DOVEZI",12,19);
  if(!r){c.fillStyle=cc.muted;c.fillText("Nu există încă o comparație făcută pe modelul V17.",12,43);return;}
  if(!steps.length){
    c.fillStyle=cc.red;c.fillText(r.found?
      "Ținta este deja satisfăcută. Nicio acțiune necesară.":"NU EXISTĂ TRASEU VALID în modelul actual.",12,52);
    c.fillStyle=cc.muted;c.fillText("Pentru a debloca o cale, sunt necesare noi tranziții OBSERVATE.",12,77);return;
  }
  const n=steps.length,margin=40,dx=(w-2*margin)/n;
  for(let i=0;i<n;i++){
    const e=steps[i],x=margin+i*dx,y=h/2,
      col=e.strictOriginalPermitted?cc.green:cc.violet;
    dash(c,x,y,x+dx,y,col,e.strictOriginalPermitted?3:4,!e.strictOriginalPermitted);
    circle(c,x,y,5,col);
    c.fillStyle=cc.text;c.font="10px monospace";
    c.fillText(crop(e.action?.to??e.to,12),x+3,y-16);
    c.fillStyle=cc.muted;
    c.fillText("obs "+e.originalOperatorSupport,x+4,y+24);
  }
  circle(c,margin+n*dx,h/2,6,cc.gold);
  c.fillStyle=cc.muted;c.font="11px monospace";
  c.fillText("VERDE = nativ permis · VIOLET PUNCTAT = permis doar după bridge observat · ROȘU = nu poate naviga",12,h-14);
 }
 async testXD(){
  const dim=+by("atlasDimension")?.value||1024,
    seed=+by("atlasUnseenSeed")?.value||81919,w=this.getWorker(),out=by("atlasXdEvalText");
  if(out)out.textContent="Se evaluează un NOU labirint cu toate coridoarele vizibile și efectele acțiunilor învățate anterior...";
  try{
    const r=await fetch("/xd-atlas-eval?w="+w+"&dimensions="+dim+"&seed="+seed,
      {method:"POST"});
    const p=await r.json();if(p.error)throw Error(p.error);
    if(w!==this.getWorker())return;
    const b=p.result,plan=b.plan,execute=b.execution;
    this.xd={...(this.xd||{}),last:{
      dimensions:b.dimensions,activeRank:b.activeRank,seed:b.seed,
      solved:execute.solved,reason:execute.reason,
      atlas:plan,execution:execute}};
    this.xdFrame=0;this.playing=true;this.draw();
    if(out)out.textContent="TEST ÎNGHEȚAT, fără intervenții în lumea-țintă: "+
      (execute.solved?"REZOLVAT":"NEREZOLVAT")+
      " · "+dim+"D ambient, "+plan.fullWorld.activeRank+" axe active, "+
      plan.fullWorld.vertices.length+" poziții fizice arătate complet\n"+
      "Cale calculată ÎNAINTE de mișcare: "+JSON.stringify(plan.initialPredictedSolution)+
      "\nAcțiuni prezise/executate: "+execute.attempted+
      " · efecte corecte: "+execute.correct+
      " · direcții care lipseau: "+plan.missingAxes.join(", ")+
      "\nCauză finală: "+execute.reason+
      " · starea ÎNTREGII lumi există înainte de execuție; nu s-a furnizat traseul ideal.";
  }catch(err){if(out)out.textContent="Eșec test: "+err.message;}
 }
 exportFile(filename,data){
  if(!data){setText("atlasPageText","Nicio dovadă încă disponibilă pentru export.");return;}
  const blob=new Blob([JSON.stringify({origin:"REAL native V17 observation",
    recordedAt:new Date().toISOString(),data},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
