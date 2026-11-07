// Interactive OFFLINE 4D slice atlas, reading only real benchmark outputs.
// Keeps full evidence IDs, route alternatives, failed steps and all 96 attempts.
// No server, hidden physics or fake sample graphs are used by the browser.
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
function client(){
 const data=JSON.parse(document.getElementById("payload").textContent),a=data.atlas,
  r=data.results,t=data.training,$=id=>document.getElementById(id);
 const canvas=$("map"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
 const colors=["#30bced","#e7bb50","#9e87ff","#b5db73","#e179e5","#66dfc0","#f39064","#e6a5a5"];
 const coord=id=>a.nodes[id].coordinates;
 const pos=id=>{const v=coord(id);return {x:44+v[2]*278+32+v[0]*54,y:39+v[3]*187+34+v[1]*33}};
 const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("ro-RO"):String(n);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let chosen=-1;
 const kinds=["path","all","wall","inferred","observed","flat"];
 $("action").innerHTML="<option value='all'>Toate acțiunile</option>"+r.atlas.models.map(x=>"<option>"+escape(x.action)+"</option>").join("");
 const metrics=[["Stări 4D",256],["Tranziții candidate",a.edges.length],
  ["Văzute pentru aceeași stare/acțiune",a.edges.filter(e=>e.observedDirectly).length],
  ["Inferate din alte lumi",a.edges.filter(e=>!e.observedDirectly).length],
  ["Pereți fizici",a.walls.length],["Reguli condiționale",r.atlas.discoveredConditionalRules],
  ["Observații reținute",t.events.length],["Lumi precedente",r.trainingWorlds],
  ["Rezolvate cu contexte",r.transfer.correct+"/"+r.worlds],
  ["Rezolvate cu deplasări fixe",r.baseline.correct+"/"+r.worlds]];
 $("metrics").innerHTML=metrics.map(([k,v])=>"<div class='metric'><b>"+fmt(v)+"</b><small>"+escape(k)+"</small></div>").join("");
 $("rules").innerHTML=r.atlas.models.map(m=>"<tr><td>"+escape(m.action)+"</td><td>"+fmt(m.examples)+"</td><td>"+
  escape(m.condition||"constantă")+"</td><td>"+Number(m.gain).toFixed(3)+"</td><td>"+m.sourceWorlds+"</td></tr>").join("");
 function line(e,color,width=1,opacity=1){const x=pos(e.from),y=pos(e.to);ctx.globalAlpha=opacity;ctx.lineWidth=width;ctx.strokeStyle=color;
  ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke();ctx.globalAlpha=1;}
 function paint(){
  ctx.fillStyle="#091725";ctx.fillRect(0,0,W,H);ctx.font="13px system-ui";ctx.lineWidth=1;
  for(let i=0;i<16;i++){const x=44+(i%4)*278,y=39+Math.floor(i/4)*187;
   ctx.strokeStyle="#254158";ctx.strokeRect(x,y,253,166);ctx.fillStyle="#abc3d8";
   ctx.fillText("x2="+(i%4)+", x3="+Math.floor(i/4),x+8,y+18);}
  const mode=$("mode").value,act=$("action").value;
  if(["all","wall","inferred","observed"].includes(mode))
   for(const e of a.edges){
    if(act!=="all"&&e.action!==act)continue;
    if(mode==="wall"&&!e.blocked)continue;
    if(mode==="inferred"&&e.observedDirectly)continue;
    if(mode==="observed"&&!e.observedDirectly)continue;
    line(e,e.blocked?"#987177":e.observedDirectly?colors[r.atlas.models.findIndex(x=>x.action===e.action)%colors.length]:"#488db9",
     mode==="all"?.6:1.25,mode==="all"?.13:.48);
   }
  if(mode==="path"||mode==="flat")for(const e of mode==="path"?a.world.correctedPath:a.world.flatPlan.route)
   line(e,mode==="path"?"#52ffd4":"#ff8581",4,.95);
  for(const n of a.nodes){const p=pos(n.id);ctx.beginPath();
   ctx.arc(p.x,p.y,n.id===chosen?7:n.id===a.world.start||n.id===a.world.goal?6:3.5,0,Math.PI*2);
   ctx.fillStyle=n.id===chosen?"#ffe899":n.id===a.world.start?"#ffe99a":
    n.id===a.world.goal?"#ff9fc3":n.passable?"#a1c1d8":"#555967";ctx.fill();
  }
  ctx.font="bold 12px system-ui";
  for(const [title,n] of [["START",a.world.start],["GOAL",a.world.goal]]){
   const p=pos(n);ctx.fillStyle="#fff";ctx.fillText(title,p.x+8,p.y-6);
  }
 }
 function inspectEdge(e){
  chosen=e.from;paint();const examples=e.evidenceIds.map(n=>t.events[n]).filter(Boolean);
  $("inspect").innerHTML="<h3>"+escape(e.action)+": ("+coord(e.from)+") → ("+coord(e.to)+")</h3>"+
   "<p>Condiție: <b>"+escape(e.modelCondition||"constantă")+"</b>; încredere: "+(100*e.confidence).toFixed(1)+
   "%; blocat: "+e.blocked+"; observat direct: "+e.observedDirectly+"</p>"+
   "<p>Dovezi: "+examples.length+" în "+e.sourceWorlds.length+" lumi. FIECARE observație:</p><pre>"+
   escape(JSON.stringify(examples,null,2))+"</pre>";
 }
 function inspectNode(n){
  chosen=n;paint();const edges=a.edges.filter(x=>x.from===n);
  $("inspect").innerHTML="<h3>Stare ("+coord(n)+") — "+(a.nodes[n].passable?"deschisă":"perete")+"</h3>"+
   edges.map(e=>"<button data-edge='"+a.edges.indexOf(e)+"'>"+escape(e.action)+" → ("+coord(e.to)+")</button>").join(" ");
 }
 canvas.addEventListener("click",event=>{const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*W/rect.width,
  y=(event.clientY-rect.top)*H/rect.height;let best=-1,distance=17**2;
  for(const n of a.nodes){const p=pos(n.id),d=(p.x-x)**2+(p.y-y)**2;if(d<distance){best=n.id;distance=d}}
  if(best>=0)inspectNode(best);
 });
 $("inspect").addEventListener("click",event=>{const node=event.target.closest("[data-edge]");if(node)inspectEdge(a.edges[+node.dataset.edge]);});
 function table(){
  const search=$("search").value.toLowerCase(),act=$("action").value;let rows=a.edges.filter(e=>act==="all"||e.action===act);
  if(search)rows=rows.filter(e=>(e.action+" "+e.from+" "+e.to+" "+e.sourceWorlds.join(" ")).toLowerCase().includes(search));
  $("count").textContent=rows.length+" potriviri; TOATE cele 2048 de muchii sunt în atlas.json. Primele "+Math.min(100,rows.length)+" sunt afișate.";
  $("edges").innerHTML=rows.slice(0,100).map(e=>"<tr data-edge='"+a.edges.indexOf(e)+"'><td>("+coord(e.from)+")</td><td>"+
   escape(e.action)+"</td><td>("+coord(e.to)+")</td><td>"+(e.blocked?"PERETE":"—")+
   "</td><td>"+(e.observedDirectly?"DA":"inferat")+"</td><td>"+(100*e.confidence).toFixed(1)+"%</td></tr>").join("");
 }
 $("edges").addEventListener("click",event=>{const el=event.target.closest("[data-edge]");if(el)inspectEdge(a.edges[+el.dataset.edge]);});
 $("attempts").innerHTML=r.attempts.map((x,i)=>"<tr data-row='"+i+"'><td>"+x.worldSeed+"</td><td>"+
  (x.conditional.success?"REUȘIT":"EȘUAT")+"</td><td>"+(x.flat.success?"REUȘIT":"EȘUAT")+
  "</td><td>"+escape(x.flat.firstMismatch?.action||x.flat.reason)+"</td><td>"+
  escape(x.flat.firstWrongCharacter?.predicted||"—")+" → "+escape(x.flat.firstWrongCharacter?.expected||"—")+"</td></tr>").join("");
 $("attempts").addEventListener("click",event=>{const el=event.target.closest("[data-row]");if(el)$("attemptDetails").textContent=JSON.stringify(r.attempts[+el.dataset.row],null,2);});
 const good=a.world.correctedOutcome,flat=a.world.flatOutcome;
 $("routes").innerHTML="<h3>FORMA COMPLETĂ, înaintea acțiunii:</h3><p class='green'>"+
  escape(a.world.beforeActionShape.join(" → "))+"</p><p>Start: ("+coord(a.world.start)+") · scop: ("+
  coord(a.world.goal)+") · execuție corectă: "+good.success+"</p><h3>CONTROLUL fără context</h3><p class='red'>"+
  escape(a.world.flatPlan.solutionShape?.join(" → ")||"niciun traseu")+"</p><pre>"+
  escape(JSON.stringify({firstMismatch:flat.firstMismatch,
    firstWrongCharacter:a.world.firstWrongCharacter,correctedTrace:good.trace},null,2))+"</pre>";
 $("failures").textContent=r.baseline.noPath+" lumi fără traseu; "+r.baseline.mismatches+
  " prime nepotriviri de succesor; "+r.baseline.correct+"/"+r.worlds+" rute reușite cu presupunerea greșită că transformările sunt fixe.";
 $("unknown").textContent="Cu o singură lume-sursă, 7 acțiuni nu au dovezi: 256 × 7 = 1792 muchii UNKNOWN. Nu sunt confundate cu pereții fizici. Schimbarea fizicii unui operator în lumea nouă invalidează 256/2048 muchii. Nu presupune perfecțiune pe limbajul natural.";
 for(const id of ["mode","action"])$(id).addEventListener("change",()=>{paint();table()});
 $("search").addEventListener("input",table);
 paint();table();
}
export function renderAtlasHTML(atlas,results,training){
 const payload=JSON.stringify({atlas,results,training}).replace(/</g,"\\u003c");
 const styles="body{margin:0;background:#081522;color:#e1eef8;font:14px/1.5 system-ui,Segoe UI}h1{font-size:23px}h2{font-size:17px}header{padding:20px;border-bottom:1px solid #29445c}.muted,small{color:#a2b5c8}.warning{color:#f3ca7c}.green{color:#6fffd6}.red{color:#ff9d9d}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;padding:16px}.metric{background:#152a40;padding:11px;border-radius:9px}.metric b{display:block;color:#6fffd6;font-size:21px}main{display:grid;grid-template-columns:minmax(650px,1.7fr) minmax(310px,1fr);gap:13px;padding:0 16px}@media(max-width:1150px){main{display:block}}.panel{background:#122337;border:1px solid #2b4860;padding:14px;border-radius:9px;margin-bottom:14px}canvas{width:100%;height:auto;background:#091725;border:1px solid #2a485f;border-radius:8px}select,input,button{color:#e9f4ff;background:#1c3b51;border:1px solid #3b6078;padding:7px;border-radius:5px;margin:3px;cursor:pointer}.scroll{max-height:360px;overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;padding:6px;border-bottom:1px solid #284358}tr:hover{background:#244053;cursor:pointer}th{position:sticky;top:0;background:#244053}pre{white-space:pre-wrap;overflow:auto;max-height:340px;background:#0b1928;padding:10px;font-size:11px;word-break:break-word}footer{color:#a2b5c8;padding:20px;border-top:1px solid #284358}";
 const html="<!doctype html><html lang='ro'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>MagicPerspective — Atlas 4D complet</title><style>"+
  styles+"</style></head><body><header><h1>MagicPerspective / Atlasul real al transformărilor 4D</h1>"+
  "<p class='muted'>Atlas persistent din 32 lumi-sursă. Arată TOATE cele 2048 posibilități dintr-o lume nevăzută, dovezi, pereți, rute reușite și eșuate.</p>"+
  "<p class='warning'>Limbaj procedural cu coordonate explicite — nu înseamnă întreaga limbă naturală sau antrenare completă CUDA.</p></header>"+
  "<div id='metrics' class='metrics'></div><main><section>"+
  "<div class='panel'><h2>Harta 4D, proiectată în 16 secțiuni 2D</h2><label>Muchii <select id='mode'><option value='path'>Traseu prezis înaintea acțiunii</option><option value='all'>Toate</option><option value='wall'>Pereți</option><option value='inferred'>Inferate din alte lumi</option><option value='observed'>Observate direct</option><option value='flat'>Traseul GREȘIT fără context</option></select></label>"+
  "<label>Acțiune <select id='action'></select></label><canvas id='map' width='1200' height='860'></canvas>"+
  "<p class='muted'>Fiecare din cele 16 panouri arată (x0,x1) pentru o pereche fixă (x2,x3). Click pentru toate acțiunile posibile.</p></div>"+
  "<div class='panel'><h2>Toate transformările (fără decimare în JSON)</h2><input id='search' placeholder='Caută stare, acțiune, sursă'><div id='count' class='muted'></div>"+
  "<div class='scroll'><table><thead><tr><th>Din</th><th>Acțiune</th><th>În</th><th>Barieră</th><th>Observat</th><th>Încredere</th></tr></thead><tbody id='edges'></tbody></table></div></div>"+
  "<div class='panel'><h2>Reguli cauzale descoperite</h2><table><thead><tr><th>Acțiune</th><th>Observații</th><th>Condiție</th><th>Scor</th><th>Lumi-sursă</th></tr></thead><tbody id='rules'></tbody></table></div>"+
  "<div class='panel'><h2>Toate cele 96 de lumi nevăzute — rute și greșeli</h2><div class='scroll'><table><thead><tr><th>Lume</th><th>Contextual</th><th>Fix</th><th>Prima greșeală</th><th>Caracter</th></tr></thead><tbody id='attempts'></tbody></table></div><pre id='attemptDetails'>Selectează o lume pentru trasarea completă a fiecărui pas.</pre></div>"+
  "</section><section><div class='panel'><h2>Forma soluției înaintea primei mișcări</h2><div id='routes'></div></div>"+
  "<div class='panel'><h2>De ce nu a găsit calea?</h2><p id='failures'></p></div>"+
  "<div class='panel'><h2>Explorează proveniența tuturor căilor</h2><div id='inspect'>Click pe un nod sau pe un rând din tabel.</div></div>"+
  "<div class='panel'><h2>Transformări lipsă / restricții de design</h2><div id='unknown'></div></div></section></main>"+
  "<footer>Proveniență verificabilă: atlas.json / results.json / learned-transforms.json. Referința oracolului există numai în evaluare, nu în model.</footer>"+
  "<script id='payload' type='application/json'>"+payload+"</script><script>("+client.toString()+")();</script></body></html>";
 return html;
}
export function writeAtlasHTML(dir){
 const p=path.resolve(dir),r=f=>JSON.parse(fs.readFileSync(path.join(p,f),'utf8'));
 const output=path.join(p,'atlas.html');
 fs.writeFileSync(output,renderAtlasHTML(r('atlas.json'),r('results.json'),r('learned-transforms.json')));
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 console.log(writeAtlasHTML(process.argv[2]||'atlas-output'));
