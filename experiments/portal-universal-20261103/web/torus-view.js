/* Portal V13: whole learned network in a navigable FOUR-SPATIAL-DIMENSION
   solid torus S¹ × B³. The geometry is a coordinate guide, NOT new nodes.
   Real vertices and links always come from /api/graph/all and /api/graph.
   Projection/rotation math follows the user's supplied Clifford Torus HTML;
   the SOLID torus is used because users explicitly need its INTERIOR volume.
   Nothing in this file is a simulated neural activation or synthetic replay.
*/
'use strict';
(() => {
  const TAU = Math.PI*2;
  const R=1.75,r=.92;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const color={activation:'#55d4e7',decision:'#f7c95d',error:'#ee5e7e',learning:'#f3985e',growth:'#eef5ff'};
  // Compute the six plane-rotation pairs ONCE per rendered frame.
  function rotateWithPairs(p,pairs){
    let [x,y,z,w]=p,t,c,si;
    c=pairs[0][0];si=pairs[0][1];t=x*c-w*si;w=x*si+w*c;x=t;
    c=pairs[1][0];si=pairs[1][1];t=y*c-w*si;w=y*si+w*c;y=t;
    c=pairs[2][0];si=pairs[2][1];t=z*c-w*si;w=z*si+w*c;z=t;
    c=pairs[3][0];si=pairs[3][1];t=x*c-y*si;y=x*si+y*c;x=t;
    c=pairs[4][0];si=pairs[4][1];t=x*c-z*si;z=x*si+z*c;x=t;
    c=pairs[5][0];si=pairs[5][1];t=y*c-z*si;z=y*si+z*c;y=t;
    return [x,y,z,w];
  }
  const pairsFor=angles=>angles.map(a=>[Math.cos(a),Math.sin(a)]);
  function rotate(p,angles){return rotateWithPairs(p,pairsFor(angles))}
  function shellPoint(theta,alpha,beta){
    return [(R+r*Math.cos(alpha))*Math.cos(theta),(R+r*Math.cos(alpha))*Math.sin(theta),
      r*Math.sin(alpha)*Math.cos(beta),r*Math.sin(alpha)*Math.sin(beta)];
  }
  const shell=[];
  function createShell(){
    // S¹×S² boundary of a filled 4D toroidal corridor. The ribs are
    // mathematical guides only, never connected to Graph nodes/weights.
    for(let a=0;a<8;a++)for(let b=0;b<6;b++){
      const alpha=(a+.5)*Math.PI/8,beta=b*TAU/6;
      shell.push(Array.from({length:65},(_,i)=>shellPoint(i*TAU/64,alpha,beta)));
    }
    for(let t=0;t<14;t++)for(let b=0;b<6;b++){
      const theta=t*TAU/14,beta=b*TAU/6;
      shell.push(Array.from({length:49},(_,i)=>shellPoint(theta,i*TAU/48,beta)));
    }
  }
  createShell();
  // Routing along the torus, rather than straight chords through its hole.
  // Every interpolated 4D point stays inside S¹×B³: the 3-ball section is
  // convex and the angular coordinate follows the shorter circular arc.
  const edgeRouteCache=new Map();
  function torusArc(a,b){
    const ua=Math.hypot(a[0],a[1])-R,ub=Math.hypot(b[0],b[1])-R;
    const ta=Math.atan2(a[1],a[0]),tb=Math.atan2(b[1],b[0]);
    let delta=(tb-ta+Math.PI)%(TAU);
    if(delta<0)delta+=TAU;
    delta-=Math.PI;
    const steps=Math.max(2,Math.ceil(Math.abs(delta)/.39));
    const out=[a];
    for(let i=1;i<steps;i++){
      const k=i/steps,th=ta+k*delta,u=ua+(ub-ua)*k;
      out.push([(R+u)*Math.cos(th),(R+u)*Math.sin(th),
                a[2]+(b[2]-a[2])*k,a[3]+(b[3]-a[3])*k]);
    }
    out.push(b);return out;
  }
  function clipSlab(a,b,center,half){
    const low=center-half,high=center+half,da=b[3]-a[3];
    if(Math.abs(da)<1e-11)return a[3]>=low&&a[3]<=high?[a,b]:null;
    const t0=(low-a[3])/da,t1=(high-a[3])/da;
    const from=Math.max(0,Math.min(t0,t1)),to=Math.min(1,Math.max(t0,t1));
    if(from>to)return null;
    const lerp=t=>a.map((x,i)=>x+(b[i]-x)*t);
    return [lerp(from),lerp(to)];
  }
  function project(p,settings,W,H){
    const depth4=5.5,denom4=depth4-p[3];
    if(denom4<.12)return null;
    const k4=depth4/denom4;
    let X=p[0]*k4,Y=p[1]*k4,Z=p[2]*k4;
    const cy=Math.cos(settings.yaw),sy=Math.sin(settings.yaw),cp=Math.cos(settings.pitch),sp=Math.sin(settings.pitch);
    const xx=X*cy-Z*sy,zz=X*sy+Z*cy,yy=Y*cp-zz*sp,zc=Y*sp+zz*cp;
    const depth3=7,denom3=depth3-zc;
    if(denom3<.12)return null;
    const k3=depth3/denom3,scale=Math.min(W,H)*.150*settings.zoom;
    return {x:W*.5+xx*k3*scale,y:H*.51-yy*k3*scale,z:zc,w:p[3],scale:k3};
  }
  function segment(ctx,a,b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
  function drawShell(ctx,settings,W,H,slice,rotation){
    ctx.save();ctx.lineCap='round';ctx.lineWidth=.85*settings.dpr;
    ctx.strokeStyle=slice?'rgba(119,196,223,.23)':'rgba(113,202,224,.24)';
    for(let c=0;c<shell.length;c++){
      const pts=shell[c];ctx.beginPath();let has=false;
      let prev=rotation(pts[0]);
      for(let i=1;i<pts.length;i++){
        const curr=rotation(pts[i]);
        let clipped=slice?clipSlab(prev,curr,settings.w,settings.thickness):[prev,curr];
        if(clipped){const p=project(clipped[0],settings,W,H),q=project(clipped[1],settings,W,H);
          if(p&&q){segment(ctx,p,q);has=true;}}
        prev=curr;
      }
      if(has)ctx.stroke();
    }
    ctx.restore();
  }
  function draw(ctx,settings){
    const W=settings.width,H=settings.height,section=settings.mode==='4d';
    ctx.clearRect(0,0,W,H);
    const background=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.68);
    background.addColorStop(0,'#081b2c');background.addColorStop(.55,'#061121');background.addColorStop(1,'#030a16');
    ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
    const visible=new Map(),byID=settings.byID,rotated=new Map();
    const rotationPairs=pairsFor(settings.angles);
    const rotation=p=>rotateWithPairs(p,rotationPairs);
    let insideCount=0,drawnEdges=0,dimCounts={1:0,2:0,3:0,4:0};
    // All received learned nodes, not the 750-node V12 focus sample.
    for(const n of settings.nodes){
      if(!Array.isArray(n.p4)||n.p4.length!==4)continue;
      const rp=rotation(n.p4);rotated.set(n.id,rp);
      if(section&&Math.abs(rp[3]-settings.w)>settings.thickness)continue;
      const screen=project(rp,settings,W,H);
      if(!screen)continue;
      visible.set(n.id,screen);
      insideCount++;dimCounts[n.dimension||1]=(dimCounts[n.dimension||1]||0)+1;
    }
    // Every drawn connection corresponds to a REAL persistent graph edge.
    // The visual path stays in the toroidal interior (avoiding chords through
    // the hole). Geometry is a VIEW convention, not an invented graph link.
    const paths=[new Path2D(),new Path2D(),new Path2D()];
    const active=new Set(settings.trace?.active||[]);
    for(const e of settings.edges){
      const na=byID.get(e.from),nb=byID.get(e.to);
      if(!na?.p4||!nb?.p4)continue;
      const key=e.from+'|'+e.to;
      let route=edgeRouteCache.get(key);
      if(!route){route=torusArc(na.p4,nb.p4);edgeRouteCache.set(key,route);}
      const isActive=active.has(e.from)&&active.has(e.to);
      const bucket=isActive?2:((na.dimension||1)>=3||(nb.dimension||1)>=3?1:0);
      const path=paths[bucket];
      let prev=rotated.get(e.from),seen=false;
      if(!prev)continue;
      for(let k=1;k<route.length;k++){
        const curr=k===route.length-1?rotated.get(e.to):rotation(route[k]);
        if(!curr)continue;
        const clipped=section?clipSlab(prev,curr,settings.w,settings.thickness):[prev,curr];
        if(clipped){
          const a=project(clipped[0],settings,W,H),b=project(clipped[1],settings,W,H);
          if(a&&b){path.moveTo(a.x,a.y);path.lineTo(b.x,b.y);seen=true;}
        }
        prev=curr;
      }
      if(seen)drawnEdges++;
    }
    const stroke=(path,ink,width)=>{ctx.strokeStyle=ink;ctx.lineWidth=width*settings.dpr;ctx.stroke(path);};
    stroke(paths[0],'rgba(72,124,161,.085)',.55);
    stroke(paths[1],'rgba(165,127,221,.12)',.8);
    drawShell(ctx,settings,W,H,section,rotation); // mathematical boundary, not learner nodes
    stroke(paths[2],'rgba(80,224,235,.78)',1.55);
    const born=new Set(settings.trace?.growth?.born||[]);
    for(const n of settings.nodes){
      const p=visible.get(n.id);if(!p)continue;
      const d=n.dimension||1,on=active.has(n.id),newBorn=born.has(n.id);
      const c=on?color.activation:n.role==='perspective'?
        (n.controllability>=.7?'#64d6a2':n.controllability<=.3?'#7195b3':'#d6addc'):
        d===4?'#c19dfd':d===3?'#a48fea':d===2?'#6198d4':'#75bdce';
      let radius=on?3.2:Math.min(2.5,.85+Math.log1p(n.uses||0)*.14);
      if(newBorn)radius=Math.max(radius,2.9);
      ctx.beginPath();ctx.arc(p.x,p.y,radius*settings.dpr,0,TAU);
      ctx.globalAlpha=on?1:d===4?.83:.6;ctx.fillStyle=c;ctx.fill();ctx.globalAlpha=1;
      if(newBorn&&settings.phase>=.88){ctx.beginPath();ctx.arc(p.x,p.y,6.2*settings.dpr,0,TAU);ctx.lineWidth=1.7*settings.dpr;ctx.strokeStyle='#ecf8ff';ctx.stroke();}
      if(n.id===settings.selected){ctx.beginPath();ctx.arc(p.x,p.y,8*settings.dpr,0,TAU);ctx.lineWidth=2.4*settings.dpr;ctx.strokeStyle='#ffffff';ctx.stroke();}
    }
    const f=settings.trace;
    if(f){
      const p=settings.phase,idx=p<.18?0:p<.56?1:p<.68?2:p<.88?3:4;
      if(idx===1){
        const msgs=f.messages||[],rounds=Math.max(1,...msgs.map(x=>x.round||1));
        const step=clamp((p-.18)/.38*rounds,0,rounds-.00001),round=Math.floor(step)+1,amt=step-Math.floor(step);
        for(const m of msgs){if((m.round||1)!==round)continue;
          const a=visible.get(m.from),b=visible.get(m.to);if(!a||!b)continue;
          const s=clamp(Number(m.strength)||0,0,2);
          ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*amt,a.y+(b.y-a.y)*amt,(1.6+Math.min(3,s*2))*settings.dpr,0,TAU);
          ctx.fillStyle=color.activation;ctx.globalAlpha=.45+.25*s;ctx.fill();ctx.globalAlpha=1;
        }
      }
      const action=visible.get(f.growth?.action_id),effect=visible.get(f.growth?.effect_id);
      function ring(p,r,c,alpha=1){if(!p)return;ctx.beginPath();ctx.arc(p.x,p.y,r*settings.dpr,0,TAU);
        ctx.lineWidth=2*settings.dpr;ctx.strokeStyle=c;ctx.globalAlpha=alpha;ctx.stroke();ctx.globalAlpha=1;}
      if(idx===2)ring(action,9+(p-.56)*35,color.decision);
      if(idx===3){const e=clamp(Number(f.error)||0,0,1),q=clamp((p-.68)/.2,0,1);
        ring(effect||action,9+34*q,e>.03?color.error:'#52cfa6',(1-q)*(.5+e*.5));}
      if(idx===4){const strength=clamp((Number(f.update_norm)||0)*500,0,1);
        ring(action,9+12*Math.sin(p*17)**2,color.learning,.25+.75*strength);
        for(const e of (f.growth?.edges_born||[]).slice(0,100)){
          const a=visible.get(e.from),b=visible.get(e.to);if(!a||!b)continue;
          ctx.beginPath();segment(ctx,a,b);ctx.strokeStyle=color.learning;
          ctx.lineWidth=1.7*settings.dpr;ctx.stroke();
        }
      }
    }
    return {visible,insideCount,drawnEdges,dimCounts};
  }
  window.PortalTorusView={rotate,clipSlab,shellPoint,torusArc,draw,resetGeometry:()=>edgeRouteCache.clear(),geometry:'S¹×B³; learner vertices and edges only'};
})();
