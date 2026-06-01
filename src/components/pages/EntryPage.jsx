import { useState, useEffect } from 'react';
import { storageGet, storageSet, getDayMaterials, saveDayMaterials, getOperatorsList, getStationsList } from '../../utils/storage';
import { DEFECTS, SHIFT_OPTIONS } from '../../utils/constants';

const AVT_BG = ['#E6F1FB','#E1F5EE','#FAEEDA','#FCEBEB','#EEEDFE','#FBEAF0'];
const AVT_TC = ['#0C447C','#085041','#633806','#791F1F','#3C3489','#72243E'];

export default function EntryPage({ globalDate, onSave, toast }) {
  const [ops, setOps]               = useState([]);
  const [stationNames, setStationNames] = useState([]);
  const [stnMorning, setStnMorning] = useState({});
  const [stnNight, setStnNight]     = useState({});
  const [defVals, setDefVals]       = useState({});
  const [matIssue, setMatIssue]     = useState({ copperFoil: '', prepreg: '' });
  const [fields, setFields]         = useState({
    output: '', target: '', scrap: '', aoi: '',
    dent: '', scratch: '', wrinkle: '', notes: '',
    delayReason: ''
  });

  useEffect(function() {
    async function loadDefaults() {
      const opsList = await getOperatorsList();
      const stnList = await getStationsList();
      setStationNames(stnList);
      if (opsList.length > 0) {
        setOps(opsList.map(function(op) { return { name: op.name, shift: 'day' }; }));
      }
    }
    loadDefaults();
  }, []);

  const totalMh = ops.reduce(function(s, o) {
    const sh = SHIFT_OPTIONS.find(function(x) { return x.value === (o.shift || 'day'); });
    return s + (sh ? sh.hours : 0);
  }, 0);

  const m2hr         = totalMh > 0 ? ((parseFloat(fields.output) || 0) / totalMh).toFixed(2) : 0;
  const dayCount     = ops.filter(function(o) { return o.shift === 'day'; }).length;
  const nightCount   = ops.filter(function(o) { return o.shift === 'night'; }).length;
  const cutSelfCount = ops.filter(function(o) { return o.shift === 'cut_self'; }).length;
  const cutMgmtCount = ops.filter(function(o) { return o.shift === 'cut_mgmt'; }).length;
  const absentCount  = ops.filter(function(o) { return o.shift === 'absent'; }).length;

  async function load() {
    const d = await storageGet('day:' + globalDate);
    if (!d) { toast('No data for ' + globalDate); return; }
    setFields({
      output: d.output || '', target: d.target || '',
      scrap: d.scrap || '', aoi: d.aoi || '',
      dent: d.dent || '', scratch: d.scratch || '',
      wrinkle: d.wrinkle || '', notes: d.notes || '',
      delayReason: d.delayReason || ''
    });
    setDefVals(d.defects || {});
    setStnMorning(d.stations_morning || {});
    setStnNight(d.stations_night || {});
    if (d.operators && d.operators.length > 0) setOps(d.operators);
    const mat = await getDayMaterials(globalDate);
    setMatIssue({ copperFoil: mat.copperFoil || '', prepreg: mat.prepreg || '' });
    toast('Loaded — ' + globalDate);
  }

  async function save() {
    const morning = {};
    const night = {};
    stationNames.forEach(function(stn, i) {
      morning[i + 1] = parseFloat(stnMorning[i + 1]) || 0;
      night[i + 1]   = parseFloat(stnNight[i + 1])   || 0;
    });
    const totalStations = {};
    stationNames.forEach(function(stn, i) {
      totalStations[i + 1] = (morning[i + 1] || 0) + (night[i + 1] || 0);
    });
    const entry = {
      output:  parseFloat(fields.output)  || 0,
      target:  parseFloat(fields.target)  || 0,
      scrap:   parseFloat(fields.scrap)   || 0,
      aoi:     parseFloat(fields.aoi)     || 0,
      dent:    parseFloat(fields.dent)    || 0,
      scratch: parseFloat(fields.scratch) || 0,
      wrinkle: parseFloat(fields.wrinkle) || 0,
      notes:   fields.notes,
      delayReason: fields.delayReason,
      defects: defVals,
      stations: totalStations,
      stations_morning: morning,
      stations_night: night,
      operators: ops,
      mh: totalMh,
      m2hr: m2hr,
    };
    const ok1 = await storageSet('day:' + globalDate, entry);
    const ok2 = await saveDayMaterials(globalDate, {
      copperFoil: parseFloat(matIssue.copperFoil) || 0,
      prepreg:    parseFloat(matIssue.prepreg)    || 0,
    });
    if (ok1 && ok2) { toast('Saved — ' + globalDate); onSave(); }
    else toast('Save error');
  }

  function setShift(i, val) {
    const n = ops.slice();
    n[i] = Object.assign({}, n[i], { shift: val });
    setOps(n);
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

  function updateMorning(idx, val) {
    setStnMorning(function(prev) {
      const next = Object.assign({}, prev);
      next[idx] = val;
      return next;
    });
  }

  function updateNight(idx, val) {
    setStnNight(function(prev) {
      const next = Object.assign({}, prev);
      next[idx] = val;
      return next;
    });
  }

  function updateDef(name, val) {
    setDefVals(function(prev) {
      const next = Object.assign({}, prev);
      next[name] = parseFloat(val) || 0;
      return next;
    });
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        <span style={{fontSize:12,color:'var(--text2)'}}>Editing: {globalDate}</span>
        <button className="btn-ghost" onClick={load}>Load saved</button>
        <button className="btn-primary" onClick={save}>Save</button>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Output and target</div>
        <div className="form-grid">
          <div className="fg">
            <label>Daily output (m2)</label>
            <input type="number" value={fields.output}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{output:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Target (m2)</label>
            <input type="number" value={fields.target}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{target:e.target.value});});}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Scrap rates</div>
        <div className="form-grid" style={{marginBottom:10}}>
          <div className="fg">
            <label>Total scrap (%)</label>
            <input type="number" step=".01" value={fields.scrap}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{scrap:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>AOI scrap (%)</label>
            <input type="number" step=".01" value={fields.aoi}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{aoi:e.target.value});});}} />
          </div>
        </div>
        <div className="divider" />
        <div className="section-lbl" style={{marginTop:0}}>Top 6 defects (% of scrap)</div>
        <div className="form-grid">
          {DEFECTS.map(function(n) {
            return (
              <div key={n} className="fg">
                <label>{n} (%)</label>
                <input type="number" step=".1" min="0" max="100"
                  value={defVals[n] || ''}
                  placeholder="0"
                  onChange={function(e) { updateDef(n, e.target.value); }} />
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <div className="section-lbl" style={{marginTop:0}}>AOI breakdown</div>
        <div className="form-grid">
          <div className="fg">
            <label>Dent (%)</label>
            <input type="number" step=".01" value={fields.dent}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{dent:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Scratches (%)</label>
            <input type="number" step=".01" value={fields.scratch}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{scratch:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Wrinkle (%)</label>
            <input type="number" step=".01" value={fields.wrinkle}
              onChange={function(e){setFields(function(f){return Object.assign({},f,{wrinkle:e.target.value});});}} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div className="section-lbl" style={{margin:0}}>Operator attendance ({ops.length})</div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn-ghost" onClick={setAllNormal} style={{fontSize:11}}>All normal</button>
            <button className="btn-primary" onClick={setAllMgmtCut} style={{fontSize:11,background:'#185FA5'}}>
              All mgmt cut OT
            </button>
          </div>
        </div>
        <div className="divider" />
        <div className="att-grid">
          <div className="att-kpi"><div className="av">{dayCount}</div><div className="al">Day 7-7</div></div>
          <div className="att-kpi"><div className="av">{nightCount}</div><div className="al">Night 7-7</div></div>
          <div className="att-kpi" style={{borderTop:'2px solid #E24B4A'}}>
            <div className="av" style={{color:'#E24B4A'}}>{cutSelfCount}</div><div className="al">Self cut</div>
          </div>
          <div className="att-kpi" style={{borderTop:'2px solid #378ADD'}}>
            <div className="av" style={{color:'#378ADD'}}>{cutMgmtCount}</div><div className="al">Mgmt cut</div>
          </div>
          <div className="att-kpi">
            <div className="av" style={{color:'var(--text2)'}}>{absentCount}</div><div className="al">Absent</div>
          </div>
        </div>
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {ops.map(function(op, i) {
            const sh = SHIFT_OPTIONS.find(function(x) { return x.value === (op.shift || 'day'); }) || SHIFT_OPTIONS[0];
            return (
              <div key={i} className="op-row">
                <div className="op-avatar" style={{background:AVT_BG[i%6],color:AVT_TC[i%6]}}>
                  {op.name.slice(0,2).toUpperCase()}
                </div>
                <span className="op-name">{op.name}</span>
                <select value={op.shift || 'day'} onChange={function(e) { setShift(i, e.target.value); }}>
                  {SHIFT_OPTIONS.map(function(s) {
                    return <option key={s.value} value={s.value}>{s.label} ({s.hours}h)</option>;
                  })}
                </select>
                <span className="shift-badge" style={{background:sh.color,color:sh.tc}}>{sh.short}</span>
                <span className="op-hours">{sh.hours}h</span>
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <div className="form-grid">
          <div className="fg"><label>Total man-hours</label><input type="number" value={totalMh} readOnly /></div>
          <div className="fg"><label>m2/hr</label><input type="number" value={m2hr} readOnly /></div>
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl" style={{marginTop:0}}>Station output — Morning shift (7am-7pm)</div>
        <div className="stn-input-grid">
          {stationNames.map(function(stn, i) {
            return (
              <div key={stn.id || i} className="stn-input-cell">
                <label>{stn.name}</label>
                <input type="number" step=".1"
                  value={stnMorning[i+1] || ''}
                  placeholder="0"
                  onChange={function(e) { updateMorning(i+1, e.target.value); }} />
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <div className="section-lbl" style={{marginTop:0}}>Station output — Night shift (7pm-7am)</div>
        <div className="stn-input-grid">
          {stationNames.map(function(stn, i) {
            return (
              <div key={stn.id || i} className="stn-input-cell">
                <label>{stn.name}</label>
                <input type="number" step=".1"
                  value={stnNight[i+1] || ''}
                  placeholder="0"
                  onChange={function(e) { updateNight(i+1, e.target.value); }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl" style={{marginTop:0}}>Daily material issuance from store</div>
        <div className="mat-issue-grid">
          <div className="mat-issue-card">
            <div className="mat-issue-title" style={{color:'#EF9F27'}}>
              <i className="ti ti-roll" aria-hidden="true" /> Copper foil
            </div>
            <div className="fg">
              <label>RM issued today</label>
              <input type="number" step="0.01" placeholder="0.00"
                value={matIssue.copperFoil}
                onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{copperFoil:e.target.value});});}} />
            </div>
          </div>
          <div className="mat-issue-card">
            <div className="mat-issue-title" style={{color:'#378ADD'}}>
              <i className="ti ti-layers" aria-hidden="true" /> Prepreg
            </div>
            <div className="fg">
              <label>RM issued today</label>
              <input type="number" step="0.01" placeholder="0.00"
                value={matIssue.prepreg}
                onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{prepreg:e.target.value});});}} />
            </div>
          </div>
        </div>
      </div>

      {(function() {
        const output = parseFloat(fields.output) || 0;
        const target = parseFloat(fields.target) || 0;
        const isBelow = target > 0 && output < target;
        const shortfall = target - output;
        if (!isBelow) return null;
        return (
          <div className="card" style={{marginBottom:10,border:'1px solid #E24B4A',background:'rgba(226,75,74,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#FCEBEB',color:'#E24B4A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                ⚠️
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#E24B4A'}}>Output below target</div>
                <div style={{fontSize:11,color:'var(--text2)'}}>
                  Short by {shortfall.toLocaleString()} m² ({((shortfall/target)*100).toFixed(1)}% gap) — please provide reason
                </div>
              </div>
            </div>
            <div className="fg">
              <label style={{color:'#E24B4A'}}>Reason for output delay (required)</label>
              <textarea
                value={fields.delayReason || ''}
                placeholder="e.g. Machine downtime at Oxide station, material shortage, manpower issue..."
                style={{borderColor:'#E24B4A',minHeight:70}}
                onChange={function(e){setFields(function(f){return Object.assign({},f,{delayReason:e.target.value});});}}
              />
            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="section-lbl" style={{marginTop:0}}>Notes and remarks</div>
        <div className="fg">
          <textarea value={fields.notes} placeholder="Reasons, observations..."
            onChange={function(e){setFields(function(f){return Object.assign({},f,{notes:e.target.value});});}} />
        </div>
      </div>
    </div>
  );
}
