import { useState, useEffect } from 'react'
import './Dashboard.css'

function daysBadgeClass(days) {
  if (days <= 7) return 'days-badge red'
  if (days <= 30) return 'days-badge yellow'
  return 'days-badge ok'
}

function formatShortDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function computeModuleStatus(summary) {
  const { coiItems, latestSafetyLog, tripCount, checklistCount, crewCount,
          maintenanceOverdue = 0, maintenanceWarning = 0, maintenanceOk = 0 } = summary

  const coiOver = coiItems.filter(i => i._status === 'overdue').length
  const coiWarn = coiItems.filter(i => i._status === 'warning').length
  const coiOk   = coiItems.filter(i => i._status === 'ok').length

  let safetyStatus = 'overdue', safetyOk = 0, safetyWarn = 0, safetyOver = 0
  if (latestSafetyLog) {
    const days = Math.floor((new Date() - new Date(latestSafetyLog.log_month + '-01')) / 86400000)
    if (days > 37)      { safetyStatus = 'overdue'; safetyOver = 1 }
    else if (days > 23) { safetyStatus = 'warning'; safetyWarn = 1 }
    else                { safetyStatus = 'ok';      safetyOk   = 1 }
  }

  const maintStatus = maintenanceOverdue > 0 ? 'overdue' : maintenanceWarning > 0 ? 'warning' : 'ok'

  return [
    { id: 'vessel',      label: 'Vessel Profile',  status: 'ok',                                                        ok: 1,                 warn: 0,               over: 0 },
    { id: 'trips',       label: 'Trip Log',         status: 'ok',                                                        ok: tripCount,         warn: 0,               over: 0 },
    { id: 'checklists',  label: 'Checklists',       status: 'ok',                                                        ok: checklistCount,    warn: 0,               over: 0 },
    { id: 'safety',      label: 'Monthly Safety',   status: safetyStatus,                                                ok: safetyOk,          warn: safetyWarn,      over: safetyOver },
    { id: 'maintenance', label: 'Maintenance',      status: maintStatus,                                                 ok: maintenanceOk,     warn: maintenanceWarning, over: maintenanceOverdue },
    { id: 'compliance',  label: 'COI Register',     status: coiOver > 0 ? 'overdue' : coiWarn > 0 ? 'warning' : 'ok',  ok: coiOk,             warn: coiWarn,         over: coiOver },
    { id: 'crew',        label: 'Crew & Training',  status: 'ok',                                                        ok: crewCount,         warn: 0,               over: 0 },
  ]
}

