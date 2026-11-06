import {trend,pathGraph,empty} from './research-charts.mjs';
import {setupShapeReplay} from './research-replay.mjs';
const e=id=>document.getElementById(id);
const put=(id,v)=>{const x=e(id);if(x)x.textContent=v;};
const pct=x=>typeof x==='number'&&Number.isFinite(x)?(100*x).toFixed(2)+'%':'—';
const num=x=>Number.isFinite(x)?x.toLocaleString('ro-RO'):'—';
export function setupResearchTab({getSelectedBrain,isLive}){
  const side=document.querySelector('aside.side');
  if(!e('tabResearch')||!e('researchPane')||!side)return;
  const shapeReplay=setupShapeReplay();
  e('tabResearch').onclick=()=>{
    side.classList.remove('evalOn');side.classList.add('researchOn');
    e('tabTrain').classList.remove('on');e('tabEval').classList.remove('on');
    e('tabResearch').classList.add('on');poll();
  };
  async function poll(){
    if(!isLive()||!side.classList.contains('researchOn'))return;
    const w=getSelectedBrain();
    try{
      const resp=await fetch('/research?w='+encodeURIComponent(w),{cache:'no-store'});
      if(!resp.ok)throw Error('HTTP '+resp.status);
      show(await resp.json(),w);
    }catch(error){put('researchStatus','EROARE backend: '+error.message);
      ['researchAccuracy','researchUsage','researchMap'].forEach(id=>empty(id,'Date indisponibile'));}
  }
  function show(r,w){
    const rate=r.rates||{},use=r.totals||{},hist=r.history||[];
    const status=r.error?'EROARE: '+r.error:
      !r.enabled?'Instrumentarea nu este pornită (-Research).':
      !r.attempts?'Creier V17 #'+w+' · aștept primul exemplu real.':
      'Creier V17 #'+w+' · '+num(r.attempts)+' predicții înainte de răspuns';
    const heldNow=r.heldout?.mean;
    if(heldNow&&Number.isFinite(heldNow.sr)&&Number.isFinite(heldNow.native)&&Number.isFinite(heldNow.lexical)){
      const comparator=Math.max(heldNow.native,heldNow.lexical,heldNow.char||0);
      const delta=heldNow.sr-comparator;
      put('researchVerdict',delta>0?
        'SR a depășit comparatorii pe doar '+r.heldout.samples+' rânduri nevăzute (Δ '+(100*delta).toFixed(2)+' pp); NU este încă dovadă de generalizare.':
        'NICIUN CÂȘTIG DEMONSTRAT: SR F1 '+pct(heldNow.sr)+' ≤ cel mai bun comparator '+pct(comparator)+
        ' · decizii schimbate '+num(use.changedDecisions)+'.');
    }else put('researchVerdict',r.attempts?
      'Progres prequential observat; testul înghețat nu a fost încă completat.':
      'Niciun câștig nu poate fi afirmat înainte de date reale.');
    const step=r.progress;
    put('researchStatus',status+(step?.bytesTotal?
      ' · rând '+num(step.index)+' '+num(step.bytesProcessed)+' / '+num(step.bytesTotal)+' caractere · '+step.phase:''));
    put('rObserved',num(r.observed)+' · graf '+num(r.graphEntries));
    put('rChars',num(r.brainCharacters)+' · maze '+num(r.mazeEpisodes));
    const diff=Number.isFinite(rate.sr-rate.native)?((rate.sr-rate.native)*100).toFixed(2)+' pp':'—';
    put('rF1',pct(rate.native)+' → '+pct(rate.sr)+' · Δ '+diff);
    put('rBaseline',pct(rate.lexical)+' / '+pct(rate.char));
    put('rUsed',num(use.nativeCalls)+' / '+num(use.srCalls));
    put('rChanged',num(use.changedDecisions)+' / '+num(use.actualTies));
    put('rTrainingEffects',num(r.trainingUpdatesFromSR??0)+' (doar evaluare, fără update de greutăți)');
    put('rRepeat',pct(rate.repeatOriginal)+' → '+pct(rate.repeatGuarded));
    put('rHeld',r.heldout?.mean?'V17 '+pct(r.heldout.mean.native)+
      ' · SR '+pct(r.heldout.mean.sr)+' · lexical '+pct(r.heldout.mean.lexical):
      'Așteaptă evaluarea înghețată.');
    const G=r.gpu||{};
    put('rGpu',G.error?'EROARE '+G.error:G.requested==='off'?
      'CPU (CUDA nu a fost cerută)':G.ready?
      G.requested+' · '+(G.batch?.phase||'lot inactiv')+' · VRAM '+(G.text?.vramUsedGB??'—')+' GB':
      (G.requested||'—')+' (inițializare / așteptare)');
    trend('researchAccuracy',hist,[
      {key:'native',title:'V17',color:'#f5b301'},
      {key:'sr',title:'SR',color:'#3ddc84'},
      {key:'lexical',title:'lexical',color:'#7cc9ff'},
      {key:'char',title:'caracter',color:'#ff738b'},
      {key:'guarded',title:'anti-loop',color:'#bf99ff'}],true);
    trend('researchUsage',hist,[
      {key:'nativeCalls',title:'apeluri V17',color:'#7cc9ff'},
      {key:'srCalls',title:'apeluri SR',color:'#f5b301'},
      {key:'changedDecisions',title:'decizii SR',color:'#3ddc84'}],false);
    pathGraph(r.last);
    shapeReplay.update(r.last,w,r.attempts);
    if(!r.last)return put('researchEvidence','Nu există încă o predicție făcută pe un exercițiu real.');
    const x=r.last,p=x.path||{},scores=x.scores||{},answers=x.answers||{};
    put('researchEvidence',[
      'PREQUENTIAL REAL · rând #'+x.index+' · predicție înainte de observarea răspunsului',
      'ÎNTREBARE: '+x.question,'RĂSPUNS REAL OBSERVAT DUPĂ: '+x.reference,
      'V17 shape F1 '+pct(scores.native)+' : '+answers.native,
      'SR tie F1 '+pct(scores.sr)+' : '+answers.sr,
      'Lexical F1 '+pct(scores.lexical)+' : '+answers.lexical,
      'Caracter F1 '+pct(scores.char)+' : '+answers.char,
      'Anti-loop F1 '+pct(scores.guarded)+' : '+answers.guarded,
      'Drumuri minime (pe graful observat): '+(p.shortestPathCount||'0'),
      'Egalități reale: '+num(p.actualTies)+' · decizii schimbate: '+num(p.changedDecisions),
      'Traseu original: '+JSON.stringify(p.original||[]),
      'Traseu SR: '+JSON.stringify(p.successor||[]),
      'Atenție: răspunsurile țintă provin din alte rânduri deja observate.',
      'Învățare semantică generală: NEDEMONSTRATĂ.'
    ].join('\n\n'));
  }
  setInterval(poll,1500);
  if(!isLive())put('researchStatus','Deschide interfața live originală V17.');
}
