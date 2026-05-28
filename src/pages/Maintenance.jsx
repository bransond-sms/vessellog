import { useState, useEffect } from 'react'
import './Maintenance.css'

const SYSTEMS = ['Main Engine', 'Generator', 'Hydraulics', 'Bow Thruster', 'Stabilizers', 'General']

const SYSTEM_META = {
  'Main Engine':  { icon: '◎', sub: 'Cummins Q9 Diesel · 450 HP' },
  'Generator':    { icon: '⚡', sub: '10KW Generator' },
  'Hydraulics':   { icon: '⊕', sub: 'Hydraulic System' },
  'Bow Thruster': { icon: '◈', sub: 'Bow Thruster' },
  'Stabilizers':  { icon: '⊗', sub: 'Stabilizer System' },
  'General':      { icon: '⚓', sub: 'General Vessel Systems' },
}

function statusLabel(s) {
  if (s === 'acknowledged') return 'ACK'
  if (s === 'overdue')      return 'OVERDUE'
  if (s === 'warning')      return 'WARNING'
  return 'OK'
}

function statusBadgeClass(s) {
  if (s === 'acknowledged') return 'status-badge status-ack'
  if (s === 'overdue')      return 'status-badge status-over'
  if (s === 'warning')      return 'status-badge status-warn'
  return 'status-badge status-ok'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function dueDisplay(task) {
  const parts = []
  if (task.next_due_date) {
    const days = Math.floor((new Date(task.next_due_date + 'T00:00:00') - new Date()) / 86400000)
    if (days < 0) parts.push(`${Math.abs(days)}d over`)
    else if (days === 0) parts.push('Due today')
    else parts.push(`${days}d`)
  }
  if (task.next_due_hours != null && task._current_hours != null) {
    const hrs = task.next_due_hours - task._current_hours
    if (hrs < 0) parts.push(`${Math.abs(hrs).toFixed(0)}h over`)
    else parts.push(`${hrs.toFixed(0)}h`)
  } else if (task.next_due_hours != null) {
    parts.push(`@ ${task.next_due_hours.toFixed(0)}h`)
  }
  return parts.join(' · ') || '—'
}

// ── Log Service Modal ─────────────────────────────────────────
function LogServiceModal({ task, currentHours, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    service_date: today,
    engine_hours: currentHours != null ? String(currentHours) : '',
    performed_by: 'Branson',
    work_description: '',
    parts_used: '',
    cost: '',
    notes: '',
  })

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSave() {
    await window.vesselAPI.maintenance.logService({
      task_id: task.id,
      service_date: form.service_date,
      engine_hours: form.engine_hours !== '' ? parseFloat(form.engine_hours) : null,
      performed_by: form.performed_by || null,
      work_description: form.work_description || null,
      parts_used: form.parts_used || null,
      cost: form.cost !== '' ? parseFloat(form.cost) : null,
      notes: form.notes || null,
    })
    onSave()
  }

  const showHours = task.interval_type === 'hours' || task.interval_type === 'hybrid'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">LOG SERVICE</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="maint-modal-task">{task.task_name}</div>
          <div className="maint-modal-system font-mono">{task.system}</div>
          <div className="modal-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label className="field-label">Service Date</label>
              <input className="field-input" type="date" value={form.service_date}
                onChange={e => set('service_date', e.target.value)} />
            </div>
            {showHours && (
              <div className="field">
                <label className="field-label">Engine Hours at Service</label>
                <input className="field-input" type="number" step="0.1" min="0"
                  value={form.engine_hours}
                  onChange={e => set('engine_hours', e.target.value)}
                  placeholder={currentHours != null ? `Current: ${currentHours}` : 'e.g. 342.5'} />
              </div>
            )}
            <div className={showHours ? 'field' : 'field span-2'}>
              <label className="field-label">Performed By</label>
              <input className="field-input" value={form.performed_by}
                onChange={e => set('performed_by', e.target.value)} />
            </div>
            {!showHours && <div />}
            <div className="field span-2">
              <label className="field-label">Work Description</label>
              <textarea className="field-input" rows={3} value={form.work_description}
                onChange={e => set('work_description', e.target.value)}
                placeholder="Describe the work performed…" />
            </div>
            <div className="field span-2">
              <label className="field-label">Parts / Materials Used</label>
              <input className="field-input" value={form.parts_used}
                onChange={e => set('parts_used', e.target.value)}
                placeholder="e.g. Fleetguard LF9080 oil filter, 3 gal 15W-40 DEO" />
            </div>
            <div className="field">
              <label className="field-label">Cost ($)</label>
              <input className="field-input" type="number" step="0.01" min="0"
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
                placeholder="0.00" />
            </div>
            <div className="field">
              <label className="field-label">Notes</label>
              <input className="field-input" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Service provider, observations…" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={!form.service_date}>
            Log Service
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task Row ──────────────────────────────────────────────────
function TaskRow({ task, onLogService, onAcknowledge }) {
  const [expanded, setExpanded] = useState(false)
  const s = task._status
  const dueStr = dueDisplay(task)
  const dueClass = s === 'overdue' ? 'maint-due-over' : s === 'warning' ? 'maint-due-warn' : ''

  async function handleAck() {
    await window.vesselAPI.maintenance.acknowledge(task.id)
    onAcknowledge()
  }

  async function handleDeleteLog(logId) {
    if (window.confirm('Delete this service record?')) {
      await window.vesselAPI.maintenance.deleteLog(logId)
      onAcknowledge()
    }
  }

  return (
    <div className={`maint-task ${s}`}>
      <div className="maint-task-row" onClick={() => setExpanded(x => !x)}>
        <div className="maint-task-left">
          <span className={statusBadgeClass(s)}>{statusLabel(s)}</span>
          <div className="maint-task-name">{task.task_name}</div>
          <div className={`maint-task-due font-mono ${dueClass}`}>{dueStr}</div>
        </div>
        <div className="maint-task-right">
          <div className="maint-task-last font-mono">
            Last: {task.last_service_date ? formatDate(task.last_service_date) : 'Never'}
            {task.last_service_hours != null && ` · ${task.last_service_hours.toFixed(1)}h`}
          </div>
          <div className="maint-task-actions" onClick={e => e.stopPropagation()}>
            {(s === 'overdue' || s === 'warning') && (
              <button className="btn btn-ghost maint-btn" onClick={handleAck}>
                Acknowledge
              </button>
            )}
            <button className="btn btn-primary maint-btn" onClick={() => onLogService(task)}>
              Log Service
            </button>
            <span className="maint-expand-arrow">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="maint-task-detail">
          <div className="maint-detail-meta">
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Interval: {task.interval_type === 'date' ? `Every ${task.interval_months}mo`
                : task.interval_type === 'hours' ? `Every ${task.interval_hours}h`
                : `Every ${task.interval_months}mo or ${task.interval_hours}h`}
              {task.warn_days && `  ·  Warn ${task.warn_days}d before`}
              {task.warn_hours && `  /  ${task.warn_hours}h before`}
            </span>
            {task.next_due_date && (
              <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Next due date: {formatDate(task.next_due_date)}
              </span>
            )}
            {task.next_due_hours != null && (
              <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Next due hours: {task.next_due_hours.toFixed(0)}h
                {task._current_hours != null && ` (current: ${task._current_hours.toFixed(1)}h)`}
              </span>
            )}
          </div>

          {task._log && task._log.length > 0 ? (
            <div className="maint-log-list">
              <div className="maint-log-header font-mono">Service History</div>
              {task._log.map(entry => (
                <div key={entry.id} className="maint-log-entry">
                  <div className="maint-log-top">
                    <span className="maint-log-date font-display">{formatDate(entry.service_date)}</span>
                    {entry.engine_hours != null && (
                      <span className="maint-log-tag font-mono">{entry.engine_hours.toFixed(1)}h</span>
                    )}
                    {entry.performed_by && (
                      <span className="maint-log-tag">{entry.performed_by}</span>
                    )}
                    {entry.cost != null && (
                      <span className="maint-log-tag font-mono">${entry.cost.toFixed(2)}</span>
                    )}
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
                      onClick={() => handleDeleteLog(entry.id)}>
                      Delete
                    </button>
                  </div>
                  {entry.work_description && (
                    <div className="maint-log-desc">{entry.work_description}</div>
                  )}
                  {entry.parts_used && (
                    <div className="maint-log-parts font-mono">Parts: {entry.parts_used}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="maint-log-empty">No service history on record.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── System Panel ──────────────────────────────────────────────
function SystemPanel({ system, tasks, onLogService, onReload }) {
  const meta = SYSTEM_META[system] || { icon: '◎', sub: '' }
  const overdue = tasks.filter(t => t._status === 'overdue').length
  const warning = tasks.filter(t => t._status === 'warning').length
  const currentHours = tasks[0]?._current_hours ?? null

  return (
    <div className="maint-system-panel">
      <div className="maint-system-header">
        <div className="maint-system-title">
          <span className="maint-system-icon">{meta.icon}</span>
          <div>
            <div className="maint-system-name font-display">{system}</div>
            <div className="maint-system-sub font-mono">{meta.sub}</div>
          </div>
        </div>
        <div className="maint-system-counts">
          {overdue > 0 && <span className="status-badge status-over">{overdue} OVERDUE</span>}
          {warning > 0 && <span className="status-badge status-warn">{warning} WARNING</span>}
          {overdue === 0 && warning === 0 && (
            <span className="status-badge status-ok">ALL OK</span>
          )}
          {currentHours != null && (
            <span className="maint-hours-chip font-mono">{currentHours.toFixed(1)}h</span>
          )}
        </div>
      </div>
      <div className="maint-task-list">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task}
            onLogService={onLogService}
            onAcknowledge={onReload} />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Maintenance() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSystem, setSelectedSystem] = useState('Main Engine')
  const [serviceModal, setServiceModal] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const all = await window.vesselAPI.maintenance.getAll()
    setTasks(all)
    setLoading(false)
  }

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">⚙</div>
      <h2>Loading maintenance tracker…</h2>
    </div>
  )

  const currentHours = tasks[0]?._current_hours ?? null
  const overdue = tasks.filter(t => t._status === 'overdue').length
  const warning = tasks.filter(t => t._status === 'warning').length

  const systemTasks = tasks.filter(t => t.system === selectedSystem)

  const systemStatus = (system) => {
    const st = tasks.filter(t => t.system === system)
    if (st.some(t => t._status === 'overdue')) return 'overdue'
    if (st.some(t => t._status === 'warning')) return 'warning'
    return 'ok'
  }

  return (
    <div className="maint-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">MECHANICAL MAINTENANCE</h1>
          <p className="page-subtitle">
            R/V Sunburst · Cummins Q9 Diesel · 10KW Generator
            {currentHours != null && ` · ${currentHours.toFixed(1)} engine hours on record`}
          </p>
        </div>
        <div className="maint-status-chips">
          {overdue > 0 && (
            <div className="maint-chip overdue">
              <span className="maint-chip-num">{overdue}</span>
              <span className="maint-chip-label">OVERDUE</span>
            </div>
          )}
          {warning > 0 && (
            <div className="maint-chip warning">
              <span className="maint-chip-num">{warning}</span>
              <span className="maint-chip-label">WARNING</span>
            </div>
          )}
          {overdue === 0 && warning === 0 && (
            <div className="maint-chip ok">
              <span className="maint-chip-label">ALL SYSTEMS OK</span>
            </div>
          )}
        </div>
      </div>

      <div className="maint-layout">
        {/* System sidebar */}
        <div className="maint-sidebar">
          {SYSTEMS.map(sys => {
            const st = systemStatus(sys)
            const count = tasks.filter(t => t.system === sys).length
            return (
              <button key={sys}
                className={`maint-sys-btn ${selectedSystem === sys ? 'active' : ''} sys-${st}`}
                onClick={() => setSelectedSystem(sys)}>
                <span className="maint-sys-icon">{SYSTEM_META[sys]?.icon}</span>
                <span className="maint-sys-label">{sys}</span>
                <span className={`maint-sys-dot ${st}`} />
              </button>
            )
          })}
        </div>

        {/* Task panel */}
        <div className="maint-content">
          <SystemPanel
            system={selectedSystem}
            tasks={systemTasks}
            onLogService={setServiceModal}
            onReload={load}
          />
        </div>
      </div>

      {serviceModal && (
        <LogServiceModal
          task={serviceModal}
          currentHours={currentHours}
          onSave={() => { setServiceModal(null); load() }}
          onClose={() => setServiceModal(null)}
        />
      )}
    </div>
  )
}
