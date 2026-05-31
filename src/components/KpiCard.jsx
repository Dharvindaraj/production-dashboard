export default function KpiCard({ icon, label, value, footer, footerClass, iconBg, iconColor, barColor }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value ?? '—'}</div>
      <div className={`kpi-footer ${footerClass || 'text-muted'}`}>{footer}</div>
      <div className="kpi-bar" style={{ background: barColor }} />
    </div>
  );
}