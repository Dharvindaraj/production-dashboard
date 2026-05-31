import { useEffect, useRef } from 'react';
import { Chart as ChartJS } from 'chart.js';

export default function KpiCard({ icon, label, value, footer, footerClass, iconBg, iconColor, barColor, sparkData, sparkColor }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(function() {
    if (!canvasRef.current || !sparkData || !sparkData.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx  = canvasRef.current.getContext('2d');
    const col  = sparkColor || barColor || '#378ADD';
    const hex  = col.replace('#', '');
    const r    = parseInt(hex.slice(0,2), 16);
    const g    = parseInt(hex.slice(2,4), 16);
    const b    = parseInt(hex.slice(4,6), 16);
    const grad = ctx.createLinearGradient(0, 0, 0, 40);
    grad.addColorStop(0,   'rgba('+r+','+g+','+b+',0.35)');
    grad.addColorStop(1,   'rgba('+r+','+g+','+b+',0.0)');

    try {
      chartRef.current = new ChartJS(canvasRef.current, {
        type: 'line',
        data: {
          labels: sparkData.map(function(_, i) { return i; }),
          datasets: [{
            data: sparkData,
            borderColor: col,
            backgroundColor: grad,
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
          }]
        },
        options: {
          responsive: false,
          animation: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      });
    } catch(e) {}

    return function() {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch(e) {}
        chartRef.current = null;
      }
    };
  }, [JSON.stringify(sparkData), sparkColor, barColor]);

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-val">{value ?? '—'}</div>
          <div className={'kpi-footer ' + (footerClass || 'text-muted')}>{footer}</div>
        </div>
        {sparkData && sparkData.length > 0 && (
          <div style={{ flexShrink: 0, marginLeft: 8, marginTop: 4, opacity: 0.85 }}>
            <canvas
              ref={canvasRef}
              width={64}
              height={40}
              style={{ display: 'block' }}
            />
          </div>
        )}
      </div>
      <div className="kpi-bar" style={{ background: barColor }} />
    </div>
  );
}
