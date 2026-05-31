import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getDowntime, saveDowntime, getStationsList } from '../../utils/storage';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DowntimePage({ globalDate, toast, darkMode }) {
  const [downtimes, setDowntimes]   = useState({});
  const [reasons, setReasons]       = useState({});
  const [stations, setStations]     = useState([]);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';

  async function loadStations() {
    const stns = await getStationsList();
    setStations(stns);
  }

  async function loadDowntime() {
    const dt = await getDowntime(globalDate);
    const dtMap = {};
    const rMap = {};
    dt.forEach(function(d) {
      dtMap[d.station_name] = d.downtime_hours;
      rMap[d.station_name] = d.reason || '';
    });
    setDowntimes(dtMap);
    setReasons(rMap);
  }

  useEffect(function() { loadStations(); }, []);
  useEffect(function() { loadDowntime(); }, [globalDate]);

  async function saveAll() {
    var ok = true;
    for (var j = 0; j < stations.length; j++) {
      var name = stations[j].name;
      var hours = parseFloat(downtimes[name]) || 0;
      if (hours > 0 || reasons[name]) {
        var res = await saveDowntime(globalDate, name, hours, reasons[name] || '');
        if (!res) ok = false;
      }
    }
    if (ok) toast('Downtime saved — ' + globalDate);
    else toast('Some saves failed');
  }

  function updateDowntime(name, val) {
    setDowntimes(function(prev) {
      const next = Object.assign({}, prev);
      next[name] = val;
      return next;
    });
  }

  function updateReason(name, val) {
    setReasons(function(prev) {
      const next = Object.assign({}, prev);
      next[name] = val;
      return next;
    });
  }

  const totalDowntime = stations.reduce(function(s, stn) {
    return s + (parseFloat(downtimes[stn.name]) || 0);
  }, 0);

  const totalM2Lost = stations.reduce(function(s, stn) {
    const capPerHour = (stn.capacity_per_day || 0) / 24;
    const dt = parseFloat(downtimes[stn.name]) || 0;
    return s + capPerHour * dt;
  }, 0);

  const affected = stations.filter(function(stn) {
    return (parseFloat(downtimes[stn.name]) || 0) > 0;
  }).length;

  const chartData = {
    labels: stations.map(function(s) { return s.name; }),
    datasets: [{
      label: 'Downtime (hrs)',
      data: stations.map(function(s) { return parseFloat(downtimes[s.name]) || 0; }),
      backgroundColor: stations.map(function(s) {
        const v = parseFloat(downtimes[s.name]) || 0;
        return v > 2 ? '#E24B4A' : v > 1 ? '#EF9F27' : '#378ADD';
      }),
      borderRadius: 4,
    }]
  };

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        <span style={{fontSize:12,color:'var(--text2)'}}>Date: {globalDate}</span>
        <button className="btn-primary" onClick={saveAll}>Save downtime</button>
      </div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>
            <i className="ti ti-clock-pause" aria-hidden="true" />
          </div>
          <div className="kpi-label">Total downtime</div>
          <div className="kpi-val">{totalDowntime.toFixed(1)}h</div>
          <div className="kpi-footer text-muted">across all stations</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>
            <i className="ti ti-trending-down" aria-hidden="true" />
          </div>
          <div className="kpi-label">m2 lost</div>
          <div className="kpi-val">{totalM2Lost.toFixed(1)}</div>
          <div className="kpi-footer text-muted">estimated output lost</div>
          <div className="kpi-bar" style={{background:'#EF9F27'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
          </div>
          <div className="kpi-label">Stations affected</div>
          <div className="kpi-val">{affected}</div>
          <div className="kpi-footer text-muted">of {stations.length} stations</div>
          <div className="kpi-bar" style={{background:'#1D9E75'}} />
        </div>
      </div>

      {totalDowntime > 0 && (
        <div className="card" style={{marginBottom:12}}>
          <div className="card-head"><div className="card-title">Downtime by station</div></div>
          <div style={{height:200}}>
            <Bar data={chartData} options={{
              responsive:true, maintainAspectRatio:false,
              plugins:{legend:{display:false}},
              scales:{
                x:{ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
                y:{ticks:{color:tickColor,callback:function(v){return v+'h';}},grid:{color:gridColor}}
              }
            }} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Station downtime entry</div>
          <div className="card-sub">Key in hours (e.g. 1.5 = 1h 30min) · m2 loss = (capacity/24) x downtime</div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Capacity (m2/day)</th>
                <th>Downtime (hrs)</th>
                <th>m2 lost</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(function(stn) {
                const dt = parseFloat(downtimes[stn.name]) || 0;
                const capPerHour = (stn.capacity_per_day || 0) / 24;
                const lost = (capPerHour * dt).toFixed(1);
                return (
                  <tr key={stn.id}>
                    <td style={{fontWeight:500,whiteSpace:'nowrap'}}>{stn.name}</td>
                    <td style={{color:'var(--text2)',fontSize:11}}>{stn.capacity_per_day || 0}</td>
                    <td style={{width:120}}>
                      <input type="number" step=".5" min="0" max="24"
                        value={downtimes[stn.name] || ''}
                        placeholder="0"
                        style={{width:'100%',fontSize:12,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}
                        onChange={function(e) { updateDowntime(stn.name, e.target.value); }} />
                    </td>
                    <td>
                      {dt > 0
                        ? <span style={{color:'#E24B4A',fontWeight:500}}>{lost} m2</span>
                        : <span style={{color:'var(--text2)'}}>—</span>}
                    </td>
                    <td>
                      <input type="text"
                        value={reasons[stn.name] || ''}
                        placeholder="Reason..."
                        style={{width:'100%',fontSize:12,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}
                        onChange={function(e) { updateReason(stn.name, e.target.value); }} />
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
