import { STATION_NAMES } from '../utils/constants';

function heatColor(ratio) {
  if (ratio === 0) return { bg: '#F1EFE8', tc: '#888780' };
  if (ratio < 0.4) return { bg: '#EAF3DE', tc: '#27500A' };
  if (ratio < 0.7) return { bg: '#5DCAA5', tc: '#04342C' };
  return { bg: '#0F6E56', tc: '#9FE1CB' };
}

export default function Heatmap({ stationTotals }) {
  const vals = Object.values(stationTotals || {});
  const maxV = Math.max.apply(null, vals.concat([0.01]));

  return (
    <div>
      <div className="heatmap">
        {STATION_NAMES.map(function(name, i) {
          const v = stationTotals ? stationTotals[i + 1] || 0 : 0;
          const colors = heatColor(v / maxV);
          return (
            <div key={name} className="heat-cell" style={{background:colors.bg, color:colors.tc}}>
              <div className="heat-num">{name}</div>
              <div className="heat-val">{v > 0 ? v.toFixed(0) : '—'}</div>
            </div>
          );
        })}
      </div>
      <div className="heat-legend">
        {[{bg:'#EAF3DE',l:'Low'},{bg:'#5DCAA5',l:'Med'},{bg:'#0F6E56',l:'High'}].map(function(item) {
          return (
            <span key={item.l} style={{display:'flex',alignItems:'center',gap:3}}>
              <span className="heat-swatch" style={{background:item.bg}} /> {item.l}
            </span>
          );
        })}
      </div>
    </div>
  );
}
