import { useState, useEffect } from 'react';
import { storageGet, storageSet, storageDel } from '../utils/storage';
import { DEFECTS, N_STN } from '../utils/constants';

const AVT_BG = ['#E6F1FB','#E1F5EE','#FAEEDA','#FCEBEB','#EEEDFE','#FBEAF0'];
const AVT_TC = ['#0C447C','#085041','#633806','#791F1F','#3C3489','#72243E'];

export default function EditModal({ date, onClose, onSaved, toast }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const d = await storageGet(`day:${date}`);
      setData(d || {}); setLoading(false);
    })();
  }, [date]);

  async function del() {
    if (!confirm(`Delete entry for ${date}?`)) return;
    const ok = await storageDel(`day:${date}`);
    if (ok) { toast('Deleted — ' + date); onSaved(); } else toast('Error');
  }

  async function save() {
    const ok = await storageSet(`day:${date}`, data);
    if (ok) { toast('Updated — ' + date); onSaved(); } else toast('Error');
  }

  function setF(k, v)     { setData(d => ({ ...d, [k]: v })); }
  function setDef(n, v)   { setData(d => ({ ...d, defects: { ...(d.defects || {}), [n]: v } })); }
  function setStn(i, v)   { setData(d => ({ ...d, stations: { ...(d.stations || {}), [i]: v } })); }
  function setOp(i, k, v) {
    setData(d => {
      const ops = [...(d.operators || [])];
      ops[i] = { ...ops[i], [k]: v };
      return { ...d, operators: ops };
    });
  }

  if (loading) return (
    <div className="modal-bg">
      <div className="modal-box" style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading...</div>
    </div>
  );

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <div className="modal-title">Edit — {date}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="section-lbl" style={{ marginTop: 0 }}>Output & target</div>
        <div className="form-grid">
          <div className="fg">
            <label>Output (m²)</label>
            <input type="number" value={data.output || ''}
              onChange={e => setF('output', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>Target (m²)</label>
            <input type="number" value={data.target || ''}
              onChange={e => setF('target', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="section-lbl">Scrap & AOI</div>
        <div className="form-grid">
          <div className="fg">
            <label>Total scrap (%)</label>
            <input type="number" step=".01" value={data.scrap || ''}
              onChange={e => setF('scrap', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>AOI (%)</label>
            <input type="number" step=".01" value={data.aoi || ''}
              onChange={e => setF('aoi', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>Dent (%)</label>
            <input type="number" step=".01" value={data.dent || ''}
              onChange={e => setF('dent', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>Scratches (%)</label>
            <input type="number" step=".01" value={data.scratch || ''}
              onChange={e => setF('scratch', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>Wrinkle (%)</label>
            <input type="number" step=".01" value={data.wrinkle || ''}
              onChange={e => setF('wrinkle', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="section-lbl">Top 6 defects</div>
        {DEFECTS.map((n, i) => (
          <div key={n} className="def-row">
            <label>{n}</label>
            <input type="range" min={0} max={100} step={.1}
              value={data.defects?.[n] || 0}
              onChange={e => setDef(n, parseFloat(e.target.value))} />
            <input type="number" step={.1} value={data.defects?.[n] || 0}
              style={{ width: 60 }}
              onChange={e => setDef(n, parseFloat(e.target.value) || 0)} />
          </div>
        ))}

        {data.operators?.length > 0 && (
          <>
            <div className="section-lbl">Operators</div>
            {data.operators.map((op, i) => (
              <div key={i} className="op-row">
                <div className="op-avatar" style={{ background: AVT_BG[i % 6], color: AVT_TC[i % 6] }}>
                  {op.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="op-name">{op.name}</span>
                <select
                  value={op.shift || 'day'}
                  onChange={e => setOp(i, 'shift', e.target.value)}
                >
                  <option value="day">Day shift (12h)</option>
                  <option value="night">Night shift (12h)</option>
                  <option value="cut_self">Cut OT self (9h)</option>
                  <option value="cut_mgmt">Cut OT mgmt (9h)</option>
                  <option value="absent">Absent (0h)</option>
                </select>
              </div>
            ))}
          </>
        )}

        <div className="section-lbl">Station output</div>
        <div className="stn-input-grid">
          {Array.from({ length: N_STN }, (_, i) => (
            <div key={i + 1} className="stn-input-cell">
              <label>STN {i + 1}</label>
              <input type="number" step=".1"
                value={data.stations?.[i + 1] || ''}
                placeholder="0"
                onChange={e => setStn(i + 1, parseFloat(e.target.value) || 0)} />
            </div>
          ))}
        </div>

        <div className="form-grid" style={{ marginTop: 10 }}>
          <div className="fg">
            <label>Man-hours</label>
            <input type="number" value={data.mh || ''}
              onChange={e => setF('mh', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="fg">
            <label>m²/hr</label>
            <input type="number" value={data.m2hr || ''}
              onChange={e => setF('m2hr', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="fg" style={{ marginTop: 10 }}>
          <label>Notes</label>
          <textarea value={data.notes || ''}
            onChange={e => setF('notes', e.target.value)} />
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={del}>Delete entry</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>💾 Save changes</button>
        </div>
      </div>
    </div>
  );
}