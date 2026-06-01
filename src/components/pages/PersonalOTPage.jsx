import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getPersonalOT, savePersonalOT, getPersonalOTRange } from '../../utils/storage';
import { tod, daysAgo, calcOT, currentMonth, OT_BASE_RATE, OT_RATE_1_5, OT_RATE_2_0, OT_RATE_3_0 } from '../../utils/constants';
import PasswordLock from '../PasswordLock';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function PersonalOTPage({ globalDate, toast, darkMode }) {
  const [scanIn, setScanIn]                   = useState('');
  const [scanOut, setScanOut]                 = useState('');
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [notes, setNotes]                     = useState('');
  const [history, setHistory]                 = useState([]);
  const [unlocked, setUnlocked]               = useState(false);
  const [from, setFrom]                       = useState(daysAgo(30));
  const [to, setTo]                           = useState(tod());

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';

  const day     = new Date(globalDate).getDay();
  const isSat   = day === 6;
  const isSun   = day === 0;
  const dayName = new Date(globalDate).toLocaleDateString('en-MY', { weekday: 'long' });

  const otResult  = calcOT(scanIn, scanOut, globalDate, isPublicHoliday);
  const otHours   = otResult.hours;
  const otAmount  = otResult.amount;
  const breakdown = otResult.breakdown;

  function getDayType() {
    if (isPublicHoliday) return { label: 'Public holiday', color: '#E24B4A', bg: '#FCEBEB' };
    if (isSun) return { label: 'Sunday', color: '#7F77DD', bg: '#EEEDFE' };
    if (isSat) return { label: 'Saturday', color: '#EF9F27', bg: '#FAEEDA' };
    return { label: 'Weekday', color: '#378ADD', bg: '#E6F1FB' };
  }

  const dayType = getDayType();

  async function load() {
    const d = await getPersonalOT(globalDate);
    if (d) {
      setScanIn(d.scan_in ? d.scan_in.slice(0,5) : '');
      setScanOut(d.scan_out ? d.scan_out.slice(0,5) : '');
      setIsPublicHoliday(d.is_public_holiday || false);
      setNotes(d.notes || '');
    } else {
      setScanIn(''); setScanOut(''); setIsPublicHoliday(false); setNotes('');
    }
  }

  async function loadHistory() {
    const data = await getPersonalOTRange(from, to);
    setHistory(data);
  }

  useEffect(function() { load(); }, [globalDate]);
  useEffect(function() { loadHistory(); }, [from, to]);

  async function save() {
    const ok = await savePersonalOT(globalDate, {
      scanIn:          scanIn || null,
      scanOut:         scanOut || null,
      otHours:         otHours,
      otAmount:        otAmount,
      isWeekend:       isSat || isSun,
      isPublicHoliday: isPublicHoliday,
      notes:           notes,
    });
    if (ok) { toast('Saved — ' + globalDate); loadHistory(); }
    else toast('Save error');
  }

  const totalOT     = history.reduce(function(s,d){ return s + (parseFloat(d.ot_hours)||0); }, 0);
  const totalAmount = history.reduce(function(s,d){ return s + (parseFloat(d.ot_amount)||0); }, 0);
  const phDays      = history.filter(function(d){ return d.is_public_holiday; }).length;
  const sunDays     = history.filter(function(d){ return !d.is_public_holiday && new Date(d.entry_date).getDay()===0; }).length;
  const satDays     = history.filter(function(d){ return !d.is_public_holiday && new Date(d.entry_date).getDay()===6; }).length;
  const weekdayOTDays = history.filter(function(d){
    const dw = new Date(d.entry_date).getDay();
    return !d.is_public_holiday && dw!==0 && dw!==6 && (parseFloat(d.ot_hours)||0)>0;
  }).length;
  const phOTDays = history.filter(function(d){ return d.is_public_holiday && (parseFloat(d.ot_hours)||0)>0; }).length;

  const chartData = {
    labels: history.map(function(d){ return d.entry_date.slice(5); }),
    datasets: [
      {
        label: 'OT Amount (RM)',
        data: history.map(function(d){ return parseFloat(d.ot_amount)||0; }),
        backgroundColor: history.map(function(d){
          if (d.is_public_holiday) return '#E24B4A';
          const dw = new Date(d.entry_date).getDay();
          if (dw===0) return '#7F77DD';
          if (dw===6) return '#EF9F27';
          return '#378ADD';
        }),
        borderRadius: 4,
      }
    ]
  };

  function getLogDayType(d) {
    if (d.is_public_holiday) return { label: 'PH', cls: 'pill-red' };
    const dw = new Date(d.entry_date).getDay();
    if (dw===0) return { label: 'Sunday', cls: 'pill-blue' };
    if (dw===6) return { label: 'Saturday', cls: 'pill-amber' };
    return { label: 'Weekday', cls: 'pill-green' };
  }

  if (!unlocked) return <PasswordLock title="My OT" subtitle="Enter password to access your personal OT records" onUnlock={function(){setUnlocked(true);}} />;

  return (
    <div>
      <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Personal OT tracker</div>
        <div style={{fontSize:20,fontWeight:500}}>My overtime record</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>
          Base: RM{OT_BASE_RATE} · Weekday/Sat: RM{OT_RATE_1_5.toFixed(3)}/hr · Sun: RM{OT_RATE_2_0.toFixed(3)}/hr · PH: RM{OT_RATE_2_0.toFixed(3)}–RM{OT_RATE_3_0.toFixed(3)}/hr
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div className="card-title">Log for {globalDate}</div>
            <div className="card-sub" style={{display:'flex',alignItems:'center',gap:6}}>
              {dayName} —
              <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:500,background:dayType.bg,color:dayType.color}}>
                {dayType.label}
              </span>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-ghost" onClick={load}>Load</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>

        <div className="form-grid" style={{marginBottom:12}}>
          <div className="fg"><label>Scan in time</label><input type="time" value={scanIn} onChange={function(e){setScanIn(e.target.value);}} /></div>
          <div className="fg"><label>Scan out time</label><input type="time" value={scanOut} onChange={function(e){setScanOut(e.target.value);}} /></div>
        </div>

        <div
          style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg3)',borderRadius:8,marginBottom:12,cursor:'pointer',border:'1px solid '+(isPublicHoliday?'#E24B4A':'var(--border)')}}
          onClick={function(){setIsPublicHoliday(function(v){return !v;});}}>
          <div style={{width:22,height:22,borderRadius:5,border:'2px solid '+(isPublicHoliday?'#E24B4A':'var(--border2)'),background:isPublicHoliday?'#E24B4A':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
            {isPublicHoliday && <span style={{color:'#fff',fontSize:14,fontWeight:700,lineHeight:1}}>✓</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>Mark as public holiday</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>First 8h × RM{OT_RATE_2_0.toFixed(3)} · After 8h × RM{OT_RATE_3_0.toFixed(3)} · Break -1h</div>
          </div>
          {isPublicHoliday && <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:500,background:'#FCEBEB',color:'#E24B4A'}}>PH active</span>}
        </div>

        <div style={{background:otHours>0?'rgba(55,138,221,0.08)':'var(--bg3)',border:'1px solid '+(otHours>0?'#378ADD':'var(--border)'),borderRadius:8,padding:'14px 16px',marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:3,textTransform:'uppercase',letterSpacing:'.05em'}}>OT hours</div>
              <div style={{fontSize:28,fontWeight:500,color:otHours>0?'#378ADD':'var(--text2)'}}>{otHours>0?otHours.toFixed(2)+'h':'—'}</div>
              {scanIn && scanOut && <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>{scanIn} → {scanOut} (break -1h)</div>}
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:3,textTransform:'uppercase',letterSpacing:'.05em'}}>OT amount</div>
              <div style={{fontSize:28,fontWeight:500,color:otAmount>0?'#3B6D11':'var(--text2)'}}>{otAmount>0?'RM '+otAmount.toFixed(2):'—'}</div>
              {breakdown && breakdown!=='No OT' && breakdown!=='No scan data' && <div style={{fontSize:11,color:'var(--text2)',marginTop:3}}>{breakdown}</div>}
            </div>
          </div>
        </div>

        <div className="fg"><label>Notes</label><textarea value={notes} placeholder="Any remarks..." onChange={function(e){setNotes(e.target.value);}} /></div>
      </div>

      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}><i className="ti ti-clock" aria-hidden="true" /></div>
          <div className="kpi-label">Total OT hours</div>
          <div className="kpi-val">{totalOT.toFixed(1)}h</div>
          <div className="kpi-footer text-muted">in range</div>
          <div className="kpi-bar" style={{background:'#378ADD'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#EAF3DE',color:'#27500A'}}><i className="ti ti-currency-ringgit" aria-hidden="true" /></div>
          <div className="kpi-label">Total OT amount</div>
          <div className="kpi-val">RM {totalAmount.toFixed(2)}</div>
          <div className="kpi-footer text-muted">in range</div>
          <div className="kpi-bar" style={{background:'#639922'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#EEEDFE',color:'#534AB7'}}><i className="ti ti-calendar-week" aria-hidden="true" /></div>
          <div className="kpi-label">Weekend days</div>
          <div className="kpi-val">{satDays + sunDays}</div>
          <div className="kpi-footer text-muted">Sat: {satDays} · Sun: {sunDays}</div>
          <div className="kpi-bar" style={{background:'#7F77DD'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}><i className="ti ti-calendar-event" aria-hidden="true" /></div>
          <div className="kpi-label">Public holidays</div>
          <div className="kpi-val">{phDays}</div>
          <div className="kpi-footer text-muted">{phOTDays} with OT</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
      </div>

      <div className="filter-bar" style={{marginBottom:12}}>
        <label>From</label><input type="date" value={from} onChange={function(e){setFrom(e.target.value);}} />
        <label>To</label><input type="date" value={to} onChange={function(e){setTo(e.target.value);}} />
        <div className="filter-sep" />
        <button className="quick-btn active" onClick={function(){setFrom(daysAgo(30));setTo(tod());}}>30d</button>
        <button className="quick-btn" onClick={function(){setFrom(currentMonth()+'-01');setTo(tod());}}>This month</button>
        <div className="filter-right">{history.length} records · RM {totalAmount.toFixed(2)} total</div>
      </div>

      {history.length > 0 && (
        <div className="card" style={{marginBottom:12}}>
          <div className="card-head"><div><div className="card-title">OT amount chart (RM)</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Weekday</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Saturday</span>
            <span className="leg"><span className="leg-dot" style={{background:'#7F77DD'}}></span>Sunday</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Public holiday</span>
          </div>
          <div style={{height:200}}>
            <Bar data={chartData} options={{
              responsive:true, maintainAspectRatio:false,
              plugins:{legend:{display:false}},
              scales:{
                x:{ticks:{color:tickColor,font:{size:9},autoSkip:true,maxRotation:45},grid:{display:false}},
                y:{ticks:{color:tickColor,callback:function(v){return 'RM '+v;}},grid:{color:gridColor}}
              }
            }} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">OT log</div></div>
          <div style={{fontSize:12,fontWeight:500,color:'#3B6D11'}}>Total: RM {totalAmount.toFixed(2)}</div>
        </div>
        {history.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Day</th><th>Scan in</th><th>Scan out</th>
                  <th>OT hours</th><th>Rate</th><th>Amount (RM)</th><th>Type</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map(function(d) {
                  const dw  = new Date(d.entry_date).getDay();
                  const isPH  = d.is_public_holiday;
                  const isSatD = dw===6 && !isPH;
                  const isSunD = dw===0 && !isPH;
                  const rateLabel = isPH ? '2.0x/3.0x' : isSunD ? '2.0x' : '1.5x';
                  const typeLabel = isPH ? 'PH' : isSunD ? 'Sunday' : isSatD ? 'Saturday' : 'Weekday';
                  const typeCls   = isPH ? 'pill-red' : isSunD ? 'pill-blue' : isSatD ? 'pill-amber' : 'pill-green';
                  return (
                    <tr key={d.entry_date}>
                      <td style={{fontWeight:500}}>{d.entry_date}</td>
                      <td style={{color:'var(--text2)'}}>{new Date(d.entry_date).toLocaleDateString('en-MY',{weekday:'short'})}</td>
                      <td>{d.scan_in?d.scan_in.slice(0,5):'—'}</td>
                      <td>{d.scan_out?d.scan_out.slice(0,5):'—'}</td>
                      <td style={{fontWeight:500,color:(parseFloat(d.ot_hours)||0)>0?'#378ADD':'var(--text2)'}}>{(parseFloat(d.ot_hours)||0).toFixed(2)}h</td>
                      <td style={{fontSize:11,color:'var(--text2)'}}>{rateLabel}</td>
                      <td style={{fontWeight:500,color:(parseFloat(d.ot_amount)||0)>0?'#3B6D11':'var(--text2)'}}>
                        {(parseFloat(d.ot_amount)||0)>0?'RM '+(parseFloat(d.ot_amount)).toFixed(2):'—'}
                      </td>
                      <td>{(function(){ var t=getLogDayType(d); return <span className={'pill '+t.cls}>{t.label}</span>; })()}</td>
                      <td style={{color:'var(--text2)',fontSize:11}}>{d.notes||'—'}</td>
                    </tr>
                  );
                })}
                <tr style={{background:'var(--bg3)'}}>
                  <td colSpan={4}><strong>Total</strong></td>
                  <td><strong style={{color:'#378ADD'}}>{totalOT.toFixed(2)}h</strong></td>
                  <td></td>
                  <td><strong style={{color:'#3B6D11'}}>RM {totalAmount.toFixed(2)}</strong></td>
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
