import { useState, useEffect } from 'react';
import { storageGet, storageSet, saveDayMaterials, getDayMaterials, getOperatorsList, getStationsList } from '../../utils/storage';
import { SHIFT_OPTIONS, DEFECTS } from '../../utils/constants';

const AVT_BG = ['#EAF3DE','#E6F1FB','#FAEEDA','#FCEBEB','#EEEDFE','#E1F5EE'];
const AVT_TC = ['#27500A','#0C447C','#633806','#791F1F','#3B3599','#0F6E56'];

export default function EntryPage({ globalDate, toast, onSave }) {
  const [fields, setFields] = useState({
    output:'', target:'', scrap:'', aoi:'',
    dent:'', scratch:'', wrinkle:'', notes:'',
    delayReason:'', noProduction: false
  });
  const [defVals, setDefVals]       = useState({});
  const [stnMorning, setStnMorning] = useState({});
  const [stnNight, setStnNight]     = useState({});
  const [matIssue, setMatIssue]     = useState({ copperFoil:'', prepreg:'' });
  const [ops, setOps]               = useState([]);
  const [stationNames, setStationNames] = useState([]);
  const [opSearch, setOpSearch]     = useState('');
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving]         = useState(false);

  useEffect(function() {
    async function loadAll() {
      const opsList = await getOperatorsList();
      const stnList = await getStationsList();
      setStationNames(stnList);

      const d = await storageGet('day:' + globalDate);
      if (d) {
        setFields({
          output: d.output || '', target: d.target || '',
          scrap: d.scrap || '', aoi: d.aoi || '',
          dent: d.dent || '', scratch: d.scratch || '',
          wrinkle: d.wrinkle || '', notes: d.notes || '',
          delayReason: d.delayReason || '',
          noProduction: d.noProduction || false,
        });
        setDefVals(d.defects || {});
        setStnMorning(d.stations_morning || {});
        setStnNight(d.stations_night || {});
        if (d.operators && d.operators.length > 0) {
          setOps(d.operators);
        } else if (opsList.length > 0) {
          setOps(opsList.map(function(o) { return { name: o.name, shift: 'day' }; }));
        }
        const mat = await getDayMaterials(globalDate);
        setMatIssue({ copperFoil: mat.copperFoil || '', prepreg: mat.prepreg || '' });
      } else {
        if (opsList.length > 0) {
          setOps(opsList.map(function(o) { return { name: o.name, shift: 'day' }; }));
        }
      }
    }
    loadAll();
  }, [globalDate]);

  const autoAoi = ((parseFloat(fields.dent)||0) + (parseFloat(fields.scratch)||0) + (parseFloat(fields.wrinkle)||0)).toFixed(2);

  const totalMh = ops.reduce(function(s, o) {
    const sh = SHIFT_OPTIONS.find(function(x) { return x.value === (o.shift||'day'); }) || SHIFT_OPTIONS[0];
    return s + sh.hours;
  }, 0);

  const totalM2hr = totalMh > 0 && parseFloat(fields.output) > 0
    ? (parseFloat(fields.output) / totalMh).toFixed(2) : 0;

  function setShift(idx, val) {
    setOps(function(prev) {
      const n = prev.slice();
      n[idx] = Object.assign({}, n[idx], { shift: val });
      return n;
    });
  }

  function toggleSelectOp(name) {
    setSelectedOps(function(prev) {
      if (prev.indexOf(name) >= 0) return prev.filter(function(n) { return n !== name; });
      return prev.concat([name]);
    });
  }

  function selectAllVisible() {
    const visible = ops.filter(function(o) {
      return !opSearch || o.name.toLowerCase().includes(opSearch.toLowerCase());
    }).map(function(o) { return o.name; });
    setSelectedOps(visible);
  }

  function clearSelection() { setSelectedOps([]); }

  function setSelectedShift(shiftVal) {
    if (selectedOps.length === 0) { toast('No operators selected'); return; }
    setOps(ops.map(function(o) {
      if (selectedOps.indexOf(o.name) >= 0) return Object.assign({}, o, { shift: shiftVal });
      return o;
    }));
    toast(selectedOps.length + ' operators set to ' + shiftVal);
    setSelectedOps([]);
  }

  function setAllMgmtCut() {
    setOps(ops.map(function(o) {
      return Object.assign({}, o, { shift: o.shift === 'absent' ? 'absent' : 'cut_mgmt' });
    }));
    toast('All set to Management Cut OT');
  }

  function setAllNormal() {
    setOps(ops.map(function(o) {
      return Object.assign({}, o, { shift: o.shift === 'absent' ? 'absent' : 'day' });
    }));
    toast('All set to Day shift');
  }

  function setAllPublicHoliday() {
    setOps(ops.map(function(o) { return Object.assign({}, o, { shift: 'absent' }); }));
    toast('All set to Public Holiday (Absent)');
  }

  async function handleSave() {
    setSaving(true);
    const ok = await storageSet('day:' + globalDate, {
      output:  parseFloat(fields.output)  || 0,
      target:  parseFloat(fields.target)  || 0,
      scrap:   parseFloat(fields.scrap)   || 0,
      aoi:     parseFloat(autoAoi)        || 0,
      dent:    parseFloat(fields.dent)    || 0,
      scratch: parseFloat(fields.scratch) || 0,
      wrinkle: parseFloat(fields.wrinkle) || 0,
      mh:      totalMh,
      m2hr:    parseFloat(totalM2hr)      || 0,
      notes:   fields.notes,
      delayReason: fields.delayReason,
      noProduction: fields.noProduction || false,
      defects: defVals,
      stations: stnMorning,
      stations_morning: stnMorning,
      stations_night:   stnNight,
      operators: ops,
    });
    if (ok) {
      await saveDayMaterials(globalDate, {
        copperFoil: parseFloat(matIssue.copperFoil) || 0,
        prepreg:    parseFloat(matIssue.prepreg)    || 0,
      });
      if (onSave) onSave();
      toast('Saved — ' + globalDate);
    } else {
      toast('Error saving');
    }
    setSaving(false);
  }

  const showDelayWarning = parseFloat(fields.output) > 0 && parseFloat(fields.target) > 0 && parseFloat(fields.output) < parseFloat(fields.target);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>Daily entry — {globalDate}</div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div className="section-lbl" style={{margin:0}}>Output and target</div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,cursor:'pointer',
            background:fields.noProduction?'#FCEBEB':'var(--bg3)',
            border:'1px solid '+(fields.noProduction?'#E24B4A':'var(--border2)')}}
            onClick={function(){
              var np = !fields.noProduction;
              setFields(function(f){ return Object.assign({},f,{
                noProduction:np, output:np?'0':'', scrap:np?'0':'',
                dent:np?'0':'', scratch:np?'0':'', wrinkle:np?'0':'',
              });});
              if (np) toast('Marked as no production day');
            }}>
            <div style={{width:18,height:18,borderRadius:4,border:'1.5px solid '+(fields.noProduction?'#E24B4A':'var(--border2)'),
              background:fields.noProduction?'#E24B4A':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {fields.noProduction && <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
            </div>
            <span style={{fontSize:11,fontWeight:500,color:fields.noProduction?'#E24B4A':'var(--text2)'}}>No production today</span>
          </div>
        </div>
        {fields.noProduction && (
          <div style={{padding:'8px 12px',background:'rgba(226,75,74,0.06)',borderRadius:7,marginBottom:8,fontSize:11,color:'#A32D2D'}}>
            Marked as no production — output and scrap set to 0.
          </div>
        )}
        <div className="form-grid">
          <div className="fg">
            <label>Daily output (m²)</label>
            <input type="number" value={fields.output} disabled={fields.noProduction}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{output:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Target (m²)</label>
            <input type="number" value={fields.target}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{target:e.target.value});});}} />
          </div>
        </div>
        {showDelayWarning && (
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,color:'#A32D2D',fontWeight:500,marginBottom:4}}>⚠️ Output below target — please enter delay reason</div>
            <textarea value={fields.delayReason}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{delayReason:e.target.value});});}}
              placeholder="Enter reason for delay..."
              style={{width:'100%',minHeight:60,fontSize:12,padding:'6px 10px',border:'1px solid #E24B4A',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none',resize:'vertical'}} />
          </div>
        )}
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">AOI scrap breakdown</div>
        <div className="form-grid">
          <div className="fg">
            <label>Dent (%)</label>
            <input type="number" step=".01" value={fields.dent} disabled={fields.noProduction}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{dent:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Scratches (%)</label>
            <input type="number" step=".01" value={fields.scratch} disabled={fields.noProduction}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{scratch:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Wrinkle (%)</label>
            <input type="number" step=".01" value={fields.wrinkle} disabled={fields.noProduction}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{wrinkle:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>AOI scrap % — auto</label>
            <input type="number" value={autoAoi} readOnly
              style={{background:'var(--bg3)',color:'var(--text2)',cursor:'not-allowed'}} />
          </div>
          <div className="fg">
            <label>Total scrap rate (%)</label>
            <input type="number" step=".01" value={fields.scrap} disabled={fields.noProduction}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{scrap:e.target.value});});}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Defect breakdown (%)</div>
        <div className="form-grid">
          {DEFECTS.map(function(def) {
            return (
              <div key={def} className="fg">
                <label>{def}</label>
                <input type="number" step=".0001" value={defVals[def]||''}
                  onChange={function(e){setDefVals(function(prev){return Object.assign({},prev,{[def]:e.target.value});});}} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Station output</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Station</th>
                <th style={{textAlign:'center',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Morning (m²)</th>
                <th style={{textAlign:'center',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Night (m²)</th>
                <th style={{textAlign:'center',padding:'6px 8px',fontSize:11,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stationNames.map(function(stn) {
                var m = parseFloat(stnMorning[stn.name]||0);
                var n = parseFloat(stnNight[stn.name]||0);
                return (
                  <tr key={stn.name}>
                    <td style={{padding:'4px 8px',fontSize:12}}>{stn.name}</td>
                    <td style={{padding:'4px 8px'}}>
                      <input type="number" value={stnMorning[stn.name]||''}
                        onChange={function(e){setStnMorning(function(p){return Object.assign({},p,{[stn.name]:e.target.value});});}}
                        style={{width:80,textAlign:'center',fontSize:12,padding:'3px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                    </td>
                    <td style={{padding:'4px 8px'}}>
                      <input type="number" value={stnNight[stn.name]||''}
                        onChange={function(e){setStnNight(function(p){return Object.assign({},p,{[stn.name]:e.target.value});});}}
                        style={{width:80,textAlign:'center',fontSize:12,padding:'3px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                    </td>
                    <td style={{padding:'4px 8px',textAlign:'center',fontSize:12,fontWeight:500,color:'var(--text)'}}>{(m+n).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Daily material issuance</div>
        <div className="form-grid">
          <div className="fg">
            <label>Copper foil (RM)</label>
            <input type="number" value={matIssue.copperFoil}
              onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{copperFoil:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Prepreg (RM)</label>
            <input type="number" value={matIssue.prepreg}
              onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{prepreg:e.target.value});});}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div className="section-lbl" style={{margin:0}}>Operator attendance ({ops.length})</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className="btn-ghost" onClick={setAllNormal} style={{fontSize:11}}>All normal</button>
            <button className="btn-primary" onClick={setAllMgmtCut} style={{fontSize:11,background:'#185FA5'}}>All mgmt cut OT</button>
            <button className="btn-primary" onClick={setAllPublicHoliday} style={{fontSize:11,background:'#E24B4A'}}>All public holiday</button>
          </div>
        </div>
        <div className="divider" />
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
          <input type="text" placeholder="Search operator..." value={opSearch}
            onChange={function(e){setOpSearch(e.target.value);}}
            style={{flex:1,minWidth:140,fontSize:12,padding:'5px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          {selectedOps.length > 0 && <span style={{fontSize:11,color:'var(--text2)'}}>{selectedOps.length} selected</span>}
          <button className="btn-ghost" onClick={selectAllVisible} style={{fontSize:11}}>Select all</button>
          {selectedOps.length > 0 && <button className="btn-ghost" onClick={clearSelection} style={{fontSize:11}}>Clear</button>}
        </div>
        {selectedOps.length > 0 && (
          <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap',padding:'8px 10px',background:'rgba(55,138,221,0.07)',borderRadius:8,border:'1px solid rgba(55,138,221,0.2)'}}>
            <span style={{fontSize:11,color:'var(--text2)',alignSelf:'center'}}>Set selected to:</span>
            <button className="btn-ghost" onClick={function(){setSelectedShift('day');}} style={{fontSize:11}}>Day</button>
            <button className="btn-ghost" onClick={function(){setSelectedShift('night');}} style={{fontSize:11}}>Night</button>
            <button className="btn-primary" onClick={function(){setSelectedShift('cut_self');}} style={{fontSize:11,background:'#A32D2D'}}>Self cut OT</button>
            <button className="btn-primary" onClick={function(){setSelectedShift('cut_mgmt');}} style={{fontSize:11,background:'#185FA5'}}>Mgmt cut OT</button>
            <button className="btn-ghost" onClick={function(){setSelectedShift('absent');}} style={{fontSize:11}}>Absent</button>
          </div>
        )}
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {ops.filter(function(op) {
            return !opSearch || op.name.toLowerCase().includes(opSearch.toLowerCase());
          }).map(function(op, i) {
            const sh = SHIFT_OPTIONS.find(function(x){ return x.value===(op.shift||'day'); })||SHIFT_OPTIONS[0];
            const isSelected = selectedOps.indexOf(op.name) >= 0;
            const globalIdx = ops.findIndex(function(o){ return o.name===op.name; });
            return (
              <div key={i} className="op-row"
                style={{background:isSelected?'rgba(55,138,221,0.08)':'',borderRadius:isSelected?6:0,cursor:'pointer'}}
                onClick={function(e){ if(e.target.tagName==='SELECT') return; toggleSelectOp(op.name); }}>
                <div style={{width:18,height:18,borderRadius:4,border:'1.5px solid '+(isSelected?'#378ADD':'var(--border2)'),
                  background:isSelected?'#378ADD':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {isSelected && <span style={{color:'#fff',fontSize:12,fontWeight:700,lineHeight:1}}>✓</span>}
                </div>
                <div className="op-avatar" style={{background:AVT_BG[globalIdx%6],color:AVT_TC[globalIdx%6]}}>
                  {op.name.slice(0,2).toUpperCase()}
                </div>
                <span className="op-name">{op.name}</span>
                <select value={op.shift||'day'} onClick={function(e){e.stopPropagation();}}
                  onChange={function(e){ setShift(globalIdx, e.target.value); }}>
                  {SHIFT_OPTIONS.map(function(s){
                    return <option key={s.value} value={s.value}>{s.label} ({s.hours}h)</option>;
                  })}
                </select>
                <span className="shift-badge" style={{background:sh.color,color:sh.tc}}>{sh.short}</span>
                <span className="op-hours">{sh.hours}h</span>
              </div>
            );
          })}
          {ops.filter(function(op){return !opSearch||op.name.toLowerCase().includes(opSearch.toLowerCase());}).length===0 && (
            <div className="empty">No operators match "{opSearch}"</div>
          )}
        </div>
        <div style={{marginTop:10,padding:'8px 12px',background:'var(--bg3)',borderRadius:7,display:'flex',gap:20,fontSize:12}}>
          <span>Total manhours: <strong>{totalMh}h</strong></span>
          <span>m²/hr: <strong>{totalM2hr}</strong></span>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Notes</div>
        <textarea value={fields.notes}
          onChange={function(e){setFields(function(f){return Object.assign({},f,{notes:e.target.value});});}}
          placeholder="Any notes for today..."
          style={{width:'100%',minHeight:80,fontSize:12,padding:'8px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none',resize:'vertical'}} />
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{width:'100%',padding:12,fontSize:13}}>
        {saving ? 'Saving...' : 'Save entry — ' + globalDate}
      </button>
    </div>
  );
}
