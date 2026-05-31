import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { getEtchRate, saveEtchRate, deleteEtchRate, getEtchRateRange } from '../../utils/storage';
import { ETCH_TARGET, ETCH_UCL, ETCH_LCL, ETCH_USL, ETCH_LSL, tod, daysAgo } from '../../utils/constants';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
export default function EtchRatePage({ globalDate, toast, darkMode }) {
  const [readings, setReadings] = useState([]);
  const [newTime, setNewTime] = useState('');
  const [newValue, setNewValue] = useState('');
  const [viewMode, setViewMode] = useState('day');
  const [rangeFrom, setRangeFrom] = useState(daysAgo(7));
  const [rangeTo, setRangeTo] = useState(tod());
  const [rangeData, setRangeData] = useState([]);
  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';
  async function loadDay() { var data = await getEtchRate(globalDate); setReadings(data); }
  async function loadRange() { var data = await getEtchRateRange(rangeFrom, rangeTo); setRangeData(data); }
  useEffect(function() { loadDay(); }, [globalDate]);
  useEffect(function() { if (viewMode === 'range') loadRange(); }, [viewMode, rangeFrom, rangeTo]);
  async function addReading() {
    if (!newTime || !newValue) { toast('Enter time and value'); return; }
    var val = parseFloat(newValue);
    if (isNaN(val)) { toast('Invalid value'); return; }
    var ok = await saveEtchRate(globalDate, newTime, val);
    if (ok) { toast('Saved'); setNewTime(''); setNewValue(''); loadDay(); }
    else toast('Save error');
  }
  async function deleteReading(time) {
    var ok = await deleteEtchRate(globalDate, time);
    if (ok) { toast('Deleted'); loadDay(); }
  }
  function getPointColor(v) {
    if (v > ETCH_USL || v < ETCH_LSL) return '#E24B4A';
    if (v > ETCH_UCL || v < ETCH_LCL) return '#EF9F27';
    return '#5DCAA5';
  }
  function buildChartData(data, labels) {
    var n = labels.length;
    return {
      labels: labels,
      datasets: [
        { label: 'Etch rate', data: data, borderColor: '#5DCAA5', backgroundColor: 'rgba(93,202,165,0.1)', pointBackgroundColor: data.map(function(v){return getPointColor(v);}), pointRadius: 5, pointHoverRadius: 7, tension: 0.3, fill: false },
        { label: 'Target', data: Array(n).fill(ETCH_TARGET), borderColor: '#888', borderDash: [4,4], pointRadius: 0, borderWidth: 1.5, fill: false },
        { label: 'UCL', data: Array(n).fill(ETCH_UCL), borderColor: '#378ADD', borderDash: [6,3], pointRadius: 0, borderWidth: 1.5, fill: false },
        { label: 'LCL', data: Array(n).fill(ETCH_LCL), borderColor: '#378ADD', borderDash: [6,3], pointRadius: 0, borderWidth: 1.5, fill: false },
        { label: 'USL', data: Array(n).fill(ETCH_USL), borderColor: '#E24B4A', borderDash: [4,2], pointRadius: 0, borderWidth: 2, fill: false },
        { label: 'LSL', data: Array(n).fill(ETCH_LSL), borderColor: '#E24B4A', borderDash: [4,2], pointRadius: 0, borderWidth: 2, fill: false },
      ]
    };
  }
  var chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tickColor, font: { size: 9 }, autoSkip: true, maxRotation: 45 }, grid: { color: gridColor } }, y: { min: 1.2, max: 2.0, ticks: { color: tickColor, font: { size: 9 }, callback: function(v){ return v + ' um'; } }, grid: { color: gridColor } } } };
  var dayLabels = readings.map(function(r){ return r.entry_time ? r.entry_time.slice(0,5) : ''; });
  var dayValues = readings.map(function(r){ return parseFloat(r.etch_value); });
  var rangeLabels = rangeData.map(function(r){ return r.entry_date + ' ' + (r.entry_time ? r.entry_time.slice(0,5) : ''); });
  var rangeValues = rangeData.map(function(r){ return parseFloat(r.etch_value); });
  var avg = readings.length ? readings.reduce(function(s,r){ return s + parseFloat(r.etch_value); }, 0) / readings.length : 0;
  var outOfControl = readings.filter(function(r){ var v=parseFloat(r.etch_value); return v>ETCH_UCL||v<ETCH_LCL; }).length;
  var outOfSpec = readings.filter(function(r){ var v=parseFloat(r.etch_value); return v>ETCH_USL||v<ETCH_LSL; }).length;
  return (
    <div>
      <div className="filter-bar" style={{marginBottom:14}}>
        <div style={{display:'flex',gap:5}}>
          <button className={'quick-btn'+(viewMode==='day'?' active':'')} onClick={function(){setViewMode('day');}}>Single day</button>
          <button className={'quick-btn'+(viewMode==='range'?' active':'')} onClick={function(){setViewMode('range');}}>Date range</button>
        </div>
        {viewMode==='range' && <>
          <div className="filter-sep" />
          <label>From</label><input type="date" value={rangeFrom} onChange={function(e){setRangeFrom(e.target.value);}} />
          <label>To</label><input type="date" value={rangeTo} onChange={function(e){setRangeTo(e.target.value);}} />
          <button className="btn-ghost" onClick={loadRange} style={{fontSize:11,padding:'4px 10px'}}>Update</button>
        </>}
        {viewMode==='day' && <span style={{fontSize:11,color:'var(--text2)'}}>Viewing: {globalDate}</span>}
      </div>
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:14}}>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}><i className="ti ti-chart-dots" aria-hidden="true" /></div><div className="kpi-label">Readings today</div><div className="kpi-val">{readings.length}</div><div className="kpi-footer text-muted">data points</div><div className="kpi-bar" style={{background:'#1D9E75'}} /></div>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}><i className="ti ti-target" aria-hidden="true" /></div><div className="kpi-label">Average</div><div className="kpi-val">{avg>0?avg.toFixed(3):'—'}</div><div className="kpi-footer text-muted">target: {ETCH_TARGET} um</div><div className="kpi-bar" style={{background:'#378ADD'}} /></div>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}><i className="ti ti-alert-circle" aria-hidden="true" /></div><div className="kpi-label">Out of control</div><div className="kpi-val" style={{color:outOfControl>0?'#EF9F27':'var(--text)'}}>{outOfControl}</div><div className="kpi-footer text-muted">beyond UCL/LCL</div><div className="kpi-bar" style={{background:'#EF9F27'}} /></div>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}><i className="ti ti-alert-triangle" aria-hidden="true" /></div><div className="kpi-label">Out of spec</div><div className="kpi-val" style={{color:outOfSpec>0?'#E24B4A':'var(--text)'}}>{outOfSpec}</div><div className="kpi-footer text-muted">beyond USL/LSL</div><div className="kpi-bar" style={{background:'#E24B4A'}} /></div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div className="card-head"><div><div className="card-title">Etch rate SPC chart</div><div className="card-sub">Target: {ETCH_TARGET} · UCL/LCL: {ETCH_UCL}/{ETCH_LCL} · USL/LSL: {ETCH_USL}/{ETCH_LSL} · Unit: um</div></div></div>
        <div className="legend-row">
          <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Etch rate</span>
          <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>UCL/LCL</span>
          <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>USL/LSL</span>
          <span className="leg"><span className="leg-dot" style={{background:'#888'}}></span>Target</span>
        </div>
        <div style={{height:300}}>
          {viewMode==='day'
            ? <Line data={buildChartData(dayValues,dayLabels)} options={chartOpts} />
            : <Line data={buildChartData(rangeValues,rangeLabels)} options={chartOpts} />}
        </div>
      </div>
      {viewMode==='day' && (
        <div className="card" style={{marginBottom:12}}>
          <div className="card-head"><div className="card-title">Add reading</div></div>
          <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
            <div className="fg" style={{width:140}}><label>Time</label><input type="time" value={newTime} onChange={function(e){setNewTime(e.target.value);}} /></div>
            <div className="fg" style={{width:160}}><label>Etch rate (um)</label><input type="number" step=".001" placeholder="1.600" value={newValue} onChange={function(e){setNewValue(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')addReading();}} /></div>
            <button className="btn-primary" onClick={addReading}>+ Add</button>
          </div>
        </div>
      )}
      {viewMode==='day' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Today readings</div></div>
          {readings.length ? (
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Time</th><th>Etch rate (um)</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {readings.map(function(r) {
                    var v=parseFloat(r.etch_value);
                    var outSpec=v>ETCH_USL||v<ETCH_LSL;
                    var outCtrl=v>ETCH_UCL||v<ETCH_LCL;
                    return (
                      <tr key={r.entry_time}>
                        <td style={{fontWeight:500}}>{r.entry_time?r.entry_time.slice(0,5):''}</td>
                        <td style={{fontWeight:500,color:outSpec?'#E24B4A':outCtrl?'#EF9F27':'#5DCAA5',fontSize:14}}>{v.toFixed(3)}</td>
                        <td>{outSpec?<span className="pill pill-red">Out of spec</span>:outCtrl?<span className="pill pill-amber">Out of control</span>:<span className="pill pill-green">In control</span>}</td>
                        <td><button className="btn-ghost" onClick={function(){deleteReading(r.entry_time);}} style={{fontSize:11,padding:'3px 8px',color:'#A32D2D'}}><i className="ti ti-trash" aria-hidden="true" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">No readings for {globalDate}</div>}
        </div>
      )}
    </div>
  );
}
