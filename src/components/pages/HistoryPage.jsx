import { useState, useEffect } from 'react';
import FilterBar from '../FilterBar';
import { daysAgo, tod, filterDays } from '../../utils/constants';

export default function HistoryPage({ allDays, onEdit }) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo]     = useState(tod());
  const [filtered, setFiltered] = useState([]);

  function update() { setFiltered(filterDays(allDays, from, to)); }
  useEffect(() => { update(); }, [allDays, from, to]);

  const rows = [...filtered].reverse();

  return (
    <div>
      <FilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} onUpdate={update}
        ranges={[{ n: 7, l: '7d' }, { n: 30, l: '30d' }, { n: 0, l: 'All' }]}
        rightLabel={`${filtered.length} records`} />
      <div className="card">
        {rows.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>{['Date','Output','Target','Diff','Scrap %','AOI %','m²/hr','Operators','Notes',''].map(t => <th key={t}>{t}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map(({ date, data: d }) => {
                  const diff = (d.output || 0) - (d.target || 0);
                  const pres = d.operators ? d.operators.filter(o => o.present).length : 0;
                  return (
                    <tr key={date}>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{date}</td>
                      <td>{(d.output || 0).toLocaleString()}</td>
                      <td>{(d.target || 0).toLocaleString()}</td>
                      <td style={{ color: diff >= 0 ? '#3B6D11' : '#A32D2D', whiteSpace: 'nowrap' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(0)}</td>
                      <td><span className={`pill ${(d.scrap || 0) > 2 ? 'pill-red' : (d.scrap || 0) > 1 ? 'pill-amber' : 'pill-green'}`}>{(d.scrap || 0).toFixed(2)}%</span></td>
                      <td>{(d.aoi || 0).toFixed(2)}%</td>
                      <td>{(parseFloat(d.m2hr) || 0).toFixed(2)}</td>
                      <td>{pres} pax</td>
                      <td style={{ color: '#888', fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.notes || ''}>{d.notes || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-ghost" onClick={() => onEdit(date)} style={{ fontSize: 11, padding: '3px 8px' }}>✎ Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">No data in this range</div>}
      </div>
    </div>
  );
}