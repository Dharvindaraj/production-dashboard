import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getPersonalOT, savePersonalOT, getPersonalOTRange } from '../../utils/storage';
import { tod, daysAgo, calcOT, isWeekend, currentMonth } from '../../utils/constants';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
export default function PersonalOTPage({ globalDate, toast, darkMode }) {
  const [scanIn, setScanIn] = useState('');
  const [scanOut, setScanOut] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(tod());
  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';
  var otHours = calcOT(scanIn, scanOut, globalDate);
  var weekend = isWeekend(globalDate);
  var dayName = new Date(globalDate).toLocaleDateString('en-MY', {weekday:'long'});
  async function load() {
    var d = await getPersonalOT(globalDate);
    if (d) { setScanIn(d.scan_in?d.scan_in.slice(0,5):''); setScanOut(d.scan_out?d.scan_out.slice(0,5):''); setNotes(d.notes||''); }
    else { setScanIn(''); setScanOut(''); setNotes(''); }
  }
  async function loadHistory() { var data = await getPersonalOTRange(from, to); setHistory(data); }
  useEffect(function() { load(); }, [globalDate]);
  useEffect(function() { loadHistory(); }, [from, to]);
  async function save() {
    var ok = await savePersonalOT(globalDate, { scanIn: scanIn||null, scanOut: scanOut||null, otHours: otHours, isWeekend: weekend, notes: notes });
    if (ok) { toast('Saved — ' + globalDate); loadHistory(); }
    else toast('Save error');
  }
  var totalOT = history.reduce(function(s,d){ return s+(parseFloat(d.ot_hours)||0); }, 0);
  var weekendDays = history.filter(function(d){ return d.is_weekend; }).length;
  var weekdayOT = history.filter(function(d){ return !d.is_weekend && (parseFloat(d.ot_hours)||0)>0; }).length;
  var chartData = {
    labels: history.map(function(d){ return d.entry_date.slice(5); }),
    datasets: [{ label: 'OT hours', data: history.map(function(d){ return parseFloat(d.ot_hours)||0; }), backgroundColor: history.map(function(d){ return d.is_weekend?'#7F77DD':'#378ADD'; }), borderRadius: 4 }]
  };
  return (
    <div>
      <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Personal OT tracker</div>
        <div style={{fontSize:20,fontWeight:500}}>My overtime record</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>OT starts after 6:30pm on weekdays · Full day on weekends</div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div><div className="card-title">Log for {globalDate}</div><div className="card-sub">{dayName} {weekend?'— Weekend (full day OT)':'— Weekday (OT after 6:30pm)'}</div></div>
          <div style={{display:'flex',gap:8}}><button className="btn-ghost" onClick={load}>Load</button><button className="btn-primary" onClick={save}>Save</button></div>
        </div>
        <div className="form-grid" style={{marginBottom:12}}>
          <div className="fg"><label>Scan in time</label><input type="time" value={scanIn} onChange={function(e){setScanIn(e.target.value);}} /></div>
          <div className="fg"><label>Scan out time</label><input type="time" value={scanOut} onChange={function(e){setScanOut(e.target.value);}} /></div>
        </div>
        <div style={{background:otHours>0?'rgba(55,138,221,0.1)':'var(--bg3)',border:'1px solid '+(otHours>0?'#378ADD':'var(--border)'),borderRadius:8,padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'var(--text2)',marginBottom:3}}>OT HOURS TODAY</div>
            <div style={{fontSize:28,fontWeight:500,color:otHours>0?'#378ADD':'var(--text2)'}}>{otHours>0?otHours.toFixed(2)+'h':'—'}</div>
            {scanIn && scanOut && <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>{scanIn} to {scanOut}{weekend?' (weekend)':' (OT from 6:30pm)'}</div>}
          </div>
          {otHours>0 && <span className="pill pill-blue">{weekend?'Weekend OT':'Weekday OT'}</span>}
        </div>
        <div className="fg"><label>Notes</label><textarea value={notes} placeholder="Any remarks..." onChange={function(e){setNotes(e.target.value);}} /></div>
      </div>
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:12}}>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}><i className="ti ti-clock" aria-hidden="true" /></div><div className="kpi-label">Total OT</div><div className="kpi-val">{totalOT.toFixed(1)}h</div><div className="kpi-footer text-muted">in selected range</div><div className="kpi-bar" style={{background:'#378ADD'}} /></div>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#EEEDFE',color:'#534AB7'}}><i className="ti ti-calendar-week" aria-hidden="true" /></div><div className="kpi-label">Weekend days</div><div className="kpi-val">{weekendDays}</div><div className="kpi-footer text-muted">worked</div><div className="kpi-bar" style={{background:'#7F77DD'}} /></div>
        <div className="kpi-card"><div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}><i className="ti ti-sunset-2" aria-hidden="true" /></div><div className="kpi-label">Weekday OT days</div><div className="kpi-val">{weekdayOT}</div><div className="kpi-footer text-muted">days with OT</div><div className="kpi-bar" style={{background:'#1D9E75'}} /></div>
      </div>
      <div className="filter-bar" style={{marginBottom:12}}>
        <label>From</label><input type="date" value={from} onChange={function(e){setFrom(e.target.value);}} />
        <label>To</label><input type="date" value={to} onChange={function(e){setTo(e.target.value);}} />
        <div className="filter-sep" />
        <button className="quick-btn active" onClick={function(){setFrom(daysAgo(30));setTo(tod());}}>30d</button>
        <button className="quick-btn" onClick={function(){setFrom(currentMonth()+'-01');setTo(tod());}}>This month</button>
        <div className="filter-right">{history.length} records</div>
      </div>
      {history.length>0 && (
        <div className="card" style={{marginBottom:12}}>
          <div className="card-head"><div className="card-title">OT hours chart</div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Weekday OT</span>
            <span className="leg"><span className="leg-dot" style={{background:'#7F77DD'}}></span>Weekend OT</span>
          </div>
          <div style={{height:200}}>
            <Bar data={chartData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:tickColor,font:{size:9},autoSkip:true,maxRotation:45},grid:{display:false}},y:{ticks:{color:tickColor,callback:function(v){return v+'h';}},grid:{color:gridColor}}}}} />
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head"><div className="card-title">OT log</div></div>
        {history.length ? (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Date</th><th>Day</th><th>Scan in</th><th>Scan out</th><th>OT hours</th><th>Type</th><th>Notes</th></tr></thead>
              <tbody>
                {[...history].reverse().map(function(d) {
                  return (
                    <tr key={d.entry_date}>
                      <td style={{fontWeight:500}}>{d.entry_date}</td>
                      <td style={{color:'var(--text2)'}}>{new Date(d.entry_date).toLocaleDateString('en-MY',{weekday:'short'})}</td>
                      <td>{d.scan_in?d.scan_in.slice(0,5):'—'}</td>
                      <td>{d.scan_out?d.scan_out.slice(0,5):'—'}</td>
                      <td style={{fontWeight:500,color:(parseFloat(d.ot_hours)||0)>0?'#378ADD':'var(--text2)'}}>{(parseFloat(d.ot_hours)||0).toFixed(2)}h</td>
                      <td>{d.is_weekend?<span className="pill pill-blue">Weekend</span>:<span className="pill pill-green">Weekday</span>}</td>
                      <td style={{color:'var(--text2)',fontSize:11}}>{d.notes||'—'}</td>
                    </tr>
                  );
                })}
                <tr style={{background:'var(--bg3)'}}>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td><strong style={{color:'#378ADD'}}>{totalOT.toFixed(2)}h</strong></td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : <div className="empty">No OT records in this range</div>}
      </div>
    </div>
  );
}
