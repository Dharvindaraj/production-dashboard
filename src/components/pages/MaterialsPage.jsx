import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
  getAllMats, saveMat, storageGet,
  getMonthMaterials, getMatTargets, saveMatTargets
} from '../../utils/storage';
import { currentMonth } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function MaterialsPage({ toast, darkMode }) {
  const [month, setMonth]     = useState(currentMonth());
  const [actual, setActual]   = useState('');
  const [target, setTarget]   = useState('');
  const [reason, setReason]   = useState('');
  const [history, setHistory] = useState([]);
  const [dayMats, setDayMats] = useState([]);
  const [matTargets, setMatTargets] = useState({ copperFoil: '', prepreg: '' });

  const variance    = (parseFloat(actual) || 0) - (parseFloat(target) || 0);
  const isOver      = parseFloat(actual) > parseFloat(target);
  const isUnder     = parseFloat(actual) < parseFloat(target);
  const statusLabel = isOver ? 'Over target' : isUnder ? 'Under target' : 'On target';
  const statusClass = isOver ? 'pill-red' : isUnder ? 'pill-green' : 'pill-blue';

  const gridColor   = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor   = darkMode ? '#9499b0' : '#666666';
  const labelColor  = darkMode ? '#e8e9f0' : '#1a1a1a';

  async function loadAll() {
    const rows = await getAllMats(); setHistory(rows);
    const days = await getMonthMaterials(month); setDayMats(days);
    const tgts = await getMatTargets(month); setMatTargets({ copperFoil: tgts.copperFoil || '', prepreg: tgts.prepreg || '' });
  }

  useEffect(() => { loadAll(); }, [month]);

  async function load() {
    const d = await storageGet(`mat:${month}`);
    if (d) { setActual(d.actual || ''); setTarget(d.target || ''); setReason(d.reason || ''); toast('Loaded ' + month); }
    else toast('No data for ' + month);
  }

  async function save() {
    const ok1 = await saveMat(month, parseFloat(actual) || 0, parseFloat(target) || 0, reason);
    const ok2 = await saveMatTargets(month, {
      copperFoil: parseFloat(matTargets.copperFoil) || 0,
      prepreg: parseFloat(matTargets.prepreg) || 0
    });
    if (ok1 && ok2) { toast('Saved ' + month); loadAll(); } else toast('Save error');
  }

  // Totals for the month
  const totalCF  = dayMats.reduce((s, d) => s + (d.copperFoil || 0), 0);
  const totalPP  = dayMats.reduce((s, d) => s + (d.prepreg || 0), 0);
  const tgtCF    = parseFloat(matTargets.copperFoil) || 0;
  const tgtPP    = parseFloat(matTargets.prepreg) || 0;
  const cfPct    = tgtCF > 0 ? Math.min((totalCF / tgtCF) * 100, 100) : 0;
  const ppPct    = tgtPP > 0 ? Math.min((totalPP / tgtPP) * 100, 100) : 0;

  const dayLabels = dayMats.map(d => d.date.slice(8));

  const baseLineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: tickColor, font: { size: 9 } }, grid: { color: gridColor } },
      y: { ticks: { color: tickColor, font: { size: 9 }, callback: v => 'RM ' + v.toLocaleString() }, grid: { color: gridColor } }
    }
  };

  const cfRunning = dayMats.map((_, i) => dayMats.slice(0, i + 1).reduce((s, d) => s + (d.copperFoil || 0), 0));
  const ppRunning = dayMats.map((_, i) => dayMats.slice(0, i + 1).reduce((s, d) => s + (d.prepreg || 0), 0));
  const cfTgtLine = dayMats.map(() => tgtCF);
  const ppTgtLine = dayMats.map(() => tgtPP);

  return (
    <div>
      {/* ── Monthly RM/m² entry ── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="section-lbl" style={{ margin: 0 }}>Monthly RM/m² entry</div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <div className="date-pill">
              <label style={{ fontSize: 10, color: 'var(--text2)' }}>Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: 12, outline: 'none', color: 'var(--text)' }} />
            </div>
            <button className="btn-ghost" onClick={load}>Load</button>
            <button className="btn-primary" onClick={save}>💾 Save</button>
          </div>
        </div>
        <div className="form-grid">
          <div className="fg"><label>Actual RM/m²</label><input type="number" value={actual} step=".0001" onChange={e => setActual(e.target.value)} /></div>
          <div className="fg"><label>Target RM/m²</label><input type="number" value={target} step=".0001" onChange={e => setTarget(e.target.value)} /></div>
          <div className="fg"><label>Variance</label><input type="number" value={actual && target ? variance.toFixed(4) : ''} readOnly /></div>
          <div className="fg"><label>Status</label>
            <div style={{ padding: '7px 9px', borderRadius: 7, fontSize: 12, background: 'var(--bg3)', display: 'flex', alignItems: 'center' }}>
              {actual && target ? <span className={`pill ${statusClass}`}>{statusLabel}</span> : '—'}
            </div>
          </div>
        </div>
        <div className="fg" style={{ marginTop: 10 }}>
          <label>Reason if over target</label>
          <textarea value={reason} placeholder="Enter reason..." onChange={e => setReason(e.target.value)} />
        </div>
      </div>

      {/* ── Daily material issuance summary ── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Daily material issuance — {month}</div>
            <div className="card-sub">Running total vs monthly target</div>
          </div>
        </div>

        {/* Monthly targets input */}
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="fg">
            <label>Copper foil monthly target (RM)</label>
            <input type="number" step="0.01" placeholder="0.00" value={matTargets.copperFoil}
              onChange={e => setMatTargets(m => ({ ...m, copperFoil: e.target.value }))} />
          </div>
          <div className="fg">
            <label>Prepreg monthly target (RM)</label>
            <input type="number" step="0.01" placeholder="0.00" value={matTargets.prepreg}
              onChange={e => setMatTargets(m => ({ ...m, prepreg: e.target.value }))} />
          </div>
        </div>

        {/* Summary cards */}
        <div className="mat-issue-grid">
          <div className="mat-issue-card">
            <div className="mat-issue-title" style={{ color: '#EF9F27' }}>
              <i className="ti ti-roll" aria-hidden="true" />Copper foil
            </div>
            <div className="mat-total">RM {totalCF.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="mat-sub">Target: RM {tgtCF.toLocaleString()} · {cfPct.toFixed(1)}% used</div>
            <div className="mat-progress">
              <div className="mat-progress-fill" style={{ width: cfPct + '%', background: cfPct > 90 ? '#E24B4A' : cfPct > 70 ? '#EF9F27' : '#5DCAA5' }} />
            </div>
          </div>
          <div className="mat-issue-card">
            <div className="mat-issue-title" style={{ color: '#378ADD' }}>
              <i className="ti ti-layers" aria-hidden="true" />Prepreg
            </div>
            <div className="mat-total">RM {totalPP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="mat-sub">Target: RM {tgtPP.toLocaleString()} · {ppPct.toFixed(1)}% used</div>
            <div className="mat-progress">
              <div className="mat-progress-fill" style={{ width: ppPct + '%', background: ppPct > 90 ? '#E24B4A' : ppPct > 70 ? '#EF9F27' : '#378ADD' }} />
            </div>
          </div>
        </div>

        {/* Daily charts */}
        {dayMats.length > 0 && (
          <div className="chart-row-equal" style={{ marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                Copper foil — daily issuance (RM)
              </div>
              <div className="legend-row">
                <span className="leg"><span className="leg-dot" style={{ background: '#EF9F27' }} />Daily</span>
                <span className="leg"><span className="leg-dot" style={{ background: '#E24B4A', opacity: .6 }} />Running total</span>
                <span className="leg"><span className="leg-dot" style={{ background: '#888', opacity: .4 }} />Target</span>
              </div>
              <div style={{ height: 180 }}>
                <Bar data={{
                  labels: dayLabels,
                  datasets: [
                    { label: 'Daily', data: dayMats.map(d => d.copperFoil || 0), backgroundColor: 'rgba(239,159,39,.7)', borderRadius: 3, yAxisID: 'y' },
                    { type: 'line', label: 'Running total', data: cfRunning, borderColor: '#E24B4A', backgroundColor: 'transparent', tension: .3, pointRadius: 2, yAxisID: 'y2' },
                    { type: 'line', label: 'Target', data: cfTgtLine, borderColor: '#888', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, yAxisID: 'y2' },
                  ]
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: tickColor, font: { size: 9 } }, grid: { display: false } },
                    y: { position: 'left', ticks: { color: tickColor, font: { size: 9 } }, grid: { color: gridColor } },
                    y2: { position: 'right', ticks: { color: tickColor, font: { size: 9 } }, grid: { display: false } }
                  }
                }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                Prepreg — daily issuance (RM)
              </div>
              <div className="legend-row">
                <span className="leg"><span className="leg-dot" style={{ background: '#378ADD' }} />Daily</span>
                <span className="leg"><span className="leg-dot" style={{ background: '#5DCAA5', opacity: .8 }} />Running total</span>
                <span className="leg"><span className="leg-dot" style={{ background: '#888', opacity: .4 }} />Target</span>
              </div>
              <div style={{ height: 180 }}>
                <Bar data={{
                  labels: dayLabels,
                  datasets: [
                    { label: 'Daily', data: dayMats.map(d => d.prepreg || 0), backgroundColor: 'rgba(55,138,221,.7)', borderRadius: 3, yAxisID: 'y' },
                    { type: 'line', label: 'Running total', data: ppRunning, borderColor: '#5DCAA5', backgroundColor: 'transparent', tension: .3, pointRadius: 2, yAxisID: 'y2' },
                    { type: 'line', label: 'Target', data: ppTgtLine, borderColor: '#888', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, yAxisID: 'y2' },
                  ]
                }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: tickColor, font: { size: 9 } }, grid: { display: false } },
                    y: { position: 'left', ticks: { color: tickColor, font: { size: 9 } }, grid: { color: gridColor } },
                    y2: { position: 'right', ticks: { color: tickColor, font: { size: 9 } }, grid: { display: false } }
                  }
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Daily table */}
        {dayMats.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Daily issuance log</div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Date</th><th>Copper foil (RM)</th><th>Prepreg (RM)</th><th>Total (RM)</th></tr></thead>
                <tbody>
                  {[...dayMats].reverse().map(d => (
                    <tr key={d.date}>
                      <td style={{ fontWeight: 500 }}>{d.date}</td>
                      <td>RM {(d.copperFoil || 0).toFixed(2)}</td>
                      <td>RM {(d.prepreg || 0).toFixed(2)}</td>
                      <td><strong>RM {((d.copperFoil || 0) + (d.prepreg || 0)).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg3)' }}>
                    <td><strong>Monthly total</strong></td>
                    <td><strong>RM {totalCF.toFixed(2)}</strong></td>
                    <td><strong>RM {totalPP.toFixed(2)}</strong></td>
                    <td><strong>RM {(totalCF + totalPP).toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── RM/m² history ── */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-head"><div className="card-title">RM/m² monthly history</div></div>
          <div className="legend-row">
            <span className="leg"><span className="leg-dot" style={{ background: '#378ADD' }} />Actual</span>
            <span className="leg"><span className="leg-dot" style={{ background: 'rgba(226,75,74,.4)' }} />Target</span>
          </div>
          <div style={{ height: 190 }}>
            <Bar data={{
              labels: history.map(r => r.month.slice(5) + '/' + r.month.slice(2, 4)),
              datasets: [
                { label: 'Actual', data: history.map(r => r.actual), backgroundColor: '#378ADD', borderRadius: 4 },
                { label: 'Target', data: history.map(r => r.target), backgroundColor: 'rgba(226,75,74,.35)', borderRadius: 4 }
              ]
            }} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor } }
              }
            }} />
          </div>
        </div>
      )}

      {/* ── History table ── */}
      <div className="card">
        <div className="card-head"><div className="card-title">Monthly RM/m² history table</div></div>
        {history.length ? (
          <div className="tbl-wrap">
            <table>
              <thead><tr>{['Month', 'Actual', 'Target', 'Variance', 'Status', 'Remarks', ''].map(t => <th key={t}>{t}</th>)}</tr></thead>
              <tbody>
                {history.map(r => {
                  const ov = r.actual > r.target, un = r.actual < r.target;
                  return (
                    <tr key={r.month}>
                      <td style={{ fontWeight: 500 }}>{r.month}</td>
                      <td>{r.actual.toFixed(4)}</td>
                      <td>{r.target.toFixed(4)}</td>
                      <td style={{ color: ov ? '#E24B4A' : un ? '#4CAF50' : 'inherit' }}>{r.variance >= 0 ? '+' : ''}{r.variance.toFixed(4)}</td>
                      <td><span className={`pill ${ov ? 'pill-red' : un ? 'pill-green' : 'pill-blue'}`}>{ov ? 'Over' : un ? 'Under' : 'On target'}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: 11 }}>{r.reason || '—'}</td>
                      <td><button className="btn-ghost" onClick={async () => {
                        const d = await storageGet(`mat:${r.month}`);
                        if (d) { setMonth(r.month); setActual(d.actual || ''); setTarget(d.target || ''); setReason(d.reason || ''); toast('Loaded ' + r.month); }
                      }} style={{ fontSize: 11, padding: '3px 8px' }}>✎ Edit</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">No monthly data yet</div>}
      </div>
    </div>
  );
}