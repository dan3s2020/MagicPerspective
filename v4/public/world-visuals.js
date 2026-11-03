// Visuals are viewer-only. The model never receives evaluator-only hidden truth.
const C={bg:'#0d1627',floor:'#2c4149',wall:'#59617b',unknown:'#1a243b',goal:'#76eac0',self:'#92c4ff',forecast:'#ffc47c'};
const limit=(v,a,b)=>Math.min(b,Math.max(a,v));
function edgeState(e,truth,id){return truth?(e.teacher.truth[id].open?1:0):e.belief.status[id];}
function prepare(id,mini){
 const canvas=document.getElementById(id),size=mini?320:580,dpr=Math.min(3,window.devicePixelRatio||1);
 const pixel=Math.round(size*dpr);
 if(canvas.width!==pixel||canvas.height!==pixel){canvas.width=pixel;canvas.height=pixel;}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,size,size);ctx.lineJoin='round';ctx.lineCap='round';
 return {ctx,size};
}
function route(ctx,nodes,xy,color,width,dashed){
 if(!nodes||nodes.length<2)return;
 ctx.beginPath();nodes.forEach((i,k)=>{const p=xy(i);if(k)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[width*2.7,width*1.7]:[]);
 ctx.stroke();ctx.setLineDash([]);
}
function marker(ctx,id,xy,color,label,r){
 const p=xy(id);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
 ctx.lineWidth=1.5;ctx.strokeStyle='#0c1525';ctx.stroke();
 ctx.fillStyle='#0a1724';ctx.font='800 '+Math.max(9,r*1.15)+'px system-ui';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y+.5);
}
function drawGrid(ctx,e,truth,size,mini){
 const spec=e.spec,n=spec.size,pad=mini?17:25,area=size-2*pad,side=area/n;
 const xy=i=>({x:pad+((i%n)+.5)*side,y:pad+(Math.floor(i/n)+.5)*side});
 const connected=Array.from({length:spec.nodes},()=>[]);
 for(const link of spec.links){connected[link.a].push(link.id);connected[link.b].push(link.id);}
 for(let i=0;i<spec.nodes;i++){
  const edges=connected[i],states=edges.map(id=>edgeState(e,truth,id));
  const knownFloor=truth?(i===spec.start||i===spec.goal||states.some(s=>s===1)):
   e.belief.observed[i]||states.some(s=>s===1);
  const knownBarrier=!knownFloor&&states.length>0&&states.every(s=>s===0);
  const x=pad+(i%n)*side,y=pad+Math.floor(i/n)*side;
  ctx.fillStyle=knownFloor?C.floor:knownBarrier?C.wall:C.unknown;
  ctx.fillRect(x+.7,y+.7,Math.max(.1,side-1.4),Math.max(.1,side-1.4));
  if(!truth&&!knownFloor&&!knownBarrier&&side>15){
   ctx.fillStyle='#415374';ctx.font=Math.max(8,side*.29)+'px system-ui';
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',x+side/2,y+side/2);
  }
 }
 if(truth){
  for(const link of spec.links){if(edgeState(e,true,link.id)!==1)continue;
   const a=xy(link.a),b=xy(link.b);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
   ctx.strokeStyle='rgba(104,202,174,.18)';ctx.lineWidth=side*.19;ctx.stroke();}
  route(ctx,e.teacher.path,xy,C.goal,Math.max(2,side*.22),false);
 }else{
  for(const candidate of e.plan.alternatives||[])
   route(ctx,candidate.nodes,xy,'rgba(222,154,246,.5)',Math.max(1.7,side*.15),true);
  route(ctx,e.plan.nodes,xy,C.forecast,Math.max(2.3,side*.21),true);
  const px=e.position%n,py=Math.floor(e.position/n),lx=Math.max(0,px-1),ly=Math.max(0,py-1);
  ctx.strokeStyle='#c4ccf6';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
  ctx.strokeRect(pad+lx*side,pad+ly*side,(Math.min(n-1,px+1)-lx+1)*side,
   (Math.min(n-1,py+1)-ly+1)*side);ctx.setLineDash([]);
 }
 marker(ctx,e.position,xy,C.self,'S',limit(side*.27,mini?5:7,14));
 marker(ctx,spec.goal,xy,C.goal,'G',limit(side*.27,mini?5:7,14));
}
function drawNetwork(ctx,e,truth,size,mini){
 const spec=e.spec,span=size-(mini?40:70),center=size/2;
 const xy=i=>({x:center+(spec.layout[i].x-.5)*span,y:center+(spec.layout[i].y-.5)*span});
 // Draw hidden/closed links first, passable links second, hypotheses last.
 for(const status of [0,-1,1])for(const link of spec.links){
  if(edgeState(e,truth,link.id)!==status)continue;
  const a=xy(link.a),b=xy(link.b);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
  ctx.lineWidth=status===1?(mini?1.7:2.5):(mini?.65:1);
  ctx.strokeStyle=status===1?'rgba(90,201,166,.5)':status===0?'rgba(114,125,152,.18)':'rgba(107,121,161,.24)';
  ctx.setLineDash(status===-1?[3,5]:[]);ctx.stroke();
 }
 ctx.setLineDash([]);
 const radius=limit(270/Math.sqrt(spec.nodes),mini?2.7:3.4,mini?6:8.5);
 if(truth)route(ctx,e.teacher.path,xy,C.goal,mini?3:5,false);
 else{for(const candidate of e.plan.alternatives||[])
   route(ctx,candidate.nodes,xy,'rgba(225,157,250,.5)',mini?2:3,true);
  route(ctx,e.plan.nodes,xy,C.forecast,mini?3:5,true);}
 for(let i=0;i<spec.nodes;i++){
  const p=xy(i);ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
  ctx.fillStyle=truth||e.belief.observed[i]?'#8399b7':'#34415f';ctx.fill();
  if(!mini&&(spec.nodes<=36||e.belief.observed[i])&&i!==spec.goal&&i!==e.position){
   ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillStyle='#c3cde1';ctx.fillText(String(i),p.x,p.y-radius-3);
  }
 }
 marker(ctx,e.position,xy,C.self,'S',Math.max(7,radius+4));
 marker(ctx,spec.goal,xy,C.goal,'G',Math.max(7,radius+4));
}
export function drawWorld(id,e,truth,{mini=false}={}){
 const {ctx,size}=prepare(id,mini);
 if(e.spec.kind==='graph')drawNetwork(ctx,e,truth,size,mini);
 else drawGrid(ctx,e,truth,size,mini);
 const names={maze:'2D MAZE',braided:'BRAIDED MAZE',graph:'ABSTRACT NETWORK'};
 ctx.fillStyle='#aebce1';ctx.font='800 '+(mini?10:12)+'px system-ui';
 ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(names[e.spec.kind]||'WORLD',mini?12:17,mini?5:7);
}
