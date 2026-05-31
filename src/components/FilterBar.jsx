import { useState } from 'react';
import { daysAgo, tod } from '../utils/constants';

export default function FilterBar({ from, to, setFrom, setTo, onUpdate, ranges, rightLabel }) {
  const defaultRanges = ranges || [{ n: 7, l: '7d' }, { n: 14, l: '14d' }, { n: 30, l: '30d' }, { n: 0, l: 'All' }];
  const [active, setActive] = useState(defaultRanges[1]?.n ?? 14);

  function pick(n) {
    setActive(n);
    if (n === 0) { setFrom(''); setTo(tod()); }
    else { setFrom(daysAgo(n)); setTo(tod()); }
    setTimeout(onUpdate, 0);
  }

  return (
    <div className="filter-bar">
      <label>From</label>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
      <label>To</label>
      <input type="date" value={to} onChange={e => setTo(e.target.value)} />
      <div className="filter-sep" />
      <div style={{ display: 'flex', gap: 5 }}>
        {defaultRanges.map(({ n, l }) => (
          <button key={n} className={`quick-btn${active === n ? ' active' : ''}`} onClick={() => pick(n)}>{l}</button>
        ))}
      </div>
      <button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 11 }} onClick={onUpdate}>↺ Update</button>
      {rightLabel && <div className="filter-right">{rightLabel}</div>}
    </div>
  );
}