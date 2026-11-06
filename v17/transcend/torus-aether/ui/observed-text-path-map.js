// Pure observation overlay. Polylines connect actual learned Geometry.U symbol
// coordinates with shortest periodic 5D torus displacements; no fictitious nodes.
// All trajectories in a scan are from one saved Brain state and one RNG seed.
const W5 = d => d - Math.round(d);
const coord = p => Array.isArray(p) && p.length === 5 && p.every(Number.isFinite);
export class ObservedTextPathMap {
  constructor(canvas, summary, detail) {
    this.cv=canvas; this.summary=summary; this.detail=detail; this.paths=[];
    this.currentStep=0; this.selected=0; this.matrix=null;
    this.cv.addEventListener("pointermove",e=>this.inspect(e));
  }
  show(data) {
    this.paths = (data.scanPaths?.length ? data.scanPaths : [{T:data.T, trace:data.pathTrace, text:data.text}])
      .filter(x=>x.trace && x.trace.steps?.length);
    this.selected=this.paths.findIndex(x=>Math.abs(x.T-data.T)<1e-7);
    if (this.selected<0) this.selected=0;
    this.currentStep=0;
    const s=this.paths.map(x=>{
      const q=x.trace.summary;
      return "T "+x.T.toFixed(2)+": "+x.trace.generated+" moves; "+q.branchingSteps+
        " branches; "+q.repeatedContextStates+" revisited contexts; "+
        q.known5DTransitions+" actual 5D transitions";
    });
    this.summary.textContent=s.join("\n")+
      "\nView: actual symbol positions in learned 5-torus; contexts and proposals are separate, not geometric axes. No decoding or training is modified.";
  }
  geometry(angles) {
    const axes=[0,1,2,3,4];
    const names=[[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];
    let M=axes.map(i=>axes.map(j=>+(i===j)));
    for(let k=0;k<names.length;k++){const [a,b]=names[k],angle=angles?.[k]||0;if(!angle)continue;
      const c=Math.cos(angle),s=Math.sin(angle),A=M[a].slice(),B=M[b].slice();
      for(let j=0;j<5;j++){M[a][j]=c*A[j]-s*B[j];M[b][j]=s*A[j]+c*B[j];}}
    return M;
  }
  draw(angles) {
    const cv=this.cv,W=cv.clientWidth||640,H=cv.clientHeight||300,dpr=window.devicePixelRatio||1;
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
    const g=cv.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
    g.fillStyle="#081623";g.fillRect(0,0,W,H);
    g.fillStyle="#b8d8ee";g.font="12px ui-monospace,monospace";
    if(!this.paths.length){g.fillText("Așteaptă un traseu REAL din generator…",15,24);return;}
    const M=this.geometry(angles), projected=[], colors=["#ffb82e","#53d8ad","#83b5ff","#dca2ff","#ff7887","#addc6a"];
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const entry of this.paths) {
      const pts=[];let last=null,walk=null;
      for(const st of entry.trace.steps){
        if(!coord(st.to5D)){pts.push(null);last=null;walk=null;continue;}
        if(!last){walk=st.to5D.slice();}
        else for(let k=0;k<5;k++)walk[k]+=W5(st.to5D[k]-last[k]);
        last=st.to5D;
        const x=M[0].reduce((sum,v,i)=>sum+v*walk[i],0);
        const y=M[1].reduce((sum,v,i)=>sum+v*walk[i],0);
        pts.push({x,y,st});
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      projected.push(pts);
    }
    const spanX=Math.max(.2,maxX-minX),spanY=Math.max(.2,maxY-minY);
    const scale=Math.min((W-42)/spanX,(H-62)/spanY);
    const at = p => ({x:20+(p.x-minX)*scale,y:28+(p.y-minY)*scale});
    this.screen=[];this.matrix=M;
    projected.forEach((pts,j)=>{
      g.strokeStyle=colors[j%colors.length];g.lineWidth=j===this.selected?2.2:1.4;g.globalAlpha=j===this.selected?1:.55;
      g.beginPath();let connected=false;
      for(let i=0;i<pts.length;i++){
        const p=pts[i];if(!p){connected=false;continue;}
        const xy=at(p);if(!connected){g.moveTo(xy.x,xy.y);connected=true;}else g.lineTo(xy.x,xy.y);
        if(i%5===0)this.screen.push({x:xy.x,y:xy.y,info:p.st,path:j});
      }
      g.stroke();g.globalAlpha=1;
      const first=pts.find(Boolean),last=pts.findLast(Boolean);
      if(first){const v=at(first);g.fillStyle=colors[j%colors.length];g.fillRect(v.x-3,v.y-3,6,6);}
      if(last){const v=at(last);g.fillStyle=colors[j%colors.length];g.beginPath();g.arc(v.x,v.y,4,0,7);g.fill();}
    });
    g.font="12px ui-monospace,monospace";
    this.paths.forEach((p,i)=>{g.fillStyle=colors[i%colors.length];g.fillText("T "+p.T.toFixed(2),12+i*72,16)});
    g.fillStyle="#a8c4d9";g.fillText("5D torus: learned symbol positions → rotated 2D projection",10,H-10);
  }
  inspect(e) {
    if(!this.screen?.length)return;
    const r=this.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    let best=null,dist=20;
    for(const p of this.screen){const d=Math.hypot(p.x-x,p.y-y);if(d<dist){best=p;dist=d;}}
    if(!best)return;
    const q=best.info, s=q.supportingPerspectives.map(v=>v.perspective+":"+v.depth).slice(0,4).join(", ")||"none";
    this.detail.textContent="T "+this.paths[best.path].T.toFixed(2)+
      " step "+q.step+" · symbol "+JSON.stringify(q.symbol)+
      " · from context "+JSON.stringify(q.context.slice(-20))+
      " · P(selected) "+q.probability+
      " · alternatives "+q.alternatives+
      " · perspective sources "+s+
      " · Δ5 "+JSON.stringify(q.delta5D)+
      " · recurrence "+q.contextVisit;
  }
}
