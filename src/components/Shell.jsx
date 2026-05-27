import './Shell.css'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '⬡',
    section: null,
  },
  {
    id: 'vessel',
    label: 'Vessel & COI Profile',
    icon: '⚓',
    section: 'VESSEL',
  },
  {
    id: 'trips',
    label: 'Trip Log',
    icon: '◫',
    section: 'OPERATIONS',
  },
  {
    id: 'checklists',
    label: 'Checklists',
    icon: '✓',
    section: null,
  },
  {
    id: 'safety',
    label: 'Monthly Safety Log',
    icon: '◉',
    section: 'COMPLIANCE',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: '⚙',
    section: null,
  },
  {
    id: 'compliance',
    label: 'COI Register',
    icon: '⊞',
    section: null,
  },
  {
    id: 'crew',
    label: 'Crew & Training',
    icon: '◈',
    section: 'CREW',
  },
  {
    id: 'reports',
    label: 'Reports & Export',
    icon: '⊟',
    section: 'REPORTS',
  },
]

// Simulated alert counts — will be driven by DB/state later
const ALERT_COUNTS = {
  dashboard: { red: 2, yellow: 1 },
  compliance: { red: 2, yellow: 1 },
  safety: { yellow: 1 },
}

export default function Shell({ currentPage, onNavigate, children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="vessel-mark">
            <span className="vessel-mark-symbol">⚓</span>
          </div>
          <div className="vessel-identity">
            <div className="vessel-name">R/V SUNBURST</div>
            <div className="vessel-sub">DOC · 1345362</div>
          </div>
        </div>

        <div className="coi-strip">
          <span className="coi-strip-label">COI STATUS</span>
          <span className="coi-strip-value">VALID · APR 2028</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const alerts = ALERT_COUNTS[item.id]
            return (
              <div key={item.id}>
                {item.section && (
                  <div className="nav-section-label">{item.section}</div>
                )}
                <button
                  className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {alerts && (
                    <span className="nav-alerts">
                      {alerts.red > 0 && (
                        <span className="alert-dot red">{alerts.red}</span>
                      )}
                      {alerts.yellow > 0 && (
                        <span className="alert-dot yellow">{alerts.yellow}</span>
                      )}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-line">VesselLog · v0.1.0</div>
          <div className="sidebar-footer-line">Smithsonian Marine Station</div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            {NAV_ITEMS.find(n => n.id === currentPage)?.label || 'Dashboard'}
          </div>
          <div className="topbar-right">
            <span className="topbar-tag">NWN36144A322</span>
            <span className="topbar-sep">·</span>
            <span className="topbar-tag">COASTAL</span>
            <span className="topbar-sep">·</span>
            <span className="topbar-tag">SUB-T</span>
            <span className="topbar-sep">·</span>
            <span className="topbar-tag">16 SOULS</span>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
