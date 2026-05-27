import { useState, useEffect } from 'react'
import './CrewTraining.css'

const ROLES = ['Captain', 'Mate', 'Crew', 'Trainee', 'Observer']

const CREDENTIAL_TYPES = [
  'USCG License', 'TWIC', 'Drug Consortium', 'MMD',
  'State Boat Operator', 'STCW Certificate', 'Medical Certificate', 'Other',
]

// ── Helpers ────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

function expiryBadge(dateStr) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  if (days < 0)  return <span className="status-badge status-over">EXPIRED</span>
  if (days <= 30) return <span className="status-badge status-warn">{days}d</span>
  if (days <= 90) return <span className="status-badge status-warn">{days}d</span>
  return <span className="status-badge status-ok">{days}d</span>
}

// ── Crew member form modal ─────────────────────────────────────
function MemberModal({ member, onSave, onClose }) {
  const isNew = !member?.id
  const [form, setForm] = useState(member ?? {
    full_name: '', preferred_name: '', role: 'Crew',
    position_detail: '', status: 'Active',
    emergency_contact_name: '', emergency_contact_phone: '', notes: '',
  })

  function handleInput(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSave() {
    await window.vesselAPI.crew.saveMember(form)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'ADD CREW MEMBER' : 'EDIT CREW MEMBER'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Full Legal Name</label>
              <input className="field-input" name="full_name" value={form.full_name}
                onChange={handleInput} placeholder="e.g. Laurence J. Houk" />
            </div>
            <div className="field">
              <label className="field-label">Preferred Name / Goes By</label>
              <input className="field-input" name="preferred_name" value={form.preferred_name ?? ''}
                onChange={handleInput} placeholder="e.g. Jay" />
            </div>
            <div className="field">
              <label className="field-label">Status</label>
              <select className="field-input" name="status" value={form.status} onChange={handleInput}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Role</label>
              <select className="field-input" name="role" value={form.role} onChange={handleInput}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Position Detail</label>
              <input className="field-input" name="position_detail" value={form.position_detail ?? ''}
                onChange={handleInput} placeholder="e.g. Unlicensed Mate — License in progress" />
            </div>
            <div className="field">
              <label className="field-label">Emergency Contact Name</label>
              <input className="field-input" name="emergency_contact_name"
                value={form.emergency_contact_name ?? ''} onChange={handleInput} />
            </div>
            <div className="field">
              <label className="field-label">Emergency Contact Phone</label>
              <input className="field-input" name="emergency_contact_phone"
                value={form.emergency_contact_phone ?? ''} onChange={handleInput} />
            </div>
            <div className="field span-2">
              <label className="field-label">Notes</label>
              <textarea className="field-input field-textarea" name="notes"
                value={form.notes ?? ''} onChange={handleInput} rows={2} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Credential form modal ──────────────────────────────────────
function CredentialModal({ credential, crewId, onSave, onClose }) {
  const isNew = !credential?.id
  const [form, setForm] = useState(credential ?? {
    crew_id: crewId, credential_type: 'USCG License',
    identifier: '', issuing_org: '', issue_date: '',
    expiry_date: '', notes: '', attachment_path: '',
  })

  function handleInput(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleAttach() {
    // Opens native file picker via a hidden input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const destPath = await window.vesselAPI.attachments.copyFile(file.path)
      setForm(f => ({ ...f, attachment_path: destPath }))
    }
    input.click()
  }

  async function handleSave() {
    await window.vesselAPI.credentials.save({ ...form, crew_id: crewId })
    onSave()
  }

  async function handleDelete() {
    if (window.confirm(`Remove this ${form.credential_type} credential?`)) {
      await window.vesselAPI.credentials.delete(form.id)
      onSave()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'ADD CREDENTIAL' : 'EDIT CREDENTIAL'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Credential Type</label>
              <select className="field-input" name="credential_type"
                value={form.credential_type} onChange={handleInput}>
                {CREDENTIAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field span-2">
              <label className="field-label">
                {form.credential_type === 'Drug Consortium' ? 'Consortium Name' :
                 form.credential_type === 'USCG License' ? 'License Number' :
                 form.credential_type === 'TWIC' ? 'TWIC Card Number' : 'Identifier / Number'}
              </label>
              <input className="field-input" name="identifier"
                value={form.identifier ?? ''} onChange={handleInput} />
            </div>
            <div className="field span-2">
              <label className="field-label">Issuing Organization</label>
              <input className="field-input" name="issuing_org"
                value={form.issuing_org ?? ''} onChange={handleInput}
                placeholder={form.credential_type === 'USCG License' ? 'USCG NMC' :
                  form.credential_type === 'TWIC' ? 'TSA' : ''} />
            </div>
            <div className="field">
              <label className="field-label">Issue Date</label>
              <input className="field-input" type="date" name="issue_date"
                value={form.issue_date ?? ''} onChange={handleInput} />
            </div>
            <div className="field">
              <label className="field-label">
                {form.credential_type === 'Drug Consortium' ? 'Next Test Due' : 'Expiry Date'}
              </label>
              <input className="field-input" type="date" name="expiry_date"
                value={form.expiry_date ?? ''} onChange={handleInput} />
            </div>
            <div className="field span-2">
              <label className="field-label">Notes</label>
              <input className="field-input" name="notes"
                value={form.notes ?? ''} onChange={handleInput}
                placeholder={form.credential_type === 'USCG License' ?
                  'e.g. 50 Ton Master, Near Coastal, Radar Observer' : ''} />
            </div>
            <div className="field span-2">
              <label className="field-label">Attached Document</label>
              <div className="attach-row">
                {form.attachment_path ? (
                  <>
                    <span className="attach-path">
                      {form.attachment_path.split(/[\\/]/).pop()}
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={() => window.vesselAPI.attachments.openFile(form.attachment_path)}>
                      Open
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={() => setForm(f => ({ ...f, attachment_path: '' }))}>
                      Remove
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={handleAttach}>
                    Attach PDF / Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger" onClick={handleDelete}>Remove</button>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Training record modal ──────────────────────────────────────
function TrainingModal({ record, crewId, trainingTypes, onSave, onClose }) {
  const isNew = !record?.id
  const [form, setForm] = useState(record ?? {
    crew_id: crewId, training_type_id: '',
    custom_type_name: '', completion_date: '',
    expiry_date: '', issuing_org: '', cert_number: '',
    notes: '', attachment_path: '',
  })
  const [useCustom, setUseCustom] = useState(!record?.training_type_id && !!record?.custom_type_name)

  function handleInput(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleTypeSelect(e) {
    const id = e.target.value
    setForm(f => ({ ...f, training_type_id: id ? parseInt(id) : null }))
    // Auto-fill expiry if type has a default interval
    if (id) {
      const type = trainingTypes.find(t => t.id === parseInt(id))
      if (type?.default_interval_months && form.completion_date) {
        const expiry = new Date(form.completion_date)
        expiry.setMonth(expiry.getMonth() + type.default_interval_months)
        setForm(f => ({ ...f, training_type_id: parseInt(id), expiry_date: expiry.toISOString().slice(0, 10) }))
      }
    }
  }

  function handleCompletionDate(e) {
    const date = e.target.value
    setForm(f => {
      const type = trainingTypes.find(t => t.id === f.training_type_id)
      if (type?.default_interval_months && date) {
        const expiry = new Date(date)
        expiry.setMonth(expiry.getMonth() + type.default_interval_months)
        return { ...f, completion_date: date, expiry_date: expiry.toISOString().slice(0, 10) }
      }
      return { ...f, completion_date: date }
    })
  }

  async function handleAttach() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const destPath = await window.vesselAPI.attachments.copyFile(file.path)
      setForm(f => ({ ...f, attachment_path: destPath }))
    }
    input.click()
  }

  async function handleSave() {
    await window.vesselAPI.training.save({ ...form, crew_id: crewId })
    onSave()
  }

  async function handleDelete() {
    if (window.confirm('Delete this training record?')) {
      await window.vesselAPI.training.delete(form.id)
      onSave()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'LOG TRAINING' : 'EDIT TRAINING RECORD'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Training Type</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className={`type-tab ${!useCustom ? 'active' : ''}`}
                  onClick={() => setUseCustom(false)}>Standard</button>
                <button className={`type-tab ${useCustom ? 'active' : ''}`}
                  onClick={() => setUseCustom(true)}>Custom</button>
              </div>
              {useCustom ? (
                <input className="field-input" name="custom_type_name"
                  value={form.custom_type_name ?? ''} onChange={handleInput}
                  placeholder="Enter training type name..." />
              ) : (
                <select className="field-input" name="training_type_id"
                  value={form.training_type_id ?? ''} onChange={handleTypeSelect}>
                  <option value="">— Select type —</option>
                  {trainingTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.required_for_subchapter_t ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label className="field-label">Completion Date</label>
              <input className="field-input" type="date" name="completion_date"
                value={form.completion_date ?? ''} onChange={handleCompletionDate} />
            </div>
            <div className="field">
              <label className="field-label">Expiry Date</label>
              <input className="field-input" type="date" name="expiry_date"
                value={form.expiry_date ?? ''} onChange={handleInput} />
            </div>
            <div className="field">
              <label className="field-label">Issuing Organization</label>
              <input className="field-input" name="issuing_org"
                value={form.issuing_org ?? ''} onChange={handleInput}
                placeholder="e.g. American Red Cross" />
            </div>
            <div className="field">
              <label className="field-label">Certificate Number</label>
              <input className="field-input" name="cert_number"
                value={form.cert_number ?? ''} onChange={handleInput} />
            </div>
            <div className="field span-2">
              <label className="field-label">Notes</label>
              <input className="field-input" name="notes"
                value={form.notes ?? ''} onChange={handleInput} />
            </div>
            <div className="field span-2">
              <label className="field-label">Attached Certificate</label>
              <div className="attach-row">
                {form.attachment_path ? (
                  <>
                    <span className="attach-path">
                      {form.attachment_path.split(/[\\/]/).pop()}
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={() => window.vesselAPI.attachments.openFile(form.attachment_path)}>
                      Open
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }}
                      onClick={() => setForm(f => ({ ...f, attachment_path: '' }))}>
                      Remove
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost" onClick={handleAttach}>
                    Attach PDF / Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Crew member detail panel ───────────────────────────────────
function MemberDetail({ member, trainingTypes, onEdit, onRefresh }) {
  const [credentials, setCredentials] = useState([])
  const [training, setTraining] = useState([])
  const [seaDays, setSeaDays] = useState({ total: 0, records: [] })
  const [tab, setTab] = useState('credentials')
  const [editingCred, setEditingCred] = useState(null)
  const [editingTraining, setEditingTraining] = useState(null)
  const [showAddCred, setShowAddCred] = useState(false)
  const [showAddTraining, setShowAddTraining] = useState(false)

  useEffect(() => { loadDetail() }, [member.id])

  async function loadDetail() {
    const [creds, train, days] = await Promise.all([
      window.vesselAPI.credentials.getForCrew(member.id),
      window.vesselAPI.training.getForCrew(member.id),
      window.vesselAPI.seaDays.getForCrew(member.id),
    ])
    setCredentials(creds)
    setTraining(train)
    setSeaDays(days)
  }

  function handleCredSaved() {
    setEditingCred(null)
    setShowAddCred(false)
    loadDetail()
  }

  function handleTrainingSaved() {
    setEditingTraining(null)
    setShowAddTraining(false)
    loadDetail()
  }

  return (
    <div className="member-detail">
      {/* Member header */}
      <div className="detail-header">
        <div className="detail-avatar">
          {(member.preferred_name || member.full_name).charAt(0).toUpperCase()}
        </div>
        <div className="detail-identity">
          <div className="detail-name">{member.full_name}</div>
          {member.preferred_name && (
            <div className="detail-preferred">Goes by: {member.preferred_name}</div>
          )}
          <div className="detail-role-row">
            <span className="detail-role">{member.role}</span>
            {member.position_detail && (
              <span className="detail-position">{member.position_detail}</span>
            )}
          </div>
        </div>
        <div className="detail-actions">
          <div className="sea-days-badge">
            <span className="sea-days-num">{seaDays.total}</span>
            <span className="sea-days-label">Sea Days</span>
          </div>
          <button className="btn btn-ghost" onClick={() => onEdit(member)}>Edit</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {['credentials', 'training', 'sea days'].map(t => (
          <button key={t} className={`detail-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Credentials tab */}
      {tab === 'credentials' && (
        <div className="detail-tab-body">
          <div className="tab-section-header">
            <span className="section-label" style={{ marginBottom: 0 }}>Credentials & Certifications</span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => setShowAddCred(true)}>+ Add</button>
          </div>
          {credentials.length === 0 && (
            <div className="empty-hint" style={{ padding: '16px 0' }}>No credentials on file.</div>
          )}
          <div className="cred-list">
            {credentials.map(c => (
              <div key={c.id} className="cred-item" onClick={() => setEditingCred(c)}>
                <div className="cred-item-left">
                  <span className="cred-type">{c.credential_type}</span>
                  {c.identifier && <span className="cred-id font-mono">{c.identifier}</span>}
                  {c.issuing_org && <span className="cred-org">{c.issuing_org}</span>}
                </div>
                <div className="cred-item-right">
                  {c.expiry_date && (
                    <div className="cred-expiry">
                      {expiryBadge(c.expiry_date)}
                      <span className="cred-expiry-date font-mono">{c.expiry_date}</span>
                    </div>
                  )}
                  {c.attachment_path && <span className="attach-indicator">📎</span>}
                  {c.notes && <span className="cred-notes">{c.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training tab */}
      {tab === 'training' && (
        <div className="detail-tab-body">
          <div className="tab-section-header">
            <span className="section-label" style={{ marginBottom: 0 }}>Training Records</span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => setShowAddTraining(true)}>+ Log Training</button>
          </div>
          {training.length === 0 && (
            <div className="empty-hint" style={{ padding: '16px 0' }}>No training records logged.</div>
          )}
          <table className="data-table">
            <thead>
              <tr>
                <th>Training</th>
                <th>Completed</th>
                <th>Expires</th>
                <th>Issuer</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {training.map(t => (
                <tr key={t.id} onClick={() => setEditingTraining(t)}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                      {t.type_name || t.custom_type_name}
                    </span>
                  </td>
                  <td><span className="font-mono" style={{ fontSize: 11 }}>{t.completion_date}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.expiry_date ? expiryBadge(t.expiry_date) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.issuing_org || '—'}</td>
                  <td>{t.attachment_path && <span>📎</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sea days tab */}
      {tab === 'sea days' && (
        <div className="detail-tab-body">
          <div className="sea-days-summary">
            <div className="sea-days-total">
              <span className="sea-days-total-num">{seaDays.total}</span>
              <span className="sea-days-total-label">Total Sea Days — R/V Sunburst</span>
            </div>
          </div>
          {seaDays.records.length === 0 ? (
            <div className="empty-hint" style={{ padding: '16px 0' }}>
              No closed trips on record yet. Sea days accumulate from closed trip log entries.
            </div>
          ) : (
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Date</th><th>Route</th><th>Area</th><th>Hrs</th></tr>
              </thead>
              <tbody>
                {seaDays.records.map((r, i) => {
                  const hrs = r.engine_hours_end && r.engine_hours_start
                    ? (r.engine_hours_end - r.engine_hours_start).toFixed(1)
                    : '—'
                  return (
                    <tr key={i}>
                      <td><span className="font-mono" style={{ fontSize: 11 }}>{r.trip_date}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {r.departure_location} → {r.arrival_location}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.operating_area || '—'}</td>
                      <td><span className="font-mono" style={{ fontSize: 11 }}>{hrs}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {(showAddCred || editingCred) && (
        <CredentialModal
          credential={editingCred ?? null}
          crewId={member.id}
          onSave={handleCredSaved}
          onClose={() => { setEditingCred(null); setShowAddCred(false) }}
        />
      )}
      {(showAddTraining || editingTraining) && (
        <TrainingModal
          record={editingTraining ?? null}
          crewId={member.id}
          trainingTypes={trainingTypes}
          onSave={handleTrainingSaved}
          onClose={() => { setEditingTraining(null); setShowAddTraining(false) }}
        />
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function CrewTraining() {
  const [crew, setCrew] = useState([])
  const [trainingTypes, setTrainingTypes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [c, tt] = await Promise.all([
      window.vesselAPI.crew.getAllIncludingInactive(),
      window.vesselAPI.trainingTypes.getAll(),
    ])
    setCrew(c)
    setTrainingTypes(tt)
    if (!selectedId && c.length) setSelectedId(c[0].id)
    setLoading(false)
  }

  function handleMemberSaved() {
    setShowAddMember(false)
    setEditingMember(null)
    load()
  }

  const visibleCrew = showInactive ? crew : crew.filter(c => c.status === 'Active')
  const selectedMember = crew.find(c => c.id === selectedId)

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">◈</div>
      <h2>Loading crew records…</h2>
    </div>
  )

  return (
    <div className="crew-training">
      <div className="page-header">
        <div>
          <h1 className="page-title">CREW &amp; TRAINING</h1>
          <p className="page-subtitle">Roster, credentials, training records, and sea days</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="toggle-label" style={{ fontSize: 12 }}>
            <input type="checkbox" checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)} />
            <span className="toggle-text">Show inactive</span>
          </label>
          <button className="btn btn-primary" onClick={() => setShowAddMember(true)}>
            + Add Crew Member
          </button>
        </div>
      </div>

      <div className="crew-layout">
        {/* Roster sidebar */}
        <div className="crew-roster">
          <div className="section-label">Roster — {visibleCrew.length} members</div>
          {visibleCrew.map(c => (
            <button key={c.id}
              className={`roster-item ${selectedId === c.id ? 'active' : ''} ${c.status === 'Inactive' ? 'inactive' : ''}`}
              onClick={() => setSelectedId(c.id)}>
              <div className="roster-avatar">
                {(c.preferred_name || c.full_name).charAt(0).toUpperCase()}
              </div>
              <div className="roster-info">
                <div className="roster-name">
                  {c.preferred_name ? `${c.preferred_name}` : c.full_name.split(' ')[0]}
                </div>
                <div className="roster-full">{c.full_name}</div>
                <div className="roster-role">{c.role}</div>
              </div>
              {c.status === 'Inactive' && (
                <span className="roster-inactive-tag">INACTIVE</span>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="crew-detail-area">
          {selectedMember ? (
            <MemberDetail
              key={selectedMember.id}
              member={selectedMember}
              trainingTypes={trainingTypes}
              onEdit={(m) => setEditingMember(m)}
              onRefresh={load}
            />
          ) : (
            <div className="placeholder-page" style={{ height: '100%' }}>
              <div className="placeholder-icon">◈</div>
              <h2>Select a crew member</h2>
            </div>
          )}
        </div>
      </div>

      {(showAddMember || editingMember) && (
        <MemberModal
          member={editingMember ?? null}
          onSave={handleMemberSaved}
          onClose={() => { setShowAddMember(false); setEditingMember(null) }}
        />
      )}
    </div>
  )
}
