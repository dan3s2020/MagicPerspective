// Interactive playback of TRUE original-V17 executed graph-world actions.
// Playback clock is a UI replay of recorded backend transitions, NOT a
// fabricated live physical action or generated character motion.
import {drawGlobalShape,drawLocalCursor} from './research-replay-draw.mjs';
const $=id=>document.getElementById(id);
const set=(id,value)=>{const e=$(id);if(e)e.textContent=value;};
const to=n=>n===undefined||n===null?'—':String(n);
function pct(n){return Number.isFinite(n)?(n*100).toFixed(2)+'%':'—';}
export function setupShapeReplay(){
  if(!$('shapeResearch')||!$('rTraceStep'))return {update:()=>{}};
  let lastKey='',latest=null,current=null,index=0,selectedAlt=-1,
    sweep=null,playing=false,timer=null,worker=null;
  const trace=()=>current?.[$('rActorPolicy').value]||null;
  function paint(){
    const T=trace();
    if(!T?.frames?.length){
      set('rStepFacts','Nu există încă o mișcare înregistrată pe graful de antrenare.');
      set('rTraceEvents','Fără evenimente de navigare.');
      set('rAlternativeList','');
      return;
    }
    index=Math.max(0,Math.min(index,T.frames.length-1));
    const f=T.frames[index],wave=f.fieldWave||[];
    if(sweep===null)sweep=wave.length-1;
    sweep=Math.max(0,Math.min(sweep,Math.max(0,wave.length-1)));
    $('rTraceStep').max=Math.max(0,T.frames.length-1);
    $('rTraceStep').value=index;
    $('rFieldSweep').max=Math.max(0,wave.length-1);
    $('rFieldSweep').value=sweep;
    set('rStepCount','Pas '+index+' / '+(T.frames.length-1));
    set('rSweepCount','Propagare '+(wave[sweep]?.iteration??0)+' / '+
      (f.fieldSweeps??0)+' iterații V17 · '+wave.length+' eșantioane reale');
    set('rRotateOut',$('rRotate').value+'°');
    drawGlobalShape(T,index,{
      projection:$('rProjection').value,
      axisX:$('rDimX').value,axisY:$('rDimY').value,rotation:+$('rRotate').value,
      sweepIndex:sweep,alternative:selectedAlt
    });
    drawLocalCursor(T,index);
    const s=T.summary||{},before=T.frames[Math.max(0,index-1)];
    set('rShapeTruth','Graful este construit din rândurile OpenThoughts deja observate. '+
      'Acești '+T.nodes.length+' vectori au patru măsurători: atracție V17, '+
      'ocupație SR, distanță, ramificare. Nu sunt o geometrie semantică 4D învățată. '+
      'Mișcarea este o acțiune de parcurgere a unei muchii a atlasului.');
    set('rStepFacts',[
      'SURSĂ: '+T.source+' | WORLD: '+T.world+
        ' | actor '+T.actorPolicy+' | creier #'+worker,
      'PERSPECTIVĂ GLOBALĂ: forma inițială = '+
        (T.initial.shape?.join(' → ')||'nicio cale anticipată'),
      'ȚINTĂ OBSERVATĂ: '+T.initial.goalCount+' · drumuri minime: '+
        T.initial.shortestPathCount+' · lungime optimă: '+to(s.optimalLength),
      'PERSPECTIVA LOCALĂ: cursor #'+f.at+' ('+f.atLabel+')'+
        ' · '+f.visibleNeighbors.length+' vecini observați',
      'ACȚIUNEA '+index+': '+(index?
        'din #'+f.from+' prin muchia/a'+f.action+' → #'+f.actual:
        'încă nu a executat prima mișcare'),
      'PREDICȚIA DINAINTEA ACȚIUNII: '+to(f.predictedNext)+
        ' · rezultat observat: '+to(f.actual)+
        ' · eroare: '+to(f.forecastError),
      'FORMA RECALCULATĂ ACUM: '+(f.shape.join(' → ')||'nu există cale'),
      'A schimbat forma? '+(f.shapeChanged?'DA':'nu')+
        ' · Δ L1 câmp: '+to(f.fieldL1Delta)+
        ' · iterații relaxare: '+to(f.fieldSweeps),
      'VALOARE SR ÎN CURSOR: '+to(f.successor)+
        ' · drumuri minime rămase: '+f.shortestPaths,
      'REZULTAT: mișcări efectuate până acum '+index+
        ' · abatere de la predicția locală: '+(T.frames.slice(1,index+1).filter(x=>x.forecastError).length),
      'TOTAL RUN: '+s.steps+' pași · '+s.recomputations+
        ' recalculări · '+s.divergencesFromRecomputedLocalPrediction+
        ' abateri · '+s.shapeChanges+' schimbări de formă',
      'SFÂRȘIT: '+s.stopReason+' · țintă din TRAINING atinsă: '+s.reachedStoredTrainingTarget,
      'Aceste evenimente sunt reproduse din acțiuni reale în graful observat; '+
        'NU reprezintă încă mișcarea unui caracter prin semantica limbajului.'
    ].join('\n\n'));
    const list=$('rAlternativeList');
    list.replaceChildren();
    for(let i=0;i<T.alternatives.length;i++){
      const alt=T.alternatives[i];
      const btn=document.createElement('button');
      btn.type='button';btn.className=selectedAlt===i?'on':'';
      btn.textContent='Muchie '+alt.action+' → #'+alt.firstNode+
        ' · drumuri minime '+alt.shortestPaths+
        ' · '+(alt.goalReached?'țintă observată':'neterminat')+
        ' · '+alt.path.join('→');
      btn.onclick=()=>{selectedAlt=selectedAlt===i?-1:i;paint();};
      list.append(btn);
    }
    set('rTraceEvents',T.frames.map((f,i)=>
      (i===index?'▶ ':'  ')+'#'+i+' cursor '+f.at+
      (i?' · a'+f.action+' din '+f.from:' · formă inițială')+
      ' · țintă '+(f.targetReached?'da':'nu')+
      ' · pred '+to(f.predictedNext)+' / actual '+to(f.actual)+
      ' · Δ câmp '+to(f.fieldL1Delta)+
      ' · alternativă rămasă '+f.shortestPaths
    ).join('\n'));
  }
  function move(toIndex){
    const T=trace();if(!T)return;
    index=Math.max(0,Math.min(T.frames.length-1,toIndex));
    sweep=null;paint();
  }
  function stop(){
    playing=false;if(timer!==null){clearTimeout(timer);timer=null;}
    $('rPlay').classList.remove('on');
  }
  function next(){
    const T=trace();if(!T){stop();return;}
    if(index>=T.frames.length-1){stop();return;}
    move(index+1);
    timer=setTimeout(next,Math.max(150,+$('rReplaySpeed').value||650));
  }
  $('rFirst').onclick=()=>{stop();move(0);};
  $('rPrev').onclick=()=>{stop();move(index-1);};
  $('rNext').onclick=()=>{stop();move(index+1);};
  $('rPause').onclick=stop;
  $('rPlay').onclick=()=>{
    if(!trace()?.frames?.length)return;
    stop();if(index>=trace().frames.length-1)move(0);
    playing=true;$('rPlay').classList.add('on');
    timer=setTimeout(next,Math.max(150,+$('rReplaySpeed').value||650));
  };
  $('rTraceStep').oninput=()=>{stop();move(+$('rTraceStep').value);};
  $('rFieldSweep').oninput=()=>{sweep=+$('rFieldSweep').value;paint();};
  $('rActorPolicy').onchange=()=>{stop();selectedAlt=-1;move(0);};
  for(const id of ['rProjection','rDimX','rDimY','rRotate']){
    $(id).addEventListener(id==='rRotate'?'input':'change',paint);
  }
  $('rFollow').onchange=()=>{if($('rFollow').checked&&latest){current=latest;stop();move(0);}};
  return {
    update(sample,selectedWorker,serial){
      if(!sample?.navigation){
        if(!latest&&!current)paint();
        return;
      }
      const key=selectedWorker+':'+(serial??sample.index)+':'+sample.index;
      if(key===lastKey)return;
      lastKey=key;latest=sample.navigation;worker=selectedWorker;
      if(!current||$('rFollow').checked){
        current=latest;selectedAlt=-1;stop();move(0);
      }
    }
  };
}
