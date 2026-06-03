import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import OverviewPage from './components/pages/OverviewPage';
import EntryPage from './components/pages/EntryPage';
import StationsPage from './components/pages/StationsPage';
import TrendsPage from './components/pages/TrendsPage';
import MaterialsPage from './components/pages/MaterialsPage';
import HistoryPage from './components/pages/HistoryPage';
import DowntimePage from './components/pages/DowntimePage';
import CapacityPage from './components/pages/CapacityPage';
import EtchRatePage from './components/pages/EtchRatePage';
import PersonalOTPage from './components/pages/PersonalOTPage';
import SettingsPage from './components/pages/SettingsPage';
import WipPage from './components/pages/WipPage';
import ScrapPage from './components/pages/ScrapPage';
import ScrapHistoryPage from './components/pages/ScrapHistoryPage';
import EditModal from './components/EditModal';
import { getAllDays } from './utils/storage';
import { tod, PAGE_TITLES } from './utils/constants';

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null;
}

export default function App() {
  const [page, setPage]             = useState('overview');
  const [globalDate, setGlobalDate] = useState(tod());
  const [allDays, setAllDays]       = useState([]);
  const [toastMsg, setToastMsg]     = useState('');
  const [editDate, setEditDate]     = useState(null);
  const [darkMode, setDarkMode]     = useState(function() {
    return localStorage.getItem('darkMode') === 'true';
  });
  const toastTimer = useRef(null);

  useEffect(function() {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  function toast(m) {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(function() { setToastMsg(''); }, 2400);
  }

  async function refreshDays() {
    const d = await getAllDays();
    setAllDays(d);
  }

  useEffect(function() { refreshDays(); }, []);

  const pageProps = {
    allDays: allDays, globalDate: globalDate,
    toast: toast, onSave: refreshDays, darkMode: darkMode
  };

  return (
    <div className={darkMode ? 'app dark' : 'app'}>
      <Sidebar page={page} setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="main">
        <Topbar
          title={PAGE_TITLES[page] || page}
          globalDate={globalDate}
          setGlobalDate={setGlobalDate}
          setPage={setPage}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <div className="content">
          {page === 'overview'   && <OverviewPage {...pageProps} />}
          {page === 'entry'      && <EntryPage {...pageProps} />}
          {page === 'stations'   && <StationsPage {...pageProps} />}
          {page === 'downtime'   && <DowntimePage {...pageProps} />}
          {page === 'capacity'   && <CapacityPage {...pageProps} />}
          {page === 'trends'     && <TrendsPage {...pageProps} />}
          {page === 'materials'  && <MaterialsPage {...pageProps} />}
          {page === 'etchrate'   && <EtchRatePage {...pageProps} />}
          {page === 'personalot' && <PersonalOTPage {...pageProps} />}
          {page === 'history'    && <HistoryPage {...pageProps} onEdit={setEditDate} />}
          {page === 'settings'   && <SettingsPage {...pageProps} />}
          {page === 'wip'        && <WipPage {...pageProps} />}
          {page === 'scrap'      && <ScrapPage {...pageProps} />}
          {page === 'scraphist'  && <ScrapHistoryPage {...pageProps} />}
        </div>
      </div>
      {editDate && (
        <EditModal
          date={editDate}
          onClose={function() { setEditDate(null); }}
          onSaved={function() { setEditDate(null); refreshDays(); toast('Updated'); }}
          toast={toast}
        />
      )}
      <Toast msg={toastMsg} />

      <nav className="mobile-nav" role="navigation" aria-label="Mobile navigation">
        {[
          { key: 'overview',   icon: 'ti-layout-dashboard', label: 'Overview' },
          { key: 'entry',      icon: 'ti-edit',             label: 'Entry' },
          { key: 'wip',        icon: 'ti-clipboard-list',   label: 'WIP' },
          { key: 'scrap',      icon: 'ti-alert-triangle',   label: 'Scrap' },
          { key: 'personalot', icon: 'ti-user-clock',       label: 'My OT' },
        ].map(function(item) {
          return (
            <button key={item.key}
              className={page === item.key ? 'mobile-nav-btn active' : 'mobile-nav-btn'}
              onClick={function() { setPage(item.key); }}
              aria-label={item.label}>
              <i className={'ti ' + item.icon} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