export default function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.vesselAPI.dashboard.getSummary()
    setSummary(data)
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">⬡</div>
      <h2>Loading dashboard…</h2>
    </div>
  )

  const { coiItems, recentTrips, latestSafetyLog, recentDrills,
          vesselProfile, tripCount } = summary

  const overdueItems = coiItems.filter(i => i._status === 'overdue')
  const warningItems = coiItems.filter(i => i._status === 'warning')

  const now = new Date()
  const in90 = new Date(); in90.setDate(in90.getDate() + 90)
  const upcomingItems = coiItems
    .filter(i => i._status !== 'overdue' && i._next_due)
    .filter(i => { const nd = new Date(i._next_due + 'T00:00:00'); return nd >= now && nd <= in90 })
    .sort((a, b) => a._next_due.localeCompare(b._next_due))
    .slice(0, 6)

  const moduleStatus = computeModuleStatus(summary)

  const coiExpiry = vesselProfile?.coi_expiry_date
  const coiDays = coiExpiry
    ? Math.floor((new Date(coiExpiry + 'T00:00:00') - now) / 86400000)
    : null
  const coiStatus = coiDays === null ? 'ok'
    : coiDays < 0 ? 'overdue'
    : coiDays < 90 ? 'warning'
    : 'ok'

  // Merge recent trips + drills + safety log into activity feed
  const activity = [
    ...recentTrips.map(t => ({
      type: 'trip',
      date: t.trip_date,
      label: `Trip — ${t.operating_area || t.captain_name || 'Underway'}`,
    })),
    ...recentDrills.map(d => ({
      type: 'drill',
      date: d.drill_date,
      label: `${d.drill_type} Drill`,
    })),
    ...(latestSafetyLog ? [{
      type: 'safety',
      date: latestSafetyLog.inspection_date || latestSafetyLog.log_month,
      label: `Safety inspection — ${new Date(latestSafetyLog.log_month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    }] : []),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="dashboard">
      {/* Alert banner */}
      {(overdueItems.length > 0 || warningItems.length > 0) && (
        <div className="alert-banner">
          <div className="alert-banner-inner">
            <div className="alert-counts">
              {overdueItems.length > 0 && (
                <div className="alert-count-block red">
                  <span className="alert-count-num">{overdueItems.length}</span>
                  <span className="alert-count-label">OVERDUE</span>
                </div>
              )}
              {warningItems.length > 0 && (
                <div className="alert-count-block yellow">
                  <span className="alert-count-num">{warningItems.length}</span>
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

      {/* Header */}
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

          {overdueItems.length > 0 && (
            <section className="card dash-section">
              <div className="section-label">⬤ Overdue Items</div>
              <div className="alert-item-list">
                {overdueItems.map(item => (
                  <div key={item.id} className="alert-item overdue">
                    <div className="alert-item-left">
                      <span className="status-badge status-over">OVERDUE</span>
                      <span className="alert-item-module">{item.category.toUpperCase()}</span>
                    </div>
                    <div className="alert-item-body">
                      <div className="alert-item-name">{item.item_name}</div>
                      <div className="alert-item-cfr">
                        {item.cfr_reference}
                        {!item.last_action_date ? ' · Never recorded' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {warningItems.length > 0 && (
            <section className="card dash-section">
              <div className="section-label">◑ Warning Items</div>
              <div className="alert-item-list">
                {warningItems.map(item => {
                  const daysLeft = item._next_due
                    ? Math.floor((new Date(item._next_due + 'T00:00:00') - now) / 86400000)
                    : null
                  return (
                    <div key={item.id} className="alert-item warning">
                      <div className="alert-item-left">
                        <span className="status-badge status-warn">WARNING</span>
                        <span className="alert-item-module">{item.category.toUpperCase()}</span>
                      </div>
                      <div className="alert-item-body">
                        <div className="alert-item-name">{item.item_name}</div>
                        <div className="alert-item-cfr">
                          {item.cfr_reference}
                          {daysLeft !== null ? ` · Due in ${daysLeft} days` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="card dash-section">
            <div className="section-label">Module Status</div>
            <div className="module-grid">
              {moduleStatus.map(mod => (
                <button key={mod.id}
                  className={`module-card status-${mod.status}`}
                  onClick={() => onNavigate(mod.id)}>
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

          <section className="card dash-section">
            <div className="section-label">Upcoming · 90 Days</div>
            {upcomingItems.length === 0 ? (
              <div className="recent-empty">
                <span>No items due in the next 90 days.</span>
              </div>
            ) : (
              <div className="upcoming-list">
                {upcomingItems.map(item => {
                  const daysUntil = Math.floor(
                    (new Date(item._next_due + 'T00:00:00') - now) / 86400000)
                  return (
                    <div key={item.id} className="upcoming-item">
                      <div className="upcoming-item-main">
                        <div className="upcoming-item-name">{item.item_name}</div>
                        <div className="upcoming-item-module">{item.category.toUpperCase()}</div>
                      </div>
                      <span className={daysBadgeClass(daysUntil)}>{daysUntil}d</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="card coi-card">
            <div className="section-label">Certificate of Inspection</div>
            <div className="coi-status-row">
              <div className="coi-status-main">
                <span className={`status-badge status-${coiStatus === 'ok' ? 'ok' : coiStatus === 'warning' ? 'warn' : 'over'}`}>
                  {coiStatus === 'ok' ? 'VALID' : coiStatus === 'warning' ? 'EXPIRING' : 'EXPIRED'}
                </span>
                <span className="coi-expiry">
                  {coiExpiry
                    ? `Expires ${new Date(coiExpiry + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : 'No expiry set'}
                </span>
              </div>
              {coiDays !== null && (
                <div className="coi-days-remain">~{Math.max(0, coiDays)} days</div>
              )}
            </div>
            <div className="coi-meta">
              {vesselProfile?.coi_issue_date && (
                <div className="coi-meta-row">
                  <span className="coi-meta-label">Issued</span>
                  <span className="coi-meta-val">
                    {new Date(vesselProfile.coi_issue_date + 'T00:00:00')
                      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="coi-meta-row">
                <span className="coi-meta-label">District</span>
                <span className="coi-meta-val">{vesselProfile?.ocmi_district ?? '—'}</span>
              </div>
              <div className="coi-meta-row">
                <span className="coi-meta-label">Route</span>
                <span className="coi-meta-val">{vesselProfile?.route ?? '—'}</span>
              </div>
              <div className="coi-meta-row">
                <span className="coi-meta-label">Subchapter</span>
                <span className="coi-meta-val">T (46 CFR 175–185)</span>
              </div>
            </div>
          </section>

          <section className="card dash-section">
            <div className="section-label">Recent Activity</div>
            {activity.length === 0 ? (
              <div className="recent-empty">
                <span>No activity logged yet.</span>
                <span>Start by creating a trip or logging a safety check.</span>
              </div>
            ) : (
              <div className="activity-list">
                {activity.map((a, i) => (
                  <div key={i} className="activity-item">
                    <span className={`activity-dot ${a.type}`}></span>
                    <div className="activity-body">
                      <div className="activity-label">{a.label}</div>
                      <div className="activity-date font-mono">{a.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
