import { useState, useEffect } from 'react';
import { getCapacity, saveCapacity } from '../../utils/storage';
import { STATION_NAMES } from '../../utils/constants';

export default function CapacityPage({ toast }) {
  const [capacities, setCapacities] = useState({});
  const [locked, setLocked]         = useState({});
  const [unlockPin, setUnlockPin]   = useState('');
  const [showPin, setShowPin]       = useState(false);
  const PIN = '1234';

  async function load() {
    const data = await getCapacity();
    const capMap = {}; const lockMap = {};
    data.forEach(d => {
      capMap[d.station_name]  = d.capacity_per_hour;
      lockMap[d.station_name] = d.is_locked !== false;
    });
    STATION_NAMES.forEach(n => {
      if (!capMap[n])  capMap[n]  = 0;
      if (lockMap[n] === undefined) lockMap[n] = true;
    });
    setCapacities(capMap); setLocked(lockMap);
  }

  useEffect(() => { load(); }, []);

  async function saveSingle(name) {
    const ok = await saveCapacity(name, parseFloat(capacities[name]) || 0, locked[name] !== false);
    if (ok) toast('Saved: ' + name);
    else toast('Save error');
  }

  async function saveAll() {
    let ok = true;
    for (const name of STATION_NAMES) {
      const res = await saveCapacity(name, parseFloat(capacities[name]) || 0, locked[name] !== false);
      if (!res) ok = false;
    }
    if (ok) toast('All capacities saved');
    else toast('Some saves failed');
  }

  function unlockAll() {
    if (unlockPin === PIN) {
      const newLocked = {};
      STATION_NAMES.forEach(n => { newLocked[n] = false; });
      setLocked(newLocked);
      setUnlockPin(''); setShowPin(false);
      toast('All stations unlocked');
    } else {
      toast('Wrong PIN');
    }
  }

  function lockAll() {
    const newLocked = {};
    STATION_NAMES.forEach(n => { newLocked[n] = true; });
    setLocked(newLocked);
    toast('All stations locked');
  }

  const totalCapacity = STATION_NAMES.reduce((s, n) => s + (parseFloat(capacities[n]) || 0), 0);

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="card-title">Machine capacity settings</div>
            <div className="card-sub">Set m²/hr capacity per station. Lock to prevent accidental changes.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {showPin ? (
              <>
                <input type="password" placeholder="Enter PIN"
                  value={unlockPin} onChange={e => setUnlockPin(e.target.value)}
                  style={{ width: 120, fontSize: 12, padding: '5px 9px', border: '1px solid var(--border2)', borderRadius: 7, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && unlockAll()} />
                <button className="btn-primary" onClick={unlockAll}>Unlock</button>
                <button className="btn-ghost" onClick={() => setShowPin(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setShowPin(true)}>
                  <i className="ti ti-lock-open" aria-hidden="true" /> Unlock all
                </button>
                <button className="btn-ghost" onClick={lockAll}>
                  <i className="ti ti-lock" aria-hidden="true" /> Lock all
                </button>
                <button className="btn-primary" onClick={saveAll}>💾 Save all</button>
              </>
            )}
          </div>
        </div>
        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          Total line capacity: <strong style={{ color: 'var(--text)' }}>{totalCapacity.toFixed(1)} m²/hr</strong>
          <span style={{ marginLeft: 8, fontSize: 11 }}>(default PIN to unlock: 1234 — change in code)</span>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Station</th>
                <th>Capacity (m²/hr)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {STATION_NAMES.map((name, i) => {
                const isLocked = locked[name] !== false;
                return (
                  <tr key={name}>
                    <td style={{ color: 'var(--text2)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{name}</td>
                    <td style={{ width: 160 }}>
                      <input type="number" step=".1" min="0"
                        value={capacities[name] || ''}
                        placeholder="0.0"
                        disabled={isLocked}
                        style={{
                          width: '100%', fontSize: 12, padding: '4px 8px',
                          border: '1px solid var(--border2)', borderRadius: 6,
                          background: isLocked ? 'var(--bg3)' : 'var(--input-bg)',
                          color: isLocked ? 'var(--text2)' : 'var(--text)',
                          outline: 'none', cursor: isLocked ? 'not-allowed' : 'text'
                        }}
                        onChange={e => !isLocked && setCapacities(c => ({ ...c, [name]: e.target.value }))} />
                    </td>
                    <td>
                      {isLocked
                        ? <span className="pill pill-gray"><i className="ti ti-lock" aria-hidden="true" /> Locked</span>
                        : <span className="pill pill-green"><i className="ti ti-lock-open" aria-hidden="true" /> Unlocked</span>}
                    </td>
                    <td>
                      {!isLocked && (
                        <button className="btn-ghost" onClick={() => saveSingle(name)}
                          style={{ fontSize: 11, padding: '3px 8px' }}>Save</button>
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