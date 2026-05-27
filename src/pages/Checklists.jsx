import { useState, useEffect } from 'react'
import './Checklists.css'

// ── Checklist item row ─────────────────────────────────────────
function ChecklistItem({ item, operator, onCheck, readOnly }) {
  const isChecked = !!item.checked
  const isNA = !!item.na
  const isDone = isChecked || isNA

  return (
    <div className={`cl-item ${isDone ? 'done' : ''} ${isNA ? 'na' : ''}`}>
      <div className="cl-item-left">
        {!readOnly ? (
          <button
            className={`cl-check-btn ${isChecked ? 'checked' : ''} ${isNA ? 'na' : ''}`}
            onClick={() => onCheck(item.id, !isChecked, false)}
            title={isChecked ? 'Uncheck' : 'Check off'}
          >
            {isChecked ? '✓' : isNA ? '—' : ''}
          </button>
        ) : (
          <div className={`cl-check-static ${isChecked ? 'checked' : isNA ? 'na' : ''}`}>
            {isChecked ? '✓' : isNA ? '—' : '○'}
          </div>
        )}
      </div>
      <div className="cl-item-body">
        <span className={`cl-item-text ${isDone ? 'done' : ''}`}>{item.item_text}</span>
        {!item.required && <span className="cl-optional">optional</span>}
        {item.checked_by && (
          <span className="cl-signed">{item.checked_by}</span>
        )}
      </div>
      {!readOnly && !isChecked && item.required && (
        <button
          className="cl-na-btn"
          onClick={() => onCheck(item.id, false, !isNA)}
          title="Mark N/A"
        >
          N/A
        </button>
      )}
    </div>
  )
}

