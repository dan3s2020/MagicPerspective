// Live display of ACTUAL text-world paths from the V17 worker's training
// stream. Never fabricates an episode, target, alternative or statistic.
// This draws an explicitly identified CPU observational sidecar next to the
// original V17 Brain/2D maze/5D visualization, without replacing any of them.
const get=id=>document.getElementById(id);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const validNumber=n=>finite(n)?n:0;
const pct=n=>finite(n)?(100*n).toFixed(1)+"%":"—";
const number=n=>finite(n)?n.toLocaleString("ro-RO"):"—";
const short=(s,n=18)=>{s=String(s??"∅").replace(/\n/g,"↵");return s.length>n?s.slice(0,n-1)+"…":s;};
const C={gold:"#F1BD50",blue:"#67B9F9",red:"#FF657C",green:"#57D6A7",
  violet:"#B598F7",grey:"#7A90A7",white:"#DEECFA",dim:"#8399AC"};
const canvasSize=cv=>{
  const w=Math.max(300,Math.floor(cv.clientWidth*devicePixelRatio)),h=Math.max(130,Math.floor(cv.clientHeight*devicePixelRatio));
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  return {w,h,dpr:devicePixelRatio};
};
const text=(g,s,x,y,color=C.white,size=11,align="left")=>{
 g.fillStyle=color;g.textAlign=align;g.font=(size*devicePixelRatio)+"px ui-monospace,monospace";
 g.fillText(s,x,y);g.textAlign="left";
};
const line=(g,x1,y1,x2,y2,color,w=2,dash=false)=>{
 g.save();g.strokeStyle=color;g.lineWidth=w*devicePixelRatio;
 g.setLineDash(dash?[5*devicePixelRatio,5*devicePixelRatio]:[]);
 g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.restore();
};
const dot=(g,x,y,color,r=4)=>{
 g.fillStyle=color;g.beginPath();g.arc(x,y,r*devicePixelRatio,0,Math.PI*2);g.fill();
};
export class CorpusHyperMazeView{
 constructor({getWorker}={}){
  this.getWorker=getWorker||(()=>0);
  this.canvas=get("hypermazeCanvas");
  this.timeline=get("hypermazeTimeline");
  this.snap=null;this.trace=null;this.episode=0;this.frame=0;
  this.playing=true;this.lastTick=0;this.lastWorker=-1;
  this.width=0;this.offset=0;this.drag=null;
  this.bound=false;
  if(this.canvas&&this.timeline)this.connect();
 }
 connect(){
  if(this.bound)return;this.bound=true;
  const use=(id,fn)=>{const el=get(id);if(el)el.addEventListener("click",fn);};
  use("hypermazePlay",()=>{this.playing=true;});
  use("hypermazePause",()=>{this.playing=false;});
  use("hypermazePrev",()=>{this.playing=false;this.frame=Math.max(0,this.frame-1);this.draw();});
  use("hypermazeNext",()=>{this.playing=false;this.frame=Math.min(this.maxFrame(),this.frame+1);this.draw();});
  use("hypermazeRestart",()=>{this.frame=0;this.playing=true;this.draw();});
  const slider=get("hypermazeScrub");
  if(slider)slider.addEventListener("input",()=>{this.playing=false;this.frame=+slider.value;this.draw();});
  const speed=get("hypermazeSpeed");if(speed)speed.addEventListener("input",()=>
    get("hypermazeSpeedOut").textContent=speed.value+" ms");
  const noise=get("hypermazeNoise");if(noise)noise.addEventListener("change",async()=>{
   const w=this.getWorker(),v=+noise.value;get("hypermazeNoiseOut").textContent=v.toFixed(2);
   try {
    const r=await(await fetch("/hypermaze-config?w="+w+"&noise="+v,{method:"POST"})).json();
    if(r.error)throw Error(r.error);
    get("hypermazeInfo").textContent="Zgomot de explorare aplicat doar previzualizării. Antrenarea deterministă și Brain original rămân neschimbate.";
   }catch(err){get("hypermazeInfo").textContent="Eroare setare: "+err.message;}
  });
  use("hypermazeEval",()=>this.evaluate());
  use("hypermazeExport",()=>this.exportTrace());
  this.canvas.addEventListener("wheel",e=>{e.preventDefault();
    this.offset=Math.max(0,Math.min(20,this.offset+(e.deltaY>0?1:-1)));this.draw();},{passive:false});
  this.canvas.addEventListener("pointerdown",e=>{this.drag=e.clientX;this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener("pointermove",e=>{if(this.drag===null)return;
    if(Math.abs(e.clientX-this.drag)>26){this.offset=Math.max(0,Math.min(20,
      this.offset+(e.clientX>this.drag?-1:1)));this.drag=e.clientX;this.draw();}});
  this.canvas.addEventListener("pointerup",()=>{this.drag=null;});
  this.canvas.addEventListener("pointercancel",()=>{this.drag=null;});
  window.addEventListener("resize",()=>this.draw());
 }
 maxFrame(){return Math.max(0,this.trace?.frames?.length||0);}
 clear(){
  this.trace=null;this.snap=null;this.episode=0;this.frame=0;this.playing=false;
  if(this.canvas)this.draw();
 }
 update(graph){
  if(!this.canvas)return;
  const stats=graph?.hypermaze;
  get("hypermazeBox").hidden=!stats;
  if(!stats)return;
  this.snap=stats;
  const worker=this.getWorker();
  if(worker!==this.lastWorker){
    this.lastWorker=worker;this.trace=null;this.episode=0;this.frame=0;
    this.playing=true;this.offset=0;
  }
  const last=stats.last;
  if(last&&last.episode!==this.episode){
    this.trace=last;this.episode=last.episode;this.frame=0;this.playing=true;
  }
  const set=(id,value)=>{const e=get(id);if(e)e.textContent=value;};
  set("hypermazeRows",number(stats.rows));
  set("hypermazeTokens",number(stats.observedTokens));
  set("hypermazeAccuracy",pct(stats.nextTokenAccuracy));
  set("hypermazeBaseline",pct(stats.unigramAccuracy));
  set("hypermazeBits",finite(stats.meanSurpriseBits)?stats.meanSurpriseBits.toFixed(2)+" bits":"—");
  set("hypermazeDepth",String(stats.contextScale??0)+" tokens");
  set("hypermazeStates",number(stats.learnedStates));
  set("hypermazeEdges",number(stats.learnedEdges));
  set("hypermazeWorker","#"+worker+" · "+stats.status+
    " · "+(graph?.gpu?.settings?.device||"CPU")+" (motor V17)");
  set("hypermazeInfo","Sursa: "+(stats.trainingBackend||"—")+
    ". Predicția este capturată înainte de învățarea răspunsului curent."+
    " Trunchieri explicite: "+number(stats.truncatedRows)+
    ". Acesta este un predictor de tranziții contextuale antrenat pe corpus real, nu o dovadă de geometrie semantică xD.");
  this.draw();
 }
 tick(now){
  if(!this.canvas||!this.playing||!this.trace)return;
  const ms=+(get("hypermazeSpeed")?.value||380);
  if(now-this.lastTick<ms)return;
  this.lastTick=now;
  if(this.frame<this.maxFrame())this.frame++;
  else this.playing=false;
  this.draw();
 }
 draw(){
  if(!this.canvas)return;
  this.drawPaths();
  this.drawMetrics();
  this.drawTimeline();
 }
 drawPaths(){
  const cv=this.canvas,{w,h,dpr}=canvasSize(cv),g=cv.getContext("2d");
  g.fillStyle="#050E17";g.fillRect(0,0,w,h);
  const e=this.trace;if(!e){
    text(g,"Așteaptă următoarea pereche REALĂ întrebare / răspuns din antrenare.",
      18*dpr,h*.48,C.dim,12);
    return;
  }
  const orig=e.predictedRoute||[],obs=e.frames||[],N=Math.max(1,Math.min(24,Math.max(orig.length,obs.length)));
  const X0=42*dpr,XR=w-20*dpr,step=(XR-X0)/Math.max(1,N-1);
  const yPred=h*.28,yObs=h*.68;
  const pAt=i=>X0+(i-this.offset)*step;
  text(g,"FORMA PREDISĂ · numai din experiențele anterioare",14*dpr,23*dpr,C.gold,12);
  text(g,"RĂSPUNS OBSERVAT · tranziții reale din corpus",14*dpr,h*.52,C.blue,12);
  line(g,X0,yPred,XR,yPred,"#344657",1,true);
  line(g,X0,yObs,XR,yObs,"#344657",1,true);
  for(let i=0;i<N;i++){
    const x=pAt(i);if(x<-15*dpr||x>w+15*dpr)continue;
    const o=orig[i],a=obs[i];const wrong=a&&o&&a.actual!==o.to;
    if(i<N-1){
      const next=pAt(i+1);
      line(g,x,yPred,next,yPred,C.gold,3);
      line(g,x,yObs,next,yObs,C.blue,2.6);
    }
    if(o){
      dot(g,x,yPred,C.gold,i===this.frame?6:4);
      text(g,short(o.to,Math.max(7,Math.floor(220/N))),x,yPred-13*dpr,
        i===this.frame?C.white:C.gold,Math.min(11,11), "center");
      if(i===this.frame){
        const alternatives=o.options?.filter(p=>p.token!==o.to).slice(0,3)||[];
        for(let j=0;j<alternatives.length;j++){
          const y=yPred+(j+1)*16*dpr;const dest=x+Math.min(step*.35,22*dpr);
          line(g,x,yPred,dest,y,C.grey,1,true);
          text(g,short(alternatives[j].token,8),dest+3*dpr,y+3*dpr,C.grey,9);
        }
      }
    }
    if(a){
      dot(g,x,yObs,a.correct?C.green:C.red,i===this.frame?6:4);
      text(g,short(a.actual,Math.max(7,Math.floor(220/N))),x,yObs+19*dpr,
        a.correct?C.green:C.blue,10,"center");
      if(wrong){
        line(g,x,yPred+6*dpr,x,yObs-6*dpr,C.red,1.2,true);
      }
    }
    if(i===this.frame){
      line(g,x,39*dpr,x,h-27*dpr,C.violet,1,true);
      dot(g,x,yObs,C.white,3);
    }
  }
  text(g,"Aur = traseu anticipat · Albastru = date reale · Roșu = eroare · Gri = alternative observate",
    14*dpr,h-9*dpr,C.dim,9);
 }
 drawMetrics(){
  const t=this.trace;
  const slider=get("hypermazeScrub");if(slider){
   slider.max=String(this.maxFrame());slider.value=String(this.frame);
  }
  const status=get("hypermazeFrameNo");if(status)
   status.textContent=this.frame+" / "+this.maxFrame();
  const pre=get("hypermazeFrame");if(!pre)return;
  if(!t){pre.textContent="Niciun răspuns real procesat încă.";return;}
  const i=Math.max(0,Math.min(this.frame,Math.max(0,(t.frames?.length||1)-1))),
   row=t.frames?.[i];
  const extra=row?[
   "PAS "+(i+1)+"/"+t.frames.length+
    " · modelul ar fi ales: "+short(row.predicted,44)+
    " · simbolul observat: "+short(row.actual,44)+
    " · "+(row.correct?"CORECT":"EROARE"),
   "Context memorat: "+(row.context?.join(" ")||"∅")+
    " · scară efectivă "+row.contextDepth+" · surpriză "+row.surpriseBits?.toFixed(2)+" bits",
   "Ramuri reale cunoscute: "+(row.options||[]).map(x=>
     short(x.token,15)+" "+(100*x.p).toFixed(1)+"%").join(" | ")
  ]:[];
  pre.textContent=[
   "EPISOD REAL "+t.episode+" · exercițiul "+(t.corpusEpisode??"—")+
    " · corpus "+t.source,
   "INPUT: "+short(t.prompt,200),
   "FORMA ÎNAINTE DE RĂSPUNS: "+short(t.predictedAnswerPreview,240),
   "RĂSPUNS OBSERVAT DUPĂ PREDICȚIE: "+short(t.observedAnswerPreview,240),
   "Coincidență traseu liber: "+t.freeRunTokenMatches+"/"+t.freeRunCompared+
    " · acțiuni presecvențiale corecte: "+t.teacherForcedCorrect+"/"+t.teacherForcedCompared+
    " · control unigram: "+t.teacherForcedBaselineCorrect+"/"+t.teacherForcedCompared,
   ...extra,
   "Notă: linia albastră este răspunsul REAL din corpus, NU o mișcare executată autonom de Brain."
  ].join("\n");
 }
 drawTimeline(){
  const cv=this.timeline;if(!cv)return;
  const {w,h,dpr}=canvasSize(cv),g=cv.getContext("2d");
  g.fillStyle="#07131D";g.fillRect(0,0,w,h);
  const rows=this.snap?.timeline||[];
  text(g,"Acuratețe pe exerciții: context (auriu), unigram (gri), traseu liber (albastru)",12*dpr,16*dpr,C.dim,9);
  if(!rows.length)return;
  const border=21*dpr,top=30*dpr,bottom=h-17*dpr,
    x=i=>border+(w-2*border)*(rows.length===1?0:i/(rows.length-1)),
    y=v=>bottom-(bottom-top)*Math.max(0,Math.min(1,validNumber(v)));
  for(const threshold of [0,.25,.5,.75,1]){
    const yy=y(threshold);line(g,border,yy,w-border,yy,"#223748",1,true);
    text(g,(threshold*100)+"%",1*dpr,yy-3*dpr,C.dim,8);
  }
  const series=[["accuracy",C.gold],["baseline",C.grey],["freeRunAccuracy",C.blue]];
  for(const [field,color] of series){
   g.beginPath();g.strokeStyle=color;g.lineWidth=2*dpr;
   rows.forEach((row,i)=>{const xx=x(i),yy=y(row[field]);i?g.lineTo(xx,yy):g.moveTo(xx,yy);});
   g.stroke();
  }
 }
 async evaluate(){
  const w=this.getWorker(),out=get("hypermazeEvalOut"),btn=get("hypermazeEval");
  if(btn)btn.disabled=true;
  out.textContent="Evaluare înghețată pe exerciții nevăzute, din același corpus...";
  try{
   const resp=await fetch("/hypermaze-eval?w="+w+"&count=12",{method:"POST"});
   const result=await resp.json();if(result.error)throw Error(result.error);
   if(w!==this.getWorker())return;
   out.textContent=[
    "ÎNGHEȚAT · exerciții nevăzute "+result.rows+" · tokens "+result.tokens,
    "Predicție contextuală pe prefix observat "+pct(result.nextTokenAccuracy)+
      " · unigram "+pct(result.unigramAccuracy),
    "Generare liberă: "+pct(result.freeRunAccuracy)+
      " · NU este scor semantic sau rezolvare a întrebării.",
    "Train tokens înainte / după evaluare: "+
      result.trainingTokensBefore+" / "+result.trainingTokensAfter,
    ...(result.examples||[]).slice(0,3).map(x=>
      "Q: "+short(x.prompt,70)+"\nPRED: "+short(x.pred,100)+"\nREAL: "+short(x.observed,100))
   ].join("\n\n");
  }catch(err){out.textContent="Evaluarea a eșuat: "+err.message;}
  finally{if(btn)btn.disabled=false;}
 }
 exportTrace(){
  if(!this.snap||!this.trace){get("hypermazeInfo").textContent=
    "Nu există încă date reale pentru export.";return;}
  const blob=new Blob([JSON.stringify({worker:this.getWorker(),
     source:"actual-v17-corpus",snapshot:this.snap},null,2)],
     {type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="v17-text-hypermaze-graph-"+this.getWorker()+
    "-episode-"+this.episode+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
