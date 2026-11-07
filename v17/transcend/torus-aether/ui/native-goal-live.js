// Live observational view of genuine ORIGINAL native V17 goal-conditioned routes.
// The 2D canvas is a projection of ACTUAL learned numeric state coordinates;
// do not depict it as a trained five-dimensional semantic geometry.
export function mountNativeGoalPanel({getGraph}){
  const $=id=>document.getElementById(id);
  const panel=$("nativeGoalRoutePane"),button=$("nativeGoalAsk"),
    question=$("nativeGoalQuestion"),caption=$("nativeGoalPrediction"),
    trace=$("nativeGoalRouteTrace"),canvas=$("nativeGoalRouteCanvas"),
    stats=$("nativeGoalLearnedStats");
  if(!panel||!button||!question||!caption||!trace||!canvas||!stats)
    throw Error("Original native V17 goal-route view missing an expected element");
  const fmt=n=>Number.isFinite(n)?n.toLocaleString("ro-RO"):"—";
  function renderTraining(g){
    const n=g?.nativeGoalField,p=g?.goalHyperpath;
    if(!n){
      stats.textContent="Aștept observațiile reale ale modelului de transformări, fără rezultate inventate.";
      return;
    }
    stats.textContent=
      "Perechi Q/A numerice observate: "+fmt(n.observedNumericQAPairs)+
      " · transformări corelate învățate: "+fmt(n.correlatedTransitions)+
      " · gramatici numerice: "+fmt(n.learnedNumericTemplates)+"\n"+
      "Trasee complete găsite: "+fmt(n.completePlans)+" · executate: "+fmt(n.executed)+
      " · reușite în modelul intern: "+fmt(n.internallyMatched)+
      " · limite recunoscute: "+fmt(n.refusedPlans)+"\n"+
      "Lume lexicală: "+fmt(p?.observedQAPairs)+" observații · "+fmt(p?.plansFound)+
      " trasee găsite. Nu confundăm reușita modelului cu adevărul semantic.";
  }
  function draw(r){
    const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#06121d";ctx.fillRect(0,0,W,H);
    if(!r?.ready||r?.mode!=="goal-path"){
      const reason=r?.error||r?.reason||"nu există un traseu învățat";
      caption.textContent="LIMITĂ REALĂ: "+reason+" · niciun predictor de caractere de rezervă.";
      trace.textContent="Nu există o predicție validată a întregului răspuns.";
      ctx.fillStyle="#e4b798";ctx.font="16px system-ui";
      ctx.fillText("Nu există un traseu complet: "+String(reason).slice(0,70),18,34);
      return;
    }
    const prediction=String(r.predictedFullAnswerBeforeFirstCharacter||"");
    const frames=Array.isArray(r.execution?.frames)?r.execution.frames:
      Array.isArray(r.initialShape)?r.initialShape:[];
    const actions=Array.isArray(r.planSteps)?r.planSteps:[];
    const actual=String(r.execution?.actual||r.text||"");
    caption.textContent="FORMA ÎNTREAGĂ ÎNAINTE DE PRIMUL PAS: "+prediction+
      "\nEXECUTAT: "+actual+"\nAcțiuni: "+actions.length+
      " · concordanță internă: "+(actual===prediction?"DA":"NU")+
      " · verdict semantic extern: NEEVALUAT";
    const states=frames.slice(0,101);
    const observedLastAxis=states.map(s=>{
      const nums=(String(s).match(/\b\d+\b/gu)||[]).map(Number);
      return nums.length>=3?nums.at(-1):null;
    });
    const useValues=states.length>0&&observedLastAxis.every(Number.isFinite);
    const lo=useValues?Math.min(...observedLastAxis):0,
      hi=useValues?Math.max(...observedLastAxis):1,spread=Math.max(1,hi-lo);
    const nodes=states.map((_,i)=>({
      x:states.length===1?W/2:35+(W-70)*i/(states.length-1),
      y:useValues?H-58-(observedLastAxis[i]-lo)/spread*(H-115):H/2
    }));
    if(nodes.length>1){
      ctx.beginPath();
      nodes.forEach((node,i)=>i?ctx.lineTo(node.x,node.y):ctx.moveTo(node.x,node.y));
      ctx.strokeStyle="#f0c85c";ctx.lineWidth=3;ctx.stroke();
    }
    nodes.forEach((node,i)=>{
      ctx.beginPath();ctx.arc(node.x,node.y,6,0,2*Math.PI);
      ctx.fillStyle=i===0?"#73adff":i===nodes.length-1?"#4cdd9a":"#f0c85c";ctx.fill();
      if(nodes.length<=10||i===0||i===nodes.length-1||i%Math.ceil(nodes.length/9)===0){
        ctx.font="11px ui-monospace,monospace";ctx.fillStyle="#e0ecf8";
        ctx.fillText(String(states[i]).slice(0,28),node.x+5,node.y-12);
      }
    });
    ctx.font="12px system-ui";ctx.fillStyle="#9cb1c8";
    ctx.fillText("Albastru: pornire observată · Auriu: traseu învățat · Verde: formă anticipată",14,H-12);
    trace.textContent=[
      "MOTOR: "+(r.nativeGoalField||"goal-conditioned learned edit-world"),
      "ÎNTREGUL RĂSPUNS ANTICIPAT ÎNAINTE DE EXECUȚIE: "+prediction,
      "NO NEXT CHARACTER FALLBACK: "+String(r.noNextCharacterFallback===true),
      "AXE ÎNVĂȚATE: "+JSON.stringify(r.stepAxes||[]),
      "STĂRI ALE TRASEULUI: "+frames.length,
      ...states.map((state,i)=>"STARE "+i+": "+state),
      ...actions.slice(0,100).map((a,i)=>"TRANSFORMARE "+(i+1)+": "+JSON.stringify(a)),
      "ACȚIUNI EXECUTATE: "+(r.execution?.executedSteps??"—"),
      "CORECTITUDINE SEMANTICĂ EXTERNĂ: NU A FOST DEMONSTRATĂ"
    ].join("\n");
  }
  button.onclick=async()=>{
    const q=question.value.trim();if(!q)return;
    button.disabled=true;
    caption.textContent="Construiesc forma completă din observațiile creierului nativ...";
    try{
      const response=await fetch("/chat",{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({w:getGraph(),history:[["you",q]],opts:{mode:"goal-path",learn:false}})});
      if(!response.ok)throw Error("HTTP "+response.status);
      draw(await response.json());
    }catch(err){draw({ready:false,error:err.message});}
    finally{button.disabled=false;}
  };
  return {draw,renderTraining};
}
