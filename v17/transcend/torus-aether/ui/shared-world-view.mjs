// The ORIGINAL V17 language tab, reading compact action/effect nodes from the
// exact same serialized Brain trained in text, maze and transformation worlds.
// No random points, synthetic transitions, or raw per-phrase node duplication.
const $=id=>document.getElementById(id);
function fitCanvas(canvas){
  const g=canvas?.getContext('2d');if(!g)return null;
  const w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);
  g.fillStyle='#07101a';g.fillRect(0,0,w,h);
  return {g,w,h};
}
function layout(nodes,width,height){
  const columns=new Map([
    ['self',0],['world',1],['action',2],['effect',3],['goal',4]
  ]);
  const grouped=new Map();
  for(const node of nodes){
    const index=columns.get(node.kind)??2;
    if(!grouped.has(index))grouped.set(index,[]);
    grouped.get(index).push(node);
  }
  const pos=new Map();
  for(const [col,items] of grouped)
    for(let i=0;i<items.length;i++)
      pos.set(items[i].id,{x:38+(width-77)*col/4,
        y:32+(height-64)*(i+.5)/items.length});
  return pos;
}
const colors={self:'#e9f3ff',world:'#85baff',action:'#f5bb45',
  effect:'#57e1bd',goal:'#e67bab'};
export function drawSharedWorldCore(snapshot){
  const canvas=$('languageMazeSharedCanvas'),panel=$('languageMazeSharedStats');
  const c=fitCanvas(canvas);
  if(!panel||!c)return;
  if(!snapshot){
    panel.textContent='Core comun dezactivat sau încă neantrenat. Nicio cale simulată.';
    c.g.fillStyle='#8198ae';c.g.fillText('Aștept observații din workerul V17.',12,c.h/2);
    return;
  }
  const {g,w,h}=c,nodes=snapshot.nodes||[],edges=snapshot.edges||[];
  const W=snapshot.observed||{},weights=snapshot.policy||[];
  panel.textContent='Același Brain V17: maze '+(W.maze||0)+
    ' · text '+(W.text||0)+' · transform '+(W.transform||0)+
    ' · actualizări '+(snapshot.updates||0)+
    ' · '+(snapshot.structuralNodes||0)+' noduri de TIP (nu fraze)'+
    ' · '+(snapshot.structuralEdges||0)+' relații · ponderi ['+
    weights.map(x=>(Number(x)||0).toFixed(3)).join(', ')+']';
  if(!nodes.length)return;
  const pos=layout(nodes,w,h);
  g.save();
  for(const e of edges){
    const a=pos.get(e.from),b=pos.get(e.to);if(!a||!b)continue;
    g.strokeStyle='#456a83';
    g.globalAlpha=Math.min(.85,.18+.10*Math.log1p(e.count||0));
    g.lineWidth=1+Math.min(3,Math.log1p(e.count||0)*.4);
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  }
  g.restore();
  for(const n of nodes){
    const p=pos.get(n.id);if(!p)continue;
    g.fillStyle=colors[n.kind]||'#aec9dc';
    g.beginPath();g.arc(p.x,p.y,Math.max(5,Math.min(10,4+Math.log1p(n.count||0))),0,Math.PI*2);g.fill();
    g.fillStyle='#dceefa';g.font='10px ui-monospace,monospace';
    g.fillText(n.id.replace(/^world:|^action:|^effect:/,''),p.x+9,p.y-6,115);
    g.fillStyle='#8cacc1';g.fillText(String(n.count||0),p.x+9,p.y+7);
  }
  g.fillStyle='#8ba9bd';g.font='10px ui-monospace,monospace';
  g.fillText('self → lumea trăită → operator → efect → obiectiv',10,h-9);
}
