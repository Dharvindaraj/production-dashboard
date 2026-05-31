import { useState, useEffect } from 'react';
import { getCapacity, saveCapacity } from '../../utils/storage';
import { STATION_NAMES } from '../../utils/constants';

const PIN = '1234';

export default function CapacityPage({ toast }) {
  const [capacities, setCapacities] = useState({});
  const [locked, setLocked] = useState({});
  const [unlockPin, setUnlockPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  async function load() {
    const data = await getCapacity();
    const capMap = {};
    const lockMap = {};
    data.forEach(function(d) {
      capMap[d.station_name] = d.capacity_per_hour;
      lockMap[d.station_name] = d.is_locked !== false;
    });
    STATION_NAMES.forEach(function(n) {
      if (!capMap[n]) capMap[n] = 0;
      if (lockMap[n] === undefined) lockMap[n] = true;
    });
    setCapacities(capMap);
    setLocked(lockMap);
  }

  useEffect(function() { load(); }, []);

  async function saveSingle(name) {
    const ok = await saveCapacity(name, parseFloat(capacities[name]) || 0, locked[name] !== false);
    if (ok) toast('Saved: ' + name);
    else toast('Save error');
  }

  async function saveAll() {
    let ok = true;
    for (let j = 0; j < STATION_NAMES.length; j++) {
      const n = STATION_NAMES[j];
      const res = await saveCapacity(n, parseFloat(capacities[n]) || 0, locked[n] !== false);
      if (!res) ok = false;
    }
    if (ok) toast('All capacities saved');
    else toast('Some saves failed');
  }

  function unlockAll() {
    if (unlockPin === PIN) {
      const newLocked = {};
      STATION_NAMES.forEach(function(n) { newLocked[n] = false; });
      setLocked(newLocked);
      setUnlockPin('');
      setShowPin(false);
      toast('All stations unlocked');
    } else {
      toast('Wrong PIN');
    }
  }

  function lockAll() {
    const newLocked = {};
    STATION_NAMES.forEach(function(n) { newLocked[n] = true; });
    setLocked(newLocked);
    toast('All stations locked');
  }

  function updateCapacity(name, value) {
    setCapacities(function(prev) {
      const next = {};
      Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
      next[name] = value;
      return next;
    });
  }

  const totalCap = STATION_NAMES.reduce(function(s, n) {
    return s + (parseFloat(capacities[n]) || 0);
  }, 0);

  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div>
            <div className="card-title">Machine capacity settings</div>
            <div className="card-sub">Set m2/day capacity per station (24 hours). Default PIN to unlock: 1234</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {showPin ? (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="password" placeholder="Enter PIN" value={unlockPin}
                  onChange={function(e) { setUnlockPin(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') unlockAll(); }}
                  style={{width:120,fontSize:12,padding:'5px 9px',border:'1px solid var(--border2)',borderRadius:7,background:'var(--input-bg)',color:'var(--text)',outline:'none'}} />
                <button className="btn-primary" onClick={unlockAll}>Unlock</button>
                <button className="btn-ghost" onClick={function() { setShowPin(false); }}>Cancel</button>
              </div>
            ) : (
              <div style={{display:'flex',gap:8}}>
                <button className="btn-ghost" onClick={function() { setShowPin(true); }}>
                  <i className="ti ti-lock-open" aria-hidden="true" /> Unlock all
                </button>
                <button className="btn-ghost" onClick={lockAll}>
                  <i className="ti ti-lock" aria-hidden="true" /> Lock all
                </button>
                <button className="btn-primary" onClick={saveAll}>Save all</button>
              </div>
            )}
          </div>
        </div>
        <div className="divider" />
        <div style={{fontSize:12,color:'var(--text2)'}}>
          Total capacity: <strong style={{color:'var(--text)'}}>{totalCap.toFixed(1)} m2/day total capacity</strong>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Station</th>
                <th>Capacity (m2/day)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {STATION_NAMES.map(function(name, i) {
                const isLocked = locked[name] !== false;
                return (
                  <tr key={name}>
                    <td style={{color:'var(--text2)',fontSize:11}}>{i + 1}</td>
                    <td style={{fontWeight:500}}>{name}</td>
                    <td style={{width:160}}>
                      <input
                        type="number"
                        step=".1"
                        min="0"
                        value={capacities[name] || ''}
                        placeholder="0.0"
                        disabled={isLocked}
                        style={{
                          width:'100%',fontSize:12,padding:'4px 8px',
                          border:'1px solid var(--border2)',borderRadius:6,
                          background:isLocked ? 'var(--bg3)' : 'var(--input-bg)',
                          color:isLocked ? 'var(--text2)' : 'var(--text)',
                          outline:'none',
                          cursor:isLocked ? 'not-allowed' : 'text'
                        }}
                        onChange={function(e) {
                          if (!isLocked) updateCapacity(name, e.target.value);
                        }}
                      />
                    </td>
                    <td>
                      {isLocked
                        ? <span className="pill pill-gray">Locked</span>
                        : <span className="pill pill-green">Unlocked</span>}
                    </td>
                    <td>
                      {!isLocked && (
                        <button className="btn-ghost"
                          onClick={function() { saveSingle(name); }}
                          style={{fontSize:11,padding:'3px 8px'}}>
                          Save
                        </button>
                      )}
                    </td>
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
