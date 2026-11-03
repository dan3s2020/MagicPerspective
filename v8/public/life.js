// "Ce a învățat": how the imagination formed over the brain's life, the kinds of worlds it discovered, its whole history.
import {drawWorld} from './draw.js';
const $=id=>document.getElementById(id);
let data=null,show=0;
const pct=x=>x==null?'—':Math.round(x*100)+'%',times=x=>x==null?'—':x.toFixed(2).replace('.',',')+'×',num=x=>x==null?'—':x.toFixed(1).replace('.',',');
function tabs(){const box=$('show-tabs');box.replaceChildren();data.showcase.forEach((s,k)=>{const b=document.createElement('button');b.textContent=s.name;b.className=k===show?'on':'';b.setAttribute('aria-pressed',String(k===show));
  b.onclick=()=>{show=k;tabs();strip();};box.append(b);});}
function strip(){const s=data.showcase[show],box=$('strip');box.replaceChildren();const world=s.world,net=world.kind==='network';
  const add=(cls,title,sub,f)=>{const fig=document.createElement('figure');fig.className=cls;const c=document.createElement('canvas');const cap=document.createElement('figcaption');
    const b=document.createElement('b');b.textContent=title;cap.append(b,document.createTextNode(sub));fig.append(c,cap);box.append(fig);if(f)requestAnimationFrame(()=>drawWorld(c,world,f,{classic:true,view:f.view||'imag'}));else c.remove();};
  add('real','Lumea reală','drumul cel mai ieftin',net?{status:world.open.map(()=>-1),seen:[],view:'real',route:[],truth:s.truthRoute,walked:[world.start],position:world.start,surprised:[]}
    :{known:world.truth,imagined:world.truth,route:[],truth:s.truthRoute,walked:[world.start],position:world.start,cloud:[],surprised:[]});
  for(const b of s.brains){if(b.unsupported){add('v6',b.label,'nu are organ de rețea',null);continue;}
    add(b.v6?'v6':'',b.label,`pe această lume: eroare ${pct(b.mapError)}, drum ghicit ${pct(b.match)}. Media pe 12 lumi de acest fel: eroare ${pct(b.avgError)}, drum ${pct(b.avgMatch)}`,
      net?{status:b.status,seen:b.seen,imagined:b.imagined,route:b.route,truth:s.truthRoute,walked:[world.start],position:world.start,surprised:[]}
        :{known:b.known,imagined:b.imagined,route:b.route,truth:s.truthRoute,walked:[world.start],position:world.start,cloud:[],surprised:[]});}}
function describe(k){const parts=[];parts.push(k.rocky>.3?'multă stâncă lângă tine':k.rocky>.05?'ceva stâncă în jur':'aproape fără stâncă în jur');
  parts.push(k.flatTops>.5?'orizontul e un zid continuu':k.horizon>.55?'munți înalți la orizont':'orizont domol, cu dealuri');return parts.join(', ');}
function kinds(){const box=$('kinds');box.replaceChildren();
  if(!data.kinds.length){const p=document.createElement('p');p.className='small';p.textContent='Încă niciunul. Apar după primul teren trăit.';box.append(p);return;}
  data.kinds.forEach((k,i)=>{const d=document.createElement('div');d.className='kind';const b=document.createElement('b');b.textContent=`Tipul ${i+1}`;
    const t=document.createElement('span');if(k.network){b.textContent='Rețele';t.textContent=`Organul de rețea, separat de cel pentru teren: ${k.worlds.toLocaleString('ro-RO')} legături ghicite și apoi corectate.`;d.append(b,t);box.append(d);return;}t.textContent=`Pe teren: ${describe(k)}. ${k.worlds.toLocaleString('ro-RO')} corecții învățate în lumi de acest fel.`;d.append(b,t);box.append(d);});}
function curve(){const c=$('life-curve'),w=c.clientWidth||600,h=Math.round(w/2.6),dpr=Math.min(3,devicePixelRatio||1);c.width=w*dpr;c.height=h*dpr;
  const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#fff';g.fillRect(0,0,w,h);g.font='12px "Source Sans 3",system-ui';
  const pts=data.runs.flatMap(r=>r.history),L=40,R=w-12,T=12,B=h-26,top=Math.min(1,Math.ceil((Math.max(.3,...pts.flatMap(p=>[p.match0,p.classic]))+.05)*10)/10);
  for(const v of [0,top/2,top]){const y=B-v/top*(B-T);g.strokeStyle='#e3e9ec';g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.stroke();g.fillStyle='#4d5d73';g.fillText(Math.round(v*100)+'%',6,y+4);}
  if(!pts.length){g.fillText('Istoria apare după prima antrenare.',L+10,(T+B)/2);return;}
  const maxE=Math.max(...pts.map(p=>p.episode),1),X=e=>L+e/maxE*(R-L),Y=v=>B-Math.min(v,top)/top*(B-T);
  for(const r of data.runs){g.strokeStyle='rgba(27,42,65,.15)';g.beginPath();g.moveTo(X(r.from),T);g.lineTo(X(r.from),B);g.stroke();}
  const line=(key,color,dash)=>{g.beginPath();pts.forEach((p,i)=>{i?g.lineTo(X(p.episode),Y(p[key])):g.moveTo(X(p.episode),Y(p[key]));});g.strokeStyle=color;g.lineWidth=2.5;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);};
  line('classic','#5d6b7a',[5,4]);line('match0','#c2185b');g.fillStyle='#4d5d73';g.fillText(`${maxE} lumi trăite · ${data.runs.length} antrenări`,L+6,h-6);}
function tests(){const body=$('tests-body');body.replaceChildren();
  for(const t of data.tests.slice().reverse()){const tr=document.createElement('tr');
    for(const v of [new Date(t.date).toLocaleString('ro-RO',{dateStyle:'short',timeStyle:'short'}),t.episodes,pct(t.relief?.match0),pct(t.network?.match0),times(t.relief?.ratio),times(t.network?.ratio),times(t.braided?.ratio),times(t.maze?.ratio)]){
      const td=document.createElement('td');td.textContent=String(v);tr.append(td);}body.append(tr);}
  if(!data.tests.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.textContent='Niciun test încă.';tr.append(td);body.append(tr);}}
async function load(){try{const r=await fetch('/api/life?size='+$('size').value);data=await r.json();if(!r.ok)throw Error(data.error);show=Math.min(show,data.showcase.length-1);tabs();strip();kinds();curve();tests();}
  catch(e){$('strip').textContent='Nu pot încărca istoria: '+e.message;}}
addEventListener('brain-changed',load);$('size').addEventListener('change',()=>setTimeout(load,300));addEventListener('resize',()=>{if(data){strip();curve();}});
load();
