// Single-map renderer. The organism layers come from the frame (belief, cloud, routes);
// the evaluator layers (real map, real route) are drawn only when the human enables them.
const C={bg:'#0d1526',fog:'#18213a',floor:'#3f6068',wall:'#5d6682',maybeWall:'#46506c',cloud:[255,172,72],gold:'#ffc078',teal:'#6ce1bd',blue:'#8fc3ff',red:'#ff7a8a',window:'#c9d2f7'};
const lim=(v,a,b)=>Math.max(a,Math.min(b,v));
function setup(canvas){const css=canvas.clientWidth||600,dpr=Math.min(3,window.devicePixelRatio||1),px=Math.round(css*dpr);
  if(canvas.width!==px){canvas.width=px;canvas.height=px;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,css,css);ctx.lineCap='round';ctx.lineJoin='round';return {ctx,size:css};}
function line(ctx,nodes,xy,color,width,dash){if(!nodes||nodes.length<2)return;ctx.beginPath();nodes.forEach((n,k)=>{const p=xy(n);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);}
function dot(ctx,p,r,fill,label){ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#0b1220';ctx.stroke();
  if(label){ctx.fillStyle='#0b1220';ctx.font=`800 ${Math.max(9,r*1.1)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y+.5);}}
function cloud(ctx,spec,q,xy,width){ // probability cloud over relations: brighter = more likely part of the solution
  ctx.save();ctx.lineCap='butt';
  for(const l of spec.links){const v=q[l.id];if(!(v>.12))continue;const a=xy(l.a),b=xy(l.b);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(${C.cloud.join(',')},${lim(Math.pow(v,1.3)*.6,.04,.6)})`;ctx.lineWidth=width*(.35+.65*v);ctx.stroke();}
  ctx.restore();}
function crosses(ctx,spec,ids,xy,r){ctx.strokeStyle=C.red;ctx.lineWidth=2.5;for(const id of ids||[]){const l=spec.links[id],a=xy(l.a),b=xy(l.b),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  ctx.beginPath();ctx.moveTo(m.x-r,m.y-r);ctx.lineTo(m.x+r,m.y+r);ctx.moveTo(m.x+r,m.y-r);ctx.lineTo(m.x-r,m.y+r);ctx.stroke();}}
export function drawMap(canvas,spec,f,layers,extra){
  const {ctx,size}=setup(canvas),open=extra.evaluator?.open,status=f.known,observed=f.observed;
  const adj=Array.from({length:spec.nodes},()=>[]);for(const l of spec.links){adj[l.a].push(l.id);adj[l.b].push(l.id);}
  let xy,unit;
  if(spec.kind==='graph'){const span=size-56,c=size/2;xy=i=>({x:c+(spec.layout[i].x-.5)*span,y:c+(spec.layout[i].y-.5)*span});unit=lim(size/Math.sqrt(spec.nodes)/4.2,4,12);
    for(const l of spec.links){const s=status[l.id],t=open?.[l.id];const a=xy(l.a),b=xy(l.b);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
      if(s===1){ctx.strokeStyle='rgba(176,192,226,.7)';ctx.lineWidth=2.2;ctx.setLineDash([]);}
      else if(s===0){ctx.strokeStyle='rgba(255,122,138,.35)';ctx.lineWidth=1;ctx.setLineDash([2,4]);}
      else if(layers.truth){ctx.strokeStyle=t?'rgba(176,192,226,.28)':'rgba(255,122,138,.14)';ctx.lineWidth=1;ctx.setLineDash([]);}
      else{ctx.strokeStyle='rgba(120,135,175,.22)';ctx.lineWidth=1;ctx.setLineDash([3,5]);}
      ctx.stroke();ctx.setLineDash([]);}
  }else{const n=spec.size,pad=14,side=(size-2*pad)/n;unit=side;xy=i=>({x:pad+(i%n+.5)*side,y:pad+(Math.floor(i/n)+.5)*side});
    for(let i=0;i<spec.nodes;i++){const ids=adj[i],st=ids.map(id=>status[id]),x=pad+(i%n)*side,y=pad+Math.floor(i/n)*side;let fill=C.fog,alpha=1;
      if(observed[i]){if(st.some(s=>s===1)||i===f.position)fill=C.floor;else if(st.every(s=>s===0))fill=C.wall;else fill=C.maybeWall;}
      else if(layers.truth){const isFloor=ids.some(id=>open[id])||i===spec.start||i===spec.goal;fill=isFloor?C.floor:C.wall;alpha=.38;}
      ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.fillRect(x+.6,y+.6,side-1.2,side-1.2);ctx.globalAlpha=1;
      if(!observed[i]&&!layers.truth&&side>16){ctx.fillStyle='#2e3a5c';ctx.font=`${side*.3}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',x+side/2,y+side/2);}}
  }
  if(layers.cloud&&f.q)cloud(ctx,spec,f.q,xy,spec.kind==='graph'?unit*1.6:unit*.62);
  // Order keeps every line visible where they overlap: wide real route below, thin predictions on top.
  if(layers.optimal)line(ctx,f.truth,xy,'rgba(108,225,189,.55)',lim(unit*.42,5,14));
  if(layers.walked)line(ctx,f.walked,xy,C.blue,lim(unit*.2,3,6));
  if(layers.route)line(ctx,f.route,xy,C.gold,lim(unit*.11,2,3.5));
  if(layers.initial)line(ctx,extra.initial,xy,'#fff1d6',lim(unit*.07,1.4,2.4),[5,5]);
  crosses(ctx,spec,f.contradicted,xy,lim(unit*.18,4,8));
  if(spec.kind!=='graph'){const n=spec.size,pad=14,side=(size-2*pad)/n,px=f.position%n,py=Math.floor(f.position/n),x0=Math.max(0,px-1),y0=Math.max(0,py-1);
    ctx.strokeStyle=C.window;ctx.lineWidth=1.4;ctx.setLineDash([4,4]);ctx.strokeRect(pad+x0*side,pad+y0*side,(Math.min(n-1,px+1)-x0+1)*side,(Math.min(n-1,py+1)-y0+1)*side);ctx.setLineDash([]);}
  else{for(let i=0;i<spec.nodes;i++){const p=xy(i);ctx.beginPath();ctx.arc(p.x,p.y,unit*.55,0,7);ctx.fillStyle=observed[i]?'#8ea3c3':'#2f3b58';ctx.fill();}}
  const r=lim(unit*.3,6,13);dot(ctx,xy(spec.start),r*.7,'#5d6f9a');dot(ctx,xy(spec.goal),r,C.teal,'G');dot(ctx,xy(f.position),r,C.blue,'S');
}
// Simple multi-series line chart. series: [{values,color,dash,max}] ; marks: steps with resistance ; cursor: current index
export function drawChart(canvas,series,{marks=[],cursor=null,labels=[],xLabel=''}={}){
  const w=canvas.clientWidth||560,h=Math.round(w/2.4),dpr=Math.min(3,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);
  const L=34,R=w-10,T=14,B=h-24,n=Math.max(...series.map(s=>s.values.length),1);
  ctx.strokeStyle='#33405c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,T);ctx.lineTo(L,B);ctx.lineTo(R,B);ctx.stroke();
  ctx.fillStyle='#8d9cb8';ctx.font='11px system-ui';ctx.textAlign='right';ctx.fillText('1',L-6,T+8);ctx.fillText('0',L-6,B);ctx.textAlign='left';ctx.fillText(xLabel,L+4,h-6);
  if(n<2&&series.every(s=>s.values.length<2)){ctx.fillText(labels[0]||'Datele apar după primii pași',L+12,(T+B)/2);}
  const X=i=>L+(n<2?0:i/(n-1))*(R-L);
  ctx.strokeStyle='rgba(255,122,138,.55)';for(const m of marks){ctx.beginPath();ctx.moveTo(X(m),B);ctx.lineTo(X(m),B-10);ctx.lineWidth=2;ctx.stroke();}
  for(const s of series){const mx=s.max||1;ctx.beginPath();s.values.forEach((v,i)=>{const y=B-lim(v/mx,0,1)*(B-T);i?ctx.lineTo(X(i),y):ctx.moveTo(X(i),y);});
    ctx.strokeStyle=s.color;ctx.lineWidth=2.2;ctx.setLineDash(s.dash||[]);ctx.stroke();ctx.setLineDash([]);}
  if(cursor!==null&&n>1){ctx.strokeStyle='rgba(201,210,247,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(cursor),T);ctx.lineTo(X(cursor),B);ctx.stroke();}
}
