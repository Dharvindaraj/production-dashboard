import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { getScrapHistory } from '../../utils/storage';
import GradientLine from '../GradientLine';
import { tod, daysAgo } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const DEFECT_COLORS = {
  'Dent':    '#378ADD',
  'Wrinkle': '#EF9F27',
  'Scratch': '#E24B4A',
  'Whitish': '#5DCAA5',
  'Void':    '#7F77DD',
  'Others':  '#888780',
};

const SCRAP_TARGET = 1.3;

export default function ScrapHistoryPage({ darkMode }) {
  const [history, setHistory]         = useState([]);
  const [from, setFrom]               = useState(daysAgo(30));
  const [to, setTo]                   = useState(tod());
  const [loading, setLoading]         = useState(false);
  const [expandedRow, setExpandedRow]   = useState(null);
  const [expandedPN, setExpandedPN]     = useState(null);
  const [showScrap, setShowScrap]     = useState(true);
  const [showAvg, setShowAvg]         = useState(true);
  const [showTarget, setShowTarget]   = useState(true);
  const [showDent, setShowDent]       = useState(false);
  const [showWrinkle, setShowWrinkle] = useState(false);
  const [showScratch, setShowScratch] = useState(false);
  const [showWhitish, setShowWhitish] = useState(false);
  const [showVoid, setShowVoid]       = useState(false);
  const [showOthers, setShowOthers]   = useState(false);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  async function load() {
    setLoading(true);
    const data = await getScrapHistory(from, to);
    setHistory(data);
    setLoading(false);
  }

  useEffect(function() { load(); }, [from, to]);

  const labels    = history.map(function(d){return d.report_date.slice(5);});
  const scrapPcts = history.map(function(d){return parseFloat(d.masslam_scrap_pct)||0;});
  const avgScrap  = scrapPcts.length ? scrapPcts.reduce(function(a,b){return a+b;},0)/scrapPcts.length : 0;
  const maxScrap  = Math.max.apply(null, scrapPcts.concat([0]));
  const minScrap  = scrapPcts.length ? Math.min.apply(null, scrapPcts.filter(function(v){return v>0;})) : 0;
  const aboveTarget = scrapPcts.filter(function(v){return v>SCRAP_TARGET;}).length;

  const avgDefects = {
    Dent:    history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_dent)||0);},0)/history.length : 0,
    Wrinkle: history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_wrinkle)||0);},0)/history.length : 0,
    Scratch: history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_scratch)||0);},0)/history.length : 0,
    Whitish: history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_whitish)||0);},0)/history.length : 0,
    Void:    history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_void)||0);},0)/history.length : 0,
    Others:  history.length ? history.reduce(function(s,d){return s+(parseFloat(d.defect_others)||0);},0)/history.length : 0,
  };

  const allOthersMap = {};
  history.forEach(function(d) {
    if (!d.others_breakdown) return;
    Object.entries(d.others_breakdown).forEach(function(entry) {
      var reason = entry[0], area = entry[1];
      if (!allOthersMap[reason]) allOthersMap[reason] = 0;
      allOthersMap[reason] += area;
    });
  });
  const othersRanked = Object.entries(allOthersMap)
    .sort(function(a,b){return b[1]-a[1];})
    .slice(0,10);
  const othersTotalArea = Object.values(allOthersMap).reduce(function(a,b){return a+b;},0);

  const allPnMap = {};
  history.forEach(function(d) {
    if (!d.pn_breakdown) return;
    Object.entries(d.pn_breakdown).forEach(function(entry) {
      const pn = entry[0], info = entry[1];
      if (!allPnMap[pn]) allPnMap[pn] = { pn: pn, totalArea: 0, defects: {} };
      allPnMap[pn].totalArea += info.totalArea || 0;
      if (info.defects) {
        Object.entries(info.defects).forEach(function(de) {
          if (!allPnMap[pn].defects[de[0]]) allPnMap[pn].defects[de[0]] = 0;
          allPnMap[pn].defects[de[0]] += de[1];
        });
      }
    });
  });
  const rankedPns = Object.values(allPnMap).sort(function(a,b){return b.totalArea-a.totalArea;}).slice(0,10);

  const lineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'Scrap: '+ctx.parsed.y.toFixed(4)+'%';}}}},
    scales:{
      x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
      y:{ticks:{font:{size:9},callback:function(v){return v+'%';},color:tickColor},grid:{color:gridColor}}
    }
  };

  return (
    <div>
      <div style={{background:'#A32D2D',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Scrap history</div>
        <div style={{fontSize:20,fontWeight:500}}>Masslam scrap analysis — accumulated</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Data saved each day via scrap tracker · select date range to analyze</div>
      </div>

      <div className="filter-bar" style={{marginBottom:12}}>
        <label style={{fontSize:11,color:'var(--text2)'}}>From</label>
        <input type="date" value={from} onChange={function(e){setFrom(e.target.value);}}
          style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <label style={{fontSize:11,color:'var(--text2)'}}>To</label>
        <input type="date" value={to} onChange={function(e){setTo(e.target.value);}}
          style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <div className="filter-sep" />
        {[['7d',7],['14d',14],['30d',30],['90d',90]].map(function(item){
          return <button key={item[0]} className="quick-btn" onClick={function(){setFrom(daysAgo(item[1]));setTo(tod());}}>{item[0]}</button>;
        })}
        <button className="btn-ghost" onClick={load} style={{fontSize:11,padding:'4px 10px'}}>↻ Refresh</button>
        <div className="filter-right" style={{fontSize:11,color:'var(--text2)'}}>{history.length} days of data</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : history.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text)',marginBottom:8}}>No scrap history yet</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>Upload your daily scrap report in Scrap Tracker and click "Push to main history" to start accumulating data.</div>
        </div>
      ) : (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{border:'2px solid #E24B4A'}}>
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>📊</div>
              <div className="kpi-label">Avg scrap %</div>
              <div className="kpi-val" style={{color:avgScrap>SCRAP_TARGET?'#E24B4A':'#1D9E75'}}>{avgScrap.toFixed(4)}%</div>
              <div className="kpi-footer" style={{color:avgScrap>SCRAP_TARGET?'#E24B4A':'#3B6D11'}}>{avgScrap>SCRAP_TARGET?'Above':'Within'} {SCRAP_TARGET}% target</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>🔺</div>
              <div className="kpi-label">Worst day</div>
              <div className="kpi-val" style={{color:'#E24B4A'}}>{maxScrap.toFixed(4)}%</div>
              <div className="kpi-footer text-muted">{history.find(function(d){return parseFloat(d.masslam_scrap_pct)===maxScrap;})?history.find(function(d){return parseFloat(d.masslam_scrap_pct)===maxScrap;}).report_date:''}</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>🔻</div>
              <div className="kpi-label">Best day</div>
              <div className="kpi-val" style={{color:'#1D9E75'}}>{minScrap.toFixed(4)}%</div>
              <div className="kpi-footer text-muted">{history.find(function(d){return parseFloat(d.masslam_scrap_pct)===minScrap;})?history.find(function(d){return parseFloat(d.masslam_scrap_pct)===minScrap;}).report_date:''}</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>⚠️</div>
              <div className="kpi-label">Days above target</div>
              <div className="kpi-val" style={{color:aboveTarget>0?'#EF9F27':'#1D9E75'}}>{aboveTarget}</div>
              <div className="kpi-footer text-muted">of {history.length} days</div>
              <div className="kpi-bar" style={{background:'#EF9F27'}} />
            </div>
          </div>

          <div className="card" style={{marginBottom:12}}>
            <div className="card-head">
              <div>
                <div className="card-title">Masslam scrap % trend</div>
                <div className="card-sub">Daily scrap % · Target: {SCRAP_TARGET}% · Avg: {avgScrap.toFixed(4)}%</div>
              </div>
            </div>
            <div className="legend-row">
              <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Scrap %</span>
              <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Target {SCRAP_TARGET}%</span>
            </div>
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
              {[
                {key:'showScrap',   state:showScrap,   set:setShowScrap,   color:'#E24B4A', label:'Daily scrap'},
                {key:'showAvg',     state:showAvg,     set:setShowAvg,     color:'#EF9F27', label:'7-day avg'},
                {key:'showTarget',  state:showTarget,  set:setShowTarget,  color:'#5DCAA5', label:'Target '+SCRAP_TARGET+'%'},
                {key:'showDent',    state:showDent,    set:setShowDent,    color:'#378ADD', label:'Dent'},
                {key:'showWrinkle', state:showWrinkle, set:setShowWrinkle, color:'#EF9F27', label:'Wrinkle'},
                {key:'showScratch', state:showScratch, set:setShowScratch, color:'#E24B4A', label:'Scratch'},
                {key:'showWhitish', state:showWhitish, set:setShowWhitish, color:'#5DCAA5', label:'Whitish'},
                {key:'showVoid',    state:showVoid,    set:setShowVoid,    color:'#7F77DD', label:'Void'},
                {key:'showOthers',  state:showOthers,  set:setShowOthers,  color:'#888780', label:'Others'},
              ].map(function(item){
                return (
                  <button key={item.key}
                    onClick={function(){item.set(function(v){return !v;});}}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:20,border:'1.5px solid '+item.color,
                      background:item.state?item.color+'22':'transparent',cursor:'pointer',fontSize:11,color:item.state?item.color:'var(--text2)',fontWeight:item.state?500:400}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:item.state?item.color:'var(--border2)',flexShrink:0,display:'inline-block'}}></span>
                    {item.label}
                  </button>
                );
              })}
            </div>
            <GradientLine id="scrap-hist-trend" height={200} data={{
              labels,
              datasets:[
                showScrap && {label:'Scrap %',data:scrapPcts,borderColor:'#E24B4A',fill:true,tension:.3,pointRadius:4,spanGaps:true,
                  pointBackgroundColor:scrapPcts.map(function(v){return v>SCRAP_TARGET?'#E24B4A':'#5DCAA5';})},
                showAvg && {label:'7-day avg',data:scrapPcts.map(function(_,i){
                  var start=Math.max(0,i-6);
                  var sl=scrapPcts.slice(start,i+1).filter(function(v){return v>0;});
                  return sl.length?parseFloat((sl.reduce(function(a,b){return a+b;},0)/sl.length).toFixed(4)):null;
                }),borderColor:'#EF9F27',fill:false,tension:.4,pointRadius:0,borderWidth:2,spanGaps:true},
                showTarget  && {label:'Target', data:labels.map(function(){return SCRAP_TARGET;}),borderColor:'#5DCAA5',borderDash:[5,4],fill:false,pointRadius:0,borderWidth:1.5},
                showDent    && {label:'Dent',    data:history.map(function(d){return parseFloat(d.defect_dent)||0;}),   borderColor:'#378ADD',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
                showWrinkle && {label:'Wrinkle', data:history.map(function(d){return parseFloat(d.defect_wrinkle)||0;}),borderColor:'#EF9F27',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
                showScratch && {label:'Scratch', data:history.map(function(d){return parseFloat(d.defect_scratch)||0;}),borderColor:'#E24B4A',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
                showWhitish && {label:'Whitish', data:history.map(function(d){return parseFloat(d.defect_whitish)||0;}),borderColor:'#5DCAA5',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
                showVoid    && {label:'Void',    data:history.map(function(d){return parseFloat(d.defect_void)||0;}),   borderColor:'#7F77DD',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
                showOthers  && {label:'Others',  data:history.map(function(d){return parseFloat(d.defect_others)||0;}), borderColor:'#888780',fill:false,tension:.3,pointRadius:2,borderWidth:1.5},
              ].filter(Boolean)
            }} options={lineOpts} />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Defect breakdown</div><div className="card-sub">Period average %</div></div></div>
              <div style={{maxHeight:250,overflowY:'auto'}}>
                {Object.entries(avgDefects).sort(function(a,b){return b[1]-a[1];}).map(function(entry){
                  var name=entry[0], val=entry[1];
                  var maxV = Math.max.apply(null, Object.values(avgDefects));
                  return (
                    <div key={name} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                        <span style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{width:10,height:10,borderRadius:2,background:DEFECT_COLORS[name],flexShrink:0,display:'inline-block'}}></span>
                          {name}
                        </span>
                        <span style={{fontWeight:500,color:DEFECT_COLORS[name]}}>{val.toFixed(4)}%</span>
                      </div>
                      <div style={{height:6,background:'var(--bg3)',borderRadius:3}}>
                        <div style={{height:'100%',width:maxV>0?(val/maxV*100).toFixed(1)+'%':'0%',background:DEFECT_COLORS[name],borderRadius:3}}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Defect distribution</div><div className="card-sub">Period average</div></div></div>
              <div style={{position:'relative',height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Doughnut
                  key={'hist-donut-'+history.length}
                  data={{
                    labels:Object.keys(avgDefects),
                    datasets:[{
                      data:Object.values(avgDefects).map(function(v){return parseFloat(v.toFixed(4));}),
                      backgroundColor:Object.keys(avgDefects).map(function(k){return DEFECT_COLORS[k];}),
                      borderWidth:3,
                      borderColor: darkMode?'#1a1a1a':'#ffffff',
                      hoverOffset:6,
                    }]
                  }}
                  options={{
                    responsive:true,maintainAspectRatio:false,cutout:'68%',
                    plugins:{
                      legend:{display:false},
                      tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': '+ctx.parsed.toFixed(4)+'%';}}}
                    }
                  }}
                />
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
                  <div style={{fontSize:15,fontWeight:600,color:'var(--text)',lineHeight:1}}>{avgScrap.toFixed(4)}%</div>
                  <div style={{fontSize:9,color:'var(--text2)',marginTop:2}}>Avg scrap</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',marginTop:6,gap:4}}>
                {Object.entries(avgDefects).sort(function(a,b){return b[1]-a[1];}).map(function(entry){
                  return (
                    <div key={entry[0]} style={{textAlign:'center',minWidth:50}}>
                      <div style={{fontSize:10,fontWeight:600,color:DEFECT_COLORS[entry[0]]}}>{entry[1].toFixed(4)}%</div>
                      <div style={{fontSize:9,color:'var(--text2)',marginTop:1}}>{entry[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{marginBottom:12}}>
            <div className="card-head"><div><div className="card-title">Defect trend over time</div><div className="card-sub">Each defect % daily</div></div></div>
            <div className="legend-row">
              {Object.keys(DEFECT_COLORS).map(function(k){return <span key={k} className="leg"><span className="leg-dot" style={{background:DEFECT_COLORS[k]}}></span>{k}</span>;})}
            </div>
            <div style={{height:200}}>
              <Line data={{labels,datasets:Object.keys(DEFECT_COLORS).map(function(def){
                var key='defect_'+def.toLowerCase();
                return {label:def,data:history.map(function(d){return parseFloat(d[key])||0;}),borderColor:DEFECT_COLORS[def],fill:false,tension:.3,pointRadius:2,borderWidth:1.5};
              })}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{ticks:{font:{size:9},callback:function(v){return v+'%'},color:tickColor},grid:{color:gridColor}}
              }}} />
            </div>
          </div>

          {othersRanked.length > 0 && (
            <div className="card" style={{marginBottom:12}}>
              <div className="card-head">
                <div>
                  <div className="card-title">Others — defect breakdown</div>
                  <div className="card-sub">What's contributing most to the "Others" category · accumulated period</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  {othersRanked.map(function(entry, i){
                    var reason=entry[0], area=entry[1];
                    var pct = othersTotalArea>0?(area/othersTotalArea*100).toFixed(1):0;
                    var maxArea = othersRanked[0][1];
                    var colors = ['#E24B4A','#EF9F27','#378ADD','#7F77DD','#5DCAA5','#FF6B9D','#888780','#97C459','#FF9F43','#54A0FF'];
                    var color = colors[i%colors.length];
                    return (
                      <div key={reason} style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                          <span style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0,display:'inline-block'}}></span>
                            {reason}
                          </span>
                          <span style={{fontWeight:500,color:color}}>{area.toFixed(4)} m² ({pct}%)</span>
                        </div>
                        <div style={{height:5,background:'var(--bg3)',borderRadius:3}}>
                          <div style={{height:'100%',width:(area/maxArea*100).toFixed(1)+'%',background:color,borderRadius:3}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{height:260}}>
                  <Bar
                    data={{
                      labels: othersRanked.map(function(e){return e[0].length>15?e[0].slice(0,15)+'...':e[0];}),
                      datasets:[{
                        label:'Scrap area (m²)',
                        data: othersRanked.map(function(e){return parseFloat(e[1].toFixed(4));}),
                        backgroundColor: ['#E24B4A','#EF9F27','#378ADD','#7F77DD','#5DCAA5','#FF6B9D','#888780','#97C459','#FF9F43','#54A0FF'],
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      responsive:true,maintainAspectRatio:false,
                      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.parsed.y.toFixed(4)+' m²';}}}},
                      scales:{
                        x:{ticks:{font:{size:8},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
                        y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return v+' m²';}},grid:{color:gridColor}}
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {rankedPns.length > 0 && (
            <div className="card" style={{marginBottom:12}}>
              <div className="card-head"><div><div className="card-title">Top {rankedPns.length} worst part numbers</div><div className="card-sub">Accumulated over selected period</div></div></div>
              <div className="legend-row">
                {Object.keys(DEFECT_COLORS).map(function(d){return <span key={d} className="leg"><span className="leg-dot" style={{background:DEFECT_COLORS[d]}}></span>{d}</span>;})}
              </div>
              <div style={{height:260}}>
                <Bar data={{labels:rankedPns.map(function(r){return r.pn.length>15?r.pn.slice(0,15)+'...':r.pn;}),datasets:Object.keys(DEFECT_COLORS).map(function(def){return {label:def,data:rankedPns.map(function(r){return parseFloat((r.defects[def]||0).toFixed(4));}),backgroundColor:DEFECT_COLORS[def],stack:'s',borderRadius:2};})}}
                  options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{stacked:true,ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},y:{stacked:true,ticks:{font:{size:9},color:tickColor,callback:function(v){return v+' m²'}},grid:{color:gridColor}}}}} />
              </div>
              <div style={{marginTop:12}}>
                {rankedPns.map(function(item,i){
                  var topDef=Object.entries(item.defects).sort(function(a,b){return b[1]-a[1];})[0];
                  return (
                    <div key={item.pn} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#FCEBEB':i===1?'#FAEEDA':'#F1EFE8',color:i===0?'#791F1F':i===1?'#633806':'#444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.pn}</div>
                        <div style={{fontSize:10,color:'var(--text2)'}}>Top defect: <span style={{color:DEFECT_COLORS[topDef?topDef[0]:'Others'],fontWeight:500}}>{topDef?topDef[0]:'—'}</span> · {Object.keys(item.defects).length} types</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#E24B4A'}}>{item.totalArea.toFixed(4)} m²</div>
                      </div>
                      <div style={{width:80,flexShrink:0}}>
                        <div style={{height:6,background:'var(--bg3)',borderRadius:3}}>
                          <div style={{height:'100%',width:(item.totalArea/rankedPns[0].totalArea*100).toFixed(1)+'%',background:'#E24B4A',borderRadius:3}}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><div><div className="card-title">Daily summary</div><div className="card-sub">{history.length} days · click row to expand</div></div></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Output (m²)</th>
                    <th>Scrap %</th>
                    <th>Dent</th>
                    <th>Wrinkle</th>
                    <th>Scratch</th>
                    <th>Whitish</th>
                    <th>Void</th>
                    <th>Others</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(function(d) {
                    var pct = parseFloat(d.masslam_scrap_pct)||0;
                    var isExpanded = expandedRow === d.report_date;
                    var pnData = d.pn_breakdown ? Object.values(d.pn_breakdown).sort(function(a,b){return b.totalArea-a.totalArea;}).slice(0,5) : [];
                    return [
                      <tr key={d.report_date} style={{cursor:'pointer',background:isExpanded?'rgba(55,138,221,0.05)':''}}
                        onClick={function(){setExpandedRow(isExpanded?null:d.report_date);}}>
                        <td style={{fontWeight:500}}>{d.report_date} {isExpanded?'▲':'▼'}</td>
                        <td>{parseFloat(d.output_m2).toLocaleString()}</td>
                        <td style={{fontWeight:500,color:pct>SCRAP_TARGET?'#E24B4A':'#1D9E75'}}>{pct.toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#378ADD'}}>{(parseFloat(d.defect_dent)||0).toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#EF9F27'}}>{(parseFloat(d.defect_wrinkle)||0).toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#E24B4A'}}>{(parseFloat(d.defect_scratch)||0).toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#5DCAA5'}}>{(parseFloat(d.defect_whitish)||0).toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#7F77DD'}}>{(parseFloat(d.defect_void)||0).toFixed(4)}%</td>
                        <td style={{fontSize:11,color:'#888780'}}>{(parseFloat(d.defect_others)||0).toFixed(4)}%</td>
                        <td><span className={pct>SCRAP_TARGET?'pill pill-red':'pill pill-green'}>{pct>SCRAP_TARGET?'Above':'Within'}</span></td>
                      </tr>,
                      isExpanded && pnData.length > 0 && (
                        <tr key={d.report_date+'-exp'}>
                          <td colSpan={10} style={{background:'var(--bg3)',padding:'10px 16px'}}>
                            <div style={{fontSize:11,fontWeight:500,color:'var(--text)',marginBottom:8}}>Top part numbers — {d.report_date}</div>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                              {pnData.map(function(pn){
                                var topDef=pn.defects?Object.entries(pn.defects).sort(function(a,b){return b[1]-a[1];})[0]:null;
                                return (
                                  <div key={pn.pn}
                                    style={{background:'var(--bg2)',borderRadius:7,padding:'8px 10px',border:'1px solid '+(expandedPN===d.report_date+pn.pn?'#378ADD':'var(--border)'),cursor:'pointer'}}
                                    onClick={function(){setExpandedPN(expandedPN===d.report_date+pn.pn?null:d.report_date+pn.pn);}}>
                                    <div style={{fontSize:11,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pn.pn}</div>
                                    <div style={{fontSize:10,color:'#E24B4A',fontWeight:500}}>{pn.totalArea.toFixed(4)} m²</div>
                                    {topDef&&<div style={{fontSize:10,color:DEFECT_COLORS[topDef[0]]||'#888'}}>{topDef[0]}</div>}
                                    {expandedPN===d.report_date+pn.pn && pn.defects && (
                                      <div style={{marginTop:6,borderTop:'1px solid var(--border)',paddingTop:6}}>
                                        {Object.entries(pn.defects).sort(function(a,b){return b[1]-a[1];}).map(function(de){
                                          var maxDef = Math.max.apply(null,Object.values(pn.defects));
                                          return (
                                            <div key={de[0]} style={{marginBottom:4}}>
                                              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:1}}>
                                                <span style={{color:DEFECT_COLORS[de[0]]||'#888'}}>{de[0]}</span>
                                                <span style={{fontWeight:500,color:DEFECT_COLORS[de[0]]||'#888'}}>{de[1].toFixed(4)} m²</span>
                                              </div>
                                              <div style={{height:3,background:'var(--bg3)',borderRadius:2}}>
                                                <div style={{height:'100%',width:(de[1]/maxDef*100).toFixed(1)+'%',background:DEFECT_COLORS[de[0]]||'#888',borderRadius:2}}></div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    ];
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
