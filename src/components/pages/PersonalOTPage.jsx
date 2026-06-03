import { useState, useEffect } from 'react';
import { getPersonalOT, savePersonalOT, getPersonalOTRange } from '../../utils/storage';
import { calcOT, tod, daysAgo } from '../../utils/constants';
import PasswordLock from '../PasswordLock';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function PersonalOTPage({ globalDate, toast, darkMode }) {
  const [unlocked, setUnlocked]         = useState(false);
  const [scanIn, setScanIn]             = useState('');
  const [scanOut, setScanOut]           = useState('');
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [notes, setNotes]               = useState('');
  const [history, setHistory]           = useState([]);
  const [from, setFrom]                 = useState(daysAgo(30));
  const [to, setTo]                     = useState(tod());
  const [saving, setSaving]             = useState(false);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  async function loadDay() {
    const d = await getPersonalOT(globalDate);
    if (d) {
      setScanIn(d.scan_in || '');
      setScanOut(d.scan_out || '');
      setIsPublicHoliday(d.is_public_holiday || false);
      setNotes(d.notes || '');
    } else {
      setScanIn(''); setScanOut(''); setIsPublicHoliday(false); setNotes('');
    }
  }

  async function loadHistory() {
    const d = await getPersonalOTRange(from, to);
    setHistory(d);
  }

  useEffect(function() { if (unlocked) { loadDay(); loadHistory(); } }, [globalDate, unlocked, from, to]);

  const otResult = calcOT(scanIn, scanOut, globalDate, isPublicHoliday);

  async function handleSave() {
    setSaving(true);
    const ok = await savePersonalOT(globalDate, {
      scanIn: scanIn, scanOut: scanOut,
      otHours: otResult.hours, otAmount: otResult.amount,
      isWeekend: [0,6].indexOf(new Date(globalDate).getDay()) >= 0,
      isPublicHoliday: isPublicHoliday,
      notes: notes,
    });
    if (ok) { toast('OT saved — ' + globalDate); loadHistory(); }
    else toast('Error saving');
    setSaving(false);
  }

  const totalOT     = history.reduce(function(s,d){return s+(parseFloat(d.ot_hours)||0);},0);
  const totalAmount = history.reduce(function(s,d){return s+(parseFloat(d.ot_amount)||0);},0);
  const phDays      = history.filter(function(d){return d.is_public_holiday;}).length;
  const sunDays     = history.filter(function(d){return !d.is_public_holiday&&new Date(d.entry_date).getDay()===0;}).length;
  const satDays     = history.filter(function(d){return !d.is_public_holiday&&new Date(d.entry_date).getDay()===6;}).length;
  const phOTDays    = history.filter(function(d){return d.is_public_holiday&&(parseFloat(d.ot_hours)||0)>0;}).length;

  function getLogDayType(d) {
    if (d.is_public_holiday) return { label:'PH', cls:'pill-red' };
    const dw = new Date(d.entry_date).getDay();
    if (dw===0) return { label:'Sunday',   cls:'pill-blue' };
    if (dw===6) return { label:'Saturday', cls:'pill-amber' };
    return { label:'Weekday', cls:'pill-green' };
  }

  const chartData = {
    labels: history.map(function(d){return d.entry_date.slice(5);}),
    datasets:[{
      label:'OT Amount (RM)',
      data: history.map(function(d){return parseFloat(d.ot_amount)||0;}),
      backgroundColor: history.map(function(d){
        if (d.is_public_holiday) return '#E24B4A';
        const dw = new Date(d.entry_date).getDay();
        if (dw===0) return '#7F77DD';
        if (dw===6) return '#EF9F27';
        return '#378ADD';
      }),
      borderRadius: 4,
    }]
  };

  if (!unlocked) return <PasswordLock onUnlock={function(){setUnlocked(true);}} />;

  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <div className="card-head">
          <div className="card-title">Log OT — {globalDate}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div className="fg">
            <label>Scan in time</label>
            <input type="time" value={scanIn} onChange={function(e){setScanIn(e.target.value);}} />
          </div>
          <div className="fg">
            <label>Scan out time</label>
            <input type="time" value={scanOut} onChange={function(e){setScanOut(e.target.value);}} />
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,padding:'8px 12px',background:'var(--bg3)',borderRadius:8,cursor:'pointer'}}
          onClick={function(){setIsPublicHoliday(function(p){return !p;});}}>
          <div style={{width:18,height:18,borderRadius:4,border:'1.5px solid '+(isPublicHoliday?'#E24B4A':'var(--border2)'),
            background:isPublicHoliday?'#E24B4A':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {isPublicHoliday && <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
          </div>
          <span style={{fontSize:12,color:isPublicHoliday?'#E24B4A':'var(--text)'}}>Public holiday</span>
          {isPublicHoliday && <span style={{fontSize:11,color:'#A32D2D',marginLeft:'auto'}}>2.0x first 8h, 3.0x after</span>}
        </div>
        {scanIn && scanOut && (
          <div style={{padding:'10px 14px',background:'rgba(55,138,221,0.07)',borderRadius:8,marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:'var(--text)',marginBottom:4}}>
              OT: {otResult.hours}h = RM {otResult.amount.toFixed(2)}
            </div>
            <div style={{fontSize:11,color:'var(--text2)'}}>{otResult.breakdown}</div>
          </div>
        )}
        <div className="fg">
          <label>Notes</label>
          <input type="text" value={notes} placeholder="Optional notes..."
            onChange={function(e){setNotes(e.target.value);}} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{marginTop:10,width:'100%'}}>
          {saving?'Saving...':'Save OT — '+globalDate}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>⏱️</div>
          <div className="kpi-label">Total OT hours</div>
          <div className="kpi-val">{totalOT.toFixed(2)}h</div>
          <div className="kpi-footer text-muted">{history.length} days</div>
          <div className="kpi-bar" style={{background:'#378ADD'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#EAF3DE',color:'#27500A'}}>💰</div>
          <div className="kpi-label">Total OT amount</div>
          <div className="kpi-val">RM {totalAmount.toFixed(2)}</div>
          <div className="kpi-footer text-muted">gross earnings</div>
          <div className="kpi-bar" style={{background:'#1D9E75'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>📅</div>
          <div className="kpi-label">Weekend days</div>
          <div className="kpi-val">{satDays + sunDays}</div>
          <div className="kpi-footer text-muted">{satDays} Sat · {sunDays} Sun</div>
          <div className="kpi-bar" style={{background:'#EF9F27'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>🎌</div>
          <div className="kpi-label">Public holidays</div>
          <div className="kpi-val">{phDays}</div>
          <div className="kpi-footer text-muted">{phOTDays} with OT</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-head">
          <div><div className="card-title">OT amount trend</div><div className="card-sub">Blue=weekday · Orange=Sat · Purple=Sun · Red=PH</div></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="date" value={from} onChange={function(e){setFrom(e.target.value);}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            <span style={{fontSize:11,color:'var(--text2)'}}>to</span>
            <input type="date" value={to} onChange={function(e){setTo(e.target.value);}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          </div>
        </div>
        <div style={{height:200}}>
          <Bar data={chartData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
            x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
            y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return 'RM'+v;}},grid:{color:gridColor}}
          }}} />
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">OT log</div></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day type</th>
                <th>Scan in</th>
                <th>Scan out</th>
                <th>OT hours</th>
                <th>Amount (RM)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map(function(d,i) {
                var t = getLogDayType(d);
                return (
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{d.entry_date}</td>
                    <td><span className={'pill '+t.cls}>{t.label}</span></td>
                    <td>{d.scan_in}</td>
                    <td>{d.scan_out}</td>
                    <td style={{fontWeight:500,color:'#378ADD'}}>{(parseFloat(d.ot_hours)||0).toFixed(2)}h</td>
                    <td style={{fontWeight:500,color:'#1D9E75'}}>RM {(parseFloat(d.ot_amount)||0).toFixed(2)}</td>
                    <td style={{color:'var(--text2)',fontSize:11}}>{d.notes}</td>
                  </tr>
                );
              })}
              <tr style={{background:'var(--bg3)',fontWeight:500}}>
                <td colSpan={4}>Total</td>
                <td style={{color:'#378ADD'}}>{totalOT.toFixed(2)}h</td>
                <td style={{color:'#1D9E75'}}>RM {totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
