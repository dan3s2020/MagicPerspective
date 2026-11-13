// Verify TWO genuinely distinct 24h archived physical forecast models.
// This is data access feasibility only; no synthetic weather.
for(const model of ['ecmwf_ifs025','ncep_gfs_global']){
 const u=new URL('https://previous-runs-api.open-meteo.com/v1/forecast');
 for(const [k,v] of Object.entries({
  latitude:52.52,longitude:13.405,start_date:'2025-10-01',
  end_date:'2025-10-03',timezone:'GMT',models:model,
  hourly:'wind_direction_100m_previous_day1'
 }))u.searchParams.set(k,String(v));
 const r=await fetch(u,{signal:AbortSignal.timeout(90000)});
 const body=await r.text();
 if(!r.ok)throw Error(model+' HTTP_'+r.status+' '+body.slice(0,200));
 const j=JSON.parse(body),h=j.hourly,field=h?.wind_direction_100m_previous_day1;
 if(!Array.isArray(field))throw Error(model+' no indexed 24h weather, keys '+Object.keys(h||{}));
 console.log('MODEL_24H_PROBE',JSON.stringify({model,count:field.length,nonnull:field.filter(v=>typeof v==='number'&&Number.isFinite(v)).length,sample:field.slice(0,12)}));
}
