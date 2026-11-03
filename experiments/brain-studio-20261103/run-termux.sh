#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then pkg install -y nodejs; fi

# Do not start a second Studio process on the same port AND data directory.
# In particular, never kill a running trainer or remove its checkpoints.
node - <<'NODE'
const net=require('node:net');
const port=3044,host='127.0.0.1',server=net.createServer();
server.once('error',async error=>{
  if(error.code!=='EADDRINUSE'){
    console.error('Nu am putut verifica portul '+port+': '+error.message);
    process.exitCode=1;return;
  }
  console.error('\nPORTUL 3044 ESTE DEJA OCUPAT. Nu pornesc un al doilea trainer.');
  try{
    const response=await fetch('http://127.0.0.1:3044/api/health',{signal:AbortSignal.timeout(1500)});
    if(response.ok){
      const state=await response.json();
      if(state.ok)console.error('Brain Studio existent: '+state.status+
        ', episoade: '+state.episodes+'.');
    }
  }catch{}
  console.error('Deschide http://127.0.0.1:3044 sau oprește serverul VECHI');
  console.error('în sesiunea lui Termux cu Ctrl+C (salvare normală), apoi rulează din nou.');
  console.error('Nu folosi kill -9, pkill node sau Reset; checkpointurile trebuie păstrate.\n');
  process.exitCode=98;
});
server.listen(port,host,()=>server.close());
NODE

printf '\nMAGICPERSPECTIVE BRAIN STUDIO · http://127.0.0.1:3044\n'
HOST=127.0.0.1 PORT=3044 node server.mjs
