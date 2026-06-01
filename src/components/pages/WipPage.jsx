import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  'In Process':         { bg: '#E6F1FB', color: '#185FA5' },
  'Ready To Start':     { bg: '#EAF3DE', color: '#27500A' },
  'Queue':              { bg: '#F1EFE8', color: '#5F5E5A' },
  'Done':               { bg: '#E1F5EE', color: '#0F6E56' },
  'Waiting For Scrap':  { bg: '#FCEBEB', color: '#791F1F' },
};

function getDurationStyle(duration) {
  if (duration > 3)  return { bg: '#E24B4A', color: '#fff',    label: duration + 'd — overdue' };
  if (duration === 3) return { bg: '#EF9F27', color: '#fff',    label: '3d — warning' };
  return                     { bg: '#EAF3DE', color: '#27500A', label: duration + 'd — ok' };
}

export default function WipPage({ darkMode }) {
  const [data, setData]         = useState([]);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('overdue');

  const tickColor = darkMode ? '#9499b0' : '#666';

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const wb   = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed = rows.map(function(r) {
        let delivDate = r['DELIVERY_DATE'] || r['Delivery Date'] || r['delivery_date'] || '';
        if (delivDate && typeof delivDate === 'object') {
          delivDate = delivDate.toISOString ? delivDate.toISOString().slice(0,10) : String(delivDate);
        } else if (delivDate) {
          delivDate = String(delivDate).slice(0,10);
        }
        return {
          processCode:  r['PROCESS_CODE']     || '',
          processName:  (r['PROCESS_NAME']    || '').trim(),
          orderType:    r['ORDER_TYPE']        || '',
          partNumber:   r['Part Number']       || r['PART_NUMBER'] || '',
          runCard:      r['Run Card No.']      || r['RUN_CARD_NO'] || '',
          qty:          parseInt(r['CURRENT_QTY_PCS'] || r['QTY'] || 0),
          status:       r['Run Card Status']   || r['STATUS'] || '',
          duration:     parseFloat(r['DURATION(DAYS)'] || 0),
          salesOrder:   r['SALES_ORDER']       || '',
          deliveryDate: delivDate,

        };
      }).filter(function(r) { return r.partNumber || r.runCard; });
      setData(parsed);
      setFileName(file.name);
    };
    reader.readAsBinaryString(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (file) parseExcel(file);
  }

  const overdueMore3 = data.filter(function(r) { return r.duration > 3; });
  const atLimit      = data.filter(function(r) { return r.duration === 3; });
  const withinLimit  = data.filter(function(r) { return r.duration < 3; });

  const byStation = {};
  data.forEach(function(r) {
    const s = r.processName || 'Unknown';
    if (!byStation[s]) byStation[s] = 0;
    byStation[s]++;
  });

  const byStatus = {};
  data.forEach(function(r) {
    const s = r.status || 'Unknown';
    if (!byStatus[s]) byStatus[s] = 0;
    byStatus[s]++;
  });

  let filtered = data.filter(function(r) {
    const matchSearch = !search ||
      r.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.runCard.toLowerCase().includes(search.toLowerCase()) ||
      r.processName.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'overdue3') return r.duration > 3;
    if (filter === 'warning')  return r.duration === 3;
    if (filter === 'ok')       return r.duration < 3;
    return true;
  });

  filtered = filtered.slice().sort(function(a, b) {
    if (sortBy === 'delivery') return new Date(a.deliveryDate) - new Date(b.deliveryDate);
    if (sortBy === 'duration') return b.duration - a.duration;
    return 0;
  });

  return (
    <div>
      {data.length === 0 ? (
        <div>
          <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
            <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>WIP tracker</div>
            <div style={{fontSize:20,fontWeight:500}}>Work in progress</div>
            <div style={{fontSize:12,opacity:.8,marginTop:4}}>Drop your daily WIP Excel export to see lot priorities and overdue alerts</div>
          </div>

          <div
            onDragOver={function(e){e.preventDefault();setDragging(true);}}
            onDragLeave={function(){setDragging(false);}}
            onDrop={onDrop}
            style={{
              border: '2px dashed ' + (dragging ? '#378ADD' : 'var(--border2)'),
              borderRadius: 12,
              padding: '60px 20px',
              textAlign: 'center',
              background: dragging ? 'rgba(55,138,221,0.05)' : 'var(--bg3)',
              transition: 'all .2s',
              cursor: 'pointer',
            }}
            onClick={function(){document.getElementById('wip-file-input').click();}}
          >
            <div style={{fontSize:40,marginBottom:12}}>📂</div>
            <div style={{fontSize:15,fontWeight:500,color:'var(--text)',marginBottom:8}}>
              Drop your WIP Excel file here
            </div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:16}}>
              Supports .xls and .xlsx · Processed locally · Zero bandwidth used
            </div>
            <button className="btn-primary" style={{pointerEvents:'none'}}>
              Or click to browse
            </button>
            <input id="wip-file-input" type="file" accept=".xls,.xlsx" style={{display:'none'}}
              onChange={onFileChange} />
          </div>

          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {icon:'🔒',title:'100% private',desc:'File never leaves your browser — processed locally'},
              {icon:'⚡',title:'Instant analysis',desc:'Drop and see overdue lots and priorities immediately'},
              {icon:'🔄',title:'Daily refresh',desc:'Drop a new file each morning to update the view'},
            ].map(function(item){
              return (
                <div key={item.title} className="card" style={{textAlign:'center',padding:'16px 12px'}}>
                  <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{fileName}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{data.length} lots loaded · {new Date().toLocaleDateString('en-MY',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
            </div>
            <button className="btn-ghost" onClick={function(){setData([]);setFileName('');}}>
              <i className="ti ti-refresh" aria-hidden="true" /> Load new file
            </button>
          </div>

          {/* KPI summary */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            <div className="kpi-card" style={{cursor:'pointer',border:filter==='all'?'1px solid #378ADD':'1px solid var(--border)'}} onClick={function(){setFilter('all');}}>
              <div className="kpi-icon" style={{background:'#E6F1FB',color:'#185FA5'}}><i className="ti ti-layers" aria-hidden="true" /></div>
              <div className="kpi-label">Total lots</div>
              <div className="kpi-val">{data.length}</div>
              <div className="kpi-footer text-muted">{Object.keys(byStation).length} stations</div>
              <div className="kpi-bar" style={{background:'#378ADD'}} />
            </div>
            <div className="kpi-card" style={{cursor:'pointer',border:filter==='overdue3'?'1px solid #E24B4A':'1px solid var(--border)'}} onClick={function(){setFilter('overdue3');}}>
              <div className="kpi-icon" style={{background:'#FCEBEB',color:'#A32D2D'}}><i className="ti ti-alert-triangle" aria-hidden="true" /></div>
              <div className="kpi-label">Duration &gt;3 days</div>
              <div className="kpi-val" style={{color:'#E24B4A'}}>{overdueMore3.length}</div>
              <div className="kpi-footer" style={{color:'#E24B4A'}}>Needs attention</div>
              <div className="kpi-bar" style={{background:'#E24B4A'}} />
            </div>
            <div className="kpi-card" style={{cursor:'pointer',border:filter==='warning'?'1px solid #EF9F27':'1px solid var(--border)'}} onClick={function(){setFilter('warning');}}>
              <div className="kpi-icon" style={{background:'#FAEEDA',color:'#854F0B'}}><i className="ti ti-clock" aria-hidden="true" /></div>
              <div className="kpi-label">At limit (3 days)</div>
              <div className="kpi-val" style={{color:'#EF9F27'}}>{atLimit.length}</div>
              <div className="kpi-footer text-muted">Warning</div>
              <div className="kpi-bar" style={{background:'#EF9F27'}} />
            </div>
            <div className="kpi-card" style={{cursor:'pointer',border:filter==='ok'?'1px solid #1D9E75':'1px solid var(--border)'}} onClick={function(){setFilter('ok');}}>
              <div className="kpi-icon" style={{background:'#E1F5EE',color:'#0F6E56'}}><i className="ti ti-circle-check" aria-hidden="true" /></div>
              <div className="kpi-label">Within limit</div>
              <div className="kpi-val" style={{color:'#1D9E75'}}>{withinLimit.length}</div>
              <div className="kpi-footer text-muted">0-2 days</div>
              <div className="kpi-bar" style={{background:'#1D9E75'}} />
            </div>
          </div>

          {/* Overdue >3 days alert banner */}
          {overdueMore3.length > 0 && (
            <div style={{background:'#791F1F',borderRadius:10,padding:'12px 16px',marginBottom:12,color:'#fff',display:'flex',alignItems:'center',gap:12}}>
              <i className="ti ti-alert-triangle" style={{fontSize:24,flexShrink:0}} aria-hidden="true" />
              <div>
                <div style={{fontSize:13,fontWeight:500}}>{overdueMore3.length} lots have been in process for more than 3 days!</div>
                <div style={{fontSize:11,opacity:.8}}>
                  {overdueMore3.slice(0,3).map(function(r){return r.partNumber + ' (' + r.duration + 'd)';}).join(' · ')}
                  {overdueMore3.length > 3 ? ' · and ' + (overdueMore3.length-3) + ' more...' : ''}
                </div>
              </div>
              <button className="btn-ghost" onClick={function(){setFilter('overdue3');}}
                style={{marginLeft:'auto',color:'#fff',borderColor:'rgba(255,255,255,0.3)',flexShrink:0,fontSize:11}}>
                View all
              </button>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            {/* By station */}
            <div className="card">
              <div className="card-head"><div className="card-title">Lots by station</div></div>
              {Object.entries(byStation).sort(function(a,b){return b[1]-a[1];}).map(function(entry){
                const name=entry[0], count=entry[1];
                const maxV = Math.max.apply(null, Object.values(byStation));
                return (
                  <div key={name} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                      <span style={{color:'var(--text)'}}>{name}</span>
                      <span style={{fontWeight:500,color:'var(--text)'}}>{count}</span>
                    </div>
                    <div style={{height:5,background:'var(--bg3)',borderRadius:3}}>
                      <div style={{height:'100%',width:(count/maxV*100).toFixed(0)+'%',background:'#378ADD',borderRadius:3}}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By status */}
            <div className="card">
              <div className="card-head"><div className="card-title">Lots by status</div></div>
              {Object.entries(byStatus).sort(function(a,b){return b[1]-a[1];}).map(function(entry){
                const name=entry[0], count=entry[1];
                const sc = STATUS_COLORS[name] || {bg:'#F1EFE8',color:'#5F5E5A'};
                return (
                  <div key={name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:11,color:'var(--text)'}}>{name}</span>
                    <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:500,background:sc.bg,color:sc.color}}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="filter-bar" style={{marginBottom:10}}>
            <input type="text" placeholder="Search part no, run card, station..."
              value={search} onChange={function(e){setSearch(e.target.value);}}
              style={{fontSize:12,padding:'5px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none',width:220}} />
            <div className="filter-sep" />
            <label style={{fontSize:11,color:'var(--text2)'}}>Filter:</label>
            {[['all','All'],['overdue3','Duration >3d'],['warning','At limit 3d'],['ok','Within limit']].map(function(item){
              return <button key={item[0]} className={'quick-btn'+(filter===item[0]?' active':'')} onClick={function(){setFilter(item[0]);}}>{item[1]}</button>;
            })}
            <div className="filter-sep" />
            <label style={{fontSize:11,color:'var(--text2)'}}>Sort:</label>
            <select value={sortBy} onChange={function(e){setSortBy(e.target.value);}}
              style={{fontSize:11,padding:'4px 8px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}>
              <option value="delivery">Delivery date (earliest first)</option>
              <option value="duration">Longest in process first</option>
            </select>
            <div className="filter-right" style={{fontSize:11,color:'var(--text2)'}}>{filtered.length} lots</div>
          </div>

          {/* Main table */}
          <div className="card">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Run card</th>
                    <th>Part number</th>
                    <th>Station</th>
                    <th>Status</th>
                    <th>Qty</th>
                    <th>Duration</th>
                    <th>Delivery date</th>
                    <th>Priority</th>
                    <th>Order type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(function(r, i) {
                    const sc = STATUS_COLORS[r.status] || {bg:'#F1EFE8',color:'#5F5E5A'};
                    const isUrgent = r.duration > 3;
                    return (
                      <tr key={i} style={{background:isUrgent?'rgba(226,75,74,0.05)':''}}>
                        <td style={{fontWeight:500,fontSize:11,whiteSpace:'nowrap'}}>{r.runCard}</td>
                        <td style={{fontSize:11,whiteSpace:'nowrap',color:isUrgent?'#E24B4A':'var(--text)',fontWeight:isUrgent?500:400}}>{r.partNumber}</td>
                        <td style={{fontSize:11,whiteSpace:'nowrap',color:'var(--text2)'}}>{r.processName}</td>
                        <td>
                          <span style={{padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:500,background:sc.bg,color:sc.color,whiteSpace:'nowrap'}}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{fontSize:11,textAlign:'right'}}>{r.qty.toLocaleString()}</td>
                        <td style={{fontSize:11,textAlign:'right',color:r.duration>100?'#E24B4A':'var(--text2)'}}>{r.duration}d</td>
                        <td style={{fontSize:11,whiteSpace:'nowrap'}}>{r.deliveryDate}</td>
                        <td>
                          {(function(){
                            const ds = getDurationStyle(r.duration);
                            return (
                              <span style={{padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:500,background:ds.bg,color:ds.color,whiteSpace:'nowrap'}}>
                                {ds.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{fontSize:10,color:'var(--text2)'}}>{r.orderType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="empty">No lots match your filter</div>}
          </div>
        </div>
      )}
    </div>
  );
}
