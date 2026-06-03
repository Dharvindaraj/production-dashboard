import { useState, useEffect } from 'react';
import { getDowntime, saveDowntime, getStationsList, getCapacity } from '../../utils/storage';

export default function DowntimePage({ globalDate, toast }) {
  const [stations, setStations]   = useState([]);
  const [downtimes, setDowntimes] = useState({});
  const [reasons, setReasons]     = useState({});

  async function loadStations() {
    const stns     = await getStationsList();
    const capData  = await getCapacity();
    const capMap   = {};
    capData.forEach(function(c) { capMap[c.station_name] = c.capacity_per_hour; });
    const merged = stns.map(function(s) {
      return Object.assign({}, s, { capacity_per_day: capMap[s.name] || s.capacity_per_day || 0 });
    });
    setStations(merged);
  }

  async function loadDowntime() {
    const dt   = await getDowntime(globalDate);
    const dtMap = {};
    const rMap  = {};
    dt.forEach(function(d) {
      dtMap[d.station_name] = d.downtime_hours;
      rMap[d.station_name]  = d.reason || '';
    });
    setDowntimes(dtMap);
    setReasons(rMap);
  }

  async function loadAll() {
    await loadStations();
    await loadDowntime();
  }

  useEffect(function() { loadAll(); }, [globalDate]);

  async function saveAll() {
    let ok = true;
    for (var i = 0; i < stations.length; i++) {
      var stn = stations[i];
      var hrs = parseFloat(downtimes[stn.name]) || 0;
      if (hrs > 0) {
        var res = await saveDowntime(globalDate, stn.name, hrs, reasons[stn.name] || '');
        if (!res) ok = false;
      }
    }
    if (ok) toast('Downtime saved — ' + globalDate);
    else toast('Error saving some records');
  }

  const totalDowntime = stations.reduce(function(s, stn) {
    return s + (parseFloat(downtimes[stn.name]) || 0);
  }, 0);

  const totalM2Lost = stations.reduce(function(s, stn) {
    const cap   = parseFloat(stn.capacity_per_day) || 0;
    const dt    = parseFloat(downtimes[stn.name])  || 0;
    return s + (cap / 24 * dt);
  }, 0);

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:12,color:'var(--text2)'}}>Date: {globalDate}</span>
        <button className="btn-ghost" onClick={loadAll} style={{fontSize:11}}>
          <i className="ti ti-refresh" aria-hidden="true" /> Refresh capacity
        </button>
        <button className="btn-primary" onClick={saveAll}>Save downtime</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>⏱️</div>
          <div className="kpi-label">Total downtime</div>
          <div className="kpi-val">{totalDowntime.toFixed(1)}h</div>
          <div className="kpi-footer text-muted">across all stations</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>📉</div>
          <div className="kpi-label">m² lost</div>
          <div className="kpi-val">{totalM2Lost.toFixed(1)}</div>
          <div className="kpi-footer text-muted">estimated loss</div>
          <div className="kpi-bar" style={{background:'#EF9F27'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>🏭</div>
          <div className="kpi-label">Stations tracked</div>
          <div className="kpi-val">{stations.length}</div>
          <div className="kpi-footer text-muted">{stations.filter(function(s){return parseFloat(downtimes[s.name])>0;}).length} with downtime</div>
          <div className="kpi-bar" style={{background:'#378ADD'}} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Station downtime — {globalDate}</div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Capacity (m²/day)</th>
                <th>Downtime (hrs)</th>
                <th>m² lost</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(function(stn) {
                const cap    = parseFloat(stn.capacity_per_day) || 0;
                const dt     = parseFloat(downtimes[stn.name])  || 0;
                const m2Lost = cap / 24 * dt;
                return (
                  <tr key={stn.name} style={{background:dt>0?'rgba(226,75,74,0.04)':''}}>
                    <td style={{fontWeight:dt>0?500:400}}>{stn.name}</td>
                    <td style={{color:'var(--text2)',fontSize:11}}>{cap}</td>
                    <td>
                      <input type="number" min="0" max="24" step="0.5"
                        value={downtimes[stn.name]||''}
                        onChange={function(e){setDowntimes(function(p){return Object.assign({},p,{[stn.name]:e.target.value});});}}
                        style={{width:70,fontSize:12,padding:'3px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none',textAlign:'center'}} />
                    </td>
                    <td style={{color:m2Lost>0?'#E24B4A':'var(--text2)',fontWeight:m2Lost>0?500:400,fontSize:12}}>
                      {m2Lost>0?m2Lost.toFixed(2):'—'}
                    </td>
                    <td>
                      {dt > 0 && (
                        <input type="text" placeholder="Enter reason..."
                          value={reasons[stn.name]||''}
                          onChange={function(e){setReasons(function(p){return Object.assign({},p,{[stn.name]:e.target.value});});}}
                          style={{width:'100%',fontSize:11,padding:'3px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
