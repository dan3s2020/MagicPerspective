// Frozen read-only V17 self-code telemetry; no training or checkpoint mutations.
const rate=n=>typeof n==='number'&&Number.isFinite(n)?(100*n).toFixed(1)+'%':'—';
const number=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('ro-RO'):'—';
export function analyzeSelfCodeGraph(graph,worker=0){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))
  throw Error('Malformed /graph: nodes and edges must be arrays');
 const s=graph.selfCode||null,a=s?.audit||null;
 const codeNodes=graph.nodes.filter(n=>Array.isArray(n)&&(['code','lock'].includes(n[1]))).length;
 const portalEdges=graph.edges.filter(e=>Array.isArray(e)&&e[2]==='portal').length;
 const status={
  source:'V17 /graph (read-only)',worker,utc:new Date().toISOString(),
  lived:Number(graph.lived||0),
  graphNodes:graph.nodes.length,graphEdges:graph.edges.length,codeNodes,portalEdges,
  // These graph byte scores are NOT a code-learning or held-out generalization metric.
  graphRecentC:typeof graph.accC==='number'?graph.accC:null,
  graphRecentCombined:typeof graph.accF==='number'?graph.accF:null,
  graphRecentAligned:typeof graph.accAlign==='number'?graph.accAlign:null,
  code:s?{
   episodes:Number(s.episodes||0),portals:Number(s.portalCost||0),
   codePredictions:typeof s.predictionAccuracy==='number'?s.predictionAccuracy:null,
   lockOpen:!!s.unlocked,lockAccuracy:typeof s.lockAccuracy==='number'?s.lockAccuracy:null,
   lockBaseline:typeof s.baseline==='number'?s.baseline:null,
   editCount:s.audit?.codeModificationCount??(s.codeEdits||[]).length,
   edits:s.codeEdits||[],portalTrace:s.portals||[],
   noiseRate:typeof s.noiseRate==='number'?s.noiseRate:null,
   remainingBudget:s.noiseBudgetRemaining??null,
   sourceCoverage:a?.sourceRegionCoverage?
    {visited:a.sourceRegionCoverage.visited,total:a.sourceRegionCoverage.total}:null,
   geneChoices:a?.portalChoiceCounts||null,
   trainingExamples:a?.trainingExamples??null,
   unseenInputs:a?.heldoutInputs?{
    accuracy:a.heldoutInputs.accuracy,coverage:a.heldoutInputs.coverage,
    baseline:a.heldoutInputs.noEditBaseline,n:a.heldoutInputs.total,
    perGene:a.heldoutInputs.genes
   }:null,
   newParameters:a?.newParameterValues?{
    accuracy:a.newParameterValues.accuracy,coverage:a.newParameterValues.coverage,
    baseline:a.newParameterValues.noEditBaseline,n:a.newParameterValues.total
   }:null,
   shuffledLabels:a?.permutedGeneLabels?{
    accuracy:a.permutedGeneLabels.accuracy,n:a.permutedGeneLabels.total
   }:null,
   lockHistory:s.lockHistory||[]
  }:null
 };
 return status;
}
export function difference(previous,current) {
 if(!previous||!current||!previous.code||!current.code)return null;
 if(current.worker!==previous.worker)return null;
 const d=current.code.episodes-previous.code.episodes;
 if(d<0)return {reset:true};
 const elapsed=(Date.parse(current.utc)-Date.parse(previous.utc))/1000;
 return {reset:false,seconds:elapsed,codeEpisodes:d,
  episodesPerSecond:elapsed>0?d/elapsed:null,
  newPortals:current.code.portals-previous.code.portals,
  newEdits:current.code.editCount-previous.code.editCount,
  changedLock:!previous.code.lockOpen&&current.code.lockOpen};
}
export function printableReport(s,diff=null){
 const c=s.code;
 const rows=[
 'MAGICPERSPECTIVE V17 — MASURARE PE TELEFON',
 'UTC: '+s.utc+'  |  worker: #'+s.worker,
 'GRAF: '+number(s.lived)+' momente · '+number(s.graphNodes)+' noduri · '+number(s.graphEdges)+' legaturi',
 'Nu confunda predicțiile de simboluri cu invatarea codului.',
 'Predicții simbol C / C+A / aliniere: '+[s.graphRecentC,s.graphRecentCombined,s.graphRecentAligned].map(rate).join(' / ')
 ];
 if(!c){rows.push('LUMEA CODE: niciun selfCode raportat. Verifica daca ruleaza workerul cu --worlds code.');return rows.join('\n');}
 rows.push(
 'CODE: '+number(c.episodes)+' experiențe · '+number(c.portals)+' portaluri · precizie în timpul învățării '+rate(c.codePredictions),
 'Incuietoare: '+(c.lockOpen?'DEBLOCATA':'INCHISA')+' | test intern '+rate(c.lockAccuracy)+' | baseline '+rate(c.lockBaseline),
 'Modificari ale genomului executabil: '+number(c.editCount));
 if(c.sourceCoverage)rows.push('Explorare sursa reala: '+number(c.sourceCoverage.visited)+' / '+number(c.sourceCoverage.total)+' regiuni vizitate');
 if(c.trainingExamples!=null)rows.push('Exemple cauzale memorate: '+number(c.trainingExamples));
 if(c.unseenInputs){
  rows.push('EVALUARE INGHEȚATA, intrari NEVAZUTE: '+rate(c.unseenInputs.accuracy)+
   ' | acoperire '+rate(c.unseenInputs.coverage)+' | fara schimbare '+rate(c.unseenInputs.baseline)+' | N='+c.unseenInputs.n);
  rows.push('PARAMETRI NOI (in afara antrenarii): '+rate(c.newParameters?.accuracy)+
   ' | acoperire '+rate(c.newParameters?.coverage)+' | N='+(c.newParameters?.n??'—'));
  rows.push('CONTROL identitati permutate: '+rate(c.shuffledLabels?.accuracy)+
   ' | N='+(c.shuffledLabels?.n??'—'));
  if(c.unseenInputs.perGene)for(const g of c.unseenInputs.perGene)
   rows.push('  '+g.gene+': '+rate(g.accuracy)+' | '+number(g.trainingExamples)+' exemple');
 }else rows.push('EVALUARE EXTINSA: lipsește în workerul activ. După git pull, reporneste launcherul pentru a incarca modulul nou.');
 if(c.edits.length)rows.push('Ultima auto-modificare: '+JSON.stringify(c.edits.at(-1)));
 if(diff){
  if(diff.reset)rows.push('COMPARATIE: sesiunea pare resetata; nu calculez progresul ca și cum ar fi continuă.');
  else rows.push('DE LA ULTIMA MASURARE: +'+number(diff.codeEpisodes)+' experiențe ('+
   (diff.episodesPerSecond==null?'—':diff.episodesPerSecond.toFixed(2))+'/s), +'+number(diff.newPortals)+
   ' portaluri, +'+number(diff.newEdits)+' modificări.');
 }
 rows.push('IMPORTANT: testele de cod sunt limitate la ADD/XOR/ROTATE/MULTIPLY pe 4 biti; nu demonstreaza invatarea limbajului JavaScript.');
 return rows.join('\n');
}