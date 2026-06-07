import { useState, useEffect } from 'react';
import { storageGet, storageSet, saveDayMaterials, getDayMaterials, getOperatorsList, getStationsList } from '../../utils/storage';
import { SHIFT_OPTIONS, DEFECTS } from '../../utils/constants';

const AVT_BG = ['#EAF3DE','#E6F1FB','#FAEEDA','#FCEBEB','#EEEDFE','#E1F5EE'];
const AVT_TC = ['#27500A','#0C447C','#633806','#791F1F','#3B3599','#0F6E56'];

export default function EntryPage({ globalDate, toast, onSave }) {
  const [fields, setFields] = useState({
    output:'', target:'', lcsOutput:'', lcsTarget:'',
    scrap:'', dent:'', scratch:'', wrinkle:'', notes:'', delayReason:'', noProduction:false
  });
  const [stLcmMorn, setStLcmMorn]   = useState({});
  const [stLcmMornB, setStLcmMornB] = useState({});
  const [stLcsMorn, setStLcsMorn]   = useState({});
  const [stLcsMornB, setStLcsMornB] = useState({});
  const [stLcmNight, setStLcmNight] = useState({});
  const [stLcmNightB, setStLcmNightB] = useState({});
  const [stLcsNight, setStLcsNight] = useState({});
  const [stLcsNightB, setStLcsNightB] = useState({});
  const [expandedStn, setExpandedStn] = useState(null);
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
          output:      d.output      || '',
          target:      d.target      || '',
          lcsOutput:   d.lcsOutput   || '',
          lcsTarget:   d.lcsTarget   || '',
          scrap:       d.scrap       || '',
          dent:        d.dent        || '',
          scratch:     d.scratch     || '',
          wrinkle:     d.wrinkle     || '',
          notes:       d.notes       || '',
          delayReason: d.delayReason || '',
          noProduction: d.noProduction || false,
        });
        setDefVals(d.defects || {});
        const stnList2 = await getStationsList();
        function convertStationKeys(stationData, nameList) {
          if (!stationData) return {};
          var keys = Object.keys(stationData);
          if (!keys.length) return {};
          var firstKey = keys[0];
          if (isNaN(parseInt(firstKey))) return stationData;
          var result = {};
          nameList.forEach(function(s, i) {
            var v = stationData[String(i+1)];
            if (v) result[s.name] = v;
          });
          return result;
        }
        var convMorn  = convertStationKeys(d.stations_morning, stnList2) || {};
        var convNight = convertStationKeys(d.stations_night, stnList2) || {};
        if (!d.stations_morning || Object.keys(d.stations_morning).length === 0) {
          convMorn = convertStationKeys(d.stations, stnList2) || {};
        }
        setStnMorning(convMorn);
        setStnNight(convNight);

        var lcmMornLoad = Object.keys(d.stationLcmMorning||{}).length > 0
          ? d.stationLcmMorning : convMorn;
        var lcmNightLoad = Object.keys(d.stationLcmNight||{}).length > 0
          ? d.stationLcmNight : convNight;
        setStLcmMorn(lcmMornLoad);
        setStLcmNight(lcmNightLoad);
        setStLcmMornB(d.stationLcmMorningBoards || {});
        setStLcmNightB(d.stationLcmNightBoards  || {});
        setStLcsMorn(d.stationLcsMorning         || {});
        setStLcsMornB(d.stationLcsMorningBoards  || {});
        setStLcsNight(d.stationLcsNight          || {});
        setStLcsNightB(d.stationLcsNightBoards   || {});
        if (d.operators && d.operators.length > 0) {
          setOps(d.operators);
        } else if (opsList.length > 0) {
          setOps(opsList.map(function(o){ return { name: o.name, shift: 'day' }; }));
        }
        const mat = await getDayMaterials(globalDate);
        setMatIssue({ copperFoil: mat.copperFoil || '', prepreg: mat.prepreg || '' });
      } else {
        if (opsList.length > 0) {
          setOps(opsList.map(function(o){ return { name: o.name, shift: 'day' }; }));
        }
        setStnMorning({});
        setStnNight({});
        setDefVals({});
        setMatIssue({ copperFoil:'', prepreg:'' });
        setFields({ output:'', target:'', lcsOutput:'', lcsTarget:'', scrap:'', dent:'', scratch:'', wrinkle:'', notes:'', delayReason:'', noProduction:false });
      }
    }
    loadAll();
  }, [globalDate]);

  const autoAoi = ((parseFloat(fields.dent)||0) + (parseFloat(fields.scratch)||0) + (parseFloat(fields.wrinkle)||0)).toFixed(2);

  function sumObj(obj) { return Object.values(obj).reduce(function(s,v){return s+(parseFloat(v)||0);},0); }

  const totalLcmM2    = sumObj(stLcmMorn)  + sumObj(stLcmNight);
  const totalLcsM2    = sumObj(stLcsMorn)  + sumObj(stLcsNight);
  const totalLcmBoards = sumObj(stLcmMornB) + sumObj(stLcmNightB);
  const totalLcsBoards = sumObj(stLcsMornB) + sumObj(stLcsNightB);
  const autoOutput    = totalLcmM2 + totalLcsM2;
  const autoBoards    = totalLcmBoards + totalLcsBoards;

  const totalMh = ops.reduce(function(s, o) {
    const sh = SHIFT_OPTIONS.find(function(x){ return x.value === (o.shift||'day'); }) || SHIFT_OPTIONS[0];
    return s + sh.hours;
  }, 0);

  const totalM2hr = totalMh > 0 && parseFloat(fields.output) > 0
    ? parseFloat((parseFloat(fields.output) / totalMh).toFixed(2)) : 0;

  function setShift(idx, val) {
    setOps(function(prev) {
      const n = prev.slice();
      n[idx] = Object.assign({}, n[idx], { shift: val });
      return n;
    });
  }

  function toggleSelectOp(name) {
    setSelectedOps(function(prev) {
      if (prev.indexOf(name) >= 0) return prev.filter(function(n){ return n !== name; });
      return prev.concat([name]);
    });
  }

  function selectAllVisible() {
    const visible = ops.filter(function(o) {
      return !opSearch || o.name.toLowerCase().includes(opSearch.toLowerCase());
    }).map(function(o){ return o.name; });
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
    setOps(ops.map(function(o){ return Object.assign({}, o, { shift: o.shift==='absent'?'absent':'cut_mgmt' }); }));
    toast('All set to Management Cut OT');
  }

  function setAllNormal() {
    setOps(ops.map(function(o){ return Object.assign({}, o, { shift: o.shift==='absent'?'absent':'day' }); }));
    toast('All set to Day shift');
  }

  function setAllPublicHoliday() {
    setOps(ops.map(function(o){ return Object.assign({}, o, { shift: 'absent' }); }));
    toast('All set to Public Holiday (Absent)');
  }

  async function handleSave() {
    setSaving(true);
    const ok = await storageSet('day:' + globalDate, {
      output:       parseFloat(fields.output)    || 0,
      target:       parseFloat(fields.target)    || 0,
      lcs_output:   parseFloat(fields.lcsOutput) || 0,
      lcs_target:   parseFloat(fields.lcsTarget) || 0,
      scrap:        parseFloat(fields.scrap)   || 0,
      aoi:          parseFloat(autoAoi)        || 0,
      dent:         parseFloat(fields.dent)    || 0,
      scratch:      parseFloat(fields.scratch) || 0,
      wrinkle:      parseFloat(fields.wrinkle) || 0,
      mh:           totalMh,
      m2hr:         parseFloat(totalM2hr)      || 0,
      notes:        fields.notes,
      delayReason:  fields.delayReason,
      noProduction: fields.noProduction || false,
      stationLcmMorning:       stLcmMorn,
      stationLcmMorningBoards: stLcmMornB,
      stations_morning:        stLcmMorn,
      stationLcsMorning:       stLcsMorn,
      stationLcsMorningBoards: stLcsMornB,
      stationLcmNight:         stLcmNight,
      stationLcmNightBoards:   stLcmNightB,
      stations_night:          stLcmNight,
      stationLcsNight:         stLcsNight,
      stationLcsNightBoards:   stLcsNightB,
      defects:          defVals,
      stations:         stnMorning,

      operators:        ops,
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

  const showDelayWarning = !fields.noProduction && parseFloat(fields.output) > 0 && parseFloat(fields.target) > 0 && parseFloat(fields.output) < parseFloat(fields.target);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>Daily entry — {globalDate}</div>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{minWidth:100}}>
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>

      {/* Output */}
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div className="section-lbl" style={{margin:0}}>Output and target</div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,cursor:'pointer',
            background:fields.noProduction?'#FCEBEB':'var(--bg3)',
            border:'1px solid '+(fields.noProduction?'#E24B4A':'var(--border2)')}}
            onClick={function(){
              var np = !fields.noProduction;
              setFields(function(f){ return Object.assign({},f,{
                noProduction:np, output:np?'0':'', lcsOutput:np?'0':'',
                scrap:np?'0':'', dent:np?'0':'', scratch:np?'0':'', wrinkle:np?'0':'',
              });});
              if (np) toast('Marked as no production day');
            }}>
            <div style={{width:18,height:18,borderRadius:4,
              border:'1.5px solid '+(fields.noProduction?'#E24B4A':'var(--border2)'),
              background:fields.noProduction?'#E24B4A':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
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

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
          <div style={{background:'rgba(55,138,221,0.06)',borderRadius:8,padding:'10px 12px',border:'1px solid rgba(55,138,221,0.15)'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#185FA5',marginBottom:8}}>🔵 LCM (m²)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div className="fg" style={{margin:0}}>
                <label style={{fontSize:10}}>Output (m²)</label>
                <input type="number" step=".1" value={fields.output} disabled={fields.noProduction}
                  style={{background:fields.noProduction?'var(--bg3)':''}}
                  onChange={function(e){setFields(function(f){return Object.assign({},f,{output:e.target.value});});}} />
              </div>
              <div className="fg" style={{margin:0}}>
                <label style={{fontSize:10}}>Target (m²)</label>
                <input type="number" step=".1" value={fields.target}
                  onChange={function(e){setFields(function(f){return Object.assign({},f,{target:e.target.value});});}} />
              </div>
            </div>
          </div>
          <div style={{background:'rgba(226,75,74,0.06)',borderRadius:8,padding:'10px 12px',border:'1px solid rgba(226,75,74,0.15)'}}>
            <div style={{fontSize:11,fontWeight:600,color:'#A32D2D',marginBottom:8}}>🔴 LCS (boards)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div className="fg" style={{margin:0}}>
                <label style={{fontSize:10}}>Output (boards)</label>
                <input type="number" value={fields.lcsOutput} disabled={fields.noProduction}
                  style={{background:fields.noProduction?'var(--bg3)':''}}
                  onChange={function(e){setFields(function(f){return Object.assign({},f,{lcsOutput:e.target.value});});}} />
              </div>
              <div className="fg" style={{margin:0}}>
                <label style={{fontSize:10}}>Target (boards)</label>
                <input type="number" value={fields.lcsTarget}
                  onChange={function(e){setFields(function(f){return Object.assign({},f,{lcsTarget:e.target.value});});}} />
              </div>
            </div>
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

      {/* Scrap */}
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
            <label>AOI total % — auto</label>
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

      {/* Defects */}
      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Defect breakdown (%)</div>
        <div className="form-grid">
          {DEFECTS.map(function(def) {
            return (
              <div key={def} className="fg">
                <label>{def}</label>
                <input type="number" step=".0001" value={defVals[def]||''}
                  placeholder="0"
                  onChange={function(e){setDefVals(function(prev){return Object.assign({},prev,{[def]:e.target.value});});}} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Station output — uses station NAME as key */}
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div className="section-lbl" style={{margin:0}}>Station output — LCM &amp; LCS</div>
          <div style={{fontSize:10,color:'var(--text2)'}}>Click station to expand · Enter m² and boards per product</div>
        </div>
        {/* Header */}
        <div style={{display:'grid',gridTemplateColumns:'140px 1fr 1fr',gap:0,marginBottom:4}}>
          <div style={{fontSize:10,fontWeight:600,color:'var(--text2)',padding:'4px 8px'}}>Station</div>
          <div style={{fontSize:10,fontWeight:600,color:'#185FA5',padding:'4px 8px',textAlign:'center',background:'rgba(55,138,221,0.06)',borderRadius:'6px 0 0 6px'}}>🔵 LCM</div>
          <div style={{fontSize:10,fontWeight:600,color:'#A32D2D',padding:'4px 8px',textAlign:'center',background:'rgba(226,75,74,0.06)',borderRadius:'0 6px 6px 0'}}>🔴 LCS</div>
        </div>
        {/* Column headers */}
        <div style={{display:'grid',gridTemplateColumns:'140px 1fr 80px',gap:0,marginBottom:4,padding:'0 10px',fontSize:10,color:'var(--text2)',fontWeight:600}}>
          <span>Station</span>
          <span>Summary</span>
          <span style={{textAlign:'right'}}>Expand</span>
        </div>
        {stationNames.map(function(stn) {
          var name = stn.name;
          var lcmMornM2 = parseFloat(stLcmMorn[name]||0);
          var lcsM2Val  = parseFloat(stLcsMorn[name]||0);
          var lcmNightM2Val = parseFloat(stLcmNight[name]||0);
          var lcsNightM2Val = parseFloat(stLcsNight[name]||0);
          var totalM2   = lcmMornM2+lcsM2Val+lcmNightM2Val+lcsNightM2Val;
          var totalB    = (parseFloat(stLcmMornB[name]||0))+(parseFloat(stLcsMornB[name]||0))+(parseFloat(stLcmNightB[name]||0))+(parseFloat(stLcsNightB[name]||0));
          var isExpanded = expandedStn === name;
          var hasData    = totalM2 > 0 || totalB > 0;
          return (
            <div key={name} style={{marginBottom:3,borderRadius:8,border:'1px solid '+(isExpanded?'#378ADD':'var(--border)'),overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',padding:'7px 10px',cursor:'pointer',background:isExpanded?'rgba(55,138,221,0.05)':hasData?'rgba(29,158,117,0.03)':'',gap:8}}
                onClick={function(){setExpandedStn(isExpanded?null:name);}}>
                <span style={{fontWeight:500,fontSize:12,color:'var(--text)',flex:'0 0 130px',whiteSpace:'nowrap'}}>{name}</span>
                <div style={{display:'flex',gap:8,flex:1,fontSize:11,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{color:'#378ADD',fontWeight:500}}>
                    LCM: {(lcmMornM2+lcmNightM2Val).toFixed(1)} m²
                    {(parseFloat(stLcmMornB[name]||0)+parseFloat(stLcmNightB[name]||0))>0 && (
                      <span style={{fontWeight:400,color:'var(--text2)'}}> · {parseFloat(stLcmMornB[name]||0)+parseFloat(stLcmNightB[name]||0)} boards</span>
                    )}
                  </span>
                  <span style={{color:'var(--text3)'}}>|</span>
                  <span style={{color:'#E24B4A',fontWeight:500}}>
                    LCS: {(lcsM2Val+lcsNightM2Val).toFixed(1)} m²
                    {(parseFloat(stLcsMornB[name]||0)+parseFloat(stLcsNightB[name]||0))>0 && (
                      <span style={{fontWeight:400,color:'var(--text2)'}}> · {parseFloat(stLcsMornB[name]||0)+parseFloat(stLcsNightB[name]||0)} boards</span>
                    )}
                  </span>
                  {totalM2===0 && <span style={{color:'var(--text3)'}}>click to enter</span>}
                </div>
                <span style={{fontSize:11,color:'var(--text3)',flexShrink:0}}>{isExpanded?'▲':'▼'}</span>
              </div>
              {isExpanded && (
                <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {/* LCM */}
                  <div style={{background:'rgba(55,138,221,0.05)',borderRadius:7,padding:'8px 10px'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#185FA5',marginBottom:8}}>🔵 LCM</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Morning m²</div>
                        <input type="number" step=".1" value={stLcmMorn[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcmMorn(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Morning boards</div>
                        <input type="number" value={stLcmMornB[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcmMornB(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Night m²</div>
                        <input type="number" step=".1" value={stLcmNight[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcmNight(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Night boards</div>
                        <input type="number" value={stLcmNightB[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcmNightB(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'#185FA5',fontWeight:500}}>
                      Total: {(lcmMornM2+lcmNightM2Val).toFixed(1)} m² · {(parseFloat(stLcmMornB[name]||0)+parseFloat(stLcmNightB[name]||0))} boards
                    </div>
                  </div>
                  {/* LCS */}
                  <div style={{background:'rgba(226,75,74,0.05)',borderRadius:7,padding:'8px 10px'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#A32D2D',marginBottom:8}}>🔴 LCS</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Morning m²</div>
                        <input type="number" step=".1" value={stLcsMorn[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcsMorn(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Morning boards</div>
                        <input type="number" value={stLcsMornB[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcsMornB(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Night m²</div>
                        <input type="number" step=".1" value={stLcsNight[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcsNight(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Night boards</div>
                        <input type="number" value={stLcsNightB[name]||''} placeholder="0" disabled={fields.noProduction}
                          onChange={function(e){setStLcsNightB(function(p){return Object.assign({},p,{[name]:e.target.value});});}}
                          style={{width:'100%',fontSize:12,padding:'4px 6px',border:'1px solid var(--border2)',borderRadius:5,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'#A32D2D',fontWeight:500}}>
                      Total: {(lcsM2Val+lcsNightM2Val).toFixed(1)} m² · {(parseFloat(stLcsMornB[name]||0)+parseFloat(stLcsNightB[name]||0))} boards
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* Materials */}
      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Daily material issuance</div>
        <div className="form-grid">
          <div className="fg">
            <label>Copper foil (RM)</label>
            <input type="number" step=".01" value={matIssue.copperFoil}
              onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{copperFoil:e.target.value});});}} />
          </div>
          <div className="fg">
            <label>Prepreg (RM)</label>
            <input type="number" step=".01" value={matIssue.prepreg}
              onChange={function(e){setMatIssue(function(m){return Object.assign({},m,{prepreg:e.target.value});});}} />
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:10}}>
          <div className="section-lbl" style={{margin:0}}>Operator attendance ({ops.length})</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className="btn-ghost" onClick={setAllNormal} style={{fontSize:11}}>All normal</button>
            <button className="btn-primary" onClick={setAllMgmtCut} style={{fontSize:11,background:'#185FA5'}}>All mgmt cut OT</button>
            <button className="btn-primary" onClick={setAllPublicHoliday} style={{fontSize:11,background:'#E24B4A'}}>All public holiday</button>
          </div>
        </div>

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

        <div style={{maxHeight:420,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8}}>
          {ops.filter(function(op) {
            return !opSearch || op.name.toLowerCase().includes(opSearch.toLowerCase());
          }).map(function(op, i) {
            const sh = SHIFT_OPTIONS.find(function(x){ return x.value===(op.shift||'day'); })||SHIFT_OPTIONS[0];
            const isSelected = selectedOps.indexOf(op.name) >= 0;
            const globalIdx = ops.findIndex(function(o){ return o.name===op.name; });
            return (
              <div key={op.name}
                style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                  borderBottom:'1px solid var(--border)',
                  background:isSelected?'rgba(55,138,221,0.08)':'',
                  cursor:'pointer'}}
                onClick={function(e){ if(e.target.tagName==='SELECT') return; toggleSelectOp(op.name); }}>
                <div style={{width:16,height:16,borderRadius:3,flexShrink:0,
                  border:'1.5px solid '+(isSelected?'#378ADD':'var(--border2)'),
                  background:isSelected?'#378ADD':'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {isSelected && <span style={{color:'#fff',fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                </div>
                <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,
                  background:AVT_BG[globalIdx%6],color:AVT_TC[globalIdx%6],
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600}}>
                  {op.name.slice(0,2).toUpperCase()}
                </div>
                <span style={{flex:1,fontSize:12,color:'var(--text)',fontWeight:500}}>{op.name}</span>
                <select value={op.shift||'day'}
                  onClick={function(e){e.stopPropagation();}}
                  onChange={function(e){ setShift(globalIdx, e.target.value); }}
                  style={{fontSize:11,padding:'3px 6px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}>
                  {SHIFT_OPTIONS.map(function(s){
                    return <option key={s.value} value={s.value}>{s.label} ({s.hours}h)</option>;
                  })}
                </select>
                <span style={{padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:500,background:sh.color,color:sh.tc,whiteSpace:'nowrap',flexShrink:0}}>
                  {sh.short}
                </span>
                <span style={{fontSize:11,color:'var(--text2)',flexShrink:0,width:28,textAlign:'right'}}>{sh.hours}h</span>
              </div>
            );
          })}
          {ops.filter(function(op){return !opSearch||op.name.toLowerCase().includes(opSearch.toLowerCase());}).length===0 && (
            <div style={{padding:'20px',textAlign:'center',color:'var(--text2)',fontSize:12}}>No operators match "{opSearch}"</div>
          )}
        </div>

        <div style={{marginTop:10,padding:'8px 12px',background:'var(--bg3)',borderRadius:7,display:'flex',gap:20,flexWrap:'wrap',fontSize:12}}>
          <span>Total manhours: <strong>{totalMh}h</strong></span>
          <span>m²/hr: <strong>{totalM2hr}</strong></span>
          <span style={{color:'var(--text2)'}}>
            Day: {ops.filter(function(o){return (o.shift||'day')==='day';}).length} ·
            Night: {ops.filter(function(o){return o.shift==='night';}).length} ·
            Self cut: {ops.filter(function(o){return o.shift==='cut_self';}).length} ·
            Mgmt cut: {ops.filter(function(o){return o.shift==='cut_mgmt';}).length} ·
            Absent: {ops.filter(function(o){return o.shift==='absent';}).length}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="card" style={{marginBottom:10}}>
        <div className="section-lbl">Notes</div>
        <textarea value={fields.notes}
          onChange={function(e){setFields(function(f){return Object.assign({},f,{notes:e.target.value});});}}
          placeholder="Any notes for today..."
          style={{width:'100%',minHeight:80,fontSize:12,padding:'8px 10px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none',resize:'vertical'}} />
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving}
        style={{width:'100%',padding:'12px',fontSize:13,borderRadius:8}}>
        {saving ? 'Saving...' : 'Save entry — ' + globalDate}
      </button>
    </div>
  );
}
