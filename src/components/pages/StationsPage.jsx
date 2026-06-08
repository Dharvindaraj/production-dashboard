import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { STATION_NAMES } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function StationsPage({ allDays, globalDate, darkMode }) {
  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';

  const recent7 = allDays.filter(function(x) { return x.date <= globalDate; }).slice(-7);
  const today   = allDays.find(function(x) { return x.date === globalDate; });

  function getStnVal(stationData, name, idx) {
    if (!stationData) return 0;
    if (stationData[name] !== undefined) return parseFloat(stationData[name]) || 0;
    if (stationData[String(idx)] !== undefined) return parseFloat(stationData[String(idx)]) || 0;
    if (stationData[idx] !== undefined) return parseFloat(stationData[idx]) || 0;
    return 0;
  }

  function getAllStnVal(dayData, name, idx) {
    var v = (parseFloat((dayData.stationLcmMorning||{})[name])||0)
          + (parseFloat((dayData.stationLcmNight||{})[name])||0)
          + (parseFloat((dayData.stationLcsMorning||{})[name])||0)
          + (parseFloat((dayData.stationLcsNight||{})[name])||0);
    if (v > 0) return v;
    var v2 = getStnVal(dayData.stations_morning, name, idx)
           + getStnVal(dayData.stations_night, name, idx);
    if (v2 > 0) return v2;
    return getStnVal(dayData.stations, name, idx);
  }

  const avgs = {};
  STATION_NAMES.forEach(function(name, i) {
    const idx = i + 1;
    const vs = recent7
      .filter(function(x) { return getAllStnVal(x.data, name, idx) > 0; })
      .map(function(x) { return getAllStnVal(x.data, name, idx); });
    avgs[name] = vs.length ? vs.reduce(function(a, b) { return a + b; }, 0) / vs.length : 0;
  });

  const cur = STATION_NAMES.map(function(name, i) {
    return today ? getAllStnVal(today.data, name, i+1) : 0;
  });
  const avg = STATION_NAMES.map(function(name) {
    return parseFloat(avgs[name].toFixed(2));
  });
  const maxV = Math.max.apply(null, cur.concat([0.01]));

  const sorted = cur.map(function(v, i) {
    return { name: STATION_NAMES[i], v: v, a: avg[i] };
  }).sort(function(a, b) { return b.v - a.v; });

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Station output vs 7-day average</div>
            </div>
          </div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Today</span>
            <span className="leg"><span className="leg-dot" style={{background:'rgba(55,138,221,.4)'}}></span>7-day avg</span>
          </div>
          <div style={{height:280}}>
            <Bar
              data={{
                labels: STATION_NAMES,
                datasets: [
                  { label: 'Today', data: cur, backgroundColor: '#378ADD', borderRadius: 3 },
                  { label: '7-day avg', data: avg, backgroundColor: 'rgba(55,138,221,.25)', borderRadius: 3 }
                ]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { font: { size: 9 }, autoSkip: false, maxRotation: 45, color: tickColor }, grid: { display: false } },
                  y: { beginAtZero: true, ticks: { font: { size: 10 }, color: tickColor }, grid: { color: gridColor } }
                }
              }}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Ranked by output</div>
              <div className="card-sub">Today</div>
            </div>
          </div>
          <div className="defect-list" style={{maxHeight:280,overflowY:'auto'}}>
            {sorted.map(function(item) {
              return (
                <div key={item.name} className="defect-item">
                  <div className="d-top">
                    <span className="d-name">{item.name}</span>
                    <span className="d-pct" style={{color:item.v>=item.a?'#3B6D11':'#A32D2D'}}>{item.v.toFixed(1)}</span>
                  </div>
                  <div className="d-bar-bg">
                    <div className="d-bar-fill" style={{width:(item.v/maxV*100).toFixed(1)+'%',background:item.v>=item.a?'#5DCAA5':'#E24B4A'}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Station detail</div></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Station</th>
                <th>Today</th>
                <th>7-day avg</th>
                <th>Diff</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {STATION_NAMES.map(function(name, i) {
                const v = cur[i];
                const a = avg[i];
                const df = v - a;
                return (
                  <tr key={name}>
                    <td style={{color:'var(--text2)',fontSize:11}}>{i+1}</td>
                    <td style={{fontWeight:500}}>{name}</td>
                    <td><strong>{v.toFixed(1)}</strong></td>
                    <td>{a.toFixed(1)}</td>
                    <td style={{color:df>=0?'#3B6D11':'#A32D2D'}}>{df>=0?'+':''}{df.toFixed(1)}</td>
                    <td>
                      <span className={v>=a?'pill pill-green':'pill pill-red'}>
                        {v>=a?'On track':'Below avg'}
                      </span>
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
