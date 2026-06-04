import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { getMaterialHistory } from '../../utils/storage';
import GradientLine from '../GradientLine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function MaterialHistoryPage({ darkMode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom]       = useState('2026-01');
  const [to, setTo]           = useState(new Date().toISOString().slice(0,7));
  const [showCopper, setShowCopper]   = useState(true);
  const [showPP, setShowPP]           = useState(true);
  const [showTotal, setShowTotal]     = useState(true);
  const [showCopperPM2, setShowCopperPM2] = useState(true);
  const [showPPPM2, setShowPPPM2]         = useState(true);
  const [showTotalPM2, setShowTotalPM2]   = useState(true);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  async function load() {
    setLoading(true);
    const data = await getMaterialHistory(from, to);
    setHistory(data);
    setLoading(false);
  }

  useEffect(function(){ load(); }, [from, to]);

  const labels      = history.map(function(d){ return d.report_month; });
  const copperRm    = history.map(function(d){ return parseFloat(d.copper_foil_rm)||0; });
  const ppRm        = history.map(function(d){ return parseFloat(d.prepreg_rm)||0; });
  const totalRm     = history.map(function(d){ return parseFloat(d.total_rm)||0; });
  const copperPerM2 = history.map(function(d){ return parseFloat(d.copper_foil_rm_per_m2)||0; });
  const ppPerM2     = history.map(function(d){ return parseFloat(d.prepreg_rm_per_m2)||0; });
  const totalPerM2  = history.map(function(d){ return parseFloat(d.total_rm_per_m2)||0; });
  const outputM2    = history.map(function(d){ return parseFloat(d.output_m2)||0; });

  const avgTotalPerM2 = totalPerM2.length ? totalPerM2.reduce(function(a,b){return a+b;},0)/totalPerM2.length : 0;
  const totalSpend    = totalRm.reduce(function(a,b){return a+b;},0);
  const bestMonth     = history.length ? history.reduce(function(a,b){ return parseFloat(a.total_rm_per_m2)<parseFloat(b.total_rm_per_m2)?a:b; }) : null;
  const worstMonth    = history.length ? history.reduce(function(a,b){ return parseFloat(a.total_rm_per_m2)>parseFloat(b.total_rm_per_m2)?a:b; }) : null;
  const latestMonth   = history.length ? history[history.length-1] : null;
  const prevMonth     = history.length > 1 ? history[history.length-2] : null;

  const momChange = latestMonth && prevMonth
    ? ((parseFloat(latestMonth.total_rm_per_m2) - parseFloat(prevMonth.total_rm_per_m2)) / parseFloat(prevMonth.total_rm_per_m2) * 100)
    : 0;

  const copperMomChange = latestMonth && prevMonth
    ? ((parseFloat(latestMonth.copper_foil_rm_per_m2) - parseFloat(prevMonth.copper_foil_rm_per_m2)) / parseFloat(prevMonth.copper_foil_rm_per_m2) * 100)
    : 0;

  const ppMomChange = latestMonth && prevMonth
    ? ((parseFloat(latestMonth.prepreg_rm_per_m2) - parseFloat(prevMonth.prepreg_rm_per_m2)) / parseFloat(prevMonth.prepreg_rm_per_m2) * 100)
    : 0;

  const momChanges = history.map(function(d, i) {
    if (i === 0) return 0;
    const prev = parseFloat(history[i-1].total_rm_per_m2)||0;
    const curr = parseFloat(d.total_rm_per_m2)||0;
    return prev > 0 ? parseFloat(((curr-prev)/prev*100).toFixed(2)) : 0;
  });

  const copperRatio = history.map(function(d) {
    const c = parseFloat(d.copper_foil_rm)||0;
    const p = parseFloat(d.prepreg_rm)||0;
    const t = c + p;
    return t > 0 ? parseFloat((c/t*100).toFixed(1)) : 0;
  });
  const ppRatio = history.map(function(d) {
    const c = parseFloat(d.copper_foil_rm)||0;
    const p = parseFloat(d.prepreg_rm)||0;
    const t = c + p;
    return t > 0 ? parseFloat((p/t*100).toFixed(1)) : 0;
  });

  const maxPerM2 = Math.max.apply(null, totalPerM2.concat([1]));
  const effScores = totalPerM2.map(function(v) {
    return parseFloat((100 - (v/maxPerM2*50)).toFixed(1));
  });

  const lineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{
      x:{ ticks:{font:{size:9},color:tickColor}, grid:{display:false} },
      y:{ ticks:{font:{size:9},color:tickColor}, grid:{color:gridColor} }
    }
  };

  function rmOpts() {
    return Object.assign({}, lineOpts, {scales: Object.assign({}, lineOpts.scales, {
      y: Object.assign({}, lineOpts.scales.y, {ticks: Object.assign({}, lineOpts.scales.y.ticks, {callback: function(v){return 'RM'+(v/1000).toFixed(0)+'K';}})})
    })});
  }

  function rm2Opts() {
    return Object.assign({}, lineOpts, {scales: Object.assign({}, lineOpts.scales, {
      y: Object.assign({}, lineOpts.scales.y, {ticks: Object.assign({}, lineOpts.scales.y.ticks, {callback: function(v){return 'RM'+v.toFixed(3);}})})
    })});
  }

  function pctOpts() {
    return Object.assign({}, lineOpts, {scales: Object.assign({}, lineOpts.scales, {
      y: Object.assign({}, lineOpts.scales.y, {ticks: Object.assign({}, lineOpts.scales.y.ticks, {callback: function(v){return v+'%';}})})
    })});
  }

  function ToggleBtn(props) {
    return (
      <button onClick={props.onClick}
        style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:20,
          border:'1.5px solid '+props.color,cursor:'pointer',fontSize:11,
          background:props.active?props.color+'22':'transparent',
          color:props.active?props.color:'var(--text2)',fontWeight:props.active?500:400}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:props.active?props.color:'var(--border2)',flexShrink:0,display:'inline-block'}}></span>
        {props.label}
      </button>
    );
  }

  if (loading) return <div className="empty">Loading...</div>;

  return (
    <div>
      <div style={{background:'#0F6E56',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Material history</div>
        <div style={{fontSize:20,fontWeight:500}}>Monthly material consumption — accumulated</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Copper Foil + PP · RM/m² efficiency · Monthly comparison · MoM analysis</div>
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

      {history.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:32,marginBottom:12}}>📦</div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text)',marginBottom:8}}>No material history yet</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>Upload your monthly material Excel in Material Tracker and click "Push to history".</div>
        </div>
      ) : (
        <div>
          {/* KPI Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{border:'2px solid #0F6E56'}}>
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>💹</div>
              <div className="kpi-label">Avg RM/m²</div>
              <div className="kpi-val" style={{color:'#0F6E56'}}>{avgTotalPerM2.toFixed(4)}</div>
              <div className="kpi-footer text-muted">{history.length} months avg</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>💰</div>
              <div className="kpi-label">Total spend</div>
              <div className="kpi-val" style={{fontSize:15}}>RM {(totalSpend/1000).toFixed(1)}K</div>
              <div className="kpi-footer text-muted">all months combined</div>
              <div className="kpi-bar" style={{background:'#378ADD'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:momChange<=0?'#E1F5EE':'#FCEBEB',color:momChange<=0?'#0F6E56':'#A32D2D'}}>
                {momChange<=0?'📉':'📈'}
              </div>
              <div className="kpi-label">MoM change</div>
              <div className="kpi-val" style={{color:momChange<=0?'#1D9E75':'#E24B4A'}}>
                {momChange>0?'+':''}{momChange.toFixed(2)}%
              </div>
              <div className="kpi-footer text-muted">{latestMonth?latestMonth.report_month:''} vs prev</div>
              <div className="kpi-bar" style={{background:momChange<=0?'#1D9E75':'#E24B4A'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#EAF3DE',color:'#27500A'}}>🏆</div>
              <div className="kpi-label">Best month</div>
              <div className="kpi-val" style={{color:'#1D9E75',fontSize:15}}>{bestMonth?parseFloat(bestMonth.total_rm_per_m2).toFixed(4):'—'}</div>
              <div className="kpi-footer text-muted">{bestMonth?bestMonth.report_month:''}</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>⚠️</div>
              <div className="kpi-label">Worst month</div>
              <div className="kpi-val" style={{color:'#E24B4A',fontSize:15}}>{worstMonth?parseFloat(worstMonth.total_rm_per_m2).toFixed(4):'—'}</div>
              <div className="kpi-footer text-muted">{worstMonth?worstMonth.report_month:''}</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
          </div>

          {/* MoM change alert */}
          {Math.abs(momChange) > 5 && (
            <div style={{padding:'10px 16px',borderRadius:10,marginBottom:12,display:'flex',alignItems:'center',gap:12,
              background:momChange>0?'rgba(226,75,74,0.08)':'rgba(29,158,117,0.08)',
              border:'1px solid '+(momChange>0?'#E24B4A':'#1D9E75')}}>
              <span style={{fontSize:24}}>{momChange>0?'⚠️':'🎉'}</span>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:momChange>0?'#E24B4A':'#1D9E75'}}>
                  {momChange>0?'Cost increased':'Cost decreased'} by {Math.abs(momChange).toFixed(2)}% vs last month!
                </div>
                <div style={{fontSize:11,color:'var(--text2)'}}>
                  {latestMonth?latestMonth.report_month:''} RM/m²: {latestMonth?parseFloat(latestMonth.total_rm_per_m2).toFixed(4):''} vs
                  {prevMonth?' '+prevMonth.report_month+': '+parseFloat(prevMonth.total_rm_per_m2).toFixed(4):''}
                </div>
              </div>
            </div>
          )}

          {/* RM/m² trend with toggles */}
          <div className="card" style={{marginBottom:12}}>
            <div className="card-head">
              <div><div className="card-title">RM/m² efficiency trend</div><div className="card-sub">Lower = more efficient · material cost per m² output</div></div>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              <ToggleBtn active={showTotalPM2}  onClick={function(){setShowTotalPM2(function(v){return !v;});}}  color="#0F6E56" label="Total RM/m²" />
              <ToggleBtn active={showCopperPM2} onClick={function(){setShowCopperPM2(function(v){return !v;});}} color="#EF9F27" label="Copper RM/m²" />
              <ToggleBtn active={showPPPM2}     onClick={function(){setShowPPPM2(function(v){return !v;});}}     color="#378ADD" label="PP RM/m²" />
            </div>
            <GradientLine id="mat-rm-m2" height={220} data={{labels, datasets:[
              showTotalPM2  && {label:'Total RM/m²', data:totalPerM2, borderColor:'#0F6E56', fill:true, tension:.3, pointRadius:5, borderWidth:2,
                pointBackgroundColor:totalPerM2.map(function(v,i){
                  if (!bestMonth || !worstMonth) return '#0F6E56';
                  return v===parseFloat(bestMonth.total_rm_per_m2)?'#1D9E75':v===parseFloat(worstMonth.total_rm_per_m2)?'#E24B4A':'#0F6E56';
                })},
              showCopperPM2 && {label:'Copper RM/m²',data:copperPerM2,borderColor:'#EF9F27',fill:false,tension:.3,pointRadius:4,borderWidth:1.5},
              showPPPM2     && {label:'PP RM/m²',    data:ppPerM2,    borderColor:'#378ADD',fill:false,tension:.3,pointRadius:4,borderWidth:1.5},
            ].filter(Boolean)}} options={rm2Opts()} />
          </div>

          {/* MoM change + Efficiency score */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Month-over-month % change</div><div className="card-sub">Total RM/m² change vs previous month</div></div></div>
              <div style={{height:200}}>
                <Bar data={{labels, datasets:[{
                  label:'MoM change %',
                  data: momChanges,
                  backgroundColor: momChanges.map(function(v){return v>0?'rgba(226,75,74,0.7)':'rgba(29,158,117,0.7)';}),
                  borderColor: momChanges.map(function(v){return v>0?'#E24B4A':'#1D9E75';}),
                  borderWidth:1, borderRadius:4,
                }]}}
                options={{responsive:true,maintainAspectRatio:false,
                  plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return (ctx.parsed.y>0?'+':'')+ctx.parsed.y.toFixed(2)+'%';}}}},
                  scales:{
                    x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                    y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return v+'%';}},grid:{color:gridColor}}
                  }}} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Efficiency score</div><div className="card-sub">Higher = more efficient (lower RM/m²)</div></div></div>
              <div style={{height:200}}>
                <Bar data={{labels, datasets:[{
                  label:'Efficiency',
                  data: effScores,
                  backgroundColor: effScores.map(function(v){return v>=80?'rgba(29,158,117,0.7)':v>=60?'rgba(239,159,39,0.7)':'rgba(226,75,74,0.7)';}),
                  borderColor: effScores.map(function(v){return v>=80?'#1D9E75':v>=60?'#EF9F27':'#E24B4A';}),
                  borderWidth:1, borderRadius:4,
                }]}}
                options={{responsive:true,maintainAspectRatio:false,
                  plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'Score: '+ctx.parsed.y.toFixed(1);}}}},
                  scales:{
                    x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                    y:{min:0,max:100,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
                  }}} />
              </div>
            </div>
          </div>

          {/* Monthly spend + Output */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Monthly spend — Copper vs PP</div><div className="card-sub">Total RM per month</div></div></div>
              <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                <ToggleBtn active={showCopper} onClick={function(){setShowCopper(function(v){return !v;});}} color="#EF9F27" label="Copper Foil" />
                <ToggleBtn active={showPP}     onClick={function(){setShowPP(function(v){return !v;});}}     color="#378ADD" label="PP" />
                <ToggleBtn active={showTotal}  onClick={function(){setShowTotal(function(v){return !v;});}}  color="#0F6E56" label="Total" />
              </div>
              <div style={{height:180}}>
                <Bar data={{labels, datasets:[
                  showCopper && {label:'Copper Foil',data:copperRm,backgroundColor:'rgba(239,159,39,0.8)',borderRadius:3,stack:'s'},
                  showPP     && {label:'PP',         data:ppRm,    backgroundColor:'rgba(55,138,221,0.8)',borderRadius:3,stack:'s'},
                  showTotal  && {type:'line',label:'Total',data:totalRm,borderColor:'#0F6E56',fill:false,tension:.3,pointRadius:4,borderWidth:2},
                ].filter(Boolean)}}
                options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                  x:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                  y:{stacked:true,ticks:{font:{size:9},color:tickColor,callback:function(v){return 'RM'+(v/1000).toFixed(0)+'K';}},grid:{color:gridColor}}
                }}} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Output m² per month</div><div className="card-sub">Production volume trend</div></div></div>
              <GradientLine id="mat-output" height={220} data={{labels, datasets:[
                {label:'Output m²',data:outputM2,borderColor:'#5DCAA5',fill:true,tension:.3,pointRadius:4},
              ]}} options={lineOpts} />
            </div>
          </div>

          {/* Copper vs PP ratio trend */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Copper vs PP ratio trend</div><div className="card-sub">% of total spend — is one growing faster?</div></div></div>
              <div className="legend-row">
                <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Copper Foil %</span>
                <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>PP %</span>
              </div>
              <div style={{height:180}}>
                <Bar data={{labels, datasets:[
                  {label:'Copper %',data:copperRatio,backgroundColor:'rgba(239,159,39,0.8)',borderRadius:3,stack:'s'},
                  {label:'PP %',    data:ppRatio,    backgroundColor:'rgba(55,138,221,0.8)',borderRadius:3,stack:'s'},
                ]}}
                options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+ctx.parsed.y.toFixed(1)+'%';}}}},scales:{
                  x:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                  y:{stacked:true,max:100,ticks:{font:{size:9},color:tickColor,callback:function(v){return v+'%';}},grid:{color:gridColor}}
                }}} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Latest month split</div><div className="card-sub">{latestMonth?latestMonth.report_month:'—'} · Copper vs PP proportion</div></div></div>
              {latestMonth ? (
                <div>
                  <div style={{position:'relative',height:160,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Doughnut
                      data={{labels:['Copper Foil','PP (Prepreg)'],datasets:[{
                        data:[parseFloat(latestMonth.copper_foil_rm)||0,parseFloat(latestMonth.prepreg_rm)||0],
                        backgroundColor:['#EF9F27','#378ADD'],borderWidth:3,
                        borderColor:darkMode?'#1a1a1a':'#ffffff',hoverOffset:6,
                      }]}}
                      options={{responsive:true,maintainAspectRatio:false,cutout:'68%',
                        plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': RM'+ctx.parsed.toLocaleString(undefined,{minimumFractionDigits:2});}}}}}
                      }
                    />
                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1}}>
                        RM {((parseFloat(latestMonth.copper_foil_rm)||0)+(parseFloat(latestMonth.prepreg_rm)||0)).toLocaleString(undefined,{maximumFractionDigits:0})}
                      </div>
                      <div style={{fontSize:9,color:'var(--text2)',marginTop:2}}>Total</div>
                    </div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-around',marginTop:8}}>
                    {[['Copper Foil',parseFloat(latestMonth.copper_foil_rm)||0,parseFloat(latestMonth.copper_foil_rm_per_m2)||0,'#EF9F27',copperMomChange],
                      ['PP',parseFloat(latestMonth.prepreg_rm)||0,parseFloat(latestMonth.prepreg_rm_per_m2)||0,'#378ADD',ppMomChange]].map(function(item){
                      return (
                        <div key={item[0]} style={{textAlign:'center'}}>
                          <div style={{fontSize:11,fontWeight:600,color:item[3]}}>RM {item[1].toFixed(0)}</div>
                          <div style={{fontSize:9,color:'var(--text2)'}}>{item[0]}</div>
                          <div style={{fontSize:9,color:item[3]}}>{item[2].toFixed(4)} RM/m²</div>
                          <div style={{fontSize:9,color:item[4]<=0?'#1D9E75':'#E24B4A',fontWeight:500}}>
                            {item[4]>0?'+':''}{item[4].toFixed(1)}% MoM
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : <div className="empty">No data</div>}
            </div>
          </div>

          {/* Summary table */}
          <div className="card">
            <div className="card-head"><div><div className="card-title">Monthly summary</div><div className="card-sub">{history.length} months · 🏆 best · ⚠️ worst</div></div></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Output (m²)</th>
                    <th>Copper RM</th>
                    <th>PP RM</th>
                    <th>Total RM</th>
                    <th>Copper RM/m²</th>
                    <th>PP RM/m²</th>
                    <th>Total RM/m²</th>
                    <th>MoM</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(function(d, ri) {
                    var idx = history.length - 1 - ri;
                    var isBest  = bestMonth  && d.report_month === bestMonth.report_month;
                    var isWorst = worstMonth && d.report_month === worstMonth.report_month;
                    var mom = momChanges[idx];
                    var eff = effScores[idx];
                    return (
                      <tr key={d.report_month} style={{background:isWorst?'rgba(226,75,74,0.04)':isBest?'rgba(29,158,117,0.04)':''}}>
                        <td style={{fontWeight:500}}>
                          {d.report_month}
                          {isBest  && <span className="pill pill-green" style={{marginLeft:6,fontSize:9}}>🏆 Best</span>}
                          {isWorst && <span className="pill pill-red"   style={{marginLeft:6,fontSize:9}}>⚠️ Worst</span>}
                        </td>
                        <td style={{fontSize:11}}>{parseFloat(d.output_m2).toLocaleString()}</td>
                        <td style={{fontSize:11,color:'#EF9F27'}}>RM {parseFloat(d.copper_foil_rm).toFixed(0)}</td>
                        <td style={{fontSize:11,color:'#378ADD'}}>RM {parseFloat(d.prepreg_rm).toFixed(0)}</td>
                        <td style={{fontWeight:500}}>RM {parseFloat(d.total_rm).toFixed(0)}</td>
                        <td style={{fontSize:11,color:'#EF9F27'}}>{parseFloat(d.copper_foil_rm_per_m2).toFixed(4)}</td>
                        <td style={{fontSize:11,color:'#378ADD'}}>{parseFloat(d.prepreg_rm_per_m2).toFixed(4)}</td>
                        <td style={{fontWeight:500,color:isBest?'#1D9E75':isWorst?'#E24B4A':'var(--text)'}}>{parseFloat(d.total_rm_per_m2).toFixed(4)}</td>
                        <td style={{fontSize:11,color:mom>0?'#E24B4A':mom<0?'#1D9E75':'var(--text2)',fontWeight:500}}>
                          {idx===0?'—':(mom>0?'+':'')+mom.toFixed(2)+'%'}
                        </td>
                        <td>
                          <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:500,
                            background:eff>=80?'#EAF3DE':eff>=60?'#FAEEDA':'#FCEBEB',
                            color:eff>=80?'#27500A':eff>=60?'#633806':'#791F1F'}}>
                            {eff.toFixed(0)}
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
      )}
    </div>
  );
}
