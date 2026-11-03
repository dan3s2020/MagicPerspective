// 4D geometry only. No invented solution, neuron state or simulator data.
export const AXES=['x','y','z','w'];
export const CORNERS=Array.from({length:16},(_,mask)=>
 Array.from({length:4},(_,axis)=>((mask>>axis)&1)?1:-1));
export const HYPERCUBE_EDGES=Object.freeze(
 Array.from({length:16},(_,a)=>Array.from({length:4},(_,axis)=>{
  const b=a^(1<<axis);return a<b?{from:a,to:b,axis}:null;
 })).flat().filter(Boolean));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function point4(value){
 const raw=Array.isArray(value)?value:[value?.x,value?.y,value?.z,value?.w];
 if(raw.length!==4||!raw.every(finite))throw Error(
  'A real 4D node requires 4 finite coordinates x,y,z,w; missing W must not be invented.');
 return raw.slice();
}
export function navigation(camera,axis,direction,step=.18){
 const i=typeof axis==='number'?axis:AXES.indexOf(axis);
 if(i<0||i>3||![1,-1].includes(direction)||!finite(step)||step<=0)
  throw Error('Invalid 4D navigation command');
 const next=point4(camera);next[i]+=direction*step;return next;
}
function plane(v,i,j,angle){
 const out=v.slice(),c=Math.cos(angle),s=Math.sin(angle);
 out[i]=v[i]*c-v[j]*s;out[j]=v[i]*s+v[j]*c;return out;
}
export function rotate4(p){
 let v=point4(p);
 // Fixed camera orientation: a real 4D projection, not random coordinates.
 for(const [i,j,a] of [[0,3,.31],[1,3,-.27],[2,3,.37],
  [0,2,.23],[1,2,-.24],[0,1,.11]])v=plane(v,i,j,a);
 return v;
}
export function project4(p,{camera=[0,0,0,0],width=600,height=440,
 zoom=1,frame=false}={}){
 const origin=point4(p),cam=frame?[0,0,0,0]:point4(camera);
 if(!finite(width)||!finite(height)||width<=0||height<=0||
 !finite(zoom)||zoom<=0)throw Error('Invalid projection viewport');
 const relative=origin.map((v,i)=>v-cam[i]);
 const v=rotate4(relative),den4=4.4-v[3];
 if(den4<=.2)return null; // behind the 4D projection eye
 const k4=3.6/den4,r=[v[0]*k4,v[1]*k4,v[2]*k4];
 const den3=5.4-r[2];if(den3<=.2)return null;
 const k3=4.5/den3,scale=Math.min(width,height)*.30*zoom;
 return {x:width/2+r[0]*k3*scale,y:height/2-r[1]*k3*scale,
  depth:r[2],w:origin[3],relativeW:relative[3]};
}
export function parseGraph(graph){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))
  throw Error('Expected real graph nodes[] and edges[]');
 const ids=new Set();
 const nodes=graph.nodes.map(node=>{
  if(node?.id===undefined||node?.id===null||ids.has(String(node.id)))
   throw Error('Every node must have a unique id');
  ids.add(String(node.id));
  return {...node,id:String(node.id),position:point4(node.position??node.pos)};
 });
 const edges=graph.edges.map((edge,i)=>{
  const from=String(edge.from),to=String(edge.to);
  if(!ids.has(from)||!ids.has(to))throw Error('Edge '+i+' refers to an absent node');
  return {...edge,from,to};
 });
 return {nodes,edges,meta:graph.meta??null};
}
export function graphBounds(nodes){
 if(!nodes.length)return {center:[0,0,0,0],radius:1};
 const center=Array(4).fill(0);
 for(const n of nodes)for(let i=0;i<4;i++)center[i]+=n.position[i]/nodes.length;
 let max=0;
 for(const n of nodes)for(let i=0;i<4;i++)
  max=Math.max(max,Math.abs(n.position[i]-center[i]));
 return {center,radius:max||1};
}
export function normalizeNodes(nodes,bounds=graphBounds(nodes)){
 return nodes.map(n=>({...n,normalized:n.position.map((v,i)=>
 (v-bounds.center[i])/bounds.radius)}));
}
export function onWSlice(p,cameraW,halfWidth=.7){
 if(!finite(cameraW)||!finite(halfWidth)||halfWidth<=0)throw Error('Invalid W section');
 return Math.abs(point4(p)[3]-cameraW)<=halfWidth;
}
export function crossingWSlice(a,b,w){
 const p=point4(a),q=point4(b),dw=q[3]-p[3];
 if(dw===0)return null;
 const t=(w-p[3])/dw;
 if(t<0||t>1)return null;
 return {position:p.map((v,i)=>v+(q[i]-v)*t),t};
}
