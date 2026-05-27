import './Dashboard.css'

// Simulated compliance data — will be replaced by SQLite queries later
const OVERDUE_ITEMS = [
  {
    id: 1,
    module: 'COI REGISTER',
    item: 'Life raft — annual shore-side servicing',
    cfr: '46 CFR 180.130',
    daysOverdue: 'NEVER SERVICED',
    status: 'overdue',
  },
  {
    id: 2,
    module: 'COI REGISTER',
    item: 'FCC Ship Station License',
    cfr: '46 CFR 184.502',
    daysOverdue: 'NOT OBTAINED',
    status: 'overdue',
  },
]

const WARNING_ITEMS = [
  {
    id: 3,
    module: 'COI REGISTER',
    item: 'Flare kit — replace on/before expiry',
    cfr: '46 CFR 180.68',
    daysUntil: '~30 days',
    status: 'warning',
  },
]

const UPCOMING = [
  { item: 'Monthly safety equipment inspection', module: 'SAFETY LOG', daysUntil: 4 },
  { item: 'Flare kit expiration', module: 'COI REGISTER', daysUntil: 30 },
  { item: 'Abandon ship / MOB drill', module: 'COMPLIANCE', daysUntil: 62 },
  { item: 'Firefighting drill', module: 'COMPLIANCE', daysUntil: 62 },
  { item: 'EPIRB NOAA registration check', module: 'COI REGISTER', daysUntil: 281 },
]

const MODULE_STATUS = [
  { id: 'vessel',      label: 'Vessel Profile',    status: 'ok',      ok: 1,  warn: 0, over: 0 },
  { id: 'trips',       label: 'Trip Log',           status: 'ok',      ok: 0,  warn: 0, over: 0 },
  { id: 'checklists',  label: 'Checklists',         status: 'ok',      ok: 0,  warn: 0, over: 0 },
  { id: 'safety',      label: 'Monthly Safety',     status: 'warning', ok: 6,  warn: 1, over: 0 },
  { id: 'maintenance', label: 'Maintenance',        status: 'ok',      ok: 12, warn: 0, over: 0 },
  { id: 'compliance',  label: 'COI Register',       status: 'overdue', ok: 31, warn: 1, over: 2 },
  { id: 'crew',        label: 'Crew & Training',    status: 'ok',      ok: 4,  warn: 0, over: 0 },
]

function statusLabel(s) {
  if (s === 'overdue') return 'OVERDUE'
  if (s === 'warning') return 'WARNING'
  return 'OK'
}

function daysBadgeClass(days) {
  if (days <= 7) return 'days-badge red'
  if (days <= 30) return 'days-badge yellow'
  return 'days-badge ok'
}

