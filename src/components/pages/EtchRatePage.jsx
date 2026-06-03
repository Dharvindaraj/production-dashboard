import { useState, useEffect } from 'react';
import { getEtchRate, saveEtchRate, deleteEtchRate, getEtchRateRange } from '../../utils/storage';
import { ETCH_TARGET, ETCH_UCL, ETCH_LCL, ETCH_USL, ETCH_LSL, tod, daysAgo } from '../../utils/constants';
import GradientLine from '../GradientLine';

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export default function EtchRatePage({ globalDate, toast, darkMode }) {
  const [entries, setEntries]   = useState([]);
  const [newTime, setNewTime]   = useState('08:00');
  const [newVal, setNewVal]     = useState('');
  const [history, setHistory]   = useState([]);
  const [from, setFrom]         = useState(daysAgo(14));
  const [to, setTo]             = useState(tod());

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  async function load() {
    const d = await getEtchRate(globalDate);
    setEntries(d);
  }

  async function loadHistory() {
    const d = await getEtchRateRange(from, to);
    setHistory(d);
  }

  useEffect(function() { load(); }, [globalDate]);
  useEffect(function() { loadHistory(); }, [from, to]);

  async function addEntry() {
    if (!newVal) { toast('Enter etch rate value'); return; }
    const ok = await saveEtchRate(globalDate, newTime, parseFloat(newVal));
    if (ok) { toast('Saved'); setNewVal(''); load(); loadHistory(); }
    else toast('Error saving');
  }

  async function delEntry(time) {
    const ok = await deleteEtchRate(globalDate, time);
    if (ok) { toast('Deleted'); load(); loadHistory(); }
  }

  const avg   = entries.length ? entries.reduce(function(s,e){return s+(parseFloat(e.etch_value)||0);},0)/entries.length : 0;
  const outUCL = entries.filter(function(e){return parseFloat(e.etch_value)>ETCH_UCL;}).length;
  const outLCL = entries.filter(function(e){return parseFloat(e.etch_value)<ETCH_LCL;}).length;

  const histLabels = history.map(function(h){return h.entry_date.slice(5)+' '+h.entry_time.slice(0,5);});
  const histVals   = history.map(function(h){return parseFloat(h.etch_value)||0;});

  const lineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{ticks:{font:{size:8},autoSkip:true,maxRotation:45,color:tickColor},grid:{display:false}},
      y:{min:1.2,max:2.0,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
    }
  };

  function getStatus(v) {
    if (v > ETCH_USL || v < ETCH_LSL) return { label:'OUT OF SPEC', color:'#791F1F', bg:'#FCEBEB' };
    if (v > ETCH_UCL || v < ETCH_LCL) return { label:'WARNING',     color:'#854F0B', bg:'#FAEEDA' };
    return { label:'OK', color:'#27500A', bg:'#EAF3DE' };
  }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>🧪</div>
          <div className="kpi-label">Today avg</div>
          <div className="kpi-val" style={{color:avg>ETCH_UCL||avg<ETCH_LCL?'#E24B4A':'#1D9E75'}}>{avg?avg.toFixed(3):'—'}</div>
          <div className="kpi-footer text-muted">Target: {ETCH_TARGET}</div>
          <div className="kpi-bar" style={{background:'#378ADD'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#EAF3DE',color:'#27500A'}}>📊</div>
          <div className="kpi-label">Readings today</div>
          <div className="kpi-val">{entries.length}</div>
          <div className="kpi-footer text-muted">data points</div>
          <div className="kpi-bar" style={{background:'#1D9E75'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>⬆️</div>
          <div className="kpi-label">Above UCL</div>
          <div className="kpi-val" style={{color:outUCL>0?'#E24B4A':'#1D9E75'}}>{outUCL}</div>
          <div className="kpi-footer text-muted">UCL: {ETCH_UCL}</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>⬇️</div>
          <div className="kpi-label">Below LCL</div>
          <div className="kpi-val" style={{color:outLCL>0?'#E24B4A':'#1D9E75'}}>{outLCL}</div>
          <div className="kpi-footer text-muted">LCL: {ETCH_LCL}</div>
          <div className="kpi-bar" style={{background:'#EF9F27'}} />
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-head"><div className="card-title">Add etch rate reading — {globalDate}</div></div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div className="fg" style={{margin:0}}>
            <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>Time</label>
            <select value={newTime} onChange={function(e){setNewTime(e.target.value);}}
              style={{fontSize:12,padding:'6px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}>
              {TIME_SLOTS.map(function(t){return <option key={t} value={t}>{t}</option>;})}
            </select>
          </div>
          <div className="fg" style={{margin:0}}>
            <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>Etch rate value</label>
            <input type="number" step=".001" value={newVal} placeholder="e.g. 1.62"
              onChange={function(e){setNewVal(e.target.value);}}
              style={{width:130,fontSize:12,padding:'6px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          </div>
          <button className="btn-primary" onClick={addEntry}>Add reading</button>
        </div>
        {entries.length > 0 && (
          <div style={{marginTop:12}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Time</th>
                  <th style={{textAlign:'center',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Value</th>
                  <th style={{textAlign:'center',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Status</th>
                  <th style={{padding:'6px 8px',borderBottom:'1px solid var(--border)'}}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(function(e) {
                  var v  = parseFloat(e.etch_value);
                  var st = getStatus(v);
                  return (
                    <tr key={e.entry_time}>
                      <td style={{padding:'6px 8px',fontSize:12}}>{e.entry_time.slice(0,5)}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',fontWeight:500,fontSize:13}}>{v.toFixed(3)}</td>
                      <td style={{padding:'6px 8px',textAlign:'center'}}>
                        <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:500,background:st.bg,color:st.color}}>{st.label}</span>
                      </td>
                      <td style={{padding:'6px 8px',textAlign:'right'}}>
                        <button className="btn-ghost" onClick={function(){delEntry(e.entry_time);}} style={{fontSize:10,padding:'2px 8px',color:'#E24B4A'}}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Etch rate SPC chart</div>
            <div className="card-sub">UCL:{ETCH_UCL} · Target:{ETCH_TARGET} · LCL:{ETCH_LCL}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="date" value={from} onChange={function(e){setFrom(e.target.value);}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            <span style={{fontSize:11,color:'var(--text2)'}}>to</span>
            <input type="date" value={to} onChange={function(e){setTo(e.target.value);}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          </div>
        </div>
        <GradientLine id="etch-spc" height={220} data={{
          labels: histLabels,
          datasets:[
            {label:'Etch rate',data:histVals,borderColor:'#378ADD',fill:true,tension:.3,pointRadius:3,
              pointBackgroundColor:histVals.map(function(v){return v>ETCH_UCL||v<ETCH_LCL?'#E24B4A':v>ETCH_UCL*0.95||v<ETCH_LCL*1.05?'#EF9F27':'#5DCAA5';})},
            {label:'UCL',data:histLabels.map(function(){return ETCH_UCL;}),borderColor:'#E24B4A',borderDash:[4,3],fill:false,pointRadius:0,borderWidth:1.5},
            {label:'Target',data:histLabels.map(function(){return ETCH_TARGET;}),borderColor:'#5DCAA5',borderDash:[4,3],fill:false,pointRadius:0,borderWidth:1.5},
            {label:'LCL',data:histLabels.map(function(){return ETCH_LCL;}),borderColor:'#EF9F27',borderDash:[4,3],fill:false,pointRadius:0,borderWidth:1.5},
          ]
        }} options={lineOpts} />
      </div>
    </div>
  );
}
