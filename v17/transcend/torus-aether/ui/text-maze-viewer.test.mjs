import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTextMaze5D} from './text-maze-viewer.mjs';
function fakeCanvas(){
 const g=new Proxy({}, {get(t,p){if(p==='fillText'||p==='beginPath'||p==='clearRect'||p==='fillRect'||p==='moveTo'||p==='lineTo'||p==='stroke'||p==='arc'||p==='fill'||p==='save'||p==='restore'||p==='setLineDash'||p==='setTransform')return ()=>{};return t[p];},set(t,p,v){t[p]=v;return true;}});
 return {clientWidth:840,clientHeight:400,width:840,height:400,style:{},getContext:()=>g,addEventListener:()=>{},setPointerCapture:()=>{},getBoundingClientRect:()=>({left:0,top:0})};
}
function fakeContainer(){
 const els={};const make=k=>els[k]||=(k==='canvas'?fakeCanvas():{textContent:'',value:k==='slice'?'1':k==='zoom'?'1':k==='rot'?'.25':k==='speed'?'170':'0',style:{},hidden:false,addEventListener:()=>{}});
 const root={isConnected:true,querySelector:q=>q==='.hmTitle'?make('title'):make(q.match(/data-hm="([^"]+)"/)?.[1]||'unknown')};
 return {parent:{innerHTML:'',querySelector:()=>root},els};
}
const coords=[...Array(128)].map((_,i)=>[i,[.1+i/500,.2+i/500,.3+i/500,.4+i/500,.5+i/500]]);
test('visual renderer works on actual-shaped V17 evaluation, chat and training payloads',()=>{
 globalThis.devicePixelRatio=1;
 globalThis.window={addEventListener:()=>{}};
 globalThis.document={fullscreenElement:null};
 globalThis.requestAnimationFrame=()=>{};
 const {parent,els}=fakeContainer();
 const viewer=mountTextMaze5D(parent,{title:'Trace fixture'});
 const rows=[[81,81],[58,58],[10,10],[65,65],[58,58],[66,66],[65,66]];
 viewer.loadEvaluation({rows,a0:5,shape:'BC',replans:[{at:1,preview:'A'}]},coords);
 viewer.setStep(2);
 assert.match(els.details.textContent,/PERSPECTIVA CURSORULUI/);
 assert.match(els.status.textContent,/Coordonate învățate/);
 viewer.loadChat({text:'She is calm.',gear:{used:true,route:[{before:'He is calm',after:'She is calm',evidence:2,slot:0}],steps:[]}},coords,'Describe calm');
 viewer.setStep(3);
 assert.match(els.details.textContent,/NativeGearDrive/);
 viewer.loadTraining([[1,65,66,66,'chain-gpu-replay'],[2,66,66,65,'align-online']],coords);
 viewer.setStep(2);
 assert.match(els.details.textContent,/LIVE: simboluri trăite/);
});
