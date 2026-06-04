import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import { getMaterialHistory } from '../../utils/storage';
import GradientLine from '../GradientLine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function MaterialHistoryPage({ darkMode }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [from, setFrom]         = useState('2026-01');
  const [to, setTo]             = useState(new Date().toISOString().slice(0,7));

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  async function load() {
    setLoading(true);
    const data = await getMaterialHistory(from, to);
    setHistory(data);
    setLoading(false);
  }

  useEffect(function(){ load(); }, [from, to]);

  var labels      = history.map(function(d){ return d.report_month; });
  var copperRm    = history.map(function(d){ return parseFloat(d.copper_foil_rm)||0; });
  var ppRm        = history.map(function(d){ return parseFloat(d.prepreg_rm)||0; });
  var totalRm     = history.map(function(d){ return parseFloat(d.total_rm)||0; });
  var copperPerM2 = history.map(function(d){ return parseFloat(d.copper_foil_rm_per_m2)||0; });
  var ppPerM2     = history.map(function(d){ return parseFloat(d.prepreg_rm_per_m2)||0; });
  var totalPerM2  = history.map(function(d){ return parseFloat(d.total_rm_per_m2)||0; });
  var outputM2    = history.map(function(d){ return parseFloat(d.output_m2)||0; });

  var avgTotalPerM2 = totalPerM2.length ? totalPerM2.reduce(function(a,b){return a+b;},0)/totalPerM2.length : 0;
  var totalSpend    = totalRm.reduce(function(a,b){return a+b;},0);
  var bestMonth     = history.length ? history.reduce(function(a,b){ return parseFloat(a.total_rm_per_m2)<parseFloat(b.total_rm_per_m2)?a:b; }) : null;
  var worstMonth    = history.length ? history.reduce(function(a,b){ return parseFloat(a.total_rm_per_m2)>parseFloat(b.total_rm_per_m2)?a:b; }) : null;

  var lineOpts = {
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},
      y:{ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
    }
  };

  return (
    <div>
      <div style={{background:'#0F6E56',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Material history</div>
        <div style={{fontSize:20,fontWeight:500}}>Monthly material consumption — accumulated</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Copper Foil + PP · RM/m² efficiency · Monthly comparison</div>
      </div>

      <div className="filter-bar" style={{marginBottom:12}}>
        <label style={{fontSize:11,color:'var(--text2)'}}>From</label>
        <input type="month" value={from} onChange={function(e){setFrom(e.target.value);}}
          style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <label style={{fontSize:11,color:'var(--text2)'}}>To</label>
        <input type="month" value={to} onChange={function(e){setTo(e.target.value);}}
          style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <button className="btn-ghost" onClick={load} style={{fontSize:11,padding:'4px 10px'}}>↻ Refresh</button>
        <div className="filter-right" style={{fontSize:11,color:'var(--text2)'}}>{history.length} months of data</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : history.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:32,marginBottom:12}}>📦</div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text)',marginBottom:8}}>No material history yet</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>Upload your monthly material Excel in Material Tracker and click "Push to history" to start accumulating data.</div>
        </div>
      ) : (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{border:'2px solid #0F6E56'}}>
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>💹</div>
              <div className="kpi-label">Avg RM/m²</div>
              <div className="kpi-val" style={{color:'#0F6E56'}}>{avgTotalPerM2.toFixed(4)}</div>
              <div className="kpi-footer text-muted">across {history.length} months</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>💰</div>
              <div className="kpi-label">Total spend</div>
              <div className="kpi-val" style={{fontSize:16}}>RM {(totalSpend/1000).toFixed(1)}K</div>
              <div className="kpi-footer text-muted">all months</div>
              <div className="kpi-bar" style={{background:'#378ADD'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#EAF3DE',color:'#27500A'}}>🏆</div>
              <div className="kpi-label">Best month</div>
              <div className="kpi-val" style={{color:'#1D9E75',fontSize:16}}>{bestMonth?parseFloat(bestMonth.total_rm_per_m2).toFixed(4):'—'}</div>
              <div className="kpi-footer text-muted">{bestMonth?bestMonth.report_month+' RM/m²':''}</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>📈</div>
              <div className="kpi-label">Worst month</div>
              <div className="kpi-val" style={{color:'#E24B4A',fontSize:16}}>{worstMonth?parseFloat(worstMonth.total_rm_per_m2).toFixed(4):'—'}</div>
              <div className="kpi-footer text-muted">{worstMonth?worstMonth.report_month+' RM/m²':''}</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
          </div>

          <div className="card" style={{marginBottom:12}}>
            <div className="card-head"><div><div className="card-title">RM/m² trend</div><div className="card-sub">Total material cost per m² output · lower = more efficient</div></div></div>
            <div className="legend-row">
              <span className="leg"><span className="leg-dot" style={{background:'#0F6E56'}}></span>Total RM/m²</span>
              <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Copper RM/m²</span>
              <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>PP RM/m²</span>
            </div>
            <GradientLine id="mat-rm-m2" height={220} data={{labels,datasets:[
              {label:'Total RM/m²', data:totalPerM2, borderColor:'#0F6E56',fill:true,tension:.3,pointRadius:4},
              {label:'Copper RM/m²',data:copperPerM2,borderColor:'#EF9F27',fill:false,tension:.3,pointRadius:4,borderWidth:1.5},
              {label:'PP RM/m²',    data:ppPerM2,    borderColor:'#378ADD',fill:false,tension:.3,pointRadius:4,borderWidth:1.5},
            ]}} options={{...lineOpts,scales:{...lineOpts.scales,y:{...lineOpts.scales.y,ticks:{...lineOpts.scales.y.ticks,callback:function(v){return 'RM'+v.toFixed(2);}}}}}
            } />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Monthly spend — Copper vs PP</div><div className="card-sub">RM per month</div></div></div>
              <div className="legend-row">
                <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Copper Foil</span>
                <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>PP</span>
              </div>
              <div style={{height:200}}>
                <Bar data={{labels,datasets:[
                  {label:'Copper Foil',data:copperRm,backgroundColor:'#EF9F27',borderRadius:4,stack:'s'},
                  {label:'PP',         data:ppRm,    backgroundColor:'#378ADD',borderRadius:4,stack:'s'},
                ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                  x:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                  y:{stacked:true,ticks:{font:{size:9},color:tickColor,callback:function(v){return 'RM'+(v/1000).toFixed(0)+'K';}},grid:{color:gridColor}}
                }}} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Output m² per month</div><div className="card-sub">Production volume</div></div></div>
              <GradientLine id="mat-output" height={200} data={{labels,datasets:[
                {label:'Output m²',data:outputM2,borderColor:'#5DCAA5',fill:true,tension:.3,pointRadius:4},
              ]}} options={lineOpts} />
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Monthly summary</div><div className="card-sub">{history.length} months</div></div></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Output (m²)</th>
                    <th>Copper Foil (RM)</th>
                    <th>PP (RM)</th>
                    <th>Total (RM)</th>
                    <th>Copper RM/m²</th>
                    <th>PP RM/m²</th>
                    <th>Total RM/m²</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(function(d){
                    var isWorst = worstMonth && d.report_month === worstMonth.report_month;
                    var isBest  = bestMonth  && d.report_month === bestMonth.report_month;
                    return (
                      <tr key={d.report_month} style={{background:isWorst?'rgba(226,75,74,0.04)':isBest?'rgba(29,158,117,0.04)':''}}>
                        <td style={{fontWeight:500}}>
                          {d.report_month}
                          {isBest  && <span className="pill pill-green" style={{marginLeft:6,fontSize:9}}>Best</span>}
                          {isWorst && <span className="pill pill-red"   style={{marginLeft:6,fontSize:9}}>Worst</span>}
                        </td>
                        <td>{parseFloat(d.output_m2).toLocaleString()}</td>
                        <td>RM {parseFloat(d.copper_foil_rm).toFixed(2)}</td>
                        <td>RM {parseFloat(d.prepreg_rm).toFixed(2)}</td>
                        <td style={{fontWeight:500}}>RM {parseFloat(d.total_rm).toFixed(2)}</td>
                        <td style={{color:'#EF9F27'}}>{parseFloat(d.copper_foil_rm_per_m2).toFixed(4)}</td>
                        <td style={{color:'#378ADD'}}>{parseFloat(d.prepreg_rm_per_m2).toFixed(4)}</td>
                        <td style={{fontWeight:500,color:isWorst?'#E24B4A':isBest?'#1D9E75':'var(--text)'}}>{parseFloat(d.total_rm_per_m2).toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
