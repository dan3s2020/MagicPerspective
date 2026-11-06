// REAL server-derived values only. Original V17 NestView canvas is not replaced.
const node=id=>document.getElementById(id);
const ink='#a5b8ca';
function canvas(id) {const c=node(id),g=c?.getContext('2d');if(!g)return null;
  g.clearRect(0,0,c.width,c.height);g.fillStyle='#050d16';g.fillRect(0,0,c.width,c.height);
  return {g,w:c.width,h:c.height};}
function label(g,t,x,y,color=ink){g.fillStyle=color;g.font='11px ui-monospace,monospace';g.fillText(String(t),x,y);}
export function empty(id,message){const c=canvas(id);if(c)label(c.g,message,14,c.h/2);}
export function trend(id,records,series,percent=true){
  const c=canvas(id);if(!c)return;
  const {g,w,h}=c,L=48,T=30,R=12,B=35,ww=w-L-R,hh=h-T-B;
  if(!records?.length){empty(id,'Se așteaptă măsurători din creierul real.');return;}
  const max=percent?1:Math.max(1,...records.flatMap(r=>series.map(s=>Number(r[s.key])||0)));
  for(let j=0;j<=4;j++){const y=T+hh*j/4;g.strokeStyle='#203345';g.lineWidth=.7;
    g.beginPath();g.moveTo(L,y);g.lineTo(w-R,y);g.stroke();
    label(g,percent?Math.round(100*(1-j/4))+'%':Math.round(max*(1-j/4)),4,y+4);}
  let offset=L;for(const seriesItem of series){
    label(g,'● '+seriesItem.title,offset,15,seriesItem.color);offset+=88;
    g.beginPath();g.lineWidth=2;g.strokeStyle=seriesItem.color;
    for(let i=0;i<records.length;i++){
      const v=Math.max(0,Number(records[i][seriesItem.key])||0);
      const x=L+(records.length===1?.5:i/(records.length-1))*ww;
      const y=T+hh*(1-Math.min(1,v/max));
      if(i)g.lineTo(x,y);else g.moveTo(x,y);
    }g.stroke();}
  label(g,'Exercițiu '+records[0].sample,L,h-10);
  label(g,'Exercițiu '+records.at(-1).sample,w-130,h-10);
}
export function pathGraph(sample) {
  const c=canvas('researchMap');if(!c)return;
  const {g,w,h}=c,model=sample?.graph;
  if(!model?.nodes?.length){empty('researchMap','Graful observat nu este încă disponibil.');return;}
  const nodes=model.nodes,edges=model.edges.filter(([a,b])=>a<nodes.length&&b<nodes.length);
  const outgoing=Array.from({length:nodes.length},()=>[]);
  edges.forEach(([a,b])=>outgoing[a].push(b));
  const distances=Array(nodes.length).fill(Infinity),queue=[0];distances[0]=0;
  for(let i=0;i<queue.length;i++)for(const next of outgoing[queue[i]])
    if(!Number.isFinite(distances[next])){distances[next]=distances[queue[i]]+1;queue.push(next);}
  const maxDepth=Math.max(1,...distances.filter(Number.isFinite)),layers=new Map(),pos=new Map();
  distances.forEach((d,i)=>{const depth=Number.isFinite(d)?d:maxDepth+1;
    if(!layers.has(depth))layers.set(depth,[]);layers.get(depth).push(i);});
  for(const [depth,ids] of layers)ids.slice(0,30).forEach((id,i)=>pos.set(id,{
    x:20+(w-44)*depth/(maxDepth+1),y:25+(h-55)*(i+.5)/Math.min(ids.length,30)}));
  const pathSet=xs=>new Set((xs||[]).slice(1).map((b,i)=>xs[i]+':'+b));
  const a=pathSet(sample.path?.original),b=pathSet(sample.path?.successor);
  for(const [from,to] of edges){const x=pos.get(from),y=pos.get(to);if(!x||!y)continue;
    const key=from+':'+to;
    g.strokeStyle=b.has(key)?'#3ddc84':a.has(key)?'#f5b301':'#304b66';
    g.globalAlpha=a.has(key)||b.has(key)?1:.4;
    g.lineWidth=a.has(key)||b.has(key)?2.6:1;
    g.beginPath();g.moveTo(x.x,x.y);g.lineTo(y.x,y.y);g.stroke();}
  g.globalAlpha=1;
  for(let i=0;i<nodes.length;i++){const p=pos.get(i);if(!p)continue;
    g.fillStyle=nodes[i].kind===2?'#3ddc84':i===0?'#fff':'#7cc9ff';
    g.beginPath();g.arc(p.x,p.y,4,0,7);g.fill();}
  for(const id of (sample.path?.successor||[]).slice(0,7)){const p=pos.get(id);if(!p)continue;
    const name=String(nodes[id]?.label||id).slice(0,22);
    label(g,name,Math.min(w-190,p.x+6),Math.max(14,p.y-8),'#dbebf9');}
  label(g,nodes.length+' noduri / '+edges.length+' muchii reale',12,h-8);
}
