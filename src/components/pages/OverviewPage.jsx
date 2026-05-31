import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import FilterBar from '../FilterBar';
import KpiCard from '../KpiCard';
import DefectBars from '../DefectBars';
import Heatmap from '../Heatmap';
import { DEFECTS, DEF_COLORS, N_STN, daysAgo, tod, filterDays } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const SCRAP_TARGET = 1.3;

export default function OverviewPage({ allDays, darkMode }) {
  const [from, setFrom] = useState(daysAgo(14));
  const [to, setTo] = useState(tod());
  const [filtered, setFiltered] = useState([]);

  function update() { setFiltered(filterDays(allDays, from, to)); }
  useEffect(function() { update(); }, [allDays, from, to]);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666666';

  function lineOpts(suffix) {
    suffix = suffix || '';
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, autoSkip: true, maxRotation: 0, color: tickColor }, grid: { display: false } },
        y: { ticks: { font: { size: 9 }, callback: function(v) { return v + suffix; }, color: tickColor }, grid: { color: gridColor } }
      }
    };
  }

  const labels = filtered.map(function(x) { return x.date.slice(5); });
  const outs   = filtered.map(function(x) { return x.data.output || 0; });
  const tgts   = filtered.map(function(x) { return x.data.target || 0; });
  const scraps = filtered.map(function(x) { return x.data.scrap || 0; });
  const m2hrs  = filtered.map(function(x) { return parseFloat(x.data.m2hr) || 0; });

  const totalOut = outs.reduce(function(a,b){return a+b;},0);
  const totalTgt = tgts.reduce(function(a,b){return a+b;},0);
  const diff = totalOut - totalTgt;
  const avgScrap = scraps.length ? scraps.reduce(function(a,b){return a+b;},0)/scraps.length : 0;
  const m2hrVals = m2hrs.filter(function(v){return v>0;});
  const avgM2hr = m2hrVals.length ? m2hrVals.reduce(function(a,b){return a+b;},0)/m2hrVals.length : 0;
  const lastD = filtered.length ? filtered[filtered.length-1].data : null;
  const lastAoi = lastD ? lastD.aoi||0 : 0;

  const avgDefs = {};
  DEFECTS.forEach(function(n) {
    const vs = filtered.map(function(x){ return (x.data.defects&&x.data.defects[n])||0; });
    avgDefs[n] = vs.length ? vs.reduce(function(a,b){return a+b;},0)/vs.length : 0;
  });

  const aoiVals = lastD ? [lastD.dent||0, lastD.scratch||0, lastD.wrinkle||0] : [0,0,0];

  const stnTotals = {};
  for (var si = 1; si <= N_STN; si++) {
    stnTotals[si] = filtered.reduce(function(s,x){ return s+((x.data.stations&&x.data.stations[si])||0); },0);
  }

  const opNormal  = filtered.map(function(x){ return (x.data.operators||[]).filter(function(o){return o.shift==='day'||o.shift==='night';}).length; });
  const opCutSelf = filtered.map(function(x){ return (x.data.operators||[]).filter(function(o){return o.shift==='cut_self';}).length; });
  const opCutMgmt = filtered.map(function(x){ return (x.data.operators||[]).filter(function(o){return o.shift==='cut_mgmt';}).length; });
  const opAbsent  = filtered.map(function(x){ return (x.data.operators||[]).filter(function(o){return o.shift==='absent';}).length; });

  function buildOpStats() {
    const opStats = {};
    filtered.forEach(function(x) {
      (x.data.operators||[]).forEach(function(op) {
        if (!opStats[op.name]) opStats[op.name] = { name: op.name, cutSelf: 0, absent: 0, cutMgmt: 0, normal: 0, total: 0 };
        opStats[op.name].total++;
        if (op.shift==='cut_self')  opStats[op.name].cutSelf++;
        if (op.shift==='absent')    opStats[op.name].absent++;
        if (op.shift==='cut_mgmt')  opStats[op.name].cutMgmt++;
        if (op.shift==='day'||op.shift==='night') opStats[op.name].normal++;
      });
    });
    return Object.values(opStats).filter(function(o){return o.total>0;});
  }

  const allOpStats = buildOpStats();
  const bestOps = allOpStats.slice().sort(function(a,b){ return (a.cutSelf+a.absent*2)-(b.cutSelf+b.absent*2); }).slice(0,5);
  const worstOps = allOpStats.slice().sort(function(a,b){ return (b.cutSelf+b.absent*2)-(a.cutSelf+a.absent*2); }).slice(0,5);

  const scrapAboveTarget = scraps.filter(function(v){return v>SCRAP_TARGET;}).length;

  return (
    <div>
      <FilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} onUpdate={update}
        rightLabel={filtered.length + ' day' + (filtered.length!==1?'s':'') + ' of data'} />

      <div className="kpi-grid">
        <KpiCard icon="📦" label="Total output" value={totalOut.toLocaleString()}
          footer={(diff>=0?'+':'')+diff.toLocaleString()+' vs target'}
          footerClass={diff>=0?'text-up':'text-down'}
          iconBg="#E6F1FB" iconColor="#185FA5" barColor="#378ADD" />
        <KpiCard icon="⚠️" label="Avg scrap rate" value={avgScrap.toFixed(2)+'%'}
          footer={avgScrap>SCRAP_TARGET?'Above target '+SCRAP_TARGET+'%':'Within target '+SCRAP_TARGET+'%'}
          footerClass={avgScrap>SCRAP_TARGET?'text-down':'text-up'}
          iconBg="#FCEBEB" iconColor="#A32D2D" barColor="#E24B4A" />
        <KpiCard icon="👁" label="Latest AOI" value={lastAoi.toFixed(2)+'%'}
          footer="Dent / Scratch / Wrinkle"
          iconBg="#E1F5EE" iconColor="#0F6E56" barColor="#1D9E75" />
        <KpiCard icon="📈" label="Avg m2/hr" value={avgM2hr.toFixed(2)}
          footer={filtered.length+' days tracked'}
          iconBg="#FAEEDA" iconColor="#854F0B" barColor="#EF9F27" />
        <KpiCard icon="📅" label="Days recorded" value={filtered.length}
          footer="in selected range"
          iconBg="#EEEDFE" iconColor="#534AB7" barColor="#7F77DD" />
      </div>

      <div className="chart-row-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Output vs target</div>
              <div className="card-sub">{filtered.length?totalOut.toLocaleString()+' m2 total · '+(diff>=0?'+':'')+diff.toLocaleString()+' diff':'Select date range'}</div>
            </div>
          </div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Actual</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A',opacity:.6}}></span>Target</span>
          </div>
          <div style={{height:185}}>
            <Line data={{labels:labels,datasets:[
              {label:'Output',data:outs,borderColor:'#378ADD',backgroundColor:'rgba(55,138,221,.08)',tension:.35,fill:true,pointRadius:3},
              {label:'Target',data:tgts,borderColor:'#E24B4A',borderDash:[5,4],tension:.35,fill:false,pointRadius:0,borderWidth:1.5}
            ]}} options={lineOpts()} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap by defect</div><div className="card-sub">Period average</div></div></div>
          <DefectBars data={avgDefs} />
        </div>
      </div>

      <div className="chart-row-3">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Scrap rate %</div>
              <div className="card-sub">
                {'Avg: '+avgScrap.toFixed(2)+'% · Target: '+SCRAP_TARGET+'% · '}
                <span style={{color:scrapAboveTarget>0?'#E24B4A':'#3B6D11',fontWeight:500}}>
                  {scrapAboveTarget>0?scrapAboveTarget+' days above target':'All within target'}
                </span>
              </div>
            </div>
          </div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Scrap %</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27',opacity:.8}}></span>Target {SCRAP_TARGET}%</span>
          </div>
          <div style={{height:130}}>
            <Line data={{labels:labels,datasets:[
              {label:'Scrap %',data:scraps,borderColor:'#E24B4A',backgroundColor:'rgba(226,75,74,.07)',tension:.35,fill:true,pointRadius:3,
                pointBackgroundColor:scraps.map(function(v){return v>SCRAP_TARGET?'#E24B4A':'#5DCAA5';})},
              {label:'Target',data:labels.map(function(){return SCRAP_TARGET;}),borderColor:'#EF9F27',borderDash:[5,4],pointRadius:0,borderWidth:1.5,fill:false}
            ]}} options={{
              responsive:true,maintainAspectRatio:false,
              plugins:{legend:{display:false}},
              scales:{
                x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{ticks:{font:{size:9},callback:function(v){return v+'%';},color:tickColor},grid:{color:gridColor}}
              }
            }} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">AOI breakdown</div><div className="card-sub">Latest day</div></div></div>
          <div className="legend-row">
            {['Dent','Scratches','Wrinkle'].map(function(l,i){
              return <span key={l} className="leg"><span className="leg-dot" style={{background:['#378ADD','#EF9F27','#E24B4A'][i]}}></span>{l+' '+aoiVals[i].toFixed(1)+'%'}</span>;
            })}
          </div>
          <div style={{height:110}}>
            <Doughnut
              data={{labels:['Dent','Scratches','Wrinkle'],datasets:[{data:aoiVals,backgroundColor:['#378ADD','#EF9F27','#E24B4A'],borderWidth:0}]}}
              options={{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">m2/hr efficiency</div><div className="card-sub">{'Avg: '+avgM2hr.toFixed(2)}</div></div></div>
          <div style={{height:130}}>
            <Line data={{labels:labels,datasets:[{data:m2hrs,borderColor:'#EF9F27',backgroundColor:'rgba(239,159,39,.07)',tension:.35,fill:true,pointRadius:2}]}} options={lineOpts()} />
          </div>
        </div>
      </div>

      <div className="chart-row-equal">
        <div className="card">
          <div className="card-head"><div><div className="card-title">Station heatmap</div><div className="card-sub">Period total per station</div></div></div>
          <Heatmap stationTotals={stnTotals} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Defect trend</div><div className="card-sub">Stacked over period</div></div></div>
          <div className="legend-row">
            {DEFECTS.map(function(n,i){ return <span key={n} className="leg"><span className="leg-dot" style={{background:DEF_COLORS[i]}}></span>{n}</span>; })}
          </div>
          <div style={{height:150}}>
            <Bar
              data={{labels:labels,datasets:DEFECTS.map(function(n,i){
                return {label:n,data:filtered.map(function(x){return (x.data.defects&&x.data.defects[n])||0;}),backgroundColor:DEF_COLORS[i],stack:'s',borderRadius:2};
              })}}
              options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{stacked:true,ticks:{font:{size:9},callback:function(v){return v+'%';},color:tickColor},grid:{color:gridColor}}
              }}}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="card-head">
          <div><div className="card-title">Operator attendance</div><div className="card-sub">Daily shift breakdown</div></div>
        </div>
        <div className="legend-row">
          <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Normal 7-7</span>
          <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Self cut OT</span>
          <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Mgmt cut OT</span>
          <span className="leg"><span className="leg-dot" style={{background:'#888780'}}></span>Absent</span>
        </div>
        <div style={{height:220}}>
          <Bar
            data={{labels:labels,datasets:[
              {label:'Normal 7-7',data:opNormal,backgroundColor:'#5DCAA5',stack:'s',borderRadius:2},
              {label:'Self cut OT',data:opCutSelf,backgroundColor:'#E24B4A',stack:'s',borderRadius:2},
              {label:'Mgmt cut OT',data:opCutMgmt,backgroundColor:'#378ADD',stack:'s',borderRadius:2},
              {label:'Absent',data:opAbsent,backgroundColor:'#888780',stack:'s',borderRadius:2}
            ]}}
            options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
              x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
              y:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
            }}}
          />
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Top 5 — Best attendance</div>
              <div className="card-sub">Least self cut OT and absent days</div>
            </div>
          </div>
          {bestOps.length ? bestOps.map(function(op,i){
            var badDays = op.cutSelf + op.absent;
            var pct = op.total>0 ? ((op.total-badDays)/op.total*100).toFixed(0) : 0;
            return (
              <div key={op.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#EAF3DE',color:'#27500A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{op.name}</div>
                  <div style={{fontSize:10,color:'var(--text2)'}}>Self cut: {op.cutSelf} · Absent: {op.absent} · {op.total} days tracked</div>
                </div>
                <span className="pill pill-green">{pct}% good</span>
              </div>
            );
          }) : <div className="empty">No data in range</div>}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Top 5 — Needs attention</div>
              <div className="card-sub">Most self cut OT and absent days</div>
            </div>
          </div>
          {worstOps.length ? worstOps.map(function(op,i){
            var badDays = op.cutSelf + op.absent;
            var pct = op.total>0 ? (badDays/op.total*100).toFixed(0) : 0;
            return (
              <div key={op.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#FCEBEB',color:'#791F1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{op.name}</div>
                  <div style={{fontSize:10,color:'var(--text2)'}}>Self cut: {op.cutSelf} · Absent: {op.absent} · {op.total} days tracked</div>
                </div>
                <span className="pill pill-red">{pct}% issues</span>
              </div>
            );
          }) : <div className="empty">No data in range</div>}
        </div>
      </div>
    </div>
  );
}
