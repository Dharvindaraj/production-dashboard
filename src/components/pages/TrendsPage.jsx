import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import FilterBar from '../FilterBar';
import { DEFECTS, DEF_COLORS, daysAgo, tod, filterDays } from '../../utils/constants';

export default function TrendsPage({ allDays }) {
  const [from, setFrom] = useState(daysAgo(14));
  const [to, setTo]     = useState(tod());
  const [filtered, setFiltered] = useState([]);

  function update() { setFiltered(filterDays(allDays, from, to)); }
  useEffect(() => { update(); }, [allDays, from, to]);

  const labels = filtered.map(x => x.date.slice(5));
  const lineOpts = (suffix = '') => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { size: 9 }, autoSkip: true, maxRotation: 45 }, grid: { display: false } },
      y: { ticks: { font: { size: 9 }, callback: v => v + suffix }, grid: { color: 'rgba(0,0,0,.05)' } }
    }
  });

  return (
    <div>
      <FilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} onUpdate={update}
        rightLabel={`${filtered.length} records`} />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head"><div><div className="card-title">Output vs target</div></div></div>
        <div className="legend-row">
          <span className="leg"><span className="leg-dot" style={{ background: '#378ADD' }} />Actual</span>
          <span className="leg"><span className="leg-dot" style={{ background: '#E24B4A', opacity: .6 }} />Target</span>
        </div>
        <div style={{ height: 210 }}>
          <Line data={{ labels, datasets: [
            { label: 'Output', data: filtered.map(x => x.data.output || 0), borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,.07)', tension: .3, fill: true, pointRadius: 2 },
            { label: 'Target', data: filtered.map(x => x.data.target || 0), borderColor: '#E24B4A', borderDash: [6, 4], tension: .3, fill: false, pointRadius: 0, borderWidth: 1.5 }
          ]}} options={lineOpts()} />
        </div>
      </div>

      <div className="chart-row-3" style={{ marginBottom: 12 }}>
        {[
          { title: 'Scrap rate (%)',    data: filtered.map(x => x.data.scrap || 0),              color: '#E24B4A', suffix: '%' },
          { title: 'AOI scrap (%)',     data: filtered.map(x => x.data.aoi || 0),                color: '#1D9E75', suffix: '%' },
          { title: 'm²/hr efficiency', data: filtered.map(x => parseFloat(x.data.m2hr) || 0),   color: '#EF9F27', suffix: '' },
        ].map(({ title, data, color, suffix }) => (
          <div key={title} className="card">
            <div className="card-head"><div className="card-title">{title}</div></div>
            <div style={{ height: 150 }}>
              <Line data={{ labels, datasets: [{ data, borderColor: color, backgroundColor: color + '18', tension: .3, fill: true, pointRadius: 2 }]}} options={lineOpts(suffix)} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div><div className="card-title">Defect trend (stacked)</div></div></div>
        <div className="legend-row">
          {DEFECTS.map((n, i) => <span key={n} className="leg"><span className="leg-dot" style={{ background: DEF_COLORS[i] }} />{n}</span>)}
        </div>
        <div style={{ height: 210 }}>
          <Bar data={{ labels, datasets: DEFECTS.map((n, i) => ({
            label: n, data: filtered.map(x => x.data.defects?.[n] || 0),
            backgroundColor: DEF_COLORS[i], stack: 's', borderRadius: 2
          }))}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: {
              x: { stacked: true, ticks: { font: { size: 9 }, autoSkip: true, maxRotation: 45 }, grid: { display: false } },
              y: { stacked: true, ticks: { font: { size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,.05)' } }
            }
          }} />
        </div>
      </div>
    </div>
  );
}