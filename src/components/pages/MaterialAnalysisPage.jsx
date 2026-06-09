import { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { getMaterialHistory, getMaterialDetail } from '../../utils/storage';
import GradientLine from '../GradientLine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export default function MaterialAnalysisPage({ darkMode }) {
  const [history, setHistory]       = useState([]);
  const [periodA, setPeriodA]       = useState([]);
  const [periodB, setPeriodB]       = useState([]);
  const [detailA, setDetailA]       = useState([]);
  const [detailB, setDetailB]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [comparing, setComparing]   = useState(false);
  const [availMonths, setAvailMonths] = useState([]);
  const [sortConfig, setSortConfig]   = useState({key:'amtA', dir:'desc'});

  const gridColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = darkMode ? '#9499b0' : '#666';

  useEffect(function() {
    async function load() {
      setLoading(true);
      var h = await getMaterialHistory('2020-01', '2030-12');
      setHistory(h);
      setAvailMonths(h.map(function(d){ return d.report_month; }));
      setLoading(false);
    }
    load();
  }, []);

  async function runComparison() {
    if (!periodA.length || !periodB.length) return;
    setComparing(true);
    var dA = await getMaterialDetail(periodA);
    var dB = await getMaterialDetail(periodB);
    setDetailA(dA);
    setDetailB(dB);
    setComparing(false);
  }

  function getHistoryForPeriod(months) {
    return history.filter(function(h){ return months.indexOf(h.report_month) >= 0; });
  }

  function avgMetric(months, field) {
    var rows = getHistoryForPeriod(months);
    if (!rows.length) return 0;
    return rows.reduce(function(s,r){ return s+(parseFloat(r[field])||0); },0) / rows.length;
  }

  function sumMetric(months, field) {
    var rows = getHistoryForPeriod(months);
    return rows.reduce(function(s,r){ return s+(parseFloat(r[field])||0); },0);
  }

  function getProductSummary(detail, matType) {
    var filtered = detail.filter(function(r){ return r.material_type === matType; });
    var byProduct = {};
    filtered.forEach(function(r) {
      var key = r.product_name || r.product_no || 'Unknown';
      if (!byProduct[key]) byProduct[key] = { name:key, productNo:r.product_no, specs:r.specs, unit:r.unit, qty:0, amountRm:0, prices:[] };
      byProduct[key].qty      += parseFloat(r.qty)||0;
      byProduct[key].amountRm += parseFloat(r.amount_rm)||0;
      if (r.unit_price_rm) byProduct[key].prices.push(parseFloat(r.unit_price_rm));
    });
    return Object.values(byProduct).map(function(p) {
      var avgPrice = p.prices.length ? p.prices.reduce(function(a,b){return a+b;},0)/p.prices.length : 0;
      return Object.assign({}, p, { avgUnitPrice: parseFloat(avgPrice.toFixed(4)) });
    }).sort(function(a,b){ return b.amountRm-a.amountRm; });
  }

  function getPriceChanges(matType) {
    var summA = getProductSummary(detailA, matType);
    var summB = getProductSummary(detailB, matType);
    var result = [];

    // Products in both periods
    summA.forEach(function(a) {
      var b = summB.find(function(x){ return x.name===a.name; });
      if (b) {
        var change = b.avgUnitPrice - a.avgUnitPrice;
        var changePct = a.avgUnitPrice > 0 ? (change/a.avgUnitPrice*100) : 0;
        result.push({ name:a.name, specs:a.specs, unit:a.unit,
          priceA:a.avgUnitPrice, priceB:b.avgUnitPrice,
          qtyA:a.qty, qtyB:b.qty,
          amtA:a.amountRm, amtB:b.amountRm,
          change:parseFloat(change.toFixed(4)),
          changePct:parseFloat(changePct.toFixed(2)),
          status:'both',
        });
      } else {
        // Only in Period A - disappeared
        result.push({ name:a.name, specs:a.specs, unit:a.unit,
          priceA:a.avgUnitPrice, priceB:0,
          qtyA:a.qty, qtyB:0,
          amtA:a.amountRm, amtB:0,
          change:0, changePct:0,
          status:'removed',
        });
      }
    });

    // New products only in Period B
    summB.forEach(function(b) {
      var a = summA.find(function(x){ return x.name===b.name; });
      if (!a) {
        result.push({ name:b.name, specs:b.specs, unit:b.unit,
          priceA:0, priceB:b.avgUnitPrice,
          qtyA:0, qtyB:b.qty,
          amtA:0, amtB:b.amountRm,
          change:0, changePct:0,
          status:'new',
        });
      }
    });

    return result.sort(function(a,b){ return Math.abs(b.changePct)-Math.abs(a.changePct); });
  }

  var labelA = periodA.length===1?periodA[0]:'Avg '+periodA[0]+(periodA.length>1?' - '+periodA[periodA.length-1]:'');
  var labelB = periodB.length===1?periodB[0]:'Avg '+periodB[0]+(periodB.length>1?' - '+periodB[periodB.length-1]:'');

  var copperChanges = detailA.length && detailB.length ? getPriceChanges('Copper Foil') : [];
  var ppChanges     = detailA.length && detailB.length ? getPriceChanges('PP') : [];

  var cmpMetrics = detailA.length || detailB.length ? [
    { label:'Copper RM/m²',  a:avgMetric(periodA,'copper_foil_rm_per_m2'), b:avgMetric(periodB,'copper_foil_rm_per_m2'), color:'#EF9F27' },
    { label:'PP RM/m²',      a:avgMetric(periodA,'prepreg_rm_per_m2'),     b:avgMetric(periodB,'prepreg_rm_per_m2'),     color:'#378ADD' },
    { label:'Total RM/m²',   a:avgMetric(periodA,'total_rm_per_m2'),       b:avgMetric(periodB,'total_rm_per_m2'),       color:'#0F6E56' },
    { label:'Output m²',     a:sumMetric(periodA,'output_m2'),             b:sumMetric(periodB,'output_m2'),             color:'#7F77DD' },
    { label:'Total spend RM',a:sumMetric(periodA,'total_rm'),              b:sumMetric(periodB,'total_rm'),              color:'#E24B4A' },
  ] : [];

  function calcImpact(matType) {
    var summA = getProductSummary(detailA, matType);
    var summB = getProductSummary(detailB, matType);
    var outA  = sumMetric(periodA, 'output_m2');
    var outB  = sumMetric(periodB, 'output_m2');
    console.log('calcImpact', matType, 'outA:', outA, 'outB:', outB, 'history:', history.length, 'summA:', summA.length, 'summB:', summB.length);
    if (!outA || !outB) return null;

    var totalAmtA = summA.reduce(function(s,p){return s+p.amountRm;},0);
    var totalAmtB = summB.reduce(function(s,p){return s+p.amountRm;},0);
    var totalQtyA = summA.reduce(function(s,p){return s+p.qty;},0);
    var totalQtyB = summB.reduce(function(s,p){return s+p.qty;},0);
    var avgPriceA = totalQtyA > 0 ? totalAmtA/totalQtyA : 0;
    var avgPriceB = totalQtyB > 0 ? totalAmtB/totalQtyB : 0;

    var rmPerM2A  = outA > 0 ? totalAmtA/outA : 0;
    var rmPerM2B  = outB > 0 ? totalAmtB/outB : 0;
    var totalChange = rmPerM2B - rmPerM2A;

    // Price impact = (new price - old price) * old qty / output B
    var priceImpact = outB > 0 ? (avgPriceB - avgPriceA) * totalQtyB / outB : 0;

    // Quantity impact = old price * (new qty/output - old qty/output)
    var qtyImpact = avgPriceA * ((totalQtyB/outB) - (totalQtyA/outA));

    return {
      rmPerM2A:     parseFloat(rmPerM2A.toFixed(4)),
      rmPerM2B:     parseFloat(rmPerM2B.toFixed(4)),
      totalChange:  parseFloat(totalChange.toFixed(4)),
      priceImpact:  parseFloat(priceImpact.toFixed(4)),
      qtyImpact:    parseFloat(qtyImpact.toFixed(4)),
      avgPriceA:    parseFloat(avgPriceA.toFixed(4)),
      avgPriceB:    parseFloat(avgPriceB.toFixed(4)),
      totalQtyA, totalQtyB, outA, outB,
      totalAmtA, totalAmtB,
    };
  }

  function sortedChanges(changes) {
    var key = sortConfig.key;
    var dir = sortConfig.dir;
    return changes.slice().sort(function(a,b){
      var av = a[key]||0, bv = b[key]||0;
      return dir==='desc' ? bv-av : av-bv;
    });
  }

  function SortTh(props) {
    var active = sortConfig.key === props.col;
    return (
      <th onClick={function(){setSortConfig(function(prev){
        return {key:props.col, dir:prev.key===props.col&&prev.dir==='desc'?'asc':'desc'};
      });}} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
        {props.label} {active?(sortConfig.dir==='desc'?'↓':'↑'):'↕'}
      </th>
    );
  }

  function MonthSelector(props) {
    return (
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:11,fontWeight:600,color:props.color,marginBottom:6}}>{props.label}</div>
        <div style={{fontSize:10,color:'var(--text2)',marginBottom:6}}>Click to select months (multiple = average)</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,maxHeight:120,overflowY:'auto',padding:4,border:'1px solid var(--border2)',borderRadius:7,background:'var(--bg3)'}}>
          {availMonths.map(function(m){
            var sel = props.selected.indexOf(m) >= 0;
            return (
              <button key={m} onClick={function(){
                props.setSelected(function(prev){
                  if (prev.indexOf(m)>=0) return prev.filter(function(x){return x!==m;});
                  return prev.concat([m]).sort();
                });
              }} style={{padding:'3px 8px',borderRadius:10,border:'1.5px solid '+props.color,fontSize:10,cursor:'pointer',
                background:sel?props.color:'transparent',color:sel?'#fff':props.color,fontWeight:sel?500:400}}>
                {m}
              </button>
            );
          })}
        </div>
        {props.selected.length > 0 && (
          <div style={{fontSize:10,color:'var(--text2)',marginTop:4}}>
            {props.selected.length} month{props.selected.length>1?'s':''} selected
            {props.selected.length>1?' — will average':''}
            <button onClick={function(){props.setSelected([]);}} style={{marginLeft:8,fontSize:10,color:'#E24B4A',background:'none',border:'none',cursor:'pointer'}}>Clear</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,#0F6E56,#185FA5)',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Material analysis</div>
        <div style={{fontSize:20,fontWeight:500}}>Full material cost analysis & comparison</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Period comparison · Price changes · Product breakdown · Management reporting</div>
      </div>

      {loading ? <div className="empty">Loading...</div> : history.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px 20px'}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text)',marginBottom:8}}>No material history yet</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>Push monthly data from Material Tracker first!</div>
        </div>
      ) : (
        <div>
          {/* Period selector */}
          <div className="card" style={{marginBottom:12}}>
            <div className="card-head"><div><div className="card-title">📅 Select periods to compare</div><div className="card-sub">Choose 1 or more months per period — multiple months will be averaged</div></div></div>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:12}}>
              <MonthSelector label="Period A" color="#378ADD" selected={periodA} setSelected={setPeriodA} />
              <div style={{display:'flex',alignItems:'center',fontSize:20,color:'var(--text2)',paddingTop:20}}>vs</div>
              <MonthSelector label="Period B" color="#E24B4A" selected={periodB} setSelected={setPeriodB} />
            </div>
            <button className="btn-primary" onClick={runComparison}
              disabled={!periodA.length||!periodB.length||comparing}
              style={{background:'#0F6E56',minWidth:160}}>
              {comparing?'Comparing...':'🔍 Run comparison'}
            </button>
          </div>

          {cmpMetrics.length > 0 && (
            <div>
              {/* KPI comparison */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
                {cmpMetrics.map(function(m){
                  var diff = m.b - m.a;
                  var diffPct = m.a > 0 ? (diff/m.a*100) : 0;
                  var isRM = m.label.includes('RM');
                  var worse = m.label.includes('spend')||m.label.includes('RM/m²') ? diff>0 : diff<0;
                  return (
                    <div key={m.label} className="kpi-card" style={{border:'2px solid '+m.color}}>
                      <div className="kpi-icon" style={{background:m.color+'22',color:m.color}}>📊</div>
                      <div className="kpi-label">{m.label}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:2,margin:'4px 0'}}>
                        <div style={{fontSize:11,color:'#378ADD'}}>A: <strong>{isRM?'RM ':''}{m.a.toFixed(m.label.includes('output')?0:4)}</strong></div>
                        <div style={{fontSize:11,color:'#E24B4A'}}>B: <strong>{isRM?'RM ':''}{m.b.toFixed(m.label.includes('output')?0:4)}</strong></div>
                      </div>
                      <div style={{fontSize:10,fontWeight:500,color:worse?'#E24B4A':'#1D9E75'}}>
                        {diff>0?'+':''}{isRM?'RM ':''}{diff.toFixed(2)} ({diffPct>0?'+':''}{diffPct.toFixed(1)}%)
                      </div>
                      <div className="kpi-bar" style={{background:m.color}} />
                    </div>
                  );
                })}
              </div>

              {/* Bar comparison chart */}
              <div className="card" style={{marginBottom:12}}>
                <div className="card-head"><div><div className="card-title">Period A vs Period B — RM/m² comparison</div><div className="card-sub">{labelA} vs {labelB}</div></div></div>
                <div style={{height:220}}>
                  <Bar data={{
                    labels:['Copper RM/m²','PP RM/m²','Total RM/m²'],
                    datasets:[
                      {label:labelA, data:[avgMetric(periodA,'copper_foil_rm_per_m2'),avgMetric(periodA,'prepreg_rm_per_m2'),avgMetric(periodA,'total_rm_per_m2')], backgroundColor:'rgba(55,138,221,0.8)', borderRadius:4},
                      {label:labelB, data:[avgMetric(periodB,'copper_foil_rm_per_m2'),avgMetric(periodB,'prepreg_rm_per_m2'),avgMetric(periodB,'total_rm_per_m2')], backgroundColor:'rgba(226,75,74,0.8)',  borderRadius:4},
                    ]
                  }} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},color:tickColor}}},scales:{
                    x:{ticks:{font:{size:10},color:tickColor},grid:{display:false}},
                    y:{ticks:{font:{size:9},color:tickColor,callback:function(v){return 'RM'+v.toFixed(3);}},grid:{color:gridColor}}
                  }}} />
                </div>
              </div>

              {/* Price change tables */}
              {[['Copper Foil',copperChanges,'#EF9F27'],['PP',ppChanges,'#378ADD']].map(function(item){
                var matName=item[0], changes=item[1], color=item[2];
                if (!changes.length) return null;
                return (
                  <div key={matName} className="card" style={{marginBottom:12}}>
                    <div className="card-head">
                      <div>
                        <div className="card-title">{matName} — price & volume analysis</div>
                        <div className="card-sub">{labelA} vs {labelB} · {changes.length} products compared</div>
                      </div>
                    </div>
                    {/* Impact analysis */}
                    {(function(){
                      var imp = calcImpact(matName);
                      if (!imp) return null;
                      return (
                        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                          <div style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:8,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--text2)',marginBottom:4}}>RM/m² — {labelA}</div>
                            <div style={{fontSize:16,fontWeight:600,color:'#378ADD'}}>RM {imp.rmPerM2A}</div>
                          </div>
                          <div style={{padding:'10px 12px',background:'var(--bg3)',borderRadius:8,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--text2)',marginBottom:4}}>RM/m² — {labelB}</div>
                            <div style={{fontSize:16,fontWeight:600,color:'#E24B4A'}}>RM {imp.rmPerM2B}</div>
                          </div>
                          <div style={{padding:'10px 12px',background:imp.priceImpact>0?'rgba(226,75,74,0.08)':'rgba(29,158,117,0.08)',borderRadius:8,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--text2)',marginBottom:4}}>Due to price change</div>
                            <div style={{fontSize:16,fontWeight:600,color:imp.priceImpact>0?'#E24B4A':'#1D9E75'}}>
                              {imp.priceImpact>0?'+':''}{imp.priceImpact} RM/m²
                            </div>
                            <div style={{fontSize:9,color:'var(--text2)'}}>
                              Avg price: RM{imp.avgPriceA} → RM{imp.avgPriceB}
                            </div>
                          </div>
                          <div style={{padding:'10px 12px',background:imp.qtyImpact>0?'rgba(226,75,74,0.08)':'rgba(29,158,117,0.08)',borderRadius:8,textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--text2)',marginBottom:4}}>Due to quantity change</div>
                            <div style={{fontSize:16,fontWeight:600,color:imp.qtyImpact>0?'#E24B4A':'#1D9E75'}}>
                              {imp.qtyImpact>0?'+':''}{imp.qtyImpact} RM/m²
                            </div>
                            <div style={{fontSize:9,color:'var(--text2)'}}>
                              Qty/m²: {(imp.totalQtyA/imp.outA).toFixed(4)} → {(imp.totalQtyB/imp.outB).toFixed(4)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Price increase alert */}
                    {changes.filter(function(c){return c.changePct>5;}).length > 0 && (
                      <div style={{padding:'8px 12px',background:'rgba(226,75,74,0.08)',border:'1px solid #E24B4A',borderRadius:7,marginBottom:10,fontSize:11,color:'#A32D2D'}}>
                        ⚠️ <strong>{changes.filter(function(c){return c.changePct>5;}).length} product(s)</strong> show price increase {'>'} 5%!
                      </div>
                    )}
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Specs</th>
                            <th>Unit</th>
                            <SortTh col="priceA" label="Price A (RM)" />
                            <SortTh col="priceB" label="Price B (RM)" />
                            <SortTh col="changePct" label="Price change" />
                            <SortTh col="qtyA" label="Qty A" />
                            <SortTh col="qtyB" label="Qty B" />
                            <th>Qty change</th>
                            <SortTh col="amtA" label="Spend A (RM)" />
                            <SortTh col="amtB" label="Spend B (RM)" />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedChanges(changes).map(function(c){
                            var priceUp   = c.changePct > 0;
                            var priceDown = c.changePct < 0;
                            var qtyChange = c.qtyA > 0 ? ((c.qtyB-c.qtyA)/c.qtyA*100).toFixed(1) : 0;
                            return (
                              <tr key={c.name} style={{background:c.status==='new'?'rgba(29,158,117,0.06)':c.status==='removed'?'rgba(128,128,128,0.06)':c.changePct>5?'rgba(226,75,74,0.04)':c.changePct<-5?'rgba(29,158,117,0.04)':''}}>
                                <td style={{fontWeight:500,fontSize:11,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {c.name}
                                  {c.status==='new' && <span className="pill pill-green" style={{marginLeft:4,fontSize:8}}>NEW</span>}
                                  {c.status==='removed' && <span style={{marginLeft:4,fontSize:8,padding:'1px 5px',borderRadius:8,background:'#888',color:'#fff'}}>NOT IN B</span>}
                                </td>
                                <td style={{fontSize:10,color:'var(--text2)'}}>{c.specs}</td>
                                <td style={{fontSize:10}}>{c.unit}</td>
                                <td style={{fontSize:11,color:'#378ADD'}}>{c.priceA>0?c.priceA.toFixed(4):'—'}</td>
                                <td style={{fontSize:11,color:'#E24B4A'}}>{c.priceB>0?c.priceB.toFixed(4):'—'}</td>
                                <td>
                                  {c.status==='new' && <span style={{fontSize:11,color:'#1D9E75',fontWeight:500}}>🆕 New in B</span>}
                                  {c.status==='removed' && <span style={{fontSize:11,color:'#888',fontWeight:500}}>❌ Not in B</span>}
                                  {c.status==='both' && <span style={{fontSize:11,fontWeight:500,color:priceUp?'#E24B4A':priceDown?'#1D9E75':'var(--text2)'}}>
                                    {c.change>0?'+':''}{c.change.toFixed(4)} ({c.changePct>0?'+':''}{c.changePct}%)
                                    {c.changePct>5?' ⚠️':c.changePct<-5?' ✅':''}
                                  </span>}
                                </td>
                                <td style={{fontSize:11}}>{c.qtyA.toFixed(2)}</td>
                                <td style={{fontSize:11}}>{c.qtyB.toFixed(2)}</td>
                                <td style={{fontSize:11,color:parseFloat(qtyChange)>0?'#E24B4A':parseFloat(qtyChange)<0?'#1D9E75':'var(--text2)'}}>
                                  {qtyChange>0?'+':''}{qtyChange}%
                                </td>
                                <td style={{fontSize:11}}>RM {c.amtA.toFixed(2)}</td>
                                <td style={{fontSize:11}}>RM {c.amtB.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Top products by spend */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
                      {[[labelA, getProductSummary(detailA,matName), '#378ADD'],[labelB, getProductSummary(detailB,matName), '#E24B4A']].map(function(pd){
                        var pLabel=pd[0], prods=pd[1], pColor=pd[2];
                        if (!prods.length) return null;
                        var maxAmt = prods[0].amountRm||1;
                        return (
                          <div key={pLabel}>
                            <div style={{fontSize:11,fontWeight:600,color:pColor,marginBottom:8}}>{pLabel} — top products by spend</div>
                            {prods.slice(0,5).map(function(p,i){
                              return (
                                <div key={p.name} style={{marginBottom:6}}>
                                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:2}}>
                                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{p.name}</span>
                                    <span style={{fontWeight:500,color:pColor}}>RM {p.amountRm.toFixed(0)} · {p.qty.toFixed(1)} {p.unit}</span>
                                  </div>
                                  <div style={{height:4,background:'var(--bg3)',borderRadius:2}}>
                                    <div style={{height:'100%',width:(p.amountRm/maxAmt*100).toFixed(1)+'%',background:pColor,borderRadius:2}}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Summary for boss */}
              <div className="card" style={{marginBottom:12,border:'2px solid #0F6E56'}}>
                <div className="card-head"><div><div className="card-title">📋 Management summary</div><div className="card-sub">{labelA} vs {labelB}</div></div></div>
                <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:12}}>
                  {(function(){
                    var totalDiff = avgMetric(periodB,'total_rm_per_m2') - avgMetric(periodA,'total_rm_per_m2');
                    var copperDiff= avgMetric(periodB,'copper_foil_rm_per_m2') - avgMetric(periodA,'copper_foil_rm_per_m2');
                    var ppDiff    = avgMetric(periodB,'prepreg_rm_per_m2') - avgMetric(periodA,'prepreg_rm_per_m2');
                    var priceInc  = copperChanges.concat(ppChanges).filter(function(c){return c.changePct>5;});
                    var priceDec  = copperChanges.concat(ppChanges).filter(function(c){return c.changePct<-5;});
                    return (
                      <div>
                        <div style={{padding:'10px 14px',background:totalDiff>0?'rgba(226,75,74,0.06)':'rgba(29,158,117,0.06)',borderRadius:8,marginBottom:8}}>
                          <strong>Overall:</strong> Material cost per m² {totalDiff>0?'increased':'decreased'} by RM{Math.abs(totalDiff).toFixed(4)}/m²
                          ({totalDiff>0?'+':''}{(avgMetric(periodA,'total_rm_per_m2')>0?(totalDiff/avgMetric(periodA,'total_rm_per_m2')*100).toFixed(1):0)}%)
                          from {labelA} to {labelB}.
                        </div>
                        {copperDiff !== 0 && <div style={{padding:'6px 14px',background:'rgba(239,159,39,0.06)',borderRadius:8,marginBottom:4}}>
                          <strong>Copper Foil:</strong> RM/m² {copperDiff>0?'↑ increased':'↓ decreased'} by RM{Math.abs(copperDiff).toFixed(4)}/m²
                        </div>}
                        {ppDiff !== 0 && <div style={{padding:'6px 14px',background:'rgba(55,138,221,0.06)',borderRadius:8,marginBottom:4}}>
                          <strong>PP (Prepreg):</strong> RM/m² {ppDiff>0?'↑ increased':'↓ decreased'} by RM{Math.abs(ppDiff).toFixed(4)}/m²
                        </div>}
                        {priceInc.length > 0 && <div style={{padding:'6px 14px',background:'rgba(226,75,74,0.06)',borderRadius:8,marginBottom:4}}>
                          <strong>⚠️ Price increases {'>'} 5%:</strong> {priceInc.map(function(p){return p.name+' (+'+p.changePct+'%)';}).join(', ')}
                        </div>}
                        {priceDec.length > 0 && <div style={{padding:'6px 14px',background:'rgba(29,158,117,0.06)',borderRadius:8,marginBottom:4}}>
                          <strong>✅ Price decreases {'>'} 5%:</strong> {priceDec.map(function(p){return p.name+' ('+p.changePct+'%)';}).join(', ')}
                        </div>}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
