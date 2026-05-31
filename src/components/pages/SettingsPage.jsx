import { useState, useEffect } from 'react';
import {
  getOperatorsList, addOperator, removeOperator,
  getStationsList, addStation, removeStation, updateStationCapacity
} from '../../utils/storage';

export default function SettingsPage({ toast }) {
  const [operators, setOperators] = useState([]);
  const [stations, setStations]   = useState([]);
  const [newOpName, setNewOpName] = useState('');
  const [newStnName, setNewStnName]   = useState('');
  const [newStnCap, setNewStnCap]     = useState('');
  const [editCaps, setEditCaps]       = useState({});

  async function loadAll() {
    const ops = await getOperatorsList();
    const stns = await getStationsList();
    setOperators(ops);
    setStations(stns);
    const caps = {};
    stns.forEach(function(s) { caps[s.id] = s.capacity_per_day; });
    setEditCaps(caps);
  }

  useEffect(function() { loadAll(); }, []);

  async function handleAddOp() {
    if (!newOpName.trim()) { toast('Enter operator name'); return; }
    const ok = await addOperator(newOpName.trim());
    if (ok) { toast('Operator added: ' + newOpName); setNewOpName(''); loadAll(); }
    else toast('Error — name may already exist');
  }

  async function handleRemoveOp(id, name) {
    if (!window.confirm('Remove ' + name + '? Their history will be kept.')) return;
    const ok = await removeOperator(id);
    if (ok) { toast('Removed: ' + name); loadAll(); }
    else toast('Error removing operator');
  }

  async function handleAddStn() {
    if (!newStnName.trim()) { toast('Enter station name'); return; }
    const cap = parseFloat(newStnCap) || 0;
    const ok = await addStation(newStnName.trim(), cap);
    if (ok) { toast('Station added: ' + newStnName); setNewStnName(''); setNewStnCap(''); loadAll(); }
    else toast('Error — name may already exist');
  }

  async function handleRemoveStn(id, name) {
    if (!window.confirm('Remove station ' + name + '?')) return;
    const ok = await removeStation(id);
    if (ok) { toast('Removed: ' + name); loadAll(); }
    else toast('Error removing station');
  }

  async function handleUpdateCap(id, name) {
    const cap = parseFloat(editCaps[id]) || 0;
    const ok = await updateStationCapacity(id, cap);
    if (ok) toast('Capacity updated: ' + name);
    else toast('Error saving capacity');
  }

  function updateCap(id, val) {
    setEditCaps(function(prev) {
      const next = Object.assign({}, prev);
      next[id] = val;
      return next;
    });
  }

  return (
    <div>
      <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Admin</div>
        <div style={{fontSize:20,fontWeight:500}}>Settings</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Manage operators and stations — changes reflect everywhere immediately</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>

        {/* Operators */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div>
              <div className="card-title">Operators</div>
              <div className="card-sub">{operators.length} active</div>
            </div>
          </div>

          {/* Add new */}
          <div style={{display:'flex',gap:7,marginBottom:12}}>
            <input
              type="text"
              value={newOpName}
              placeholder="New operator name"
              onChange={function(e) { setNewOpName(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleAddOp(); }}
              style={{flex:1,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}
            />
            <button className="btn-primary" onClick={handleAddOp} style={{whiteSpace:'nowrap'}}>+ Add</button>
          </div>

          <div style={{maxHeight:500,overflowY:'auto'}}>
            {operators.map(function(op, i) {
              const colors = ['#E6F1FB','#E1F5EE','#FAEEDA','#FCEBEB','#EEEDFE','#FBEAF0'];
              const tcs    = ['#0C447C','#085041','#633806','#791F1F','#3C3489','#72243E'];
              return (
                <div key={op.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:colors[i%6],color:tcs[i%6],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,flexShrink:0}}>
                    {op.name.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{flex:1,fontSize:12,color:'var(--text)'}}>{op.name}</span>
                  <button
                    className="btn-ghost"
                    onClick={function() { handleRemoveOp(op.id, op.name); }}
                    style={{fontSize:11,padding:'3px 8px',color:'#A32D2D',borderColor:'#F7C1C1'}}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stations */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div>
              <div className="card-title">Stations</div>
              <div className="card-sub">{stations.length} active · capacity = m2/day (24h)</div>
            </div>
          </div>

          {/* Add new */}
          <div style={{display:'flex',gap:7,marginBottom:12,flexWrap:'wrap'}}>
            <input
              type="text"
              value={newStnName}
              placeholder="Station name"
              onChange={function(e) { setNewStnName(e.target.value); }}
              style={{flex:2,minWidth:120,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}
            />
            <input
              type="number"
              value={newStnCap}
              placeholder="Capacity m2/day"
              onChange={function(e) { setNewStnCap(e.target.value); }}
              style={{flex:1,minWidth:100,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}}
            />
            <button className="btn-primary" onClick={handleAddStn}>+ Add</button>
          </div>

          <div style={{maxHeight:500,overflowY:'auto'}}>
            {stations.map(function(stn, i) {
              return (
                <div key={stn.id} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{width:20,fontSize:11,color:'var(--text2)',flexShrink:0}}>{i+1}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:500,color:'var(--text)'}}>{stn.name}</span>
                  <input
                    type="number"
                    value={editCaps[stn.id] || ''}
                    placeholder="0"
                    onChange={function(e) { updateCap(stn.id, e.target.value); }}
                    style={{width:90,fontSize:12,padding:'4px 7px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none',textAlign:'right'}}
                  />
                  <span style={{fontSize:10,color:'var(--text2)',flexShrink:0}}>m2/day</span>
                  <button
                    className="btn-ghost"
                    onClick={function() { handleUpdateCap(stn.id, stn.name); }}
                    style={{fontSize:11,padding:'3px 8px'}}>
                    Save
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={function() { handleRemoveStn(stn.id, stn.name); }}
                    style={{fontSize:11,padding:'3px 8px',color:'#A32D2D',borderColor:'#F7C1C1'}}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
