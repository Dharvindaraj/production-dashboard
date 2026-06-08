import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import FilterBar from '../FilterBar';
import KpiCard from '../KpiCard';
import DefectBars from '../DefectBars';
import Heatmap from '../Heatmap';
import GradientLine from '../GradientLine';
import { DEFECTS, DEF_COLORS, N_STN, daysAgo, tod, filterDays } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const SCRAP_TARGET = 1.3;
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function OverviewPage({ allDays, darkMode }) {
  const [from, setFrom] = useState(daysAgo(14));
  const [to, setTo]     = useState(tod());
  const [filtered, setFiltered] = useState([]);

  const [outputView, setOutputView] = useState('lcm');
  const [stationView, setStationView] = useState('lcm');
  const [donutView, setDonutView]     = useState('lcm');

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

  const labels  = filtered.map(function(x) { return x.date.slice(5); });
  const noProductionDays = filtered.map(function(x) { return x.data.noProduction || false; });
  const outs    = filtered.map(function(x,i) { if(noProductionDays[i]) return null; return x.data.output||null; });
  const tgts    = filtered.map(function(x) { return x.data.target || 0; });
  const scraps  = filtered.map(function(x,i) { if(noProductionDays[i]) return null; var v=parseFloat(x.data.scrap); return (v&&v>0)?v:null; });
  const m2hrs   = filtered.map(function(x,i) { if(noProductionDays[i]) return null; var v=parseFloat(parseFloat(x.data.m2hr||0).toFixed(2)); return v>0?v:null; });

  const lcsOutputArr = filtered.map(function(x,i) {
    if(noProductionDays[i]) return null;
    var v = parseFloat(x.data.lcsOutput)||0;
    return v > 0 ? v : null;
  });
  const lcsTargetArr = filtered.map(function(x,i) {
    return parseFloat(x.data.lcsTarget)||0;
  });

  const lcmM2 = filtered.map(function(x,i) {
    if(noProductionDays[i]) return null;
    var v = (parseFloat(x.data.lcmMorningM2)||0)+(parseFloat(x.data.lcmNightM2)||0);
    return v > 0 ? v : null;
  });
  const lcsM2 = filtered.map(function(x,i) {
    if(noProductionDays[i]) return null;
    var v = (parseFloat(x.data.lcsMorningM2)||0)+(parseFloat(x.data.lcsNightM2)||0);
    return v > 0 ? v : null;
  });
  const lcmBoards = filtered.map(function(x,i) {
    if(noProductionDays[i]) return null;
    var v = (parseFloat(x.data.lcmMorningBoards)||0)+(parseFloat(x.data.lcmNightBoards)||0);
    return v > 0 ? v : null;
  });
  const lcsBoards = filtered.map(function(x,i) {
    if(noProductionDays[i]) return null;
    var v = (parseFloat(x.data.lcsMorningBoards)||0)+(parseFloat(x.data.lcsNightBoards)||0);
    return v > 0 ? v : null;
  });
  const hasProductType = lcmM2.some(function(v){return v!==null&&v>0;}) || lcsM2.some(function(v){return v!==null&&v>0;});


  const totalLcsMornBoards = filtered.reduce(function(s,x){
    return s+Object.values(x.data.stationLcsMorningBoards||{}).reduce(function(a,b){return a+(parseFloat(b)||0);},0);
  },0);
  const totalLcsNightBoards = filtered.reduce(function(s,x){
    return s+Object.values(x.data.stationLcsNightBoards||{}).reduce(function(a,b){return a+(parseFloat(b)||0);},0);
  },0);

  const totalOut = outs.reduce(function(a,b){return a+(b||0);},0);
  const totalTgt = tgts.reduce(function(a,b){return a+b;},0);
  const diff     = totalOut - totalTgt;
  const scrapVals = scraps.filter(function(v){return v!==null&&v>0;});
  const avgScrap = scrapVals.length ? scrapVals.reduce(function(a,b){return a+b;},0)/scrapVals.length : 0;
  const m2hrVals = m2hrs.filter(Boolean);
  const avgM2hr  = m2hrVals.length ? parseFloat((m2hrVals.reduce(function(a,b){return a+b;},0)/m2hrVals.length).toFixed(2)) : 0;
  const lastD    = filtered.length ? filtered[filtered.length-1].data : null;
  const firstPassRate = 100 - avgScrap;
  const scrapAbove    = scraps.filter(function(v){return v!==null&&v>SCRAP_TARGET;}).length;

  const avgDefs = {};
  DEFECTS.forEach(function(n) {
    const vs = filtered.map(function(x){return parseFloat((x.data.defects&&x.data.defects[n])||0)||0;});
    avgDefs[n] = vs.length ? vs.reduce(function(a,b){return a+b;},0)/vs.length : 0;
  });

  const aoiDentAvg    = filtered.length ? filtered.reduce(function(s,x){return s+(parseFloat(x.data.dent)||0);},0)/filtered.length : 0;
  const aoiScratchAvg = filtered.length ? filtered.reduce(function(s,x){return s+(parseFloat(x.data.scratch)||0);},0)/filtered.length : 0;
  const aoiWrinkleAvg = filtered.length ? filtered.reduce(function(s,x){return s+(parseFloat(x.data.wrinkle)||0);},0)/filtered.length : 0;
  const aoiVals = [aoiDentAvg, aoiScratchAvg, aoiWrinkleAvg];

  var STN_NAMES_ORD = ['Oxide','Glicap','Baking','Rivet','Setup','Preparation','Pulse bonding','CCD Welding','Layup 1','Layup 2','Vigor press','Buckle press','Routing 1','Routing 2','Xray 1','Xray 2','TTST'];

  function getStnTotal(stationData, idx) {
    if (!stationData) return 0;
    var name = STN_NAMES_ORD[idx-1];
    var byName = stationData[name];
    if (byName !== undefined && byName !== null) return parseFloat(byName) || 0;
    var byIdx = stationData[String(idx)] !== undefined ? stationData[String(idx)] : stationData[idx];
    return parseFloat(byIdx) || 0;
  }

  const lcmMornTotals  = {};
  const lcmNightTotals = {};
  const lcmMornBTotals = {};
  const lcmNightBTotals= {};
  const lcsMornTotals   = {};
  const lcsNightTotals  = {};
  const lcsM2MornTotals = {};
  const lcsM2NightTotals= {};
  for (var li = 1; li <= N_STN; li++) {
    var sname = STN_NAMES_ORD[li-1];
    lcmMornTotals[sname]   = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcmMorning||{})[sname])||0);},0);
    lcmNightTotals[sname]  = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcmNight||{})[sname])||0);},0);
    lcmMornBTotals[sname]  = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcmMorningBoards||{})[sname])||0);},0);
    lcmNightBTotals[sname] = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcmNightBoards||{})[sname])||0);},0);
    lcsMornTotals[sname]   = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcsMorningBoards||{})[sname])||0);},0);
    lcsNightTotals[sname]  = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcsNightBoards||{})[sname])||0);},0);
    lcsM2MornTotals[sname] = filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcsMorning||{})[sname])||0);},0);
    lcsM2NightTotals[sname]= filtered.reduce(function(s,x){return s+(parseFloat((x.data.stationLcsNight||{})[sname])||0);},0);
  }

  function getStnByName(stationData, name) {
    if (!stationData) return 0;
    return parseFloat(stationData[name]) || 0;
  }

  const stnTotals = {};
  for (var si = 1; si <= N_STN; si++) {
    var sname = STN_NAMES_ORD[si-1];
    stnTotals[si] = filtered.reduce(function(s,x){
      return s
        + getStnByName(x.data.stationLcmMorning, sname)
        + getStnByName(x.data.stationLcmNight, sname)
        + getStnByName(x.data.stationLcsMorning, sname)
        + getStnByName(x.data.stationLcsNight, sname)
        + getStnTotal(x.data.stations, si)
        + getStnTotal(x.data.stations_morning, si)
        + getStnTotal(x.data.stations_night, si);
    },0);
  }

  const morningTotals = {};
  const nightTotals   = {};
  for (var mi = 1; mi <= N_STN; mi++) {
    var mname = STN_NAMES_ORD[mi-1];
    morningTotals[mi] = filtered.reduce(function(s,x){
      return s
        + getStnByName(x.data.stationLcmMorning, mname)
        + getStnTotal(x.data.stations_morning, mi);
    },0);
    nightTotals[mi] = filtered.reduce(function(s,x){
      return s
        + getStnByName(x.data.stationLcmNight, mname)
        + getStnTotal(x.data.stations_night, mi);
    },0);
  }

  const totalMorning = Object.values(morningTotals).reduce(function(a,b){return a+b;},0);
  const totalNight   = Object.values(nightTotals).reduce(function(a,b){return a+b;},0);
  const totalLcmMornDonut  = totalMorning;
  const totalLcmNightDonut = totalNight;

  const opNormal  = filtered.map(function(x){return (x.data.operators||[]).filter(function(o){return o.shift==='day'||o.shift==='night';}).length;});
  const opCutSelf = filtered.map(function(x){return (x.data.operators||[]).filter(function(o){return o.shift==='cut_self';}).length;});
  const opCutMgmt = filtered.map(function(x){return (x.data.operators||[]).filter(function(o){return o.shift==='cut_mgmt';}).length;});
  const opAbsent  = filtered.map(function(x){return (x.data.operators||[]).filter(function(o){return o.shift==='absent';}).length;});

  const totalPossibleMh = filtered.reduce(function(s,x){return s+((x.data.operators||[]).length*12);},0);
  const totalActualMh   = filtered.reduce(function(s,x){return s+(x.data.mh||0);},0);
  const utilizationRate = totalPossibleMh>0?(totalActualMh/totalPossibleMh*100).toFixed(1):0;

  const movingAvg = scraps.map(function(_,i){
    if (scraps[i]===null) return null;
    const start=Math.max(0,i-6);
    const sl=scraps.slice(start,i+1).filter(function(v){return v!==null&&v>0;});
    if (!sl.length) return null;
    return parseFloat((sl.reduce(function(a,b){return a+b;},0)/sl.length).toFixed(3));
  });

  const cumOut = outs.map(function(_,i){return outs.slice(0,i+1).reduce(function(a,b){return a+(b||0);},0);});
  const cumTgt = tgts.map(function(_,i){return tgts.slice(0,i+1).reduce(function(a,b){return a+b;},0);});

  const dowByDay = {};
  DAYS_OF_WEEK.forEach(function(d){dowByDay[d]={scrap:0,count:0};});
  filtered.forEach(function(x,i){
    if (noProductionDays[i]) return;
    const d=new Date(x.date).getDay();
    const name=DAYS_OF_WEEK[d];
    dowByDay[name].scrap+=x.data.scrap||0;
    dowByDay[name].count++;
  });
  const dowLabels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dowScrap=dowLabels.map(function(d){return dowByDay[d]&&dowByDay[d].count>0?(dowByDay[d].scrap/dowByDay[d].count).toFixed(2):0;});

  const calDays=allDays.slice(-90);
  const calMap={};
  calDays.forEach(function(x){calMap[x.date]=x.data.output||0;});
  const calMax=Math.max.apply(null,Object.values(calMap).concat([1]));

  function calColor(v){
    if(!v) return darkMode?'#242736':'#f0f0ee';
    const r=v/calMax;
    if(r<0.25) return '#EAF3DE';
    if(r<0.5)  return '#97C459';
    if(r<0.75) return '#5DCAA5';
    return '#0F6E56';
  }

  const aoiTrendData={labels,datasets:[
    {label:'Dent',   data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.dent)?null:x.data.dent;}),   borderColor:'#378ADD',fill:true,tension:.3,pointRadius:2,spanGaps:true},
    {label:'Scratch',data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.scratch)?null:x.data.scratch;}),borderColor:'#EF9F27',fill:true,tension:.3,pointRadius:2,spanGaps:true},
    {label:'Wrinkle',data:filtered.map(function(x,i){return (noProductionDays[i]||!x.data.wrinkle)?null:x.data.wrinkle;}),borderColor:'#E24B4A',fill:true,tension:.3,pointRadius:2,spanGaps:true},
  ]};

  const scatterData={datasets:[{
    label:'Days',
    data:filtered.filter(function(x,i){return x.data.m2hr>0&&!noProductionDays[i];}).map(function(x){return{x:parseFloat(x.data.m2hr)||0,y:parseFloat(x.data.scrap)||0};}),
    backgroundColor:'rgba(55,138,221,.6)',pointRadius:6,pointHoverRadius:8,
  }]};

  function buildOpStats(){
    const opStats={};
    filtered.forEach(function(x){
      (x.data.operators||[]).forEach(function(op){
        if(!opStats[op.name]) opStats[op.name]={name:op.name,cutSelf:0,absent:0,cutMgmt:0,normal:0,total:0};
        opStats[op.name].total++;
        if(op.shift==='cut_self')  opStats[op.name].cutSelf++;
        if(op.shift==='absent')    opStats[op.name].absent++;
        if(op.shift==='cut_mgmt')  opStats[op.name].cutMgmt++;
        if(op.shift==='day'||op.shift==='night') opStats[op.name].normal++;
      });
    });
    return Object.values(opStats).filter(function(o){return o.total>0;});
  }

  const allOpStats=buildOpStats();
  const bestOps =allOpStats.slice().sort(function(a,b){return(a.cutSelf+a.absent*2)-(b.cutSelf+b.absent*2);}).slice(0,5);
  const worstOps=allOpStats.slice().sort(function(a,b){return(b.cutSelf+b.absent*2)-(a.cutSelf+a.absent*2);}).slice(0,5);

  const absentPerDay=filtered.map(function(x){return(x.data.operators||[]).filter(function(o){return o.shift==='absent';}).length;});
  const absentMovAvg=absentPerDay.map(function(_,i){
    const start=Math.max(0,i-6);
    const sl=absentPerDay.slice(start,i+1);
    return parseFloat((sl.reduce(function(a,b){return a+b;},0)/sl.length).toFixed(2));
  });

  const qualityScore=(function(){
    if(!filtered.length) return 0;
    const scrapScore=Math.max(0,100-(avgScrap/SCRAP_TARGET*50));
    const utilScore=Math.min(100,parseFloat(utilizationRate));
    return Math.round((scrapScore*0.5)+(utilScore*0.5));
  })();

  function qualityColor(s){return s>=80?'#5DCAA5':s>=60?'#EF9F27':'#E24B4A';}

  const stnNames=['Oxide','Glicap','Baking','Rivet','Setup','Preparation','Pulse bonding','CCD Welding','Layup 1','Layup 2','Vigor press','Buckle press','Routing 1','Routing 2','Xray 1','Xray 2','TTST'];
  const stnValues=stnNames.map(function(_,i){return stnTotals[i+1]||0;});
  const stnSorted=stnNames.map(function(n,i){return{name:n,v:stnValues[i]};}).sort(function(a,b){return b.v-a.v;});
  const top5Stns=stnSorted.slice(0,5);
  const bot5Stns=stnSorted.slice(-5).reverse();

  const paretoTotal=Object.values(avgDefs).reduce(function(a,b){return a+b;},0);
  const paretoSorted=DEFECTS.map(function(n,i){return{name:n,val:avgDefs[n]||0,color:DEF_COLORS[i]};}).sort(function(a,b){return b.val-a.val;});
  var paretoRunning=0;
  const paretoCumulative=paretoSorted.map(function(d){
    paretoRunning+=paretoTotal>0?(d.val/paretoTotal*100):0;
    return parseFloat(paretoRunning.toFixed(1));
  });

  const opOTData=allOpStats.slice().sort(function(a,b){return(b.cutSelf+b.absent)-(a.cutSelf+a.absent);}).slice(0,10);

  const scrapsForChart = scraps.map(function(v,i){
    if (noProductionDays[i]) return null;
    return v || null;
  });
  const outsForChart = outs.map(function(v,i){
    if (noProductionDays[i]) return null;
    return v || null;
  });

  return (
    <div>
      <FilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} onUpdate={update}
        rightLabel={filtered.length+' day'+(filtered.length!==1?'s':'')+' of data'} />

      <div className="kpi-grid" style={{marginBottom:12}}>
        <KpiCard icon="📦" label="Total output" value={totalOut.toLocaleString()}
          footer={(diff>=0?'+':'')+diff.toLocaleString()+' vs target'}
          footerClass={diff>=0?'text-up':'text-down'}
          iconBg="#E6F1FB" iconColor="#185FA5" barColor="#378ADD" />
        <KpiCard icon="⚠️" label="Avg scrap rate" value={avgScrap.toFixed(2)+'%'}
          footer={avgScrap>SCRAP_TARGET?'Above '+SCRAP_TARGET+'% target':'Within target'}
          footerClass={avgScrap>SCRAP_TARGET?'text-down':'text-up'}
          iconBg="#FCEBEB" iconColor="#A32D2D" barColor="#E24B4A" />
        <KpiCard icon="✅" label="First pass rate" value={firstPassRate.toFixed(2)+'%'}
          footer={scrapAbove+' days above scrap target'}
          footerClass={scrapAbove>0?'text-down':'text-up'}
          iconBg="#E1F5EE" iconColor="#0F6E56" barColor="#1D9E75" />
        <KpiCard icon="📈" label="Avg m²/hr" value={avgM2hr.toFixed(2)}
          footer={filtered.length+' days tracked'}
          iconBg="#FAEEDA" iconColor="#854F0B" barColor="#EF9F27" />
        <KpiCard icon="🏭" label="Quality score" value={qualityScore+'/100'}
          footer={qualityScore>=80?'Good':qualityScore>=60?'Needs attention':'Critical'}
          footerClass={qualityScore>=80?'text-up':'text-down'}
          iconBg="#EEEDFE" iconColor="#534AB7" barColor={qualityColor(qualityScore)} />
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Output vs target</div>
              <div className="card-sub">
                {outputView==='lcm'
                  ? totalOut.toLocaleString()+' m² · '+(diff>=0?'+':'')+diff.toLocaleString()+' diff'
                  : (lcsOutputArr.reduce(function(s,v){return s+(v||0);},0)).toLocaleString()+' boards'}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={function(){setOutputView('lcm');}}
                style={{padding:'3px 10px',borderRadius:14,border:'1.5px solid #378ADD',fontSize:11,cursor:'pointer',
                  background:outputView==='lcm'?'#378ADD':'transparent',color:outputView==='lcm'?'#fff':'#378ADD',fontWeight:500}}>
                🔵 LCM
              </button>
              <button onClick={function(){setOutputView('lcs');}}
                style={{padding:'3px 10px',borderRadius:14,border:'1.5px solid #E24B4A',fontSize:11,cursor:'pointer',
                  background:outputView==='lcs'?'#E24B4A':'transparent',color:outputView==='lcs'?'#fff':'#E24B4A',fontWeight:500}}>
                🔴 LCS
              </button>
            </div>
          </div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:outputView==='lcm'?'#378ADD':'#E24B4A'}}></span>{outputView==='lcm'?'LCM output (m²)':'LCS output (boards)'}</span>
            <span className="leg"><span className="leg-dot" style={{background:'rgba(226,75,74,0.5)'}}></span>Target</span>
          </div>
          <GradientLine id="ov-output" height={180} data={{labels,datasets:outputView==='lcm'?[
            {label:'LCM Output',data:outsForChart,borderColor:'#378ADD',fill:true,tension:.35,pointRadius:3,spanGaps:true,
              pointStyle:outsForChart.map(function(v,i){return noProductionDays[i]?'rectRot':'circle';}),
              pointBackgroundColor:outsForChart.map(function(v,i){return noProductionDays[i]?'#888780':'#378ADD';})},
            {label:'Target',data:tgts,borderColor:'#E24B4A',borderDash:[5,4],tension:.35,fill:false,pointRadius:0,borderWidth:1.5}
          ]:[
            {label:'LCS Output',data:lcsOutputArr,borderColor:'#E24B4A',fill:true,tension:.35,pointRadius:3,spanGaps:true},
            {label:'LCS Target',data:lcsTargetArr,borderColor:'#EF9F27',borderDash:[5,4],tension:.35,fill:false,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts()} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap rate + 7-day moving average</div><div className="card-sub">Target: {SCRAP_TARGET}% · Avg: {avgScrap.toFixed(2)}%</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Daily scrap</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>7-day avg</span>
            <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Target</span>
          </div>
          <GradientLine id="ov-scrap" height={180} data={{labels,datasets:[
            {label:'Scrap',data:scrapsForChart,borderColor:'#E24B4A',fill:true,tension:.2,spanGaps:true,
              pointRadius:scrapsForChart.map(function(v,i){return noProductionDays[i]?6:3;}),
              pointStyle:scrapsForChart.map(function(v,i){return noProductionDays[i]?'rectRot':'circle';}),
              pointBackgroundColor:scrapsForChart.map(function(v,i){return noProductionDays[i]?'#888780':v&&v>SCRAP_TARGET?'#E24B4A':'#5DCAA5';})},
            {label:'7d avg',data:movingAvg,borderColor:'#EF9F27',fill:false,tension:.4,pointRadius:0,borderWidth:2,spanGaps:true},
            {label:'Target',data:labels.map(function(){return SCRAP_TARGET;}),borderColor:'#5DCAA5',borderDash:[5,4],fill:false,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts('%')} />
        </div>
      </div>

      {hasProductType && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">LCM vs LCS — output m²</div><div className="card-sub">Stacked daily output by product type</div></div></div>
            <div className="legend-row">
              <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>LCM</span>
              <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>LCS</span>
            </div>
            <div style={{height:180}}>
              <Bar data={{labels,datasets:[
                {label:'LCM',data:lcmM2, backgroundColor:'#378ADD',borderRadius:3,stack:'s'},
                {label:'LCS',data:lcsM2, backgroundColor:'#E24B4A',borderRadius:3,stack:'s'},
              ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
              }}} />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div><div className="card-title">LCM vs LCS — boards</div><div className="card-sub">Grouped daily boards by product type</div></div></div>
            <div className="legend-row">
              <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>LCM</span>
              <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>LCS</span>
            </div>
            <div style={{height:180}}>
              <Bar data={{labels,datasets:[
                {label:'LCM boards',data:lcmBoards,backgroundColor:'#378ADD',borderRadius:3},
                {label:'LCS boards',data:lcsBoards,backgroundColor:'#E24B4A',borderRadius:3},
              ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
              }}} />
            </div>
          </div>
        </div>
      )}

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Cumulative output vs target</div><div className="card-sub">Running total over period</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Cumulative output</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A',opacity:.6}}></span>Cumulative target</span>
          </div>
          <GradientLine id="ov-cumout" height={170} data={{labels,datasets:[
            {label:'Cum output',data:cumOut,borderColor:'#378ADD',fill:true,tension:.3,pointRadius:2},
            {label:'Cum target',data:cumTgt,borderColor:'#E24B4A',borderDash:[5,4],fill:false,tension:.3,pointRadius:0,borderWidth:1.5}
          ]}} options={lineOpts()} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">AOI defect trend</div><div className="card-sub">Dent / Scratch / Wrinkle</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Dent</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Scratch</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Wrinkle</span>
          </div>
          <GradientLine id="ov-aoi-trend" height={170} data={aoiTrendData} options={lineOpts('%')} />
        </div>
      </div>

      <div className="chart-row-3" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">m²/hr efficiency</div><div className="card-sub">Avg: {avgM2hr.toFixed(2)}</div></div></div>
          <GradientLine id="ov-m2hr" height={130} data={{labels,datasets:[
            {label:'m²/hr',data:m2hrs,borderColor:'#EF9F27',fill:true,tension:.35,pointRadius:2}
          ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
            x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
            y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return parseFloat(v.toFixed(2));}},grid:{color:gridColor}}
          }}} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap by day of week</div><div className="card-sub">Average % per weekday</div></div></div>
          <div style={{height:130}}>
            <Bar data={{labels:dowLabels,datasets:[{data:dowScrap,backgroundColor:dowScrap.map(function(v){return parseFloat(v)>SCRAP_TARGET?'#E24B4A':'#5DCAA5';}),borderRadius:4}]}}
              options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{ticks:{font:{size:9},color:tickColor},grid:{display:false}},
                y:{ticks:{font:{size:9},callback:function(v){return v+'%'},color:tickColor},grid:{color:gridColor}}
              }}} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Morning vs night</div><div className="card-sub">{donutView==='lcm'?'LCM m²':'LCS boards'} split</div></div>
            <div style={{display:'flex',gap:4}}>
              <button onClick={function(){setDonutView('lcm');}}
                style={{padding:'2px 8px',borderRadius:12,border:'1.5px solid #378ADD',fontSize:10,cursor:'pointer',
                  background:donutView==='lcm'?'#378ADD':'transparent',color:donutView==='lcm'?'#fff':'#378ADD',fontWeight:500}}>
                🔵 LCM
              </button>
              <button onClick={function(){setDonutView('lcs');}}
                style={{padding:'2px 8px',borderRadius:12,border:'1.5px solid #E24B4A',fontSize:10,cursor:'pointer',
                  background:donutView==='lcs'?'#E24B4A':'transparent',color:donutView==='lcs'?'#fff':'#E24B4A',fontWeight:500}}>
                🔴 LCS
              </button>
            </div>
          </div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>
              Morning {donutView==='lcm'
                ? (totalLcmMornDonut>0?(totalLcmMornDonut/(totalLcmMornDonut+totalLcmNightDonut)*100).toFixed(0):0)+'%'
                : (totalLcsMornBoards>0?(totalLcsMornBoards/(totalLcsMornBoards+totalLcsNightBoards)*100).toFixed(0):0)+'%'}
            </span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>
              Night {donutView==='lcm'
                ? (totalLcmNightDonut>0?(totalLcmNightDonut/(totalLcmMornDonut+totalLcmNightDonut)*100).toFixed(0):0)+'%'
                : (totalLcsNightBoards>0?(totalLcsNightBoards/(totalLcsMornBoards+totalLcsNightBoards)*100).toFixed(0):0)+'%'}
            </span>
          </div>
          <div style={{height:100}}>
            <Doughnut
              key={'donut-mn-'+donutView}
              data={{labels:['Morning','Night'],datasets:[{
                data: donutView==='lcm'
                  ? [totalLcmMornDonut, totalLcmNightDonut]
                  : [totalLcsMornBoards, totalLcsNightBoards],
                backgroundColor:['#378ADD','#EF9F27'],borderWidth:0,hoverOffset:4
              }]}}
              options={{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}}
            />
          </div>
        </div>
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Defect pareto chart</div><div className="card-sub">Focus on top defects (80/20 rule)</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Defect avg %</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Cumulative %</span>
          </div>
          <div style={{height:180}}>
            <Bar data={{labels:paretoSorted.map(function(d){return d.name;}),datasets:[
              {type:'bar',label:'Avg %',data:paretoSorted.map(function(d){return d.val.toFixed(2);}),backgroundColor:paretoSorted.map(function(d){return d.color;}),borderRadius:4,yAxisID:'y'},
              {type:'line',label:'Cumulative %',data:paretoCumulative,borderColor:'#EF9F27',pointRadius:4,pointBackgroundColor:'#EF9F27',tension:.2,fill:false,yAxisID:'y2'}
            ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
              x:{ticks:{font:{size:10},color:tickColor},grid:{display:false}},
              y:{position:'left',ticks:{font:{size:9},callback:function(v){return v+'%'},color:tickColor},grid:{color:gridColor}},
              y2:{position:'right',min:0,max:100,ticks:{font:{size:9},callback:function(v){return v+'%'},color:tickColor},grid:{display:false}}
            }}} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Efficiency vs scrap scatter</div><div className="card-sub">Each dot = one day</div></div></div>
          <div style={{height:180}}>
            <Scatter data={scatterData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'm²/hr: '+ctx.parsed.x+' · Scrap: '+ctx.parsed.y+'%';}}}},scales:{
              x:{title:{display:true,text:'m²/hr',color:tickColor,font:{size:10}},ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}},
              y:{title:{display:true,text:'Scrap %',color:tickColor,font:{size:10}},ticks:{font:{size:9},callback:function(v){return v+'%'},color:tickColor},grid:{color:gridColor}}
            }}} />
          </div>
        </div>
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 stations</div><div className="card-sub">Highest output in period</div></div></div>
          <div className="defect-list">
            {top5Stns.map(function(s,i){
              const maxV=top5Stns[0].v||1;
              return (
                <div key={s.name} className="defect-item">
                  <div className="d-top">
                    <span className="d-name" style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{width:20,height:20,borderRadius:'50%',background:'#EAF3DE',color:'#27500A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,flexShrink:0}}>{i+1}</span>
                      {s.name}
                    </span>
                    <span className="d-pct" style={{color:'#5DCAA5'}}>{s.v.toFixed(0)}</span>
                  </div>
                  <div className="d-bar-bg"><div className="d-bar-fill" style={{width:(s.v/maxV*100).toFixed(1)+'%',background:'#5DCAA5'}} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Bottom 5 stations</div><div className="card-sub">Lowest output — possible bottlenecks</div></div></div>
          <div className="defect-list">
            {bot5Stns.map(function(s,i){
              const maxV=top5Stns[0].v||1;
              return (
                <div key={s.name} className="defect-item">
                  <div className="d-top">
                    <span className="d-name" style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{width:20,height:20,borderRadius:'50%',background:'#FCEBEB',color:'#791F1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,flexShrink:0}}>{i+1}</span>
                      {s.name}
                    </span>
                    <span className="d-pct" style={{color:'#E24B4A'}}>{s.v.toFixed(0)}</span>
                  </div>
                  <div className="d-bar-bg"><div className="d-bar-fill" style={{width:(s.v/maxV*100).toFixed(1)+'%',background:'#E24B4A'}} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Station heatmap</div><div className="card-sub">Period total per station</div></div></div>
          <Heatmap stationTotals={stnTotals} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Defect trend stacked</div><div className="card-sub">All 6 defects over period</div></div></div>
          <div className="legend-row">
            {DEFECTS.map(function(n,i){return <span key={n} className="leg"><span className="leg-dot" style={{background:DEF_COLORS[i]}}></span>{n}</span>;})}
          </div>
          <div style={{height:150}}>
            <Bar data={{labels,datasets:DEFECTS.map(function(n,i){return{label:n,data:filtered.map(function(x){return parseFloat((x.data.defects&&x.data.defects[n])||0)||0;}),backgroundColor:DEF_COLORS[i],stack:'s',borderRadius:2};})}}
              options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
                y:{stacked:true,ticks:{font:{size:9},callback:function(v){return v+'%';},color:tickColor},grid:{color:gridColor}}
              }}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-head">
          <div><div className="card-title">Morning vs night shift per station</div><div className="card-sub">
            {stationView==='lcmm2'?'LCM m²':stationView==='lcmb'?'LCM boards':stationView==='lcsm2'?'LCS m²':stationView==='lcsb'?'LCS boards':stationView==='totalm2'?'Total m² (LCM+LCS)':'Total boards (LCM+LCS)'}
          </div></div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {[
              {key:'lcmm2',   label:'🔵 LCM m²',         color:'#378ADD'},
              {key:'lcmb',    label:'🔵 LCM boards',      color:'#185FA5'},
              {key:'lcsm2',   label:'🔴 LCS m²',          color:'#E24B4A'},
              {key:'lcsb',    label:'🔴 LCS boards',      color:'#A32D2D'},
              {key:'totalm2', label:'📊 Total m²',        color:'#1D9E75'},
              {key:'totalb',  label:'📊 Total boards',    color:'#7F77DD'},
            ].map(function(item){return(
              <button key={item.key} onClick={function(){setStationView(item.key);}}
                style={{padding:'3px 8px',borderRadius:14,border:'1.5px solid '+item.color,fontSize:10,cursor:'pointer',
                  background:stationView===item.key?item.color:'transparent',
                  color:stationView===item.key?'#fff':item.color,fontWeight:500}}>
                {item.label}
              </button>
            );})}
          </div>
        </div>
        <div className="legend-row">
          <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Morning</span>
          <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Night</span>
        </div>
        <div style={{height:220}}>
          <Bar data={{labels:stnNames,datasets:(function(){
            if (stationView==='lcmm2')  return [
              {label:'LCM Morning m²',   data:stnNames.map(function(n,i){return lcmMornTotals[n]||morningTotals[i+1]||0;}),  backgroundColor:'#378ADD',borderRadius:3,stack:'s'},
              {label:'LCM Night m²',     data:stnNames.map(function(n,i){return lcmNightTotals[n]||nightTotals[i+1]||0;}),   backgroundColor:'#EF9F27',borderRadius:3,stack:'s'},
            ];
            if (stationView==='lcmb')   return [
              {label:'LCM Morning boards',data:stnNames.map(function(n){return lcmMornBTotals[n]||0;}),  backgroundColor:'#378ADD',borderRadius:3,stack:'s'},
              {label:'LCM Night boards',  data:stnNames.map(function(n){return lcmNightBTotals[n]||0;}), backgroundColor:'#185FA5',borderRadius:3,stack:'s'},
            ];
            if (stationView==='lcsm2')  return [
              {label:'LCS Morning m²',   data:stnNames.map(function(n){return lcsM2MornTotals[n]||0;}),  backgroundColor:'#E24B4A',borderRadius:3,stack:'s'},
              {label:'LCS Night m²',     data:stnNames.map(function(n){return lcsM2NightTotals[n]||0;}), backgroundColor:'#EF9F27',borderRadius:3,stack:'s'},
            ];
            if (stationView==='lcsb')   return [
              {label:'LCS Morning boards',data:stnNames.map(function(n){return lcsMornTotals[n]||0;}),  backgroundColor:'#E24B4A',borderRadius:3,stack:'s'},
              {label:'LCS Night boards',  data:stnNames.map(function(n){return lcsNightTotals[n]||0;}), backgroundColor:'#A32D2D',borderRadius:3,stack:'s'},
            ];

            if (stationView==='totalm2') return [
              {label:'Morning m²',data:stnNames.map(function(n,i){return (lcmMornTotals[n]||morningTotals[i+1]||0)+(lcsMornTotals[n]||0);}),  backgroundColor:'#378ADD',borderRadius:3,stack:'s'},
              {label:'Night m²',  data:stnNames.map(function(n,i){return (lcmNightTotals[n]||nightTotals[i+1]||0)+(lcsNightTotals[n]||0);}),   backgroundColor:'#EF9F27',borderRadius:3,stack:'s'},
            ];
            return [
              {label:'Morning boards',data:stnNames.map(function(n){return (lcmMornBTotals[n]||0)+(lcsMornTotals[n]||0);}),  backgroundColor:'#7F77DD',borderRadius:3,stack:'s'},
              {label:'Night boards',  data:stnNames.map(function(n){return (lcmNightBTotals[n]||0)+(lcsNightTotals[n]||0);}), backgroundColor:'#EF9F27',borderRadius:3,stack:'s'},
            ];
          })()}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){
            var unit = ['lcmm2','lcsm2','totalm2'].indexOf(stationView)>=0?' m²':' boards';
            return ctx.dataset.label+': '+ctx.parsed.y+unit;
          }}}},scales:{
            x:{stacked:true,ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
            y:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
          }}} />
        </div>
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Operator attendance</div><div className="card-sub">Daily shift breakdown</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#5DCAA5'}}></span>Normal</span>
            <span className="leg"><span className="leg-dot" style={{background:'#E24B4A'}}></span>Self cut</span>
            <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>Mgmt cut</span>
            <span className="leg"><span className="leg-dot" style={{background:'#888780'}}></span>Absent</span>
          </div>
          <div style={{height:180}}>
            <Bar data={{labels,datasets:[
              {label:'Normal',  data:opNormal,  backgroundColor:'#5DCAA5',stack:'s',borderRadius:2},
              {label:'Self cut',data:opCutSelf, backgroundColor:'#E24B4A',stack:'s',borderRadius:2},
              {label:'Mgmt cut',data:opCutMgmt, backgroundColor:'#378ADD',stack:'s',borderRadius:2},
              {label:'Absent',  data:opAbsent,  backgroundColor:'#888780',stack:'s',borderRadius:2}
            ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
              x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
              y:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
            }}} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Absent trend</div><div className="card-sub">Daily count + 7-day average</div></div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{background:'#888780'}}></span>Absent</span>
            <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>7-day avg</span>
          </div>
          <GradientLine id="ov-absent" height={180} data={{labels,datasets:[
            {label:'Absent',data:absentPerDay,borderColor:'#888780',fill:true,tension:.2,pointRadius:3},
            {label:'7d avg',data:absentMovAvg,borderColor:'#EF9F27',fill:false,tension:.4,pointRadius:0,borderWidth:2}
          ]}} options={lineOpts()} />
        </div>
      </div>

      <div className="chart-row-2" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Manpower utilization</div><div className="card-sub">Actual vs possible · {utilizationRate}% utilized</div></div></div>
          <div style={{height:180}}>
            <Bar data={{labels,datasets:[
              {label:'Actual MH',  data:filtered.map(function(x){return x.data.mh||0;}),backgroundColor:'#378ADD',borderRadius:3},
              {label:'Possible MH',data:filtered.map(function(x){return(x.data.operators||[]).length*12;}),backgroundColor:'rgba(55,138,221,.2)',borderRadius:3}
            ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:8,usePointStyle:true,color:tickColor}}},scales:{
              x:{ticks:{font:{size:9},autoSkip:true,maxRotation:0,color:tickColor},grid:{display:false}},
              y:{ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
            }}} />
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">OT pattern by operator</div><div className="card-sub">Top 10 — self cut + absent</div></div></div>
          <div style={{height:180}}>
            <Bar data={{labels:opOTData.map(function(o){return o.name.split(' ')[0];}),datasets:[
              {label:'Self cut',data:opOTData.map(function(o){return o.cutSelf;}),backgroundColor:'#E24B4A',borderRadius:3,stack:'s'},
              {label:'Absent',  data:opOTData.map(function(o){return o.absent;}), backgroundColor:'#888780',borderRadius:3,stack:'s'}
            ]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:8,usePointStyle:true,color:tickColor}}},scales:{
              x:{stacked:true,ticks:{font:{size:9},autoSkip:false,maxRotation:45,color:tickColor},grid:{display:false}},
              y:{stacked:true,ticks:{font:{size:9},color:tickColor},grid:{color:gridColor}}
            }}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-head"><div><div className="card-title">Output calendar heatmap</div><div className="card-sub">Last 90 days — darker = higher output</div></div></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:8}}>
          {calDays.map(function(x){
            return (
              <div key={x.date} title={x.date+': '+(x.data.output||0).toLocaleString()+' m²'}
                style={{width:16,height:16,borderRadius:3,background:calColor(x.data.output||0),cursor:'default',flexShrink:0}} />
            );
          })}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:10,color:'var(--text2)'}}>
          <span>Less</span>
          {[0,0.25,0.5,0.75,1].map(function(r,i){return <span key={i} style={{width:12,height:12,borderRadius:2,background:calColor(r*calMax),display:'inline-block'}}></span>;})}
          <span>More</span>
        </div>
      </div>

      <div className="chart-row-3" style={{marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Scrap by defect</div><div className="card-sub">Period average</div></div></div>
          <DefectBars data={avgDefs} />
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">AOI breakdown</div><div className="card-sub">Period average</div></div></div>
          <div style={{position:'relative',height:160,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Doughnut key={'aoi-donut-'+filtered.length}
              data={{labels:['Dent','Scratches','Wrinkle'],datasets:[{data:aoiVals,backgroundColor:['#378ADD','#EF9F27','#E24B4A'],borderWidth:3,borderColor:darkMode?'#1a1a1a':'#ffffff',hoverOffset:6}]}}
              options={{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': '+ctx.parsed.toFixed(2)+'%';}}}}}}
            />
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
              <div style={{fontSize:16,fontWeight:600,color:'var(--text)',lineHeight:1}}>{(aoiDentAvg+aoiScratchAvg+aoiWrinkleAvg).toFixed(2)}%</div>
              <div style={{fontSize:9,color:'var(--text2)',marginTop:2}}>Total AOI</div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-around',marginTop:6}}>
            {[['Dent',aoiDentAvg,'#378ADD'],['Scratch',aoiScratchAvg,'#EF9F27'],['Wrinkle',aoiWrinkleAvg,'#E24B4A']].map(function(item){
              return (
                <div key={item[0]} style={{textAlign:'center'}}>
                  <div style={{fontSize:11,fontWeight:600,color:item[2]}}>{item[1].toFixed(2)}%</div>
                  <div style={{fontSize:9,color:'var(--text2)',marginTop:1}}>{item[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Quality scorecard</div><div className="card-sub">Combined score this period</div></div></div>
          <div style={{textAlign:'center',padding:'12px 0'}}>
            <div style={{fontSize:52,fontWeight:500,color:qualityColor(qualityScore),lineHeight:1}}>{qualityScore}</div>
            <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>out of 100</div>
            <div style={{marginTop:10,padding:'5px 14px',borderRadius:20,display:'inline-block',background:qualityScore>=80?'#EAF3DE':qualityScore>=60?'#FAEEDA':'#FCEBEB',color:qualityColor(qualityScore),fontSize:11,fontWeight:500}}>
              {qualityScore>=80?'Good performance':qualityScore>=60?'Needs attention':'Critical'}
            </div>
            <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:5,textAlign:'left'}}>
              {[
                {label:'Scrap rate',value:avgScrap.toFixed(2)+'%',ok:avgScrap<=SCRAP_TARGET},
                {label:'First pass',value:firstPassRate.toFixed(2)+'%',ok:firstPassRate>=98},
                {label:'Utilization',value:utilizationRate+'%',ok:parseFloat(utilizationRate)>=85},
              ].map(function(item){
                return (
                  <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11}}>
                    <span style={{color:'var(--text2)'}}>{item.label}</span>
                    <span style={{fontWeight:500,color:item.ok?'#3B6D11':'#A32D2D'}}>{item.value} {item.ok?'✓':'✗'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 — Best attendance</div><div className="card-sub">Least self cut OT and absent</div></div></div>
          {bestOps.length ? bestOps.map(function(op,i){
            var bad=op.cutSelf+op.absent;
            var pct=op.total>0?((op.total-bad)/op.total*100).toFixed(0):0;
            return (
              <div key={op.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#EAF3DE',color:'#27500A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{op.name}</div>
                  <div style={{fontSize:10,color:'var(--text2)'}}>Self cut: {op.cutSelf} · Absent: {op.absent} · {op.total} days</div>
                </div>
                <span className="pill pill-green">{pct}% good</span>
              </div>
            );
          }) : <div className="empty">No data in range</div>}
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Top 5 — Needs attention</div><div className="card-sub">Most self cut OT and absent</div></div></div>
          {worstOps.length ? worstOps.map(function(op,i){
            var bad=op.cutSelf+op.absent;
            var pct=op.total>0?(bad/op.total*100).toFixed(0):0;
            return (
              <div key={op.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'#FCEBEB',color:'#791F1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{op.name}</div>
                  <div style={{fontSize:10,color:'var(--text2)'}}>Self cut: {op.cutSelf} · Absent: {op.absent} · {op.total} days</div>
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
