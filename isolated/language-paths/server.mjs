// Local-only observatory. No V17 data or checkpoints are modified.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runBenchmark} from './benchmark.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8898),host='127.0.0.1';
let report=null;
function getReport(){if(report)return report;const file=path.join(dir,'run-result.json');
 report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):runBenchmark();return report;}
const server=http.createServer((req,res)=>{
 let body,contentType,status=200;
 try{if(req.method!=='GET')throw Object.assign(Error('GET only'),{status:405});
   if(req.url==='/'||req.url==='/index.html'){body=fs.readFileSync(path.join(dir,'index.html'));contentType='text/html; charset=utf-8';}
   else if(req.url==='/api/report'){body=JSON.stringify(getReport());contentType='application/json; charset=utf-8';}
   else if(req.url==='/health'){body='ok';contentType='text/plain; charset=utf-8';}
   else throw Object.assign(Error('Not found'),{status:404});
 }catch(e){status=e.status||500;body=JSON.stringify({error:e.message});contentType='application/json';}
 res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'none'});res.end(body);
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(port,host,()=>console.log(`Language paths observer: http://${host}:${port}/`));
export {server};
