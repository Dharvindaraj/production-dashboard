import { DEFECTS, DEF_COLORS } from '../utils/constants';

export default function DefectBars({ data }) {
  if (!data) return <div className="empty">No data</div>;
  const max = Math.max(...DEFECTS.map(n => data[n] || 0), 0.01);
  return (
    <div className="defect-list">
      {DEFECTS.map((n, i) => {
        const v = data[n] || 0;
        return (
          <div key={n} className="defect-item">
            <div className="d-top">
              <span className="d-name">{n}</span>
              <span className="d-pct" style={{ color: DEF_COLORS[i] }}>{v.toFixed(1)}%</span>
            </div>
            <div className="d-bar-bg">
              <div className="d-bar-fill" style={{ width: `${(v / max * 100).toFixed(1)}%`, background: DEF_COLORS[i] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}