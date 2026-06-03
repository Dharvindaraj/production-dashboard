import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import GradientLine from '../GradientLine';
import KpiCard from '../KpiCard';
import { tod, daysAgo, filterDays, DEFECTS, DEF_COLORS } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Tooltip, Legend, Filler);

const SCRAP_TARGET = 1.3;

function makeGrad(ctx, hex, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const r = parseInt(hex.slice(1,3),16), gn = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  g.addColorStop(0, 'rgba('+r+','+gn+','+b+',0.35)');
  g.addColorStop(1, 'rgba('+r+','+gn+','+b+',0)');
  return g;
}

export default function OverviewPage({ allDays, darkMode }) {
  const [range, setRange]   = useState('30d');
  const [from, setFrom]     = useState(daysAgo(30));
  const [to, setTo]         = useState(tod());

  const grid = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tick = darkMode ? '#9499b0' : '#666';

  function setPreset(r) {
    setRange(r);
    if (r==='7d')  { setFrom(daysAgo(7));  setTo(tod()); }
    if (r==='14d') { setFrom(daysAgo(14)); setTo(tod()); }
    if (r==='30d') { setFrom(daysAgo(30)); setTo(tod()); }
    if (r==='all') { setFrom('2020-01-01'); setTo(tod()); }
  }

  const filtered = filterDays(allDays, from, to);
  const labels   = filtered.map(function(x){return x.date.slice(5);});

  const noProductionDays = filtered.map(function(x){return x.data.noProduction||false;});

  const outs   = filtered.map(function(x,i){
    if (noProductionDays[i]) return null;
    return x.data.output||null;
  });
  const scraps = filtered.map(function(x,i){
    if (noProductionDays[i]) return null;
    var v = parseFloat(x.data.scrap);
    return (v&&v>0)?v:null;
  });
  const tgts   = filtered.map(function(x){return x.data.target||0;});
  const m2hrs  = filtered.map(function(x,i){
    if (noProductionDays[i]) return null;
    return parseFloat(x.data.m2hr)||null;
  });

  const scrapVals    = scraps.filter(function(v){return v!==null&&v>0;});
  const avgScrap     = scrapVals.length ? scrapVals.reduce(function(a,b){return a+b;},0)/scrapVals.length : 0;
  const totalOut     = outs.reduce(function(a,b){return a+(b||0);},0);
  const totalTgt     = tgts.reduce(function(a,b){return a+b;},0);
  const avgM2hr      = m2hrs.filter(Boolean).length ? m2hrs.filter(Boolean).reduce(function(a,b){return a+b;},0)/m2hrs.filter(Boolean).length : 0;
  const scrapAbove   = scraps.filter(function(v){return v!==null&&v>SCRAP_TARGET;}).length;
  const firstPass    = avgScrap>0 ? (100-avgScrap).toFixed(2) : 0;

  const movingAvg = scraps.map(function(_,i){
    if (scraps[i]===null) return null;
    var start = Math.max(0,i-6);
    var sl = scraps.slice(start,i+1).filter(function(v){return v!==null&&v>0;});
    if (!sl.length) return null;
    return parseFloat((sl.reduce(function(a,b){return a+b;},0)/sl.length).toFixed(2));
  });

  const cumOut = outs.map(function(_,i){return outs.slice(0,i+1).reduce(function(a,b){return a+(b||0);},0);});
  const cumTgt = tgts.map(function(_,i){return tgts.slice(0,i+1).reduce(function(a,b){return a+b;},0);});

  const lastD = filtered.length ? filtered[filtered.length-1].data : null;

  const aoiTrendData = {labels, datasets:[
    {label:'Dent',   data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.dent)?null:x.data.dent;}),   borderColor:'#378ADD',fill:false,tension:.3,pointRadius:2,spanGaps:true},
    {label:'Scratch',data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.scratch)?null:x.data.scratch;}),borderColor:'#EF9F27',fill:false,tension:.3,pointRadius:2,spanGaps:true},
    {label:'Wrinkle',data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.wrinkle)?null:x.data.wrinkle;}),borderColor:'#E24B4A',fill:false,tension:.3,pointRadius:2,spanGaps:true},
  ]};

  const shiftCounts = { day:0, night:0, cut_self:0, cut_mgmt:0, absent:0 };
  filtered.forEach(function(x){
    if (!x.data.operators) return;
    x.data.operators.forEach(function(op){
      var s = op.shift||'day';
      if (shiftCounts[s]!==undefined) shiftCounts[s]++;
    });
  });

  const attendanceData = {
    labels,
    datasets:[
      {label:'Day',     data:filtered.map(function(x){return x.data.operators?x.data.operators.filter(function(o){return (o.shift||'day')==='day';}).length:0;}),     backgroundColor:'#5DCAA5',stack:'s',borderRadius:2},
      {label:'Night',   data:filtered.map(function(x){return x.data.operators?x.data.operators.filter(function(o){return o.shift==='night';}).length:0;}),    backgroundColor:'#378ADD',stack:'s',borderRadius:2},
      {label:'Self cut',data:filtered.map(function(x){return x.data.operators?x.data.operators.filter(function(o){return o.shift==='cut_self';}).length:0;}), backgroundColor:'#E24B4A',stack:'s',borderRadius:2},
      {label:'Mgmt cut',data:filtered.map(function(x){return x.data.operators?x.data.operators.filter(function(o){return o.shift==='cut_mgmt';}).length:0;}), backgroundColor:'#185FA5',stack:'s',borderRadius:2},
      {label:'Absent',  data:filtered.map(function(x){return x.data.operators?x.data.operators.filter(function(o){return o.shift==='absent';}).length:0;}),   backgroundColor:'#888780',stack:'s',borderRadius:2},
    ]
  };

  const stationTotals = {};
  filtered.forEach(function(x){
    if (!x.data.stations_morning && !x.data.stations) return;
    var stns = Object.assign({}, x.data.stations_morning||{}, x.data.stations||{});
    Object.entries(stns).forEach(function(e){
      if (!stationTotals[e[0]]) stationTotals[e[0]]=0;
      stationTotals[e[0]] += parseFloat(e[1])||0;
    });
  });
  var stnEntries = Object.entries(stationTotals).sort(function(a,b){return b[1]-a[1];});
  var top5    = stnEntries.slice(0,5);
  var bottom5 = stnEntries.slice(-5).reverse();

  const attScores = {};
  filtered.forEach(function(x){
    if (!x.data.operators) return;
    x.data.operators.forEach(function(op){
      if (!attScores[op.name]) attScores[op.name]={name:op.name,days:0,issues:0};
      attScores[op.name].days++;
      if (op.shift==='cut_self') attScores[op.name].issues++;
      if (op.shift==='absent')   attScores[op.name].issues+=2;
    });
  });
  var attList = Object.values(attScores).filter(function(a){return a.days>0;});
  var best5   = attList.sort(function(a,b){return (a.issues/a.days)-(b.issues/b.days);}).slice(0,5);
  var worst5  = attList.sort(function(a,b){return (b.issues/b.days)-(a.issues/a.days);}).slice(0,5);

  const scrapScore = avgScrap>0 ? Math.max(0,100-(avgScrap/SCRAP_TARGET)*50) : 100;
  const utilScore  = totalTgt>0 ? Math.min(100,(totalOut/totalTgt)*100) : 0;
  const qualScore  = Math.round(0.5*scrapScore+0.5*utilScore);

  function lineOpts(unit) {
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{font:{size:8},autoSkip:true,maxRotation:0,color:tick},grid:{display:false}},
        y:{ticks:{font:{size:8},color:tick,callback:function(v){return v+(unit||'');}},grid:{color:grid}}
      }
    };
  }

  return (
    <div>
      <div className="filter-bar" style={{marginBottom:12}}>
        {['7d','14d','30d','all'].map(function(r){
          return <button key={r} className={range===r?'quick-btn active':'quick-btn'} onClick={function(){setPreset(r);}}>{r}</button>;
        })}
        <div className="filter-sep" />
        <input type="date" value={from} onChange={function(e){setFrom(e.target.value);setRange('custom');}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <span style={{fontSize:11,color:'var(--text2)'}}>to</span>
        <input type="date" value={to} onChange={function(e){setTo(e.target.value);setRange('custom');}} style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
        <div className="filter-right" style={{fontSize:11,color:'var(--text2)'}}>{filtered.length} days</div>
      </div>

      <div className="kpi-grid" style={{marginBottom:12}}>
        <KpiCard label="Total output" value={totalOut.toLocaleString()} foot={(totalOut-totalTgt>0?'+':'')+Math.round(totalOut-totalTgt)+' vs target'} footCls={totalOut>=totalTgt?'up':'dn'} color="#378ADD" icon="📦" sparkData={outs.slice(-7).map(function(v){return v||0;})} sparkColor="#378ADD" />
        <KpiCard label="Avg scrap rate" value={avgScrap.toFixed(2)+'%'} foot={scrapAbove+' days above '+SCRAP_TARGET+'%'} footCls={avgScrap<=SCRAP_TARGET?'up':'dn'} color="#E24B4A" icon="⚠️" sparkData={scraps.slice(-7).map(function(v){return v||0;})} sparkColor="#E24B4A" />
        <KpiCard label="First pass rate" value={firstPass+'%'} foot={filtered.length+' days tracked'} footCls="up" color="#1D9E75" icon="✅" sparkData={scraps.slice(-7).map(function(v){return v?100-v:null;})} sparkColor="#1D9E75" />
        <KpiCard label="Avg m²/hr" value={avgM2hr.toFixed(2)} foot={filtered.length+' days avg'} footCls="mu" color="#EF9F27" icon="📈" sparkData={m2hrs.slice(-7).map(function(v){return v||0;})} sparkColor="#EF9F27" />
        <KpiCard label="Quality score" value={qualScore+'/100'} foot={qualScore>=80?'Good performance':qualScore>=60?'Needs attention':'Below target'} footCls={qualScore>=80?'up':qualScore>=60?'mu':'dn'} color="#5DCAA5" icon="🏭" />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Output vs target</div><div className="card-sub">{totalOut.toLocaleString()} m² total</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Actual</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A',opacity:.6}}></span>Target</span>
          </div>
          <GradientLine id="out-tgt" height={160} data={{labels,datasets:[
            {label:'Output',data:outs,borderColor:'#378ADD',fill:true,tension:.35,pointRadius:2,spanGaps:true,
              pointStyle:outs.map(function(v,i){return noProductionDays[i]?'rectRot':'circle';}),
              pointBackgroundColor:outs.map(function(v,i){return noProductionDays[i]?'#888780':'#378ADD';})},
            {label:'Target',data:tgts,borderColor:'#E24B4A',borderDash:[5,4],fill:false,tension:.35,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts()} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap rate + 7-day moving avg</div><div className="card-sub">Target: {SCRAP_TARGET}% · Avg: {avgScrap.toFixed(2)}%</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Daily scrap</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>7d avg</span>
            <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Target</span>
          </div>
          <GradientLine id="scrap-trend" height={160} data={{labels,datasets:[
            {label:'Scrap %',data:scraps,borderColor:'#E24B4A',fill:true,tension:.2,spanGaps:true,
              pointRadius:scraps.map(function(v,i){return noProductionDays[i]?6:3;}),
              pointStyle:scraps.map(function(v,i){return noProductionDays[i]?'rectRot':'circle';}),
              pointBackgroundColor:scraps.map(function(v,i){return noProductionDays[i]?'#888780':v&&v>SCRAP_TARGET?'#E24B4A':'#5DCAA5';})},
            {label:'7d avg',data:movingAvg,borderColor:'#EF9F27',fill:false,tension:.4,pointRadius:0,borderWidth:2,spanGaps:true},
            {label:'Target',data:labels.map(function(){return SCRAP_TARGET;}),borderColor:'#5DCAA5',borderDash:[5,4],fill:false,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts('%')} />
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Cumulative output vs target</div></div></div>
          <GradientLine id="cum-out" height={150} data={{labels,datasets:[
            {label:'Cum output',data:cumOut,borderColor:'#378ADD',fill:true,tension:.3,pointRadius:2},
            {label:'Cum target',data:cumTgt,borderColor:'#E24B4A',borderDash:[5,4],fill:false,tension:.3,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts()} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">AOI defect trend</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Dent</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Scratch</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Wrinkle</span>
          </div>
          <div style={{height:150}}>
            <Line data={aoiTrendData} options={lineOpts('%')} />
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">m²/hr efficiency</div></div></div>
          <GradientLine id="m2hr" height={110} data={{labels,datasets:[{label:'m²/hr',data:m2hrs,borderColor:'#EF9F27',fill:true,tension:.35,pointRadius:2,spanGaps:true}]}} options={lineOpts()} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap by day of week</div></div></div>
          <div style={{height:110}}>
            <Bar data={{
              labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
              datasets:[{data:(function(){
                var sums=[0,0,0,0,0,0,0], counts=[0,0,0,0,0,0,0];
                filtered.forEach(function(x){
                  if (!x.data.scrap||noProductionDays[filtered.indexOf(x)]) return;
                  var dw=(new Date(x.date).getDay()+6)%7;
                  sums[dw]+=parseFloat(x.data.scrap)||0; counts[dw]++;
                });
                return sums.map(function(s,i){return counts[i]?parseFloat((s/counts[i]).toFixed(2)):0;});
              })(),backgroundColor:['#5DCAA5','#5DCAA5','#5DCAA5','#5DCAA5','#E24B4A','#EF9F27','#7F77DD'],borderRadius:4}]
            }} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:9},color:tick},grid:{display:false}},y:{ticks:{font:{size:8},color:tick,callback:function(v){return v+'%'}},grid:{color:grid}}}}} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Defect pareto</div></div></div>
          <div style={{height:110}}>
            {lastD && lastD.defects ? (
              <Bar data={{
                labels:Object.keys(lastD.defects||{}),
                datasets:[{data:Object.values(lastD.defects||{}).map(function(v){return parseFloat(v)||0;}),backgroundColor:DEF_COLORS,borderRadius:4}]
              }} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:8},color:tick},grid:{display:false}},y:{ticks:{font:{size:8},color:tick,callback:function(v){return v+'%'}},grid:{color:grid}}}}} />
            ) : <div className="empty" style={{fontSize:11}}>No defect data</div>}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 stations</div><div className="card-sub">By total output</div></div></div>
          {top5.map(function(e){var maxV=top5[0]?top5[0][1]:1;return(
            <div key={e[0]} style={{marginBottom:6}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}><span>{e[0]}</span><span style={{fontWeight:500,color:'#1D9E75'}}>{e[1].toFixed(0)}</span></div>
              <div style={{height:5,background:'var(--bg3)',borderRadius:3}}><div style={{height:'100%',width:(e[1]/maxV*100).toFixed(0)+'%',background:'#5DCAA5',borderRadius:3}}></div></div>
            </div>
          );})}
          <div className="card-head" style={{marginTop:12}}><div><div className="card-title">Bottom 5 stations</div></div></div>
          {bottom5.map(function(e){var maxV=top5[0]?top5[0][1]:1;return(
            <div key={e[0]} style={{marginBottom:6}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}><span>{e[0]}</span><span style={{fontWeight:500,color:'#E24B4A'}}>{e[1].toFixed(0)}</span></div>
              <div style={{height:5,background:'var(--bg3)',borderRadius:3}}><div style={{height:'100%',width:(e[1]/maxV*100).toFixed(0)+'%',background:'#E24B4A',borderRadius:3}}></div></div>
            </div>
          );})}
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Operator attendance</div></div></div>
          <div style={{height:160}}>
            <Bar data={attendanceData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{stacked:true,ticks:{font:{size:8},autoSkip:true,maxRotation:0,color:tick},grid:{display:false}},y:{stacked:true,ticks:{font:{size:8},color:tick},grid:{color:grid}}}}} />
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 — best attendance</div></div></div>
          {best5.map(function(a,i){return(
            <div key={a.name} className="op-item">
              <div style={{width:24,height:24,borderRadius:'50%',background:'#EAF3DE',color:'#27500A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
              <span className="op-name">{a.name}</span>
              <span className="pill pill-green">{Math.round((1-a.issues/a.days)*100)}% good</span>
            </div>
          );})}
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 — needs attention</div></div></div>
          {worst5.map(function(a,i){return(
            <div key={a.name} className="op-item">
              <div style={{width:24,height:24,borderRadius:'50%',background:'#FCEBEB',color:'#791F1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
              <span className="op-name">{a.name}</span>
              <span className="pill pill-red">{Math.round(a.issues/a.days*100)}% issues</span>
            </div>
          );})}
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="card-head"><div><div className="card-title">Quality scorecard</div></div></div>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:48,fontWeight:500,color:'#5DCAA5',lineHeight:1}}>{qualScore}</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>out of 100</div>
            <div style={{marginTop:8,padding:'4px 14px',borderRadius:20,background:qualScore>=80?'#EAF3DE':qualScore>=60?'#FAEEDA':'#FCEBEB',color:qualScore>=80?'#27500A':qualScore>=60?'#633806':'#791F1F',fontSize:11,fontWeight:500,display:'inline-block'}}>
              {qualScore>=80?'Good':qualScore>=60?'Fair':'Needs work'}
            </div>
          </div>
          <div style={{flex:1}}>
            {[['Scrap rate',avgScrap.toFixed(2)+'%',avgScrap<=SCRAP_TARGET],['First pass',firstPass+'%',parseFloat(firstPass)>=98],['Utilization',(totalTgt>0?(totalOut/totalTgt*100).toFixed(1):0)+'%',(totalTgt>0&&totalOut/totalTgt>=0.9)]].map(function(row){return(
              <div key={row[0]} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'0.5px solid var(--border)'}}>
                <span style={{color:'var(--text2)'}}>{row[0]}</span>
                <span style={{fontWeight:500,color:row[2]?'#3B6D11':'#A32D2D'}}>{row[1]} {row[2]?'✓':'✗'}</span>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}
