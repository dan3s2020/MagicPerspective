// Pure visualization of recorded, executed graph-world V17 actions.
// Positions in the "4D" view are projections of FOUR measured graph features,
// NOT learnt 4D semantic coordinates. No synthetic motions or guessed nodes.
const get=id=>document.getElementById(id);
const COL={edge:'#29435b',initial:'#f5b301',local:'#00d7df',executed:'#68a8ff',
  alternative:'#36dd9a',cursor:'#fb526d',text:'#cce3f4'};
function surface(id){
  const c=get(id),g=c?.getContext('2d');if(!g)return null;
  const w=c.width,h=c.height;
  g.clearRect(0,0,w,h);g.fillStyle='#050d16';g.fillRect(0,0,w,h);
  return {c,g,w,h};
}
function label(g,value,x,y,color=COL.text,size=11){
  g.font=size+'px ui-monospace,monospace';g.fillStyle=color;
  g.fillText(String(value),x,y);
}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function topology(trace,w,h){
  const n=trace.nodes.length,depth=Array(n).fill(Infinity),queue=[0];
  const adj=Array.from({length:n},()=>[]);
  trace.edges.forEach(({from,to})=>{if(adj[from])adj[from].push(to);});
  depth[0]=0;
  for(let i=0;i<queue.length;i++)for(const to of adj[queue[i]])
    if(depth[to]===Infinity){depth[to]=depth[queue[i]]+1;queue.push(to);}
  const longest=Math.max(1,...depth.filter(Number.isFinite)),layers=new Map();
  trace.nodes.forEach((node,i)=>{
    const d=Number.isFinite(depth[i])?depth[i]:longest+1;
    if(!layers.has(d))layers.set(d,[]);
    layers.get(d).push(i);
  });
  const pos=new Map();
  for(const [layer,ids] of layers)for(let i=0;i<ids.length;i++)
    pos.set(ids[i],{x:26+(w-52)*layer/(longest+1),
      y:28+(h-67)*(i+.5)/ids.length});
  return pos;
}
const numeric=(node,key)=>node.dimension?.[key];
function metricProjection(trace,w,h,{axisX='attraction',axisY='successor',angle=0}){
  const all=['attraction','successor','distance','branching'];
  const used=[axisX,axisY],other=all.filter(k=>!used.includes(k));
  // Do not infer unmeasured dimensions; all four values are taken from trace.nodes.
  const axes=[axisX,axisY,other[0]||'distance',other[1]||'branching'];
  const range=new Map();
  for(const k of axes){
    const vals=trace.nodes.map(n=>numeric(n,k)).filter(Number.isFinite);
    range.set(k,[Math.min(0,...vals),Math.max(1e-9,...vals)]);
  }
  const normal=(n,key)=>{
    const v=numeric(n,key);
    if(!Number.isFinite(v))return .5;
    const [a,b]=range.get(key);
    return b>a?(v-a)/(b-a):.5;
  };
  const t=angle*Math.PI/180,c=Math.cos(t),s=Math.sin(t),points=[];
  for(const node of trace.nodes){
    const X=2*normal(node,axes[0])-1,Y=2*normal(node,axes[1])-1,
      Z=2*normal(node,axes[2])-1,W=2*normal(node,axes[3])-1;
    // A pair of 4D Givens rotations projected to 2D. Projection only.
    points.push({id:node.id,x:c*X+s*Z,y:c*Y+s*W});
  }
  const mx=Math.max(1,...points.map(p=>Math.abs(p.x))),
    my=Math.max(1,...points.map(p=>Math.abs(p.y)));
  return new Map(points.map(p=>[p.id,{
    x:clamp(w/2+p.x/mx*(w*.43),20,w-20),
    y:clamp(h/2-p.y/my*(h*.41),24,h-35)
  }]));
}
function route(g,ids,pos,color,width=2,dash=[]){
  if(!ids?.length)return;
  g.save();g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash);
  g.lineJoin='round';g.lineCap='round';let begun=false;
  g.beginPath();
  for(const i of ids){const p=pos.get(i);if(!p){begun=false;continue;}
    if(!begun){g.moveTo(p.x,p.y);begun=true;}else g.lineTo(p.x,p.y);}
  g.stroke();g.restore();
}
function heatNode(g,point,node,field,selected){
  const v=clamp(Number(field[node.id])||0,0,1);
  // The measured field controls glow intensity; this is a heatmap encoding.
  const radius=4.5+5*v;
  g.save();
  if(v>.01){
    g.globalAlpha=.17+.44*v;g.fillStyle='#ffc65a';g.beginPath();
    g.arc(point.x,point.y,radius+7*v,0,Math.PI*2);g.fill();}
  g.globalAlpha=1;
  g.fillStyle=node.kind===2?'#3ddc84':node.id===0?'#e7f6ff':'#579bc7';
  g.beginPath();g.arc(point.x,point.y,selected?radius+1:radius,0,Math.PI*2);g.fill();
  g.restore();
}
export function drawGlobalShape(trace,frameIndex,{projection='topology',
  axisX='attraction',axisY='successor',rotation=0,sweepIndex=Infinity,alternative=-1}={}){
  const c=surface('researchShapeMap');if(!c)return;
  if(!trace?.nodes?.length){label(c.g,'Aștept traseu real din workerul V17.',12,c.h/2);return;}
  const {g,w,h}=c,frame=trace.frames[clamp(frameIndex,0,trace.frames.length-1)];
  const pos=projection==='diagnostic'?
    metricProjection(trace,w,h,{axisX,axisY,angle:rotation}):topology(trace,w,h);
  const waves=frame.fieldWave||[],wave=waves.length?
    waves[clamp(sweepIndex,0,waves.length-1)]:null;
  const field=wave?.values||frame.field||[];
  const executed=trace.executed.slice(0,frame.index+1);
  g.save();g.globalAlpha=.55;g.strokeStyle=COL.edge;g.lineWidth=.85;
  for(const edge of trace.edges){
    const a=pos.get(edge.from),b=pos.get(edge.to);if(!a||!b)continue;
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
  g.restore();
  const alt=trace.alternatives[alternative];
  if(alt)route(g,alt.path,pos,COL.alternative,3,[8,3]);
  route(g,trace.initial.shape,pos,COL.initial,2.7,[7,5]);
  route(g,frame.shape,pos,COL.local,3.2,[3,3]);
  route(g,executed,pos,COL.executed,4);
  for(const node of trace.nodes)heatNode(g,pos.get(node.id),node,field,node.id===frame.at);
  const current=pos.get(frame.at);
  if(current){g.save();g.strokeStyle=COL.cursor;g.lineWidth=3;g.beginPath();
    g.arc(current.x,current.y,13,0,Math.PI*2);g.stroke();g.restore();
    const name=String(trace.nodes[frame.at]?.label||'').slice(0,36);
    label(g,'CURSOR #'+frame.at+' '+name,clamp(current.x+16,6,w-330),
      clamp(current.y-14,12,h-32),'#ff8ea3',12);}
  label(g,'Noduri: '+trace.nodes.length+' | muchii observate: '+trace.edges.length,11,h-9);
  label(g,projection==='diagnostic'?
    'PROIECȚIE măsurată 4D (NU geometrie semantică învățată)':'TOPOLOGIE — graf observat',11,16,'#ffe0a1');
  label(g,'cadru '+(frame.index+1)+'/'+trace.frames.length+' | câmp iterația '+
    (wave?.iteration??frame.fieldSweeps??0),w-280,h-9,'#8bb9cc');
}
export function drawLocalCursor(trace,frameIndex){
  const c=surface('researchLocal');if(!c)return;
  if(!trace?.frames?.length){label(c.g,'Aștept actorul și vecinii real observați.',12,c.h/2);return;}
  const {g,w,h}=c,f=trace.frames[clamp(frameIndex,0,trace.frames.length-1)];
  const ox=140,oy=h/2;const next=trace.frames[frameIndex+1];
  g.fillStyle=COL.cursor;g.beginPath();g.arc(ox,oy,25,0,7);g.fill();
  label(g,'SELF / CURSOR',54,oy-39,'#ff8ca7',13);
  label(g,'#'+f.at,ox-10,oy+5,'#fff',15);
  label(g,String(f.atLabel||'').slice(0,32),15,oy+46,'#cfeafa',11);
  const neighbors=f.visibleNeighbors||[],n=Math.min(12,neighbors.length);
  if(!n)label(g,f.targetReached?'ȚINTĂ stocată atinsă':'Fără vecini validați',260,oy,'#a5b8ca');
  for(let i=0;i<n;i++){
    const v=neighbors[i],x=w*.56,y=20+(h-42)*(i+.5)/n,
      chosen=next?.action===v.action&&next.from===f.at;
    g.strokeStyle=chosen?COL.executed:v.rising?COL.local:COL.edge;
    g.lineWidth=chosen?3:1;g.beginPath();g.moveTo(ox+28,oy);g.lineTo(x-16,y);g.stroke();
    g.fillStyle=chosen?'#68a8ff':v.kind===2?'#3ddc84':'#38668b';
    g.beginPath();g.arc(x,y,10,0,7);g.fill();
    label(g,'a'+v.action+' → #'+v.to+' '+String(trace.nodes[v.to]?.label||'').slice(0,23),
      x+18,y-1,chosen?'#bde6ff':'#b0c5d8',11);
    label(g,'F '+Number(v.field||0).toFixed(3)+' · SR '+Number(v.successor||0).toFixed(3)+
      ' · paths '+v.shortestPaths,x+18,y+12,'#819fb5',9);
  }
  label(g,'Opțiunile sunt muchii existente în atlas, nu mișcări prin semnificația textului.',12,h-6,'#779bb4');
}
