import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PLATEN_NAMES = ['Platen 01','Platen 02','Platen 03','Platen 04','Platen 05','Platen 06','Platen 07','Platen 08','Platen 09','Platen 10','Platen 11'];
const SENSOR_NAMES = ['PrdSensor 01','PrdSensor 02','PrdSensor 03'];

const PLATEN_COLORS = [
  '#378ADD','#E24B4A','#5DCAA5','#EF9F27','#7F77DD',
  '#FF6B9D','#97C459','#FF9F43','#54A0FF','#FD79A8','#00B894'
];
const SENSOR_COLORS = ['#00CEC9','#A29BFE','#FDCB6E'];
const TEMP_SET_COLOR = '#636E72';
const PRESSURE_COLOR = '#2D3436';
const VACUUM_COLOR   = '#B2BEC3';

export default function PressProfilePage({ darkMode }) {
  const [rawData, setRawData]       = useState(null);
  const [fileName, setFileName]     = useState('');
  const [dragging, setDragging]     = useState(false);
  const [pressName, setPressName]   = useState('');
  const [visible, setVisible]       = useState({});
  const [durationTemp, setDurationTemp] = useState('');
  const [heatT1, setHeatT1]         = useState('');
  const [heatT2, setHeatT2]         = useState('');
  const chartRef = useRef(null);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const tickColor = darkMode ? '#9499b0' : '#555';

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const wb   = XLSX.read(e.target.result, { type:'binary', cellDates:true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const allRows = [];
      for (var R = range.s.r; R <= range.e.r; R++) {
        var row = [];
        for (var C = range.s.c; C <= range.e.c; C++) {
          var addr = XLSX.utils.encode_cell({r:R, c:C});
          var cell = sheet[addr];
          row.push(cell ? cell.v : null);
        }
        allRows.push(row);
      }
      var dataRows = allRows.slice(2).filter(function(r){
        return r[0] && r[1] !== null && !isNaN(r[1]);
      });

      var parsed = dataRows.map(function(r) {
        return {
          sec:      parseFloat(r[1]) || 0,
          min:      parseFloat(r[1]) / 60,
          pressurePsi: parseFloat(r[3]) || 0,
          pressure: parseFloat(r[3]) ? parseFloat((parseFloat(r[3]) * 0.07031).toFixed(3)) : 0,
          vacuum:   parseFloat(r[6]) || 0,
          tempSet:  parseFloat(r[7]) || 0,
          p01: parseFloat(r[8])  || 0,
          p02: parseFloat(r[9])  || 0,
          p03: parseFloat(r[10]) || 0,
          p04: parseFloat(r[11]) || 0,
          p05: parseFloat(r[12]) || 0,
          p06: parseFloat(r[13]) || 0,
          p07: parseFloat(r[14]) || 0,
          p08: parseFloat(r[15]) || 0,
          p09: parseFloat(r[16]) || 0,
          p10: parseFloat(r[17]) || 0,
          p11: parseFloat(r[18]) || 0,
          s01: parseFloat(r[19]) || 0,
          s02: parseFloat(r[20]) || 0,
          s03: parseFloat(r[21]) || 0,
        };
      });

      setRawData(parsed);
      setPressName(wb.SheetNames[0]);
      setFileName(file.name);

      var initVisible = { tempSet:true, pressure:true, vacuum:true };
      PLATEN_NAMES.forEach(function(_,i){ initVisible['p'+(i+1).toString().padStart(2,'0')] = true; });
      SENSOR_NAMES.forEach(function(_,i){ initVisible['s'+(i+1).toString().padStart(2,'0')] = true; });
      setVisible(initVisible);
    };
    reader.readAsBinaryString(file);
  }

  function onDrop(e) { e.preventDefault(); setDragging(false); var f=e.dataTransfer.files[0]; if(f) parseExcel(f); }
  function onFileChange(e) { var f=e.target.files[0]; if(f) parseExcel(f); }

  const chartData = useMemo(function() {
    if (!rawData) return null;
    var sampled = rawData.filter(function(_,i){ return i % 5 === 0; });
    var labels   = sampled.map(function(r){ return r.min.toFixed(1); });

    var datasets = [];

    if (visible.tempSet) datasets.push({
      label:'Temp Set', data:sampled.map(function(r){return r.tempSet;}),
      borderColor:TEMP_SET_COLOR, borderWidth:2, borderDash:[8,4],
      pointRadius:0, fill:false, tension:0, yAxisID:'yTemp',
    });

    PLATEN_NAMES.forEach(function(name, i) {
      var key = 'p'+(i+1).toString().padStart(2,'0');
      if (!visible[key]) return;
      datasets.push({
        label: name,
        data: sampled.map(function(r){ return r[key]; }),
        borderColor: PLATEN_COLORS[i],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
        yAxisID: 'yTemp',
      });
    });

    SENSOR_NAMES.forEach(function(name, i) {
      var key = 's'+(i+1).toString().padStart(2,'0');
      if (!visible[key]) return;
      datasets.push({
        label: name,
        data: sampled.map(function(r){ return r[key] > 0 ? r[key] : null; }),
        borderColor: SENSOR_COLORS[i],
        borderWidth: 2.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2,
        yAxisID: 'yTemp',
        spanGaps: true,
      });
    });

    if (visible.pressure) datasets.push({
      label:'Pressure (kgf/cm²)',
      data: sampled.map(function(r){ return r.pressure; }),
      borderColor: PRESSURE_COLOR,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0,
      yAxisID: 'yRight',
      borderDash: [4,2],
    });

    if (visible.vacuum) datasets.push({
      label:'Vacuum (mbar)',
      data: sampled.map(function(r){ return (r.vacuum > 0 && r.vacuum < 500) ? r.vacuum : null; }),
      borderColor: VACUUM_COLOR,
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
      yAxisID: 'yRight',
      spanGaps: true,
    });

    return { labels, datasets };
  }, [rawData, visible]);

  const chartOptions = useMemo(function() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display:false },
        tooltip: {
          backgroundColor: darkMode?'rgba(20,20,30,0.95)':'rgba(255,255,255,0.97)',
          titleColor: darkMode?'#e0e0e0':'#1a1a1a',
          bodyColor:  darkMode?'#b0b0b0':'#444',
          borderColor: darkMode?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 10,
          titleFont: { size:11, weight:'bold' },
          bodyFont:  { size:10 },
          callbacks: {
            title: function(items) { return 'Time: ' + parseFloat(items[0].label).toFixed(2) + ' min'; },
            label: function(ctx) {
              var v = ctx.parsed.y;
              if (v === null || v === undefined) return null;
              return ctx.dataset.label + ': ' + v.toFixed(2) + (ctx.dataset.yAxisID==='yRight'?' ':' °C');
            }
          }
        }
      },
      scales: {
        x: {
          title: { display:true, text:'Time (min)', color:tickColor, font:{size:11} },
          ticks: { font:{size:9}, color:tickColor, maxTicksLimit:20, callback:function(v,i,a){ return parseFloat(this.getLabelForValue(v)).toFixed(0); } },
          grid: { color:gridColor }
        },
        yTemp: {
          position:'left',
          title: { display:true, text:'Temperature (°C)', color:tickColor, font:{size:11} },
          ticks: { font:{size:9}, color:tickColor },
          grid:  { color:gridColor }
        },
        yRight: {
          position:'right',
          title: { display:true, text:'Pressure (kgf/cm²) / Vacuum (mbar)', color:tickColor, font:{size:10} },
          ticks: { font:{size:9}, color:tickColor },
          grid:  { display:false }
        }
      }
    };
  }, [darkMode, gridColor, tickColor]);

  const durationResults = useMemo(function() {
    if (!rawData || !durationTemp) return null;
    var t = parseFloat(durationTemp);
    if (isNaN(t)) return null;
    var sensors = [
      {key:'s01', name:'PrdSensor 01', color:SENSOR_COLORS[0]},
      {key:'s02', name:'PrdSensor 02', color:SENSOR_COLORS[1]},
      {key:'s03', name:'PrdSensor 03', color:SENSOR_COLORS[2]},
      {key:'p01', name:'Platen 01',    color:PLATEN_COLORS[0]},
      {key:'p02', name:'Platen 02',    color:PLATEN_COLORS[1]},
      {key:'p03', name:'Platen 03',    color:PLATEN_COLORS[2]},
      {key:'p04', name:'Platen 04',    color:PLATEN_COLORS[3]},
      {key:'p05', name:'Platen 05',    color:PLATEN_COLORS[4]},
      {key:'p06', name:'Platen 06',    color:PLATEN_COLORS[5]},
      {key:'p07', name:'Platen 07',    color:PLATEN_COLORS[6]},
      {key:'p08', name:'Platen 08',    color:PLATEN_COLORS[7]},
      {key:'p09', name:'Platen 09',    color:PLATEN_COLORS[8]},
      {key:'p10', name:'Platen 10',    color:PLATEN_COLORS[9]},
      {key:'p11', name:'Platen 11',    color:PLATEN_COLORS[10]},
    ];
    return sensors.map(function(s) {
      var count = rawData.filter(function(r){ return r[s.key] > t; }).length;
      var secs  = count;
      var mins  = Math.floor(secs/60);
      var remSecs = secs % 60;
      var firstIdx = rawData.findIndex(function(r){ return r[s.key] > t; });
      var firstMin = firstIdx >= 0 ? (firstIdx/60).toFixed(1) : '—';
      return { name:s.name, color:s.color, secs:secs, mins:mins, remSecs:remSecs, firstMin:firstMin, hasData: count > 0 };
    });
  }, [rawData, durationTemp]);

  const heatRateResults = useMemo(function() {
    if (!rawData || !heatT1 || !heatT2) return null;
    var t1 = parseFloat(heatT1);
    var t2 = parseFloat(heatT2);
    if (isNaN(t1) || isNaN(t2) || t2 <= t1) return null;
    var sensors = [
      {key:'s01', name:'PrdSensor 01', color:SENSOR_COLORS[0]},
      {key:'s02', name:'PrdSensor 02', color:SENSOR_COLORS[1]},
      {key:'s03', name:'PrdSensor 03', color:SENSOR_COLORS[2]},
      {key:'p01', name:'Platen 01',    color:PLATEN_COLORS[0]},
      {key:'p02', name:'Platen 02',    color:PLATEN_COLORS[1]},
      {key:'p03', name:'Platen 03',    color:PLATEN_COLORS[2]},
      {key:'p04', name:'Platen 04',    color:PLATEN_COLORS[3]},
      {key:'p05', name:'Platen 05',    color:PLATEN_COLORS[4]},
      {key:'p06', name:'Platen 06',    color:PLATEN_COLORS[5]},
      {key:'p07', name:'Platen 07',    color:PLATEN_COLORS[6]},
      {key:'p08', name:'Platen 08',    color:PLATEN_COLORS[7]},
      {key:'p09', name:'Platen 09',    color:PLATEN_COLORS[8]},
      {key:'p10', name:'Platen 10',    color:PLATEN_COLORS[9]},
      {key:'p11', name:'Platen 11',    color:PLATEN_COLORS[10]},
    ];
    return sensors.map(function(s) {
      var idx1 = rawData.findIndex(function(r){ return r[s.key] >= t1; });
      var idx2 = rawData.findIndex(function(r){ return r[s.key] >= t2; });
      if (idx1 < 0 || idx2 < 0 || idx2 <= idx1) return { name:s.name, color:s.color, rate:null, timeSecs:null };
      var timeSecs = (idx2 - idx1);
      var timeMins = timeSecs / 60;
      var rate = (t2 - t1) / timeMins;
      return { name:s.name, color:s.color, rate:parseFloat(rate.toFixed(3)), timeSecs:timeSecs, timeMins:parseFloat(timeMins.toFixed(2)) };
    });
  }, [rawData, heatT1, heatT2]);

  function toggleAll(val) {
    var next = Object.assign({}, visible);
    Object.keys(next).forEach(function(k){ next[k] = val; });
    setVisible(next);
  }

  function LegendBtn(props) {
    return (
      <button onClick={function(){ setVisible(function(v){ return Object.assign({},v,{[props.id]:!v[props.id]}); }); }}
        style={{display:'flex',alignItems:'center',gap:5,padding:'3px 8px',borderRadius:14,border:'1.5px solid '+props.color,
          background:visible[props.id]?props.color+'28':'transparent',cursor:'pointer',fontSize:10,
          color:visible[props.id]?props.color:'var(--text3)',fontWeight:visible[props.id]?500:400,whiteSpace:'nowrap'}}>
        <span style={{width:14,height:3,background:visible[props.id]?props.color:'var(--border2)',borderRadius:2,flexShrink:0,display:'inline-block'}}></span>
        {props.label}
      </button>
    );
  }

  if (!rawData) return (
    <div>
      <div style={{background:'linear-gradient(135deg,#185FA5,#0F6E56)',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Press profile viewer</div>
        <div style={{fontSize:20,fontWeight:500}}>Hot press profile analysis</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Upload profile Excel · Interactive chart · Duration & heat rate calculators</div>
      </div>
      <div onDragOver={function(e){e.preventDefault();setDragging(true);}} onDragLeave={function(){setDragging(false);}} onDrop={onDrop}
        onClick={function(){document.getElementById('press-file-input').click();}}
        style={{border:'2px dashed '+(dragging?'#378ADD':'var(--border2)'),borderRadius:12,padding:'60px 20px',textAlign:'center',
          background:dragging?'rgba(55,138,221,0.05)':'var(--bg3)',transition:'all .2s',cursor:'pointer'}}>
        <div style={{fontSize:40,marginBottom:12}}>🏭</div>
        <div style={{fontSize:15,fontWeight:500,color:'var(--text)',marginBottom:8}}>Drop your press profile Excel here</div>
        <div style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>Supports .xlsx · Processed locally · Interactive chart with hover details</div>
        <button className="btn-primary" style={{pointerEvents:'none'}}>Or click to browse</button>
        <input id="press-file-input" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={onFileChange} />
      </div>
      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[
          {icon:'📈',title:'Interactive chart',desc:'Hover to see all sensor values at any time point'},
          {icon:'⏱️',title:'Duration calculator',desc:'Key in temperature → see how long each sensor stayed above it'},
          {icon:'🔥',title:'Heat rate calculator',desc:'Key in T1 and T2 → get °C/min for each sensor'},
        ].map(function(item){return(
          <div key={item.title} className="card" style={{textAlign:'center',padding:'16px 12px'}}>
            <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
            <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:4}}>{item.title}</div>
            <div style={{fontSize:11,color:'var(--text2)'}}>{item.desc}</div>
          </div>
        );})}
      </div>
    </div>
  );

  var totalMins = rawData.length > 0 ? (rawData[rawData.length-1].sec/60).toFixed(1) : 0;
  var maxTemp   = Math.max.apply(null, rawData.map(function(r){return Math.max(r.p01,r.p02,r.p03,r.p04,r.p05,r.p06,r.p07,r.p08,r.p09,r.p10,r.p11);}));
  var maxPres   = Math.max.apply(null, rawData.map(function(r){return r.pressure;}));
  var minVac    = Math.min.apply(null, rawData.filter(function(r){return r.vacuum>0;}).map(function(r){return r.vacuum;}));

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{pressName} — {fileName}</div>
          <div style={{fontSize:11,color:'var(--text2)'}}>
            {rawData.length.toLocaleString()} data points · {totalMins} min · sampled every 5s for chart
          </div>
        </div>
        <button className="btn-ghost" onClick={function(){setRawData(null);setFileName('');}}>Load new file</button>
      </div>

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>⏱️</div>
          <div className="kpi-label">Total duration</div>
          <div className="kpi-val">{totalMins} min</div>
          <div className="kpi-footer text-muted">{rawData.length.toLocaleString()} seconds</div>
          <div className="kpi-bar" style={{background:'#378ADD'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}>🌡️</div>
          <div className="kpi-label">Max temperature</div>
          <div className="kpi-val">{maxTemp.toFixed(1)}°C</div>
          <div className="kpi-footer text-muted">across all platens</div>
          <div className="kpi-bar" style={{background:'#E24B4A'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>💪</div>
          <div className="kpi-label">Max pressure</div>
          <div className="kpi-val">{maxPres.toFixed(2)}</div>
          <div className="kpi-footer text-muted">kgf/cm²</div>
          <div className="kpi-bar" style={{background:'#EF9F27'}} />
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>🔽</div>
          <div className="kpi-label">Min vacuum</div>
          <div className="kpi-val">{minVac ? minVac.toFixed(0) : '—'}</div>
          <div className="kpi-footer text-muted">mbar</div>
          <div className="kpi-bar" style={{background:'#1D9E75'}} />
        </div>
      </div>

      {/* Main chart */}
      <div className="card" style={{marginBottom:12}}>
        <div className="card-head">
          <div>
            <div className="card-title">{pressName} — Temperature, Pressure & Vacuum Profile</div>
            <div className="card-sub">Hover over chart to see all sensor values · Left Y = Temperature (°C) · Right Y = Pressure / Vacuum</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn-ghost" onClick={function(){toggleAll(true);}} style={{fontSize:10,padding:'3px 8px'}}>Show all</button>
            <button className="btn-ghost" onClick={function(){toggleAll(false);}} style={{fontSize:10,padding:'3px 8px'}}>Hide all</button>
          </div>
        </div>

        {/* Legend toggles */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:'var(--text2)',marginBottom:5,fontWeight:500}}>TEMPERATURE SENSORS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
            <LegendBtn id="tempSet" color={TEMP_SET_COLOR} label="Temp Set" />
            {PLATEN_NAMES.map(function(name,i){
              return <LegendBtn key={name} id={'p'+(i+1).toString().padStart(2,'0')} color={PLATEN_COLORS[i]} label={name} />;
            })}
            {SENSOR_NAMES.map(function(name,i){
              return <LegendBtn key={name} id={'s'+(i+1).toString().padStart(2,'0')} color={SENSOR_COLORS[i]} label={name} />;
            })}
          </div>
          <div style={{fontSize:10,color:'var(--text2)',marginBottom:5,fontWeight:500}}>PRESSURE & VACUUM</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            <LegendBtn id="pressure" color={PRESSURE_COLOR} label="Pressure (kgf/cm²)" />
            <LegendBtn id="vacuum"   color={VACUUM_COLOR}   label="Vacuum (mbar)" />
          </div>
        </div>

        <div style={{height:420}}>
          {chartData && <Line ref={chartRef} data={chartData} options={chartOptions} />}
        </div>
      </div>

      {/* Calculators */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>

        {/* Duration calculator */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">⏱️ Duration above temperature</div>
              <div className="card-sub">Key in temperature → how long each sensor stayed above it</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:12}}>
            <div className="fg" style={{margin:0,flex:1}}>
              <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>Temperature threshold (°C)</label>
              <input type="number" step="0.1" value={durationTemp} placeholder="e.g. 200"
                onChange={function(e){setDurationTemp(e.target.value);}}
                style={{width:'100%',fontSize:13,padding:'7px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            </div>
          </div>
          {durationResults && (
            <div style={{maxHeight:350,overflowY:'auto'}}>
              {durationResults.filter(function(r){return r.secs > 0;}).map(function(r){
                return (
                  <div key={r.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{width:10,height:10,borderRadius:2,background:r.color,flexShrink:0,display:'inline-block'}}></span>
                    <span style={{flex:1,fontSize:12,fontWeight:500,color:'var(--text)'}}>{r.name}</span>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:600,color:r.color}}>{r.mins}m {r.remSecs}s</div>
                      <div style={{fontSize:10,color:'var(--text2)'}}>First crossed at {r.firstMin} min · {r.secs}s total</div>
                    </div>
                  </div>
                );
              })}
              {durationResults.every(function(r){return r.secs===0;}) && (
                <div className="empty">No sensor reached {durationTemp}°C</div>
              )}
            </div>
          )}
          {!durationResults && durationTemp && <div className="empty">Enter a valid temperature</div>}
          {!durationTemp && <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',padding:'20px 0'}}>Enter a temperature above to see results</div>}
        </div>

        {/* Heat rate calculator */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">🔥 Heat rate calculator</div>
              <div className="card-sub">Key in T1 and T2 → °C/min for each sensor</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:12,flexWrap:'wrap'}}>
            <div className="fg" style={{margin:0,flex:1}}>
              <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>T1 — Start temp (°C)</label>
              <input type="number" step="0.1" value={heatT1} placeholder="e.g. 150"
                onChange={function(e){setHeatT1(e.target.value);}}
                style={{width:'100%',fontSize:13,padding:'7px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            </div>
            <div style={{fontSize:18,color:'var(--text2)',paddingBottom:8}}>→</div>
            <div className="fg" style={{margin:0,flex:1}}>
              <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>T2 — End temp (°C)</label>
              <input type="number" step="0.1" value={heatT2} placeholder="e.g. 200"
                onChange={function(e){setHeatT2(e.target.value);}}
                style={{width:'100%',fontSize:13,padding:'7px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            </div>
          </div>
          {heatT1 && heatT2 && parseFloat(heatT2) <= parseFloat(heatT1) && (
            <div style={{fontSize:11,color:'#E24B4A',marginBottom:8}}>⚠️ T2 must be greater than T1</div>
          )}
          {heatRateResults && (
            <div style={{maxHeight:350,overflowY:'auto'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,marginBottom:4}}>
                <div style={{fontSize:10,color:'var(--text2)',fontWeight:600,padding:'4px 6px'}}>Sensor</div>
                <div style={{fontSize:10,color:'var(--text2)',fontWeight:600,padding:'4px 6px',textAlign:'right'}}>Rate / Time</div>
              </div>
              {heatRateResults.map(function(r){
                if (!r.rate) return null;
                var good = r.rate >= 2 && r.rate <= 8;
                return (
                  <div key={r.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{width:10,height:10,borderRadius:2,background:r.color,flexShrink:0,display:'inline-block'}}></span>
                    <span style={{flex:1,fontSize:12,fontWeight:500,color:'var(--text)'}}>{r.name}</span>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:600,color:r.color}}>{r.rate} °C/min</div>
                      <div style={{fontSize:10,color:'var(--text2)'}}>
                        {heatT1}→{heatT2}°C in {r.timeMins} min ({r.timeSecs}s)
                      </div>
                    </div>
                  </div>
                );
              })}
              {heatRateResults.every(function(r){return !r.rate;}) && (
                <div className="empty">Sensors did not reach the specified temperatures</div>
              )}
            </div>
          )}
          {!heatRateResults && heatT1 && heatT2 && parseFloat(heatT2)>parseFloat(heatT1) && (
            <div className="empty">Calculating...</div>
          )}
          {(!heatT1 || !heatT2) && (
            <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',padding:'20px 0'}}>Enter T1 and T2 above to see heat rates</div>
          )}
        </div>
      </div>

      {/* Sensor stats table */}
      <div className="card">
        <div className="card-head"><div><div className="card-title">Sensor statistics summary</div><div className="card-sub">Min, Max, Avg for all sensors</div></div></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Min (°C)</th>
                <th>Max (°C)</th>
                <th>Avg (°C)</th>
                <th>Range (°C)</th>
                <th>Max - Avg</th>
              </tr>
            </thead>
            <tbody>
              {[
                {key:'s01',name:'PrdSensor 01',color:SENSOR_COLORS[0]},
                {key:'s02',name:'PrdSensor 02',color:SENSOR_COLORS[1]},
                {key:'s03',name:'PrdSensor 03',color:SENSOR_COLORS[2]},
                {key:'p01',name:'Platen 01',color:PLATEN_COLORS[0]},
                {key:'p02',name:'Platen 02',color:PLATEN_COLORS[1]},
                {key:'p03',name:'Platen 03',color:PLATEN_COLORS[2]},
                {key:'p04',name:'Platen 04',color:PLATEN_COLORS[3]},
                {key:'p05',name:'Platen 05',color:PLATEN_COLORS[4]},
                {key:'p06',name:'Platen 06',color:PLATEN_COLORS[5]},
                {key:'p07',name:'Platen 07',color:PLATEN_COLORS[6]},
                {key:'p08',name:'Platen 08',color:PLATEN_COLORS[7]},
                {key:'p09',name:'Platen 09',color:PLATEN_COLORS[8]},
                {key:'p10',name:'Platen 10',color:PLATEN_COLORS[9]},
                {key:'p11',name:'Platen 11',color:PLATEN_COLORS[10]},
              ].map(function(s){
                var vals = rawData.map(function(r){return r[s.key];}).filter(function(v){return v>0;});
                if (!vals.length) return null;
                var mn  = Math.min.apply(null,vals);
                var mx  = Math.max.apply(null,vals);
                var avg = vals.reduce(function(a,b){return a+b;},0)/vals.length;
                var rng = mx - mn;
                var dev = mx - avg;
                return (
                  <tr key={s.key}>
                    <td style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0,display:'inline-block'}}></span>
                      <span style={{fontWeight:500}}>{s.name}</span>
                    </td>
                    <td style={{color:'#378ADD'}}>{mn.toFixed(2)}</td>
                    <td style={{color:'#E24B4A',fontWeight:500}}>{mx.toFixed(2)}</td>
                    <td>{avg.toFixed(2)}</td>
                    <td style={{color:rng>5?'#E24B4A':'#1D9E75',fontWeight:500}}>{rng.toFixed(2)}</td>
                    <td style={{color:dev>3?'#EF9F27':'var(--text2)'}}>{dev.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
