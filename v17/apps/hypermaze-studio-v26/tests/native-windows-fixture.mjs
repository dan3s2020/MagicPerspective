// Test-only fixture for validating the Windows PowerShell bridge launcher.
// Does NOT stand in for a real training acceptance test. Real original V17
// worker integration is independently tested by native-real-runtime.test.mjs.
import http from "node:http";
const port=Number(process.argv[2]||8841);
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://localhost");
  res.setHeader("content-type","application/json; charset=utf-8");
  if(u.pathname==="/graphs")return res.end(JSON.stringify({
    world:"WINDOWS_LAUNCHER_FIXTURE",corpus:{kind:"text",trainRows:20,heldOut:2},
    graphs:[{w:0,arm:"winner",status:"oprit",worlds:["text"],chars:0,
      progress:{trained:0,total:20,heldOut:2},test:null}]}));
  if(u.pathname==="/graph")return res.end(JSON.stringify({
    w:0,nodes:[["source","symbol","source",0,0,0]],edges:[],U:[["source",[.1,.2]]],flow:[]}));
  res.end(JSON.stringify({ok:true}));
});
server.listen(port,"127.0.0.1",()=>{
  console.log("V28_WINDOWS_POWERSHELL_UPSTREAM_FIXTURE "+port);
});
