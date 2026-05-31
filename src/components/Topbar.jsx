export default function Topbar({ title, globalDate, setGlobalDate, setPage }) {
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        <div className="date-pill">
          📅
          <input
            type="date"
            value={globalDate}
            onChange={e => setGlobalDate(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setPage('entry')}>
          ✎ Daily entry
        </button>
      </div>
    </div>
  );
}