export default function Dashboard({ onNavigate }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="dashboard">
      {/* Alert banner */}
      {(OVERDUE_ITEMS.length > 0 || WARNING_ITEMS.length > 0) && (
        <div className="alert-banner">
          <div className="alert-banner-inner">
            <div className="alert-counts">
              {OVERDUE_ITEMS.length > 0 && (
                <div className="alert-count-block red">
                  <span className="alert-count-num">{OVERDUE_ITEMS.length}</span>
                  <span className="alert-count-label">OVERDUE</span>
                </div>
              )}
              {WARNING_ITEMS.length > 0 && (
                <div className="alert-count-block yellow">
                  <span className="alert-count-num">{WARNING_ITEMS.length}</span>
                  <span className="alert-count-label">WARNING</span>
                </div>
              )}
            </div>
            <div className="alert-banner-text">
              Compliance items require attention before next underway operation.
            </div>
            <button className="btn btn-ghost" onClick={() => onNavigate('compliance')}>
              View COI Register →
            </button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">OPERATIONS DASHBOARD</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('trips')}>+ New Trip</button>
          <button className="btn btn-ghost" onClick={() => onNavigate('safety')}>Log Safety Check</button>
          <button className="btn btn-ghost" onClick={() => onNavigate('compliance')}>Log Drill</button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left column */}
        <div className="dash-col-main">

          {/* Overdue items */}
          {OVERDUE_ITEMS.length > 0 && (
            <section className="card dash-section">
              <div className="section-label">⬤ Overdue Items</div>
              <div className="alert-item-list">
                {OVERDUE_ITEMS.map(item => (
                  <div key={item.id} className="alert-item overdue">
                    <div className="alert-item-left">
                      <span className="status-badge status-over">OVERDUE</span>
                      <span className="alert-item-module">{item.module}</span>
                    </div>
                    <div className="alert-item-body">
                      <div className="alert-item-name">{item.item}</div>
                      <div className="alert-item-cfr">{item.cfr} · {item.daysOverdue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Warning items */}
          {WARNING_ITEMS.length > 0 && (
            <section className="card dash-section">
              <div className="section-label">◑ Warning Items</div>
              <div className="alert-item-list">
                {WARNING_ITEMS.map(item => (
                  <div key={item.id} className="alert-item warning">
                    <div className="alert-item-left">
                      <span className="status-badge status-warn">WARNING</span>
                      <span className="alert-item-module">{item.module}</span>
                    </div>
                    <div className="alert-item-body">
                      <div className="alert-item-name">{item.item}</div>
                      <div className="alert-item-cfr">{item.cfr} · Due in {item.daysUntil}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Module status grid */}
          <section className="card dash-section">
            <div className="section-label">Module Status</div>
            <div className="module-grid">
              {MODULE_STATUS.map(mod => (
                <button
                  key={mod.id}
                  className={`module-card status-${mod.status}`}
                  onClick={() => onNavigate(mod.id)}
                >
                  <div className="module-card-top">
                    <span className={`module-status-dot ${mod.status}`}></span>
                    <span className="module-card-label">{mod.label}</span>
                  </div>
                  <div className="module-card-counts">
                    <span className="mc-ok">{mod.ok} OK</span>
                    {mod.warn > 0 && <span className="mc-warn">{mod.warn} WARN</span>}
                    {mod.over > 0 && <span className="mc-over">{mod.over} OVER</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="dash-col-side">

          {/* Upcoming deadlines */}
          <section className="card dash-section">
            <div className="section-label">Upcoming · 90 Days</div>
            <div className="upcoming-list">
              {UPCOMING.map((u, i) => (
                <div key={i} className="upcoming-item">
                  <div className="upcoming-item-main">
                    <div className="upcoming-item-name">{u.item}</div>
                    <div className="upcoming-item-module">{u.module}</div>
                  </div>
                  <span className={daysBadgeClass(u.daysUntil)}>
                    {u.daysUntil}d
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* COI status */}
          <section className="card coi-card">
            <div className="section-label">Certificate of Inspection</div>
            <div className="coi-status-row">
              <div className="coi-status-main">
                <span className="status-badge status-ok">VALID</span>
                <span className="coi-expiry">Expires APR 2028</span>
              </div>
              <div className="coi-days-remain">~700 days</div>
            </div>
            <div className="coi-meta">
              <div className="coi-meta-row">
                <span className="coi-meta-label">Issued</span>
                <span className="coi-meta-val">April 2026</span>
              </div>
              <div className="coi-meta-row">
                <span className="coi-meta-label">District</span>
                <span className="coi-meta-val">Sector Jacksonville</span>
              </div>
              <div className="coi-meta-row">
                <span className="coi-meta-label">Route</span>
                <span className="coi-meta-val">Coastal</span>
              </div>
              <div className="coi-meta-row">
                <span className="coi-meta-label">Subchapter</span>
                <span className="coi-meta-val">T (46 CFR 175–185)</span>
              </div>
            </div>
          </section>

          {/* Recent activity placeholder */}
          <section className="card dash-section">
            <div className="section-label">Recent Activity</div>
            <div className="recent-empty">
              <span>No activity logged yet.</span>
              <span>Start by creating a trip or logging a safety check.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
