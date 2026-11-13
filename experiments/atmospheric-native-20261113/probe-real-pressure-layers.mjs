// Read-only feasibility probe of real pressure-level historical forecast data.
// This is NOT a simulation, and does not manufacture missing measurements.
const url=new URL('https://historical-forecast-api.open-meteo.com/v1/forecast');
for(const [k,v] of Object.entries({
 latitude:52.52,longitude:13.405,start_date:'2025-10-01',end_date:'2025-10-02',
 timezone:'GMT',
 hourly:'wind_direction_850hPa,wind_speed_850hPa,wind_direction_700hPa,wind_speed_700hPa,wind_direction_100m,wind_speed_100m',
 wind_speed_unit:'ms'
}))url.searchParams.set(k,String(v));
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
const body=await response.text();
if(!response.ok)throw Error('HISTORICAL_PRESSURE_LEVEL_HTTP_'+response.status+' '+body.slice(0,400));
const parsed=JSON.parse(body);
if(parsed.error)throw Error('Pressure level API says '+body.slice(0,400));
const h=parsed.hourly;
if(!h||!Array.isArray(h.time))throw Error('No times in 3D real archive');
const fields=Object.keys(h).filter(x=>x!=='time');
console.log('REAL_3D_PRESSURE_LAYER_PROBE',JSON.stringify({count:h.time.length,first:h.time[0],last:h.time.at(-1),fields,firstValues:Object.fromEntries(fields.map(f=>[f,h[f]?.slice(0,3)]))}));
