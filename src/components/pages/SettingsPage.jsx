import { useState, useEffect } from 'react';
import {
  getOperatorsList, addOperator, removeOperator,
  getStationsList, addStation, removeStation, updateStationCapacity
} from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import PasswordLock from '../PasswordLock';
import { tod, daysAgo } from '../../utils/constants';

export default function SettingsPage({ toast }) {
  const [operators, setOperators]   = useState([]);
  const [stations, setStations]     = useState([]);
  const [newOpName, setNewOpName]   = useState('');
  const [newStnName, setNewStnName] = useState('');
  const [newStnCap, setNewStnCap]   = useState('');
  const [editCaps, setEditCaps]     = useState({});
  const [clearing, setClearing]     = useState('');
  const [unlocked, setUnlocked]     = useState(false);
  const [clearFrom, setClearFrom]   = useState(daysAgo(30));
  const [clearTo, setClearTo]       = useState(tod());

  async function loadAll() {
    const ops  = await getOperatorsList();
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
    if (!window.confirm('Remove ' + name + '? History kept.')) return;
    const ok = await removeOperator(id);
    if (ok) { toast('Removed: ' + name); loadAll(); }
    else toast('Error');
  }

  async function handleAddStn() {
    if (!newStnName.trim()) { toast('Enter station name'); return; }
    const ok = await addStation(newStnName.trim(), parseFloat(newStnCap) || 0);
    if (ok) { toast('Station added: ' + newStnName); setNewStnName(''); setNewStnCap(''); loadAll(); }
    else toast('Error — name may already exist');
  }

  async function handleRemoveStn(id, name) {
    if (!window.confirm('Remove station ' + name + '?')) return;
    const ok = await removeStation(id);
    if (ok) { toast('Removed: ' + name); loadAll(); }
    else toast('Error');
  }

  async function handleUpdateCap(id, name) {
    const ok = await updateStationCapacity(id, parseFloat(editCaps[id]) || 0);
    if (ok) toast('Capacity updated: ' + name);
    else toast('Error');
  }

  function updateCap(id, val) {
    setEditCaps(function(prev) {
      const next = Object.assign({}, prev);
      next[id] = val;
      return next;
    });
  }

  async function clearByDateRange(table, dateCol, label) {
    if (!clearFrom || !clearTo) { toast('Select date range first'); return; }
    if (!window.confirm('Delete ' + label + ' from ' + clearFrom + ' to ' + clearTo + '?\nThis cannot be undone!')) return;
    setClearing(table);
    const { error, count } = await supabase
      .from(table).delete()
      .gte(dateCol, clearFrom)
      .lte(dateCol, clearTo);
    setClearing('');
    if (!error) toast('Cleared ' + label + ' (' + clearFrom + ' to ' + clearTo + ')');
    else toast('Error clearing ' + label + ': ' + (error.message || ''));
  }

  async function clearMonthRange(table, monthCol, label) {
    if (!clearFrom || !clearTo) { toast('Select date range first'); return; }
    const fromMonth = clearFrom.slice(0, 7);
    const toMonth   = clearTo.slice(0, 7);
    if (!window.confirm('Delete ' + label + ' from ' + fromMonth + ' to ' + toMonth + '?\nThis cannot be undone!')) return;
    setClearing(table);
    const { error } = await supabase
      .from(table).delete()
      .gte(monthCol, fromMonth)
      .lte(monthCol, toMonth);
    setClearing('');
    if (!error) toast('Cleared ' + label + ' (' + fromMonth + ' to ' + toMonth + ')');
    else toast('Error clearing ' + label);
  }

  async function clearAllInRange() {
    if (!clearFrom || !clearTo) { toast('Select date range first'); return; }
    if (!window.confirm('Delete ALL production data from ' + clearFrom + ' to ' + clearTo + '?\nThis cannot be undone!')) return;
    if (!window.confirm('Final confirmation — are you sure?')) return;
    setClearing('all');
    await supabase.from('daily_entries').delete().gte('entry_date', clearFrom).lte('entry_date', clearTo);
    await supabase.from('daily_materials').delete().gte('entry_date', clearFrom).lte('entry_date', clearTo);
    await supabase.from('station_downtime').delete().gte('entry_date', clearFrom).lte('entry_date', clearTo);
    await supabase.from('etch_rate').delete().gte('entry_date', clearFrom).lte('entry_date', clearTo);
    await supabase.from('personal_ot').delete().gte('entry_date', clearFrom).lte('entry_date', clearTo);
    const fromMonth = clearFrom.slice(0, 7);
    const toMonth   = clearTo.slice(0, 7);
    await supabase.from('material_costs').delete().gte('month_year', fromMonth).lte('month_year', toMonth);
    await supabase.from('material_targets').delete().gte('month_year', fromMonth).lte('month_year', toMonth);
    setClearing('');
    toast('All data cleared for ' + clearFrom + ' to ' + clearTo);
  }

  const clearItems = [
    { table: 'daily_entries',    col: 'entry_date', label: 'Daily entries',     sub: 'Output, scrap, operators',  type: 'date' },
    { table: 'daily_materials',  col: 'entry_date', label: 'Material issuance', sub: 'Copper foil + prepreg',     type: 'date' },
    { table: 'station_downtime', col: 'entry_date', label: 'Downtime records',  sub: 'All downtime entries',      type: 'date' },
    { table: 'etch_rate',        col: 'entry_date', label: 'Etch rate data',    sub: 'All SPC readings',          type: 'date' },
    { table: 'personal_ot',      col: 'entry_date', label: 'Personal OT',       sub: 'My OT records',             type: 'date' },
    { table: 'material_costs',   col: 'month_year', label: 'Material costs',    sub: 'Monthly RM/m2 records',     type: 'month' },
  ];

  if (!unlocked) return <PasswordLock title="Settings" subtitle="Enter password to access settings and admin functions" onUnlock={function(){setUnlocked(true);}} />;

  return (
    <div>
      <div style={{background:'#185FA5',borderRadius:10,padding:'16px 20px',marginBottom:14,color:'#fff'}}>
        <div style={{fontSize:11,opacity:.8,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Admin</div>
        <div style={{fontSize:20,fontWeight:500}}>Settings</div>
        <div style={{fontSize:12,opacity:.8,marginTop:4}}>Manage operators, stations and data</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div><div className="card-title">Operators</div><div className="card-sub">{operators.length} active</div></div>
          </div>
          <div style={{display:'flex',gap:7,marginBottom:12}}>
            <input type="text" value={newOpName} placeholder="New operator name"
              onChange={function(e){setNewOpName(e.target.value);}}
              onKeyDown={function(e){if(e.key==='Enter')handleAddOp();}}
              style={{flex:1,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            <button className="btn-primary" onClick={handleAddOp}>+ Add</button>
          </div>
          <div style={{maxHeight:380,overflowY:'auto'}}>
            {operators.map(function(op, i) {
              const bgs = ['#E6F1FB','#E1F5EE','#FAEEDA','#FCEBEB','#EEEDFE','#FBEAF0'];
              const tcs = ['#0C447C','#085041','#633806','#791F1F','#3C3489','#72243E'];
              return (
                <div key={op.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:bgs[i%6],color:tcs[i%6],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600,flexShrink:0}}>
                    {op.name.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{flex:1,fontSize:12,color:'var(--text)'}}>{op.name}</span>
                  <button className="btn-ghost" onClick={function(){handleRemoveOp(op.id,op.name);}}
                    style={{fontSize:11,padding:'3px 8px',color:'#A32D2D',borderColor:'#F7C1C1'}}>Remove</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div><div className="card-title">Stations</div><div className="card-sub">{stations.length} active · m2/day</div></div>
          </div>
          <div style={{display:'flex',gap:7,marginBottom:12,flexWrap:'wrap'}}>
            <input type="text" value={newStnName} placeholder="Station name"
              onChange={function(e){setNewStnName(e.target.value);}}
              style={{flex:2,minWidth:120,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            <input type="number" value={newStnCap} placeholder="m2/day"
              onChange={function(e){setNewStnCap(e.target.value);}}
              style={{flex:1,minWidth:80,fontSize:12,padding:'6px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
            <button className="btn-primary" onClick={handleAddStn}>+ Add</button>
          </div>
          <div style={{maxHeight:380,overflowY:'auto'}}>
            {stations.map(function(stn, i) {
              return (
                <div key={stn.id} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{width:20,fontSize:11,color:'var(--text2)',flexShrink:0}}>{i+1}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:500,color:'var(--text)'}}>{stn.name}</span>
                  <input type="number" value={editCaps[stn.id]||''} placeholder="0"
                    onChange={function(e){updateCap(stn.id,e.target.value);}}
                    style={{width:80,fontSize:12,padding:'4px 7px',border:'1px solid var(--border2)',borderRadius:6,background:'var(--input-bg)',color:'var(--text)',outline:'none',textAlign:'right'}} />
                  <span style={{fontSize:10,color:'var(--text2)',flexShrink:0}}>m2/day</span>
                  <button className="btn-ghost" onClick={function(){handleUpdateCap(stn.id,stn.name);}}
                    style={{fontSize:11,padding:'3px 8px'}}>Save</button>
                  <button className="btn-ghost" onClick={function(){handleRemoveStn(stn.id,stn.name);}}
                    style={{fontSize:11,padding:'3px 8px',color:'#A32D2D',borderColor:'#F7C1C1'}}>Remove</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title" style={{color:'#A32D2D'}}>Danger zone — clear data by date range</div>
            <div className="card-sub">Select a date range then clear specific or all data. Cannot be undone!</div>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'var(--bg3)',borderRadius:8,marginBottom:14,flexWrap:'wrap'}}>
          <i className="ti ti-calendar-x" style={{fontSize:16,color:'#A32D2D'}} aria-hidden="true" />
          <label style={{fontSize:12,color:'var(--text2)'}}>Clear from</label>
          <input type="date" value={clearFrom} onChange={function(e){setClearFrom(e.target.value);}}
            style={{fontSize:12,padding:'5px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          <label style={{fontSize:12,color:'var(--text2)'}}>to</label>
          <input type="date" value={clearTo} onChange={function(e){setClearTo(e.target.value);}}
            style={{fontSize:12,padding:'5px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
          <span style={{fontSize:11,color:'var(--text2)',marginLeft:4}}>
            {clearFrom && clearTo ? clearFrom + ' to ' + clearTo : 'Select range'}
          </span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {clearItems.map(function(item) {
            return (
              <div key={item.table} style={{background:'var(--bg3)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:2}}>{item.label}</div>
                <div style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>{item.sub}</div>
                <button
                  className="btn-ghost"
                  onClick={function(){
                    if (item.type === 'month') clearMonthRange(item.table, item.col, item.label);
                    else clearByDateRange(item.table, item.col, item.label);
                  }}
                  disabled={clearing===item.table}
                  style={{fontSize:11,padding:'4px 10px',color:'#A32D2D',borderColor:'#F7C1C1',width:'100%'}}>
                  {clearing===item.table ? 'Clearing...' : 'Clear ' + item.label}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={clearAllInRange}
          disabled={clearing==='all'}
          style={{width:'100%',padding:'11px',background:'#A32D2D',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <i className="ti ti-trash" aria-hidden="true" />
          {clearing==='all'
            ? 'Clearing...'
            : 'Clear ALL data in range (' + (clearFrom||'?') + ' to ' + (clearTo||'?') + ')'}
        </button>
      </div>
    </div>
  );
}