// ── Active checklist view ──────────────────────────────────────
function ChecklistDetail({ checklist, operator, onClose, onUpdate }) {
  const [items, setItems] = useState(checklist.items || [])
  const [loading, setLoading] = useState(false)

  const groups = [...new Set(items.map(i => i.group_name))]
  const requiredTotal = items.filter(i => i.required).length
  const requiredDone = items.filter(i => i.required && (i.checked || i.na)).length
  const allDone = requiredDone === requiredTotal
  const pct = requiredTotal > 0 ? Math.round((requiredDone / requiredTotal) * 100) : 0

  async function handleCheck(itemId, checked, na) {
    setLoading(true)
    await window.vesselAPI.checklists.checkItem({
      item_id: itemId,
      checked,
      na,
      checked_by: operator,
    })
    // Reload items
    const updated = await window.vesselAPI.checklists.getOne(checklist.id)
    setItems(updated.items)
    onUpdate()
    setLoading(false)
  }

  const typeLabel = checklist.type === 'pre-departure' ? 'PRE-DEPARTURE' : 'POST-RETURN'
  const isCompleted = !!checklist.completed

  return (
    <div className="cl-detail">
      {/* Header */}
      <div className="cl-detail-header">
        <div className="cl-detail-meta">
          <span className={`cl-type-badge ${checklist.type}`}>{typeLabel}</span>
          <span className="cl-detail-date font-mono">{checklist.date}</span>
          {checklist.trip_date && (
            <span className="cl-trip-link">Trip: {checklist.trip_date}</span>
          )}
        </div>
        <button className="btn btn-ghost" onClick={onClose}>← Back</button>
      </div>

      {/* Progress bar */}
      <div className="cl-progress-section">
        <div className="cl-progress-bar-wrap">
          <div
            className={`cl-progress-bar ${allDone ? 'complete' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="cl-progress-label">
          <span className={`cl-progress-count ${allDone ? 'complete' : ''}`}>
            {requiredDone} / {requiredTotal} required items
          </span>
          {allDone && (
            <span className="cl-complete-badge">✓ CHECKLIST COMPLETE</span>
          )}
        </div>
      </div>

      {/* Items by group */}
      <div className="cl-items-scroll">
        {groups.map(group => {
          const groupItems = items.filter(i => i.group_name === group)
          return (
            <div key={group} className="cl-group">
              <div className="cl-group-label">{group}</div>
              <div className="cl-group-items">
                {groupItems.map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    operator={operator}
                    onCheck={handleCheck}
                    readOnly={isCompleted || loading}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {isCompleted && (
        <div className="cl-completed-footer">
          <span className="status-badge status-ok">COMPLETE</span>
          <span className="cl-completed-text">
            Signed off {checklist.completed_at?.slice(0, 16).replace('T', ' ')}
            {checklist.completed_by ? ` by ${checklist.completed_by}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

// ── New checklist modal ────────────────────────────────────────
function NewChecklistModal({ trips, onCreate, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState('pre-departure')
  const [date, setDate] = useState(today)
  const [tripId, setTripId] = useState('')

  async function handleCreate() {
    await window.vesselAPI.checklists.create({
      type,
      date,
      trip_id: tripId || null,
    })
    onCreate()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">NEW CHECKLIST</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Checklist Type</label>
              <div className="type-selector">
                <button
                  className={`type-selector-btn ${type === 'pre-departure' ? 'active' : ''}`}
                  onClick={() => setType('pre-departure')}
                >
                  Pre-Departure
                </button>
                <button
                  className={`type-selector-btn ${type === 'post-return' ? 'active' : ''}`}
                  onClick={() => setType('post-return')}
                >
                  Post-Return
                </button>
              </div>
            </div>
            <div className="field span-2">
              <label className="field-label">Date</label>
              <input className="field-input" type="date" value={date}
                onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field span-2">
              <label className="field-label">Link to Trip (optional)</label>
              <select className="field-input" value={tripId}
                onChange={e => setTripId(e.target.value)}>
                <option value="">— No trip linked —</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.trip_date} — {t.departure_location || '?'} → {t.arrival_location || '?'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>
            Start Checklist
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function Checklists() {
  const [checklists, setChecklists] = useState([])
  const [trips, setTrips] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeChecklist, setActiveChecklist] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | open | complete

  // Operator name — would come from auth in a multi-user setup
  // For now, use the captain's preferred name from vessel profile
  const operator = 'Branson'

  useEffect(() => { load() }, [])

  async function load() {
    const [cl, tr] = await Promise.all([
      window.vesselAPI.checklists.getAll(),
      window.vesselAPI.trips.getAll(),
    ])
    setChecklists(cl)
    setTrips(tr)
    setLoading(false)
  }

  async function openChecklist(id) {
    const cl = await window.vesselAPI.checklists.getOne(id)
    setActiveChecklist(cl)
    setActiveId(id)
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this checklist?')) {
      await window.vesselAPI.checklists.delete(id)
      if (activeId === id) { setActiveId(null); setActiveChecklist(null) }
      load()
    }
  }

  function handleCreated() {
    setShowNew(false)
    load()
    // Open the newest checklist automatically
    setTimeout(async () => {
      const cl = await window.vesselAPI.checklists.getAll()
      if (cl.length) openChecklist(cl[0].id)
    }, 100)
  }

  const filtered = checklists.filter(cl => {
    if (filter === 'open') return !cl.completed
    if (filter === 'complete') return !!cl.completed
    return true
  })

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">✓</div>
      <h2>Loading checklists…</h2>
    </div>
  )

  return (
    <div className="checklists-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">OPERATIONS CHECKLISTS</h1>
          <p className="page-subtitle">46 CFR 185.510 — Pre-departure and post-return procedures</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Checklist
        </button>
      </div>

      <div className="cl-layout">
        {/* List sidebar */}
        <div className="cl-list-col">
          <div className="cl-filter-row">
            {['all', 'open', 'complete'].map(f => (
              <button key={f} className={`cl-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-hint" style={{ padding: '20px 12px' }}>
              No checklists yet. Start one before departure.
            </div>
          )}

          {filtered.map(cl => {
            const pct = cl.item_count > 0
              ? Math.round((cl.checked_count / cl.item_count) * 100) : 0
            const isActive = cl.id === activeId

            return (
              <div key={cl.id}
                className={`cl-list-item ${isActive ? 'active' : ''} ${cl.completed ? 'complete' : ''}`}
                onClick={() => openChecklist(cl.id)}
              >
                <div className="cl-list-item-top">
                  <span className={`cl-type-dot ${cl.type}`} />
                  <span className="cl-list-type">
                    {cl.type === 'pre-departure' ? 'Pre-Departure' : 'Post-Return'}
                  </span>
                  {cl.completed
                    ? <span className="status-badge status-ok" style={{ fontSize: 9 }}>DONE</span>
                    : <span className="status-badge status-warn" style={{ fontSize: 9 }}>OPEN</span>
                  }
                </div>
                <div className="cl-list-date font-mono">{cl.date}</div>
                {cl.trip_date && (
                  <div className="cl-list-trip">Trip: {cl.trip_date}</div>
                )}
                <div className="cl-mini-progress">
                  <div className="cl-mini-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="cl-list-counts">
                  {cl.checked_count} / {cl.item_count} items
                </div>
                <button className="cl-delete-btn"
                  onClick={e => { e.stopPropagation(); handleDelete(cl.id) }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {/* Detail area */}
        <div className="cl-detail-col">
          {activeChecklist ? (
            <ChecklistDetail
              key={activeChecklist.id}
              checklist={activeChecklist}
              operator={operator}
              onClose={() => { setActiveId(null); setActiveChecklist(null) }}
              onUpdate={() => {
                load()
                openChecklist(activeChecklist.id)
              }}
            />
          ) : (
            <div className="cl-empty-detail">
              <div className="cl-empty-icon">✓</div>
              <div className="cl-empty-text">Select a checklist or start a new one</div>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                + New Checklist
              </button>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewChecklistModal
          trips={trips}
          onCreate={handleCreated}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
