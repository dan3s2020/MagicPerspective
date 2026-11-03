// Map drawing. Cells the organism has seen are drawn solid; unseen cells sit under hatched fog.
// In "imag" mode the fog shows the organism's OWN imagined terrain; in "real" mode it shows the true terrain (only the human sees it).
const WALL=.82,STOPS=[[0,[205,226,206]],[.3,[178,206,160]],[.55,[217,199,143]],[.82,[183,135,88]]];
function ramp(h){if(h>WALL)return [108,114,128];for(let k=1;k<STOPS.length;k++){const [b,cb]=STOPS[k],[a,ca]=STOPS[k-1];if(h<=b){const t=(h-a)/(b-a);return ca.map((v,i)=>Math.round(v+(cb[i]-v)*t));}}return STOPS.at(-1)[1];}
function setup(c){const w=c.clientWidth||400,dpr=Math.min(3,devicePixelRatio||1);if(c.width!==Math.round(w*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(w*dpr);}
  const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.lineCap='round';g.lineJoin='round';return {g,w};}
function path(g,cells,xy,color,width,dash){if(!cells||cells.length<2)return;g.beginPath();cells.forEach((c,k)=>{const p=xy(c);k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);}
export function drawTerrain(canvas,world,f,{view='imag',classic=false,first=[]}={}){
  const {g,w}=setup(canvas),n=world.n,s=w/n,xy=i=>({x:(i%n+.5)*s,y:(((i/n)|0)+.5)*s});
  g.fillStyle='#d3dbe1';g.fillRect(0,0,w,w);
  for(let i=0;i<n*n;i++){const x=(i%n)*s,y=((i/n)|0)*s,k=f.known[i];
    if(k>=0){const [r,gg,b]=ramp(k);g.fillStyle=`rgb(${r},${gg},${b})`;g.fillRect(x,y,s+.5,s+.5);continue;}
    const h=view==='real'?world.truth[i]:f.imagined[i],[r,gg,b]=ramp(h);g.fillStyle=`rgba(${r},${gg},${b},${view==='real'?.62:.72})`;g.fillRect(x,y,s+.5,s+.5);}
  // fog hatching over everything unseen
  g.save();g.beginPath();for(let i=0;i<n*n;i++)if(f.known[i]<0)g.rect((i%n)*s,((i/n)|0)*s,s+.5,s+.5);g.clip();
  g.strokeStyle='rgba(27,42,65,.2)';g.lineWidth=1;g.beginPath();for(let d=-w;d<w;d+=6){g.moveTo(d,0);g.lineTo(d+w,w);}g.stroke();g.restore();
  if(!classic){for(let i=0;i<n*n;i++){const c=f.cloud[i];if(c<.1)continue;g.fillStyle=`rgba(194,24,91,${Math.min(.42,c*.42)})`;g.fillRect((i%n)*s+s*.18,((i/n)|0)*s+s*.18,s*.64,s*.64);}}
  path(g,f.truth,xy,'rgba(11,122,117,.5)',Math.max(4,s*.5));
  path(g,f.walked,xy,'#1f3a93',Math.max(2,s*.16));
  path(g,first,xy,'#c2185b',Math.max(1.3,s*.08),[s*.35,s*.3]);
  path(g,f.route,xy,'#c2185b',Math.max(2,s*.18));
  g.strokeStyle='#d62828';g.lineWidth=2;for(const i of f.surprised||[]){const p=xy(i);g.beginPath();g.arc(p.x,p.y,s*.42,0,7);g.stroke();}
  const px=f.position%n,py=(f.position/n)|0,x0=Math.max(0,px-1),y0=Math.max(0,py-1);
  g.strokeStyle='#1b2a41';g.lineWidth=1.5;g.setLineDash([3,3]);g.strokeRect(x0*s,y0*s,(Math.min(n-1,px+1)-x0+1)*s,(Math.min(n-1,py+1)-y0+1)*s);g.setLineDash([]);
  const st=xy(world.start);g.strokeStyle='#1b2a41';g.lineWidth=2;g.beginPath();g.arc(st.x,st.y,s*.32,0,7);g.stroke();
  const go=xy(world.goal);g.fillStyle='#0b7a75';g.beginPath();g.arc(go.x,go.y,s*.4,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(go.x-s*.18,go.y);g.lineTo(go.x+s*.18,go.y);g.moveTo(go.x,go.y-s*.18);g.lineTo(go.x,go.y+s*.18);g.stroke();
  const me=xy(f.position);g.fillStyle='#1f3a93';g.beginPath();g.arc(me.x,me.y,s*.34,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();
}
export function drawCurve(canvas,history){const w=canvas.clientWidth||600,h=Math.round(w/2.6),dpr=Math.min(3,devicePixelRatio||1);canvas.width=w*dpr;canvas.height=h*dpr;
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#fff';g.fillRect(0,0,w,h);
  const L=40,R=w-12,T=12,B=h-26,top=Math.min(1,Math.ceil((Math.max(.3,...(history||[]).flatMap(p=>[p.match0,p.classic.match0]))+.05)*10)/10);g.font='12px "Source Sans 3",system-ui';g.fillStyle='#4d5d73';
  for(const v of [0,top/2,top]){const y=B-v/top*(B-T);g.strokeStyle='#e3e9ec';g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.stroke();g.fillText(Math.round(v*100)+'%',6,y+4);}
  if(!history?.length){g.fillText('Curba apare în timpul antrenării.',L+10,(T+B)/2);return;}
  const X=i=>L+(history.length<2?0:i/(history.length-1))*(R-L),Y=v=>B-Math.min(v,top)/top*(B-T);
  const line=(get,color,dash)=>{g.beginPath();history.forEach((p,i)=>{const y=Y(get(p));i?g.lineTo(X(i),y):g.moveTo(X(i),y);});g.strokeStyle=color;g.lineWidth=2.5;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);};
  line(p=>p.classic.match0,'#5d6b7a',[5,4]);line(p=>p.match0,'#c2185b');
  g.fillStyle='#4d5d73';g.fillText(history.at(-1).episode+' terenuri trăite',R-120,h-6);}

// ── Abstract network ──
// Links the organism has seen: solid ink (open) or faint red (blocked). Unseen links: what it IMAGINES (opacity = belief it is open),
// or, in "real" mode, the truth for the human. Each node shows its dance: the fill hue is its phase (the goal is phase 0),
// the soft halo is the goal's wave as it reached that node inside the organism.
export function drawNetwork(canvas,world,f,{view='imag',classic=false,first=[]}={}){
  const {g,w}=setup(canvas),pad=w*.06,P=i=>({x:pad+world.pos[i].x*(w-2*pad),y:pad+world.pos[i].y*(w-2*pad)});
  g.fillStyle='#eef2f4';g.fillRect(0,0,w,w);const L=world.links.length,r=Math.max(3.5,w/world.n/2.6);
  for(let i=0;i<L;i++){const [a,b]=world.links[i],A=P(a),B=P(b),s=f.status?f.status[i]:-1;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.setLineDash([]);
    if(s===1){g.strokeStyle='#1b2a41';g.lineWidth=1.8;}
    else if(s===0){g.strokeStyle='rgba(214,40,40,.45)';g.lineWidth=1.2;g.setLineDash([3,3]);}
    else if(view==='real'){g.strokeStyle=world.open[i]?'rgba(11,122,117,.45)':'rgba(214,40,40,.18)';g.lineWidth=1.2;g.setLineDash([4,3]);}
    else{const p=f.imagined?f.imagined[i]:.5;g.strokeStyle=`rgba(27,42,65,${.08+.5*p*p})`;g.lineWidth=1+1.5*p;g.setLineDash([4,3]);}
    g.stroke();}
  g.setLineDash([]);
  if(!classic&&f.cloud)for(let i=0;i<world.n;i++){const c=f.cloud[i];if(c<.1)continue;const p=P(i);g.fillStyle=`rgba(194,24,91,${Math.min(.35,c*.35)})`;g.beginPath();g.arc(p.x,p.y,r*2.1,0,7);g.fill();}
  const path=(nodes,color,width,dash)=>{if(!nodes||nodes.length<2)return;g.beginPath();nodes.forEach((x,k)=>{const p=P(x);k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);};
  path(f.truth,'rgba(11,122,117,.5)',r*1.6);path(f.walked,'#1f3a93',Math.max(2.5,r*.6));path(first,'#c2185b',1.6,[6,5]);path(f.route,'#c2185b',Math.max(2.5,r*.65));
  for(let i=0;i<world.n;i++){const p=P(i),seen=f.seen?f.seen[i]:0;
    if(!classic&&f.amp&&f.amp[i]>.05){g.fillStyle=`rgba(242,165,65,${Math.min(.45,f.amp[i]*.45)})`;g.beginPath();g.arc(p.x,p.y,r*1.6,0,7);g.fill();}
    const hue=f.theta&&!classic?((f.theta[i]%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*360:210;
    g.beginPath();g.arc(p.x,p.y,r,0,7);g.fillStyle=seen?`hsl(${hue},55%,${classic?60:52}%)`:'#fff';g.fill();g.strokeStyle='#1b2a41';g.lineWidth=seen?1.5:1;g.stroke();}
  g.strokeStyle='#d62828';g.lineWidth=2.2;for(const id of f.surprised||[]){const [a,b]=world.links[id],A=P(a),B=P(b),m={x:(A.x+B.x)/2,y:(A.y+B.y)/2},k=r*.8;
    g.beginPath();g.moveTo(m.x-k,m.y-k);g.lineTo(m.x+k,m.y+k);g.moveTo(m.x+k,m.y-k);g.lineTo(m.x-k,m.y+k);g.stroke();}
  const st=P(world.start);g.strokeStyle='#1b2a41';g.lineWidth=2;g.beginPath();g.arc(st.x,st.y,r*1.7,0,7);g.stroke();
  const go=P(world.goal);g.fillStyle='#0b7a75';g.beginPath();g.arc(go.x,go.y,r*1.5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(go.x-r*.7,go.y);g.lineTo(go.x+r*.7,go.y);g.moveTo(go.x,go.y-r*.7);g.lineTo(go.x,go.y+r*.7);g.stroke();
  const me=P(f.position);g.fillStyle='#1f3a93';g.beginPath();g.arc(me.x,me.y,r*1.25,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();
}
export function drawWorld(canvas,world,f,opts){return world.kind==='network'?drawNetwork(canvas,world,f,opts):drawTerrain(canvas,world,f,opts);}
