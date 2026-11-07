// Native V19 learned sentence-transform world, read-only on the ORIGINAL
// V17 Brain.disc.shape() call. All graph states and edges come from the
// actual V19 induced transformations, not an invented animation.
// Gold: globally planned steps before action; blue: previously observed
// action effects; dotted violet: untested learned rule hypotheses.
const $=id=>document.getElementById(id);
const canvas=$("nativeCognitiveCanvas"),g=canvas.getContext("2d");
const brainId=()=>Math.max(0,Math.trunc(Number($("textMazeWorker")?.value)||0));
let result=null,frame=0,play=true,busy=false,lastTick=0;
const label=(n)=>String(n?.label??"").slice(0,44);
const coords=(node,total,W,H)=>{
  // Stable diagnostic layout by learned state identity, not intrinsic axes.
  const f=(Math.imul(node.id+1,2654435761)>>>0)/4294967296;
  const layer=node.id===0?0:((node.id*17)%Math.max(2,Math.min(8,total)));
  const phi=2*Math.PI*f;
  return {x:Math.max(42,Math.min(W-48,W*(.10+.82*(layer/Math.max(1,Math.min(7,total-1))))+22*Math.cos(phi))),
    y:Math.max(35,Math.min(H-36,H*(.20+.60*(.5+.42*Math.sin(phi)))))};
};
function draw(){
  const W=canvas.width,H=canvas.height;
  g.fillStyle="#071019";g.fillRect(0,0,W,H);
  g.font="12px monospace";g.fillStyle="#c5d9ef";
  g.fillText("NATIVE V17 Discoverer.shape | V19 learned causal text state space",12,20);
  if(!result?.graph?.nodes?.length){
    g.fillText("Start the original cognitivemap world and request the frozen solution shape",20,H/2);
    return;
  }
  const nodes=result.graph.nodes,positions=new Map(nodes.map(n=>[n.id,coords(n,nodes.length,W,H)]));
  const solution=result.plannedPath||[];
  const predictedEdges=new Set(solution.map(e=>e.from+"\0"+e.action+"\0"+e.after));
  for(const edge of result.graph.edges){
    const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b)continue;
    g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);
    g.lineWidth=edge.verified?1.7:1;g.strokeStyle=edge.verified?"rgba(84,215,250,.48)":"rgba(189,138,244,.33)";
    g.setLineDash(edge.verified?[]:[4,4]);g.stroke();g.setLineDash([]);
  }
  const index=new Map(nodes.map(n=>[n.label,n.id]));
  let here=index.get(result.start);
  const plannedNodes=new Set([here]);
  for(const edge of solution){
    const to=index.get(edge.after),a=positions.get(here),b=positions.get(to);
    if(a&&b){
      g.lineWidth=3.6;g.strokeStyle="#ffd466";g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    }
    here=to;plannedNodes.add(to);
  }
  for(const n of nodes){
    const p=positions.get(n.id),gold=plannedNodes.has(n.id);
    g.fillStyle=n.id===0?"#ffffff":gold?"#ffd466":"#577f9d";
    g.beginPath();g.arc(p.x,p.y,n.id===0?7:gold?5.5:3,0,Math.PI*2);g.fill();
  }
  const active=frame===0?result.start:solution[Math.min(frame-1,solution.length-1)]?.after;
  const focus=positions.get(index.get(active));
  if(focus){
    g.beginPath();g.arc(focus.x,focus.y,10,0,2*Math.PI);
    g.strokeStyle="#e5fbff";g.lineWidth=2;g.stroke();
    g.font="12px monospace";g.fillStyle="#ffffff";
    g.fillText(String(active).slice(0,65),Math.min(W-430,Math.max(13,focus.x+14)),Math.max(38,focus.y-13));
  }
  g.fillStyle="#9bb5d0";g.fillText("Gold: native predicted path | cyan: verified effects | purple dashed: inferred hypotheses",12,H-14);
}
function render(){
  const r=result,edges=r?.plannedPath||[],now=frame?edges[Math.min(frame-1,edges.length-1)]:null;
  $("nativeCognitiveStep").textContent=frame+"/"+edges.length;
  $("nativeCognitiveScrub").max=edges.length;
  $("nativeCognitiveScrub").value=Math.min(frame,edges.length);
  $("nativeCognitiveOutput").textContent=[
    "Original engine called: "+(r?.originalDiscovererDirectlyUsed??"not evaluated"),
    "Frozen before first act: "+(r?.frozen??"unknown")+" | no hidden answer: "+(r?.noHiddenAnswerOracle??"unknown"),
    "Learned rules: "+(r?.rules??"unknown")+" | generated future states: "+(r?.generatedStates??"unknown"),
    "Predicted full shape: "+(r?.found?"YES":"NO")+" | "+(r?.reason??"not evaluated"),
    "First predicted action: "+(r?.firstAction??"none"),
    "All predicted actions: "+edges.map(e=>e.action+" ["+e.provenance+"]").join(" -> "),
    "Current step: "+(now?now.from+" -> "+now.after+" ("+now.action+")":"before first action"),
    "Math residual: "+(r?.math?.maxBellmanResidual??"unknown"),
    "Hypothesis steps: "+(r?.math?.inferredHypothesisSteps??"unknown"),
    "Observed edge steps: "+edges.filter(e=>e.provenance==="observed").length,
    "Graph nodes: "+(r?.graph?.nodes?.length??0)+" | drawn edges: "+(r?.graph?.edges?.length??0)+"/"+(r?.graph?.totalEdges??0),
    "This is a generated SHAPE. It is NOT an executed free-answer or a demonstration of arbitrary semantic QA."
  ].join("\n");
  draw();
}
async function evaluate(){
  if(busy)return;busy=true;$("nativeCognitivePlan").disabled=true;
  try{
    const slots=JSON.parse($("cognitiveGoal").value);
    if(!slots||typeof slots!=="object"||!Object.keys(slots).length)throw Error("Set explicit goal constraints");
    const r=await fetch("/cognitive-native-eval",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({w:brainId(),initial:$("cognitiveInitial").value,
        goal:{slots},maxNodes:384,maxDepth:8}),signal:AbortSignal.timeout(25000)});
    if(!r.ok)throw Error("HTTP "+r.status);
    const value=await r.json();if(value.error)throw Error(value.error);
    result=value;frame=0;render();
    $("nativeCognitiveStatus").textContent="Real worker #"+brainId()+" / frozen original Discoverer";
  }catch(err){$("nativeCognitiveStatus").textContent="Native V19: "+err.message;}
  finally{busy=false;$("nativeCognitivePlan").disabled=false;}
}
$("nativeCognitivePlan").addEventListener("click",evaluate);
$("nativeCognitiveScrub").addEventListener("input",e=>{play=false;frame=+e.target.value;render();});
$("nativeCognitivePrev").addEventListener("click",()=>{play=false;frame=Math.max(0,frame-1);render();});
$("nativeCognitiveNext").addEventListener("click",()=>{play=false;frame=Math.min(result?.plannedPath?.length||0,frame+1);render();});
$("nativeCognitivePlay").addEventListener("click",()=>{play=!play;$("nativeCognitivePlay").textContent=play?"Pause path":"Play path";});
function animate(t){
  if(play&&result?.plannedPath?.length&&t-lastTick>450){
    lastTick=t;frame=(frame+1)%(result.plannedPath.length+1);render();
  }
  requestAnimationFrame(animate);
}
render();requestAnimationFrame(animate);
