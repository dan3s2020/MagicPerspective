// V44 dataset isolation worker. This imports the pre-existing, proven
// OpenThoughts Parquet FORMAT ADAPTER ONLY, never the V42/V43 trainer/UI.
import {parentPort, workerData} from "node:worker_threads";
import fs from "node:fs";
import {openTextDataset} from "../v17/transcend/torus-aether/data/text-dataset.mjs";

let ds=null,index=0,busy=false;
const send=(type,data={})=>parentPort.postMessage({type,...data});
async function init(){
  try{
    if(workerData.ciSynthetic){
      if(process.env.V44_ALLOW_CI_SYNTHETIC!=="1")throw Error("Synthetic dataset is restricted to authorized CI");
      const rows=fs.readFileSync(workerData.dataset,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
      if(rows.length<4)throw Error("CI requires at least 4 synthetic rows");
      const held=Math.min(2,Math.floor(rows.length/4)),trainRows=rows.length-held;
      ds={trainRows,held,files:[{path:workerData.dataset}],
        exercise:async i=>rows[i],heldOut:async i=>rows[trainRows+i]};
    }else{
      ds=await openTextDataset(workerData.dataset);
    }
    index=Math.max(0,Math.min(ds.trainRows,Number(workerData.startRow)||0));
    const holdout=[];
    for(let i=0;i<ds.held;i++){
      const x=await ds.heldOut(i);
      holdout.push({id:x.index,prompt:x.prompt,answer:x.answer});
    }
    send("ready",{trainRows:ds.trainRows,heldOutRows:ds.held,
      files:ds.files.length,index,holdout});
  }catch(e){send("fatal",{error:String(e.stack||e)});}
}
parentPort.on("message",async m=>{
  if(!ds)return;
  try{
    if(m.cmd==="seek"){
      if(busy){send("warning",{error:"Dataset seek rejected while read active"});return}
      index=Math.max(0,Math.min(ds.trainRows,Math.floor(Number(m.index)||0)));
      send("seek",{index});return;
    }
    if(m.cmd!=="next"||busy)return;
    busy=true;
    const requested=Math.max(1,Math.min(16,Math.floor(Number(m.size)||4)));
    const rows=[];
    let attempted=0,bytes=0;
    while(rows.length<requested&&index<ds.trainRows&&attempted<requested*10){
      const i=index++;
      attempted++;
      const item=await ds.exercise(i);
      if(!item.prompt?.trim()||!item.answer?.trim())continue;
      const row={id:i,prompt:item.prompt,answer:item.answer};
      bytes+=Buffer.byteLength(row.prompt)+Buffer.byteLength(row.answer);
      rows.push(row);
    }
    send("batch",{rows,index,attempted,sourceBytes:bytes,done:index>=ds.trainRows});
  }catch(e){send("fatal",{error:String(e.stack||e)})}
  finally{busy=false}
});
await init();
