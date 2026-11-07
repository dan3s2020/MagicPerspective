// V25 conservative original-shape completeness monitor, added to the
// ORIGINAL V17 page; no original buttons/scripts overwritten.
const $=id=>document.getElementById(id);
const required=["v25NeutralExamples","v25TeachNeutral","v25Audit","v25StrictPlan",
  "v25GateResult","v23Kind","v23Document","v23Question","v23Noise","v23Seed"];
for(const id of required)if(!$(id))throw Error("V25 UI element missing: "+id);
const selectedBrain=()=>{const card=document.querySelector(".lgc.on[data-w]");return card?Number(card.dataset.w):0;};
const post=async(command,extra={})=>{
 const body={w:selectedBrain(),kind:$("v23Kind").value,command,...extra};
 const r=await fetch("/v25-strict",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const reply=await r.json();
 if(!r.ok||reply.error)throw Error(reply.error||"Native strict HTTP failure");
 return reply;
};
const report=x=>{$("v25GateResult").textContent=String(x)};
const payload=()=>({document:$("v23Document").value,question:$("v23Question").value,
 seed:Number($("v23Seed").value),temperature:Number($("v23Noise").value),
 offset:0,limit:100});
$("v25TeachNeutral").onclick=async()=>{
 const button=$("v25TeachNeutral");button.disabled=true;report("Înregistrez dovezi observate...");
 try{
   const observations=JSON.parse($("v25NeutralExamples").value);
   if(!Array.isArray(observations)||!observations.length)
     throw Error("Introdu o listă JSON de observații cu stări înainte/după neschimbate");
   const r=await post("teach-neutral",{observations});
   report("OBSERVAȚII RAPORTATE, nu inventate\n"+JSON.stringify(r,null,2));
 }catch(err){report("EROARE: "+err.message)}
 finally{button.disabled=false}
};
$("v25Audit").onclick=async()=>{
 const button=$("v25Audit");button.disabled=true;report("Caut evenimente necunoscute relevante...");
 try{
  const r=await post("audit",payload());
  const gate=r.audit||{};
  report((r.found?"NU S-A DETECTAT UN EVENIMENT RELEVANT NECUNOSCUT":"ABȚINERE: "+gate.reason)+
    "\nEntitate: "+String(gate.entity)+
    "\nEfecte recunoscute: "+String(gate.recognizedEffects)+
    "\nPropoziții neutre dovedite: "+String(gate.recognizedNeutral)+
    "\nReferințe necunoscute / posibilă coreferință: "+(gate.unknown||[]).length+
    "\n"+(gate.unknown||[]).map(x=>"Propoziția "+x.sentenceIndex+": "+x.excerpt+" — "+x.meaning).join("\n")+
    "\nLimită: pronumele și actorii indirecți nu sunt rezolvați semantic în general.");
 }catch(e){report("EROARE: "+e.message)}
 finally{button.disabled=false}
};
$("v25StrictPlan").onclick=async()=>{
 const button=$("v25StrictPlan");button.disabled=true;report("Construiesc strict doar dacă lumea are dovezi...");
 try{
  const r=await post("plan",payload());
  if(!r.found){
    report("NU POT CERTIFICA TRASUL: "+String(r.reason)+
      "\n"+(r.audit?.unknown||[]).map(x=>"#"+x.sentenceIndex+" "+x.excerpt).join("\n")+
      "\nNu există răspuns garantat până la clarificarea acestor acțiuni.");
    return;
  }
  report("PASSED STRUCTURED EVIDENCE GATE: "+r.originalMethod+
    "\nForma completă înainte de acțiune: "+r.path.total+" transformări"+
    "\nRăspuns calculat: "+String(r.answer)+
    "\nAnomalii detectate: "+String(r.audit?.unknown?.length||0)+
    "\nSHA256 traseu: "+r.sha256+
    "\nATENȚIE: o întrebare liberă necunoscută nu este automat înțeleasă, iar mișcările nu sunt executate de acest panou.");
  // Reuse exactly the original V23 measured path and the original scalar
  // graph visualization; never draw an invented geometric view.
  document.dispatchEvent(new CustomEvent("mp-v25-strict-frozen-path",{detail:r}));
 }catch(e){report("EROARE: "+e.message)}
 finally{button.disabled=false}
};
