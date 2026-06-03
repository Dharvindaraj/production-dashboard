export default function Sidebar({ page, setPage, darkMode, setDarkMode }) {
  const navItems = [
    { section: 'Production' },
    { key: 'overview',   icon: 'ti-layout-dashboard', label: 'Masslam Dashboard' },
    { key: 'entry',      icon: 'ti-edit',             label: 'Daily entry' },
    { key: 'stations',   icon: 'ti-grid-dots',        label: 'Stations' },
    { key: 'downtime',   icon: 'ti-clock-pause',      label: 'Downtime' },
    { key: 'capacity',   icon: 'ti-settings-2',       label: 'Machine capacity' },
    { section: 'Analysis' },
    { key: 'trends',     icon: 'ti-chart-line',       label: 'Trends' },
    { key: 'materials',  icon: 'ti-packages',         label: 'Materials' },
    { key: 'etchrate',   icon: 'ti-chart-dots',       label: 'Etch rate SPC' },
    { key: 'history',    icon: 'ti-table',            label: 'History log' },
    { section: 'Quality' },
    { key: 'scrap',      icon: 'ti-alert-triangle',   label: 'Scrap tracker' },
    { key: 'scraphist',  icon: 'ti-chart-bar',        label: 'Scrap history' },
    { section: 'Operations' },
    { key: 'wip',        icon: 'ti-clipboard-list',   label: 'WIP tracker' },
    { section: 'Personal' },
    { key: 'personalot', icon: 'ti-user-clock',       label: 'My OT' },
    { section: 'Admin' },
    { key: 'settings',   icon: 'ti-adjustments',      label: 'Settings' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-name">
          <i className="ti ti-building-factory logo-icon" aria-hidden="true" />
          Masslam Monitoring
        </div>
        <div className="logo-sub">Dharvin's Dashboard</div>
      </div>

      {navItems.map(function(item, idx) {
        if (item.section) {
          return <div key={idx} className="nav-sec">{item.section}</div>;
        }
        return (
          <button key={item.key}
            className={page === item.key ? 'nav-btn active' : 'nav-btn'}
            onClick={function() { setPage(item.key); }}>
            <i className={'ti ' + item.icon} aria-hidden="true" />
            {item.label}
          </button>
        );
      })}

      <div className="dark-toggle" onClick={function() { setDarkMode(function(d) { return !d; }); }}>
        <span style={{display:'flex',alignItems:'center',gap:6}}>
          <i className={darkMode ? 'ti ti-moon' : 'ti ti-sun'} aria-hidden="true" />
          {darkMode ? 'Dark mode' : 'Light mode'}
        </span>
        <button className={darkMode ? 'toggle-switch on' : 'toggle-switch'} aria-label="Toggle dark mode">
          <div className="toggle-knob" />
        </button>
      </div>
    </div>
  );
}
