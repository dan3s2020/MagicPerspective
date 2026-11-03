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
  const L=40,R=w-12,T=12,B=h-26;g.font='12px "Source Sans 3",system-ui';g.fillStyle='#4d5d73';
  for(const v of [0,.25,.5]){const y=B-v/.5*(B-T);g.strokeStyle='#e3e9ec';g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.stroke();g.fillText(Math.round(v*100)+'%',6,y+4);}
  if(!history?.length){g.fillText('Curba apare în timpul antrenării.',L+10,(T+B)/2);return;}
  const X=i=>L+(history.length<2?0:i/(history.length-1))*(R-L),Y=v=>B-Math.min(v,.5)/.5*(B-T);
  const line=(get,color,dash)=>{g.beginPath();history.forEach((p,i)=>{const y=Y(get(p));i?g.lineTo(X(i),y):g.moveTo(X(i),y);});g.strokeStyle=color;g.lineWidth=2.5;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);};
  line(p=>p.classic.match0,'#5d6b7a',[5,4]);line(p=>p.match0,'#c2185b');
  g.fillStyle='#4d5d73';g.fillText(history.at(-1).episode+' terenuri trăite',R-120,h-6);}
