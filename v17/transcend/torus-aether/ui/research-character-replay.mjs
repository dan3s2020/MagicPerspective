// REAL original AligningGraph.live() predictions (CPU text path only).
// GPU aggregate results do not expose these events: show "unavailable" rather
// than creating a fake cursor or reconstructing predictions after learning.
const $=id=>document.getElementById(id);
const chr=y=>!Number.isInteger(y)?'—':y===10?'⏎':y===9?'⇥':y===32?'␠':
  y<32||y>126?'·':String.fromCharCode(y);
export function setupCharacterReplay(){
  if(!$('rCharacterStream')||!$('rCharStep'))return {update:()=>{}};
  let records=[],cursor=0,manual=false,previousLast=null;
  function draw(){
    const trace=$('rCharacterStream');
    trace.replaceChildren();
    if(!records.length){$('rCharInspection').textContent='Nicio predicție originală disponibilă.';return;}
    cursor=Math.max(0,Math.min(cursor,records.length-1));
    const current=records[cursor];
    $('rCharStep').max=records.length-1;
    $('rCharStep').value=cursor;
    $('rCharInspection').textContent=[
      'Caracter '+(cursor+1)+' / '+records.length+' din fereastra memorată',
      'Poziție originală: '+current.at,
      'A prezis ÎNAINTE să vadă: "'+chr(current.guess)+'" (cod '+current.guess+')',
      'Real observat: "'+chr(current.actual)+'" (cod '+current.actual+')',
      'Eroare/impuls: '+(current.correct?'0 — anticipare corectă':'1 — anticipare diferită'),
      'Sursa alinierii folosite: '+(current.source||'necunoscută'),
      'Acesta este un pas ORIGINAL de învățare a caracterului, NU o mișcare în graful de răspunsuri.'
    ].join('\n');
    const begin=Math.max(0,cursor-95),end=Math.min(records.length,cursor+96);
    for(let i=begin;i<end;i++){
      const x=records[i],span=document.createElement('span');
      span.className=(x.correct?'ok':'err')+(cursor===i?' selected':'');
      span.textContent=chr(x.actual);
      span.title='Pas '+x.at+' · pred '+chr(x.guess)+' / real '+chr(x.actual)+' · '+(x.correct?'corect':'eroare');
      span.onclick=()=>{manual=true;cursor=i;draw();};
      trace.append(span);
    }
  }
  $('rCharStep').oninput=()=>{manual=true;cursor=+$('rCharStep').value;draw();};
  return {
    update(data,gpu){
      const current=data?.recent||[],last=current.at(-1)?.at??null;
      if(!current.length){
        const why=gpu?.requested&&gpu.requested!=='off'?
          'CUDA agregată: evenimente per caracter indisponibile pe această rută; nu simulăm traiectorii.':
          'Aștept predicții reale de la Brain.live în timpul antrenării textului.';
        $('rCharStatus').textContent=why;
        if(!records.length)draw();
        return;
      }
      $('rCharStatus').textContent='Original AligningGraph.live · '+data.seen+
        ' caractere monitorizate · '+data.hits+' corecte · '+(100*(data.accuracy||0)).toFixed(2)+
        '% în această rulare · ultimele '+current.length+' observabile';
      if(last===previousLast)return;
      previousLast=last;
      records=current;
      if(!manual)cursor=records.length-1;
      else cursor=Math.min(cursor,records.length-1);
      draw();
    }
  };
}
