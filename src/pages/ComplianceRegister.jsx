import { useState, useEffect, Fragment } from 'react'
import './ComplianceRegister.css'

const CATEGORY_ORDER = [
  'Life Saving Equipment',
  'Fire Fighting',
  'Navigation & Comms',
  'Documentation',
  'Drills',
  'Training',
  'General Safety',
]

const DRILL_TYPES = ['Abandon Ship / MOB', 'Firefighting']

function statusBadgeClass(status) {
  if (status === 'overdue') return 'status-badge status-over'
  if (status === 'warning') return 'status-badge status-warn'
  return 'status-badge status-ok'
}

function daysUntilDisplay(nextDue) {
  if (!nextDue) return '—'
  const days = Math.floor((new Date(nextDue + 'T00:00:00') - new Date()) / 86400000)
  if (days < 0) return `${Math.abs(days)}d over`
  if (days === 0) return 'Today'
  return `${days}d`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getDrillType(item) {
  if (item.item_name.includes('Abandon Ship')) return 'Abandon Ship / MOB'
  if (item.item_name.includes('Firefighting')) return 'Firefighting'
  return null
}

// ── Log Action Modal ──────────────────────────────────────────────
function LogActionModal({ item, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    last_action_date: today,
    next_due_date: item.next_due_date ?? '',
    notes: item.notes ?? '',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSave() {
    await window.vesselAPI.coiRegister.logAction({
      id: item.id,
      last_action_date: form.last_action_date || null,
      next_due_date: form.next_due_date || null,
      notes: form.notes || null,
    })
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">LOG ACTION</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="la-item-name">{item.item_name}</div>
          <div className="la-cfr">{item.cfr_reference} · {item.frequency}</div>
          <div className="modal-grid" style={{ marginTop: 16 }}>
            <div className="field span-2">
              <label className="field-label">Action Date</label>
              <input className="field-input" type="date"
                value={form.last_action_date}
                onChange={e => set('last_action_date', e.target.value)} />
            </div>
            {item.frequency === 'PerExpiry' && (
              <div className="field span-2">
                <label className="field-label">Next Due Date</label>
                <input className="field-input" type="date"
                  value={form.next_due_date}
                  onChange={e => set('next_due_date', e.target.value)} />
              </div>
            )}
            <div className="field span-2">
              <label className="field-label">Notes</label>
              <input className="field-input"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Service provider, cert number, observations…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={!form.last_action_date}>
            Log Action
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Drill Form Modal ──────────────────────────────────────────────
function DrillFormModal({ drill, presetType, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const isNew = !drill?.id
  const [form, setForm] = useState(() => isNew
    ? {
        drill_type: presetType ?? 'Abandon Ship / MOB',
        drill_date: today,
        conducted_by: 'Branson',
        participants: '',
        duration_minutes: '',
        location: 'Fort Pierce Marina',
        observations: '',
        corrective_actions: '',
        notes: '',
      }
    : {
        drill_type: drill.drill_type,
        drill_date: drill.drill_date,
        conducted_by: drill.conducted_by ?? '',
        participants: drill.participants ?? '',
        duration_minutes: drill.duration_minutes ?? '',
        location: drill.location ?? '',
        observations: drill.observations ?? '',
        corrective_actions: drill.corrective_actions ?? '',
        notes: drill.notes ?? '',
      }
  )

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSave() {
    await window.vesselAPI.drills.save({
      ...(isNew ? {} : { id: drill.id }),
      ...form,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
    })
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'LOG DRILL' : 'EDIT DRILL'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Drill Type</label>
              <select className="field-input" value={form.drill_type}
                onChange={e => set('drill_type', e.target.value)}>
                {DRILL_TYPES.map(t => <option key={t} value={t}>{t} Drill</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Drill Date</label>
              <input className="field-input" type="date" value={form.drill_date}
                onChange={e => set('drill_date', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Duration (minutes)</label>
              <input className="field-input" type="number" min="1"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', e.target.value)}
                placeholder="e.g. 20" />
            </div>
            <div className="field">
              <label className="field-label">Conducted By</label>
              <input className="field-input" value={form.conducted_by}
                onChange={e => set('conducted_by', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Location</label>
              <input className="field-input" value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>
            <div className="field span-2">
              <label className="field-label">Participants</label>
              <input className="field-input" value={form.participants}
                onChange={e => set('participants', e.target.value)}
                placeholder="e.g. Branson, Jay, 3 scientists" />
            </div>
            <div className="field span-2">
              <label className="field-label">Observations</label>
              <textarea className="field-input" rows={3} value={form.observations}
                onChange={e => set('observations', e.target.value)}
                placeholder="Crew performance, equipment used, timing, any issues…" />
            </div>
            <div className="field span-2">
              <label className="field-label">Corrective Actions</label>
              <textarea className="field-input" rows={2} value={form.corrective_actions}
                onChange={e => set('corrective_actions', e.target.value)}
                placeholder="Any deficiencies noted and follow-up required…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={!form.drill_date}>
            {isNew ? 'Log Drill' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Register Tab ──────────────────────────────────────────────────
function RegisterTab({ items, onLogAction, onLogDrill }) {
  const [filter, setFilter] = useState('all')

  const counts = {
    overdue: items.filter(i => i._status === 'overdue').length,
    warning: items.filter(i => i._status === 'warning').length,
    ok: items.filter(i => i._status === 'ok').length,
  }

  const filtered = filter === 'all' ? items : items.filter(i => i._status === filter)
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat)
    if (catItems.length) acc[cat] = catItems
    return acc
  }, {})

  return (
    <div className="cr-register">
      <div className="cr-filter-bar">
        {[
          { key: 'all',     label: `All (${items.length})` },
          { key: 'overdue', label: `Overdue (${counts.overdue})` },
          { key: 'warning', label: `Warning (${counts.warning})` },
          { key: 'ok',      label: `OK (${counts.ok})` },
        ].map(({ key, label }) => (
          <button key={key}
            className={`cr-filter-chip ${filter === key ? 'active' : ''} ${key !== 'all' ? `chip-${key}` : ''}`}
            onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="cr-table-wrap">
        {Object.keys(grouped).length === 0 ? (
          <div className="cr-empty">No items match the selected filter.</div>
        ) : (
          <table className="cr-table">
            <thead>
              <tr>
                <th style={{ width: 82 }}>Status</th>
                <th>Requirement</th>
                <th style={{ width: 120 }}>CFR</th>
                <th style={{ width: 78 }}>Frequency</th>
                <th style={{ width: 108 }}>Last Action</th>
                <th style={{ width: 88 }}>Next Due</th>
                <th style={{ width: 96 }}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, catItems]) => (
                <Fragment key={cat}>
                  <tr className="cr-category-row">
                    <td colSpan={7}>{cat.toUpperCase()}</td>
                  </tr>
                  {catItems.map(item => {
                    const drillType = getDrillType(item)
                    const isDrill = item.category === 'Drills'
                    const daysLabel = item.frequency === 'OneTime'
                      ? (item.last_action_date ? '✓ Done' : '—')
                      : daysUntilDisplay(item._next_due)
                    const dueClass = item._status === 'overdue' ? 'cr-due-over'
                      : item._status === 'warning' ? 'cr-due-warn' : ''

                    return (
                      <tr key={item.id} className="cr-item-row">
                        <td>
                          <span className={statusBadgeClass(item._status)}>
                            {item._status === 'overdue' ? 'OVERDUE'
                              : item._status === 'warning' ? 'WARNING' : 'OK'}
                          </span>
                        </td>
                        <td>
                          <div className="cr-name-text">{item.item_name}</div>
                          {item.notes && <div className="cr-item-note">{item.notes}</div>}
                        </td>
                        <td className="font-mono cr-cfr">{item.cfr_reference}</td>
                        <td className="cr-freq">{item.frequency}</td>
                        <td className="font-mono cr-date">{formatDate(item.last_action_date)}</td>
                        <td className={`font-mono cr-due ${dueClass}`}>{daysLabel}</td>
                        <td>
                          {isDrill ? (
                            <button className="btn btn-ghost cr-action-btn"
                              onClick={() => onLogDrill(drillType)}>
                              Log Drill
                            </button>
                          ) : (
                            <button className="btn btn-ghost cr-action-btn"
                              onClick={() => onLogAction(item)}>
                              {item.last_action_date ? 'Update' : 'Log Action'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Drill Log Tab ─────────────────────────────────────────────────
function DrillSection({ drillType, drills, coiItem, onLog, onEdit, onDelete }) {
  const typeDrills = drills.filter(d => d.drill_type === drillType)

  return (
    <div className="drill-section">
      <div className="drill-section-header">
        <div className="drill-section-meta">
          <span className="drill-section-title font-display">{drillType} Drill</span>
          {coiItem && (
            <span className={statusBadgeClass(coiItem._status)}>
              {coiItem._status === 'ok' ? 'COMPLIANT'
                : coiItem._status === 'warning' ? 'DUE SOON' : 'OVERDUE'}
            </span>
          )}
          {coiItem?._next_due && (
            <span className={`drill-next font-mono ${coiItem._status !== 'ok' ? 'drill-next-warn' : ''}`}>
              Next due: {formatDate(coiItem._next_due)} · {daysUntilDisplay(coiItem._next_due)}
            </span>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => onLog(drillType)}>
          + Log {drillType} Drill
        </button>
      </div>

      <div className="drill-cfr font-mono">
        {coiItem?.cfr_reference} — Required at least quarterly (46 CFR 185.506)
      </div>

      {typeDrills.length === 0 ? (
        <div className="drill-empty">No drills on record. Quarterly drills required.</div>
      ) : (
        <div className="drill-list">
          {typeDrills.map(drill => (
            <div key={drill.id} className="drill-record">
              <div className="drill-record-top">
                <div className="drill-record-date font-display">{formatDate(drill.drill_date)}</div>
                <div className="drill-record-tags">
                  {drill.duration_minutes && (
                    <span className="drill-tag font-mono">{drill.duration_minutes} min</span>
                  )}
                  {drill.conducted_by && (
                    <span className="drill-tag">{drill.conducted_by}</span>
                  )}
                  {drill.location && (
                    <span className="drill-tag">{drill.location}</span>
                  )}
                </div>
              </div>
              {drill.participants && (
                <div className="drill-record-field">
                  <span className="drill-field-label">Participants</span>
                  <span>{drill.participants}</span>
                </div>
              )}
              {drill.observations && (
                <div className="drill-record-field">
                  <span className="drill-field-label">Observations</span>
                  <span>{drill.observations}</span>
                </div>
              )}
              {drill.corrective_actions && (
                <div className="drill-record-field drill-ca">
                  <span className="drill-field-label">Corrective Actions</span>
                  <span>{drill.corrective_actions}</span>
                </div>
              )}
              <div className="drill-record-actions">
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={() => onEdit(drill)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize: 12, padding: '3px 10px' }}
                  onClick={() => onDelete(drill.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DrillLogTab({ drills, coiItems, onLog, onEdit, onDelete }) {
  const drillCOI = {
    'Abandon Ship / MOB': coiItems.find(i => i.item_name.includes('Abandon Ship')),
    'Firefighting': coiItems.find(i => i.item_name.includes('Firefighting Drill')),
  }
  return (
    <div className="cr-drill-log">
      <div className="drill-log-note font-mono">
        46 CFR 185.506 — Abandon ship and firefighting drills required at least quarterly.
        Drills logged here automatically update the COI Register status.
      </div>
      {DRILL_TYPES.map(type => (
        <DrillSection
          key={type}
          drillType={type}
          drills={drills}
          coiItem={drillCOI[type]}
          onLog={onLog}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function ComplianceRegister() {
  const [items, setItems] = useState([])
  const [drills, setDrills] = useState([])
  const [tab, setTab] = useState('register')
  const [loading, setLoading] = useState(true)
  const [logActionItem, setLogActionItem] = useState(null)
  const [drillForm, setDrillForm] = useState({ open: false, drill: null, presetType: null })

  useEffect(() => { load() }, [])

  async function load() {
    const [allItems, allDrills] = await Promise.all([
      window.vesselAPI.coiRegister.getAll(),
      window.vesselAPI.drills.getAll(),
    ])
    setItems(allItems)
    setDrills(allDrills)
    setLoading(false)
  }

  function openDrillForm(presetType) {
    setDrillForm({ open: true, drill: null, presetType })
  }

  function closeDrillForm() {
    setDrillForm({ open: false, drill: null, presetType: null })
  }

  async function handleDeleteDrill(id) {
    if (window.confirm('Delete this drill record?')) {
      await window.vesselAPI.drills.delete(id)
      load()
    }
  }

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">⊞</div>
      <h2>Loading compliance register…</h2>
    </div>
  )

  const overdueCount = items.filter(i => i._status === 'overdue').length
  const warningCount = items.filter(i => i._status === 'warning').length
  const overallStatus = overdueCount > 0 ? 'overdue' : warningCount > 0 ? 'warning' : 'ok'
  const drillsOverdue = items.filter(i => i.category === 'Drills' && i._status === 'overdue').length

  return (
    <div className="cr-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">COI COMPLIANCE REGISTER</h1>
          <p className="page-subtitle">
            46 CFR 175–185 · Subchapter T · R/V Sunburst · Sector Jacksonville
          </p>
        </div>
        <div className={`compliance-chip ${overallStatus}`}>
          <span className="compliance-chip-label">Register Status</span>
          <span className="compliance-chip-val">
            {overdueCount === 0 && warningCount === 0
              ? 'ALL ITEMS OK'
              : [
                  overdueCount > 0 && `${overdueCount} OVERDUE`,
                  warningCount > 0 && `${warningCount} WARNING`,
                ].filter(Boolean).join(' · ')
            }
          </span>
        </div>
      </div>

      <div className="cr-tabs">
        <button className={`cr-tab ${tab === 'register' ? 'active' : ''}`}
          onClick={() => setTab('register')}>
          Register
          {(overdueCount > 0 || warningCount > 0) && (
            <span className="cr-tab-badge">
              {overdueCount > 0 && <span className="cr-tab-dot red">{overdueCount}</span>}
              {warningCount > 0 && <span className="cr-tab-dot yellow">{warningCount}</span>}
            </span>
          )}
        </button>
        <button className={`cr-tab ${tab === 'drills' ? 'active' : ''}`}
          onClick={() => setTab('drills')}>
          Drill Log
          {drillsOverdue > 0 && (
            <span className="cr-tab-badge">
              <span className="cr-tab-dot red">{drillsOverdue}</span>
            </span>
          )}
        </button>
      </div>

      <div className="cr-content">
        {tab === 'register' && (
          <RegisterTab
            items={items}
            onLogAction={setLogActionItem}
            onLogDrill={type => { openDrillForm(type); setTab('drills') }}
          />
        )}
        {tab === 'drills' && (
          <DrillLogTab
            drills={drills}
            coiItems={items}
            onLog={openDrillForm}
            onEdit={drill => setDrillForm({ open: true, drill, presetType: null })}
            onDelete={handleDeleteDrill}
          />
        )}
      </div>

      {logActionItem && (
        <LogActionModal
          item={logActionItem}
          onSave={() => { setLogActionItem(null); load() }}
          onClose={() => setLogActionItem(null)}
        />
      )}

      {drillForm.open && (
        <DrillFormModal
          drill={drillForm.drill}
          presetType={drillForm.presetType}
          onSave={() => { closeDrillForm(); load() }}
          onClose={closeDrillForm}
        />
      )}
    </div>
  )
}
