import { useState, useEffect } from 'react'
import './SafetyLog.css'

const RESULT_OPTIONS = ['Pass', 'Fail', 'N/A']

function resultClass(result) {
  if (result === 'Pass') return 'result-pass'
  if (result === 'Fail') return 'result-fail'
  if (result === 'N/A')  return 'result-na'
  return ''
}

// Days since a YYYY-MM date string
function daysSince(logMonth) {
  if (!logMonth) return null
  const d = new Date(logMonth + '-01')
  return Math.floor((new Date() - d) / 86400000)
}

function complianceStatus(logs) {
  if (!logs.length) return { status: 'overdue', label: 'NEVER LOGGED', days: null }
  const latest = logs[0]
  const days = daysSince(latest.log_month)
  if (days > 37)  return { status: 'overdue', label: `${days} days ago`, days }
  if (days > 23)  return { status: 'warning', label: `${days} days ago`, days }
  return { status: 'ok', label: `${days} days ago`, days }
}

// ── Inspection item row ────────────────────────────────────────
function InspectionItem({ item, initials, onChange, readOnly }) {
  const [localNotes, setLocalNotes] = useState(item.notes ?? '')
  const [expanded, setExpanded] = useState(false)

  function handleResult(result) {
    onChange({ ...item, result, initials })
  }

  function handleNotesBlur() {
    if (localNotes !== item.notes) {
      onChange({ ...item, notes: localNotes, initials })
    }
  }

  return (
    <div className={`si-item ${item.result ? 'recorded' : ''}`}>
      <div className="si-item-main">
        <div className="si-item-label" onClick={() => setExpanded(!expanded)}>
          <span className="si-expand">{expanded ? '▾' : '▸'}</span>
          <span className="si-item-text">{item.item_label}</span>
        </div>
        <div className="si-item-controls">
          {item.initials && (
            <span className="si-initials font-mono">{item.initials}</span>
          )}
          {!readOnly && RESULT_OPTIONS.map(opt => (
            <button
              key={opt}
              className={`si-result-btn ${resultClass(opt)} ${item.result === opt ? 'active' : ''}`}
              onClick={() => handleResult(item.result === opt ? null : opt)}
            >
              {opt}
            </button>
          ))}
          {readOnly && item.result && (
            <span className={`si-result-static ${resultClass(item.result)}`}>
              {item.result}
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div className="si-item-notes">
          {readOnly ? (
            <span className="si-notes-text">{item.notes || 'No notes.'}</span>
          ) : (
            <input
              className="field-input"
              placeholder="Notes (condition, observations, actions taken)…"
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Log entry detail ───────────────────────────────────────────
function LogDetail({ log, onUpdate, onClose }) {
  const [items, setItems] = useState(log.items || [])
  const [header, setHeader] = useState({
    id: log.id,
    inspection_date: log.inspection_date,
    inspected_by: log.inspected_by ?? '',
    notes: log.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [headerDirty, setHeaderDirty] = useState(false)

  const allRecorded = items.every(i => i.result)
  const passCount = items.filter(i => i.result === 'Pass').length
  const failCount = items.filter(i => i.result === 'Fail').length
  const isComplete = allRecorded

  // Default initials from inspected_by
  const initials = header.inspected_by
    ? header.inspected_by.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3)
    : ''

  async function handleItemChange(updatedItem) {
    setSaving(true)
    await window.vesselAPI.safetyLog.saveItem({
      id: updatedItem.id,
      result: updatedItem.result,
      notes: updatedItem.notes,
      initials: updatedItem.initials || initials,
    })
    // Refresh items
    const updated = await window.vesselAPI.safetyLog.getOne(log.id)
    setItems(updated.items)
    onUpdate()
    setSaving(false)
  }

  async function handleHeaderSave() {
    await window.vesselAPI.safetyLog.update(header)
    setHeaderDirty(false)
    onUpdate()
  }

  function handleHeaderChange(e) {
    setHeader(h => ({ ...h, [e.target.name]: e.target.value }))
    setHeaderDirty(true)
  }

  const monthLabel = log.log_month
    ? new Date(log.log_month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : log.log_month

  return (
    <div className="sl-detail">
      <div className="sl-detail-header">
        <div className="sl-detail-meta">
          <span className="sl-month-label font-display">{monthLabel}</span>
          {isComplete
            ? <span className="status-badge status-ok">COMPLETE</span>
            : <span className="status-badge status-warn">IN PROGRESS</span>
          }
          {failCount > 0 && (
            <span className="status-badge status-over">{failCount} FAIL{failCount > 1 ? 'S' : ''}</span>
          )}
        </div>
        <button className="btn btn-ghost" onClick={onClose}>← Back</button>
      </div>

      {/* Header fields */}
      <div className="sl-header-fields">
        <div className="field">
          <label className="field-label">Inspection Date</label>
          <input className="field-input" type="date" name="inspection_date"
            value={header.inspection_date} onChange={handleHeaderChange} />
        </div>
        <div className="field">
          <label className="field-label">Inspected By</label>
          <input className="field-input" name="inspected_by"
            value={header.inspected_by} onChange={handleHeaderChange}
            placeholder="Name or initials" />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label className="field-label">General Notes</label>
          <input className="field-input" name="notes"
            value={header.notes} onChange={handleHeaderChange}
            placeholder="Overall condition, follow-up actions…" />
        </div>
        {headerDirty && (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }}
            onClick={handleHeaderSave}>
            Save
          </button>
        )}
      </div>

      {/* Progress summary */}
      <div className="sl-summary">
        <div className="sl-summary-stat">
          <span className="sl-summary-num">{passCount}</span>
          <span className="sl-summary-label">Pass</span>
        </div>
        <div className="sl-summary-stat fail">
          <span className="sl-summary-num">{failCount}</span>
          <span className="sl-summary-label">Fail</span>
        </div>
        <div className="sl-summary-stat">
          <span className="sl-summary-num">{items.length - passCount - failCount}</span>
          <span className="sl-summary-label">Pending</span>
        </div>
        {saving && (
          <span className="sl-saving font-mono">Saving…</span>
        )}
      </div>

      {/* Inspection items */}
      <div className="sl-items">
        {items.map(item => (
          <InspectionItem
            key={item.id}
            item={item}
            initials={initials}
            onChange={handleItemChange}
            readOnly={false}
          />
        ))}
      </div>

      {isComplete && failCount === 0 && (
        <div className="sl-complete-banner">
          <span className="status-badge status-ok">ALL PASS</span>
          <span className="sl-complete-text">
            All 7 items inspected and passed — {monthLabel} log complete.
          </span>
        </div>
      )}
      {isComplete && failCount > 0 && (
        <div className="sl-fail-banner">
          <span className="status-badge status-over">ACTION REQUIRED</span>
          <span className="sl-complete-text">
            {failCount} item{failCount > 1 ? 's' : ''} failed inspection.
            Document corrective action in notes and re-inspect.
          </span>
        </div>
      )}
    </div>
  )
}

// ── New log modal ──────────────────────────────────────────────
function NewLogModal({ existingMonths, onCreate, onClose }) {
  const today = new Date()
  const defaultMonth = today.toISOString().slice(0, 7)
  const [logMonth, setLogMonth] = useState(defaultMonth)
  const [inspectionDate, setInspectionDate] = useState(today.toISOString().slice(0, 10))
  const [inspectedBy, setInspectedBy] = useState('Branson')
  const alreadyExists = existingMonths.includes(logMonth)

  async function handleCreate() {
    await window.vesselAPI.safetyLog.create({
      log_month: logMonth,
      inspection_date: inspectionDate,
      inspected_by: inspectedBy,
    })
    onCreate(logMonth)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">NEW MONTHLY SAFETY LOG</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Log Month</label>
              <input className="field-input" type="month"
                value={logMonth} onChange={e => setLogMonth(e.target.value)} />
              {alreadyExists && (
                <span style={{ fontSize: 11, color: 'var(--amber-400)', marginTop: 4, display: 'block' }}>
                  A log already exists for this month. Opening it.
                </span>
              )}
            </div>
            <div className="field span-2">
              <label className="field-label">Inspection Date</label>
              <input className="field-input" type="date"
                value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
            </div>
            <div className="field span-2">
              <label className="field-label">Inspected By</label>
              <input className="field-input"
                value={inspectedBy} onChange={e => setInspectedBy(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>
            {alreadyExists ? 'Open Existing' : 'Start Log'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function SafetyLog() {
  const [logs, setLogs] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeLog, setActiveLog] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const all = await window.vesselAPI.safetyLog.getAll()
    setLogs(all)
    setLoading(false)
  }

  async function openLog(id) {
    const log = await window.vesselAPI.safetyLog.getOne(id)
    setActiveLog(log)
    setActiveId(id)
  }

  async function handleCreated(logMonth) {
    setShowNew(false)
    await load()
    // Find and open the log for that month
    const all = await window.vesselAPI.safetyLog.getAll()
    const found = all.find(l => l.log_month === logMonth)
    if (found) openLog(found.id)
  }

  async function handleDelete(id) {
    if (window.confirm('Delete this safety log entry?')) {
      await window.vesselAPI.safetyLog.delete(id)
      if (activeId === id) { setActiveId(null); setActiveLog(null) }
      load()
    }
  }

  const compliance = complianceStatus(logs)
  const existingMonths = logs.map(l => l.log_month)

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">◉</div>
      <h2>Loading safety log…</h2>
    </div>
  )

  return (
    <div className="safety-log-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">MONTHLY SAFETY LOG</h1>
          <p className="page-subtitle">
            46 CFR 180.64, 180.68, 180.70, 181.500, 178.420 — Monthly equipment inspection
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className={`compliance-chip ${compliance.status}`}>
            <span className="compliance-chip-label">LAST INSPECTION</span>
            <span className="compliance-chip-val">{compliance.label}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Monthly Log
          </button>
        </div>
      </div>

      <div className="sl-layout">
        {/* List sidebar */}
        <div className="sl-list-col">
          <div className="section-label" style={{ padding: '10px 12px 4px' }}>
            {logs.length} log{logs.length !== 1 ? 's' : ''} on record
          </div>
          {logs.length === 0 && (
            <div className="empty-hint" style={{ padding: '16px 12px' }}>
              No inspections logged yet. Monthly safety equipment inspections are
              required under 46 CFR 180.64 and 181.500.
            </div>
          )}
          {logs.map(log => {
            const monthLabel = new Date(log.log_month + '-15')
              .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            const pct = log.total_items > 0
              ? Math.round((log.completed_items / log.total_items) * 100) : 0
            const isComplete = log.completed_items === log.total_items && log.total_items > 0
            const isActive = log.id === activeId
            const days = daysSince(log.log_month)

            return (
              <div key={log.id}
                className={`sl-list-item ${isActive ? 'active' : ''}`}
                onClick={() => openLog(log.id)}
              >
                <div className="sl-list-top">
                  <span className="sl-list-month font-display">{monthLabel}</span>
                  {isComplete
                    ? <span className="status-badge status-ok" style={{ fontSize: 9 }}>DONE</span>
                    : <span className="status-badge status-warn" style={{ fontSize: 9 }}>OPEN</span>
                  }
                </div>
                <div className="sl-list-meta">
                  {log.inspected_by && (
                    <span className="sl-list-by">{log.inspected_by}</span>
                  )}
                  <span className="sl-list-date font-mono">{log.inspection_date}</span>
                </div>
                <div className="cl-mini-progress" style={{ margin: '5px 0 3px' }}>
                  <div className="cl-mini-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="sl-list-counts">
                  {log.completed_items} / {log.total_items} items
                </div>
                <button className="cl-delete-btn"
                  onClick={e => { e.stopPropagation(); handleDelete(log.id) }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {/* Detail area */}
        <div className="sl-detail-col">
          {activeLog ? (
            <LogDetail
              key={activeLog.id}
              log={activeLog}
              onUpdate={() => {
                load()
                openLog(activeLog.id)
              }}
              onClose={() => { setActiveId(null); setActiveLog(null) }}
            />
          ) : (
            <div className="cl-empty-detail">
              <div className="cl-empty-icon">◉</div>
              <div className="cl-empty-text">
                Select a log entry or start this month's inspection
              </div>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                + New Monthly Log
              </button>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewLogModal
          existingMonths={existingMonths}
          onCreate={handleCreated}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
