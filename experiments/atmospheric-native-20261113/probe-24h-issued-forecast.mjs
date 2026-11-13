// Verify a forecast field with the explicit 24h lead, *not* a hindsight
// analysis field; no original organism inference is done in this probe.
const url=new URL('https://previous-runs-api.open-meteo.com/v1/forecast');
for(const [k,v] of Object.entries({
 latitude:52.52,longitude:13.405,
 start_date:'2025-10-01',end_date:'2025-10-02',timezone:'GMT',
 hourly:'wind_direction_100m_previous_day1,wind_speed_100m_previous_day1'
}))url.searchParams.set(k,String(v));
const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
const txt=await r.text();
if(!r.ok)throw Error('ARCHIVED_24H_FORECAST_HTTP_'+r.status+': '+txt.slice(0,450));
const j=JSON.parse(txt);
if(j.error||!j.hourly?.time?.length)throw Error('No archived numerical future '+txt.slice(0,450));
const out={n:j.hourly.time.length,fields:Object.keys(j.hourly).filter(k=>k!=='time'),date:j.hourly.time[0],
 sample:Object.fromEntries(Object.entries(j.hourly).filter(([k])=>k!=='time').map(([k,v])=>[k,v.slice(0,5)]))};
console.log('REAL_ARCHIVED_24H_FORECAST_PROBE',JSON.stringify(out));
