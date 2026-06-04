import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { saveMaterialHistory, getAllDays } from '../../utils/storage';
import { tod, daysAgo } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COPPER_KEY = 'MAIN MATERIAL - COPPER FOIL(OUT)';
const PP_KEY     = 'MAIN MATERIAL - PP(OUT)';

export default function MaterialTrackerPage({ darkMode, toast, allDays }) {
  const [data, setData]             = useState(null);
  const [fileName, setFileName]     = useState('');
  const [dragging, setDragging]     = useState(false);
  const [outputM2, setOutputM2]     = useState('');
  const [fileMonth, setFileMonth]   = useState('');
  const [manualMonth, setManualMonth] = useState(tod().slice(0,7));
  const [pushing, setPushing]       = useState(false);
  const [pushed, setPushed]         = useState(false);

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  useEffect(function() {
    if (!fileMonth) return;
    var monthDays = allDays.filter(function(d){ return d.date.startsWith(fileMonth); });
    var totalOut  = monthDays.reduce(function(s,d){ return s+(parseFloat(d.data.output)||0); },0);
    if (totalOut > 0) setOutputM2(totalOut.toFixed(0));
  }, [fileMonth, allDays]);

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const wb   = XLSX.read(e.target.result, { type:'binary', cellDates:true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']);
      const merges = ws['!merges'] || [];
      const allRows = [];
      for (var R = range.s.r; R <= range.e.r; R++) {
        var row = [];
        for (var C = range.s.c; C <= range.e.c; C++) {
          var addr = XLSX.utils.encode_cell({r:R,c:C});
          var cell = ws[addr];
          row.push(cell ? (cell.v !== undefined ? cell.v : '') : '');
        }
        allRows.push(row);
      }
      merges.forEach(function(merge) {
        var srcAddr = XLSX.utils.encode_cell({r:merge.s.r,c:merge.s.c});
        var srcCell = ws[srcAddr];
        if (!srcCell) return;
        for (var R2=merge.s.r;R2<=merge.e.r;R2++) {
          for (var C2=merge.s.c;C2<=merge.e.c;C2++) {
            if (R2===merge.s.r&&C2===merge.s.c) continue;
            if (allRows[R2]) allRows[R2][C2]=srcCell.v;
          }
        }
      });

      var headerRow = allRows.findIndex(function(r){
        return r.some(function(c){return String(c).includes('Date');});
      });
      if (headerRow < 0) { toast('Cannot find header row'); return; }

      var dataRows = allRows.slice(headerRow+1);
      var parsed = dataRows.map(function(r){
        return {
          date:        String(r[0]||'').trim(),
          productName: String(r[2]||'').trim(),
          qty:         parseFloat(r[6])||0,
          amountRM:    parseFloat(r[10])||0,
          accountName: String(r[28]||'').trim(),
        };
      }).filter(function(r){ return r.date && r.date !== 'Date' && r.amountRM > 0; });

      var copperRows = parsed.filter(function(r){ return r.accountName.includes('COPPER FOIL'); });
      var ppRows     = parsed.filter(function(r){ return r.accountName.includes('PP(OUT)') || r.accountName.includes('PP (OUT)'); });

      var totalCopper = copperRows.reduce(function(s,r){return s+r.amountRM;},0);
      var totalPP     = ppRows.reduce(function(s,r){return s+r.amountRM;},0);

      var dailyMap = {};
      function addToDaily(rows, key) {
        rows.forEach(function(r) {
          var d = String(r.date).slice(0,10);
          if (!dailyMap[d]) dailyMap[d] = { copper:0, pp:0 };
          dailyMap[d][key] += r.amountRM;
        });
      }
      addToDaily(copperRows, 'copper');
      addToDaily(ppRows, 'pp');

      var months = new Set();
      parsed.forEach(function(r){
        var d = String(r.date).slice(0,7);
        if (d && d.match(/\d{4}-\d{2}/)) months.add(d);
      });
      if (months.size > 0) setFileMonth(Array.from(months)[0]);

      setData({
        totalCopper, totalPP,
        copperRows, ppRows,
        dailyMap,
        totalRM: totalCopper + totalPP,
      });
      setFileName(file.name);
      setPushed(false);
      toast('Loaded — Copper Foil: RM '+totalCopper.toFixed(2)+' · PP: RM '+totalPP.toFixed(2));
    };
    reader.readAsBinaryString(file);
  }

  function onDrop(e) { e.preventDefault(); setDragging(false); var f=e.dataTransfer.files[0]; if(f) parseExcel(f); }
  function onFileChange(e) { var f=e.target.files[0]; if(f) parseExcel(f); }

  var outputNum       = parseFloat(outputM2)||0;
  var copperPerM2     = outputNum>0 ? data&&(data.totalCopper/outputNum) : 0;
  var ppPerM2         = outputNum>0 ? data&&(data.totalPP/outputNum) : 0;
  var totalPerM2      = outputNum>0 ? data&&(data.totalRM/outputNum) : 0;

  var dailyLabels = data ? Object.keys(data.dailyMap).sort() : [];
  var dailyCopper = dailyLabels.map(function(d){ return parseFloat((data.dailyMap[d].copper||0).toFixed(2)); });
  var dailyPP     = dailyLabels.map(function(d){ return parseFloat((data.dailyMap[d].pp||0).toFixed(2)); });

  async function pushToHistory() {
    if (!data)      { toast('No data loaded'); return; }
    if (!outputM2)  { toast('Please key in output m²'); return; }
    var month = fileMonth || manualMonth;
    if (!month)     { toast('Cannot detect month'); return; }
    setPushing(true);
    var ok = await saveMaterialHistory(month, {
      outputM2:          outputNum,
      copperFoilRm:      data.totalCopper,
      prepregRm:         data.totalPP,
      copperFoilRmPerM2: parseFloat((copperPerM2||0).toFixed(4)),
      prepregRmPerM2:    parseFloat((ppPerM2||0).toFixed(4)),
      totalRm:           data.totalRM,
      totalRmPerM2:      parseFloat((totalPerM2||0).toFixed(4)),
      dailyBreakdown:    data.dailyMap,
    });
    setPushing(false);
    if (ok) { setPushed(true); toast('Saved to material history — '+month); }
    else toast('Error saving');
  }

  return (
    <div>
      {!data ? (
        <div>
          <div style={{background:'#0F6E56',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
            <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Material tracker</div>
            <div style={{fontSize:20,fontWeight:500}}>Monthly material consumption</div>
            <div style={{fontSize:12,opacity:.8,marginTop:4}}>Upload monthly Excel · Copper Foil + PP only · Push to history</div>
          </div>
          <div onDragOver={function(e){e.preventDefault();setDragging(true);}} onDragLeave={function(){setDragging(false);}} onDrop={onDrop}
            onClick={function(){document.getElementById('mat-file-input').click();}}
            style={{border:'2px dashed '+(dragging?'#1D9E75':'var(--border2)'),borderRadius:12,padding:'60px 20px',textAlign:'center',background:dragging?'rgba(29,158,117,0.05)':'var(--bg3)',transition:'all .2s',cursor:'pointer'}}>
            <div style={{fontSize:40,marginBottom:12}}>📦</div>
            <div style={{fontSize:15,fontWeight:500,color:'var(--text)',marginBottom:8}}>Drop your monthly material consumption Excel here</div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>Supports .xlsx · Processed locally · Zero bandwidth</div>
            <button className="btn-primary" style={{pointerEvents:'none',background:'#0F6E56'}}>Or click to browse</button>
            <input id="mat-file-input" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={onFileChange} />
          </div>
          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {icon:'🔒',title:'100% private',desc:'File never leaves your browser'},
              {icon:'🏭',title:'Masslam only',desc:'Reads Copper Foil and PP only'},
              {icon:'📊',title:'RM/m² efficiency',desc:'Calculates material cost per output'},
            ].map(function(item){return(
              <div key={item.title} className="card" style={{textAlign:'center',padding:'16px 12px'}}>
                <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
                <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:4}}>{item.title}</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>{item.desc}</div>
              </div>
            );},)}
          </div>
        </div>
      ) : (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{fileName}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>
                Month: {fileMonth||manualMonth} ·
                Copper Foil: RM {data.totalCopper.toFixed(2)} ·
                PP: RM {data.totalPP.toFixed(2)}
              </div>
            </div>
            <button className="btn-ghost" onClick={function(){setData(null);setFileName('');setPushed(false);}}>Load new file</button>
          </div>

          {/* Push card */}
          <div className="card" style={{marginBottom:12,border:'1px solid '+(pushed?'#1D9E75':'#0F6E56'),background:pushed?'rgba(29,158,117,0.05)':'rgba(15,110,86,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'var(--text)',marginBottom:4}}>Push to material history</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>
                  {fileMonth
                    ? <span>Month detected: <strong>{fileMonth}</strong></span>
                    : <span style={{color:'#E24B4A'}}>⚠️ Select month manually:</span>}
                </div>
                {!fileMonth && (
                  <input type="month" value={manualMonth} onChange={function(e){setManualMonth(e.target.value);}}
                    style={{marginTop:6,fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                )}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <div className="fg" style={{margin:0}}>
                  <label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:4}}>
                    Monthly output (m²)
                    {outputM2 && allDays.filter(function(d){return d.date.startsWith(fileMonth||manualMonth);}).length > 0
                      ? <span style={{color:'#1D9E75',marginLeft:6}}>✓ auto from database</span>
                      : <span style={{color:'var(--text3)',marginLeft:6}}>key in manually</span>}
                  </label>
                  <input type="number" value={outputM2} placeholder="e.g. 68000"
                    onChange={function(e){setOutputM2(e.target.value);setPushed(false);}}
                    style={{width:150,fontSize:12,padding:'6px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                </div>
                {outputM2 && (
                  <div style={{fontSize:11,color:'var(--text2)',textAlign:'right'}}>
                    <div>Total RM: <strong>RM {data.totalRM.toFixed(2)}</strong></div>
                    <div style={{color:'#0F6E56',fontWeight:500}}>RM/m²: {(totalPerM2||0).toFixed(4)}</div>
                  </div>
                )}
                <button className="btn-primary" onClick={pushToHistory}
                  disabled={pushing||pushed||!outputM2}
                  style={{background:pushed?'#1D9E75':pushing?'#888':'#0F6E56',minWidth:140}}>
                  {pushed?'✓ Saved!':pushing?'Saving...':'→ Push to history'}
                </button>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{border:'2px solid #0F6E56'}}>
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}>🏭</div>
              <div className="kpi-label">Total RM</div>
              <div className="kpi-val" style={{color:'#0F6E56',fontSize:16}}>RM {data.totalRM.toFixed(0)}</div>
              <div className="kpi-footer text-muted">Copper + PP</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}>🔶</div>
              <div className="kpi-label">Copper Foil RM</div>
              <div className="kpi-val" style={{fontSize:16}}>RM {data.totalCopper.toFixed(0)}</div>
              <div className="kpi-footer text-muted">{outputM2?'RM/m²: '+(copperPerM2||0).toFixed(4):data.copperRows.length+' records'}</div>
              <div className="kpi-bar" style={{background:'#EF9F27'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}>🔷</div>
              <div className="kpi-label">PP (Prepreg) RM</div>
              <div className="kpi-val" style={{fontSize:16}}>RM {data.totalPP.toFixed(0)}</div>
              <div className="kpi-footer text-muted">{outputM2?'RM/m²: '+(ppPerM2||0).toFixed(4):data.ppRows.length+' records'}</div>
              <div className="kpi-bar" style={{background:'#378ADD'}} />
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{background:'#EEEDFE',color:'#534AB7'}}>💹</div>
              <div className="kpi-label">Total RM/m²</div>
              <div className="kpi-val" style={{color:outputM2?'#0F6E56':'var(--text2)'}}>{outputM2?(totalPerM2||0).toFixed(4):'—'}</div>
              <div className="kpi-footer text-muted">{outputM2?outputM2+' m² output':'Key in output'}</div>
              <div className="kpi-bar" style={{background:'#7F77DD'}} />
            </div>
          </div>

          {/* Charts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Daily material cost</div><div className="card-sub">Copper Foil vs PP by day</div></div></div>
              <div className="legend-row">
                <span className="leg"><span className="leg-dot" style={{background:'#EF9F27'}}></span>Copper Foil</span>
                <span className="leg"><span className="leg-dot" style={{background:'#378ADD'}}></span>PP</span>
              </div>
              <div style={{height:220}}>
                <Bar key={'daily-'+outputM2}
                  data={{labels:dailyLabels.map(function(d){return d.slice(5);}),datasets:[
                    {label:'Copper Foil',data:dailyCopper,backgroundColor:'#EF9F27',borderRadius:3,stack:'s'},
                    {label:'PP',         data:dailyPP,     backgroundColor:'#378ADD',borderRadius:3,stack:'s'},
                  ]}}
                  options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{
                    x:{stacked:true,ticks:{font:{size:9},autoSkip:true,maxRotation:45,color:tickColor},grid:{display:false}},
                    y:{stacked:true,ticks:{font:{size:9},color:tickColor,callback:function(v){return 'RM'+v.toLocaleString();}},grid:{color:gridColor}}
                  }}}
                />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><div className="card-title">Material split</div><div className="card-sub">Copper Foil vs PP proportion</div></div></div>
              <div style={{position:'relative',height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Doughnut key={'donut-mat-'+data.totalRM}
                  data={{
                    labels:['Copper Foil','PP (Prepreg)'],
                    datasets:[{
                      data:[parseFloat(data.totalCopper.toFixed(2)),parseFloat(data.totalPP.toFixed(2))],
                      backgroundColor:['#EF9F27','#378ADD'],
                      borderWidth:3,
                      borderColor:darkMode?'#1a1a1a':'#ffffff',
                      hoverOffset:6,
                    }]
                  }}
                  options={{responsive:true,maintainAspectRatio:false,cutout:'68%',
                    plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.label+': RM'+ctx.parsed.toLocaleString(undefined,{minimumFractionDigits:2});}}}}}
                  }
                />
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1}}>RM {(data.totalRM/1000).toFixed(1)}K</div>
                  <div style={{fontSize:9,color:'var(--text2)',marginTop:2}}>Total</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-around',marginTop:6}}>
                {[['Copper Foil',data.totalCopper,'#EF9F27'],[' PP',data.totalPP,'#378ADD']].map(function(item){return(
                  <div key={item[0]} style={{textAlign:'center'}}>
                    <div style={{fontSize:11,fontWeight:600,color:item[2]}}>RM {item[1].toFixed(0)}</div>
                    <div style={{fontSize:9,color:'var(--text2)',marginTop:1}}>{item[0]}</div>
                    {outputM2 && <div style={{fontSize:9,color:item[2]}}>{item[0]==='Copper Foil'?(copperPerM2||0).toFixed(4):(ppPerM2||0).toFixed(4)} RM/m²</div>}
                  </div>
                );})}
              </div>
            </div>
          </div>

          {/* Detail tables */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[['Copper Foil',data.copperRows,'#EF9F27'],['PP (Prepreg)',data.ppRows,'#378ADD']].map(function(item){
              var name=item[0], rows=item[1], color=item[2];
              return (
                <div key={name} className="card">
                  <div className="card-head"><div><div className="card-title">{name} detail</div><div className="card-sub">{rows.length} records</div></div></div>
                  <div className="tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Amount (RM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(function(r,i){return(
                          <tr key={i}>
                            <td style={{fontSize:11,whiteSpace:'nowrap'}}>{String(r.date).slice(0,10)}</td>
                            <td style={{fontSize:11,color:'var(--text2)'}}>{r.productName}</td>
                            <td style={{fontSize:11,textAlign:'right'}}>{r.qty}</td>
                            <td style={{fontSize:11,textAlign:'right',fontWeight:500,color:color}}>RM {r.amountRM.toFixed(2)}</td>
                          </tr>
                        );})}
                      </tbody>
                      <tfoot>
                        <tr style={{background:'var(--bg3)'}}>
                          <td colSpan={3} style={{fontSize:11,fontWeight:500,padding:'6px 8px'}}>Total</td>
                          <td style={{fontSize:12,fontWeight:600,color:color,textAlign:'right',padding:'6px 8px'}}>
                            RM {rows.reduce(function(s,r){return s+r.amountRM;},0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
