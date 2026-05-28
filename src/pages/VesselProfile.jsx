import { useState, useEffect } from 'react'
import './VesselProfile.css'

// ── Field group component ──────────────────────────────────────
function FieldGroup({ label, children }) {
  return (
    <div className="field-group">
      <div className="field-group-label">{label}</div>
      <div className="field-group-body">{children}</div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', readOnly = false, span = 1 }) {
  return (
    <div className={`field span-${span}`}>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  )
}

// ── Equipment row ──────────────────────────────────────────────
function EquipmentRow({ item, onEdit }) {
  return (
    <tr onClick={() => onEdit(item)} style={{ cursor: 'pointer' }}>
      <td>
        <span className="equip-name">{item.item_name}</span>
      </td>
      <td>
        <span className="font-mono" style={{ fontSize: 12 }}>{item.quantity}</span>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.specification}</td>
      <td>
        <span className="font-mono cfr-ref">{item.cfr_reference}</span>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.compliance_module}</td>
    </tr>
  )
}

// ── Equipment edit modal ───────────────────────────────────────
function EquipmentModal({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...item })
  const isNew = !item.id

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    await window.vesselAPI.equipment.saveItem(form)
    onSave()
  }

  async function handleDelete() {
    if (window.confirm(`Remove "${item.item_name}" from inventory?`)) {
      await window.vesselAPI.equipment.deleteItem(item.id)
      onDelete()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'Add Equipment Item' : 'Edit Equipment Item'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="field span-2">
              <label className="field-label">Item Name</label>
              <input className="field-input" name="item_name" value={form.item_name ?? ''} onChange={handleChange} />
            </div>
            <div className="field">
              <label className="field-label">Quantity</label>
              <input className="field-input" name="quantity" value={form.quantity ?? ''} onChange={handleChange} />
            </div>
            <div className="field">
              <label className="field-label">CFR Reference</label>
              <input className="field-input" name="cfr_reference" value={form.cfr_reference ?? ''} onChange={handleChange} />
            </div>
            <div className="field span-2">
              <label className="field-label">Specification</label>
              <input className="field-input" name="specification" value={form.specification ?? ''} onChange={handleChange} />
            </div>
            <div className="field span-2">
              <label className="field-label">Compliance Module</label>
              <input className="field-input" name="compliance_module" value={form.compliance_module ?? ''} onChange={handleChange} />
            </div>
            <div className="field span-2">
              <label className="field-label">Notes</label>
              <input className="field-input" name="notes" value={form.notes ?? ''} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={handleDelete}>Remove</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function VesselProfile() {
  const [profile, setProfile] = useState(null)
  const [equipment, setEquipment] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [editingEquip, setEditingEquip] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load data on mount
  useEffect(() => {
    async function load() {
      const [p, e] = await Promise.all([
        window.vesselAPI.vessel.getProfile(),
        window.vesselAPI.equipment.getAll(),
      ])
      setProfile(p)
      setForm(p)
      setEquipment(e)
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      await window.vesselAPI.vessel.saveProfile(form)
      const updated = await window.vesselAPI.vessel.getProfile()
      setProfile(updated)
      setForm(updated)
      setEditing(false)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (err) {
      console.error(err)
      setSaveState('error')
    }
  }

  function handleCancel() {
    setForm(profile)
    setEditing(false)
    setSaveState('idle')
  }

  async function reloadEquipment() {
    const e = await window.vesselAPI.equipment.getAll()
    setEquipment(e)
    setEditingEquip(null)
  }

  if (loading) {
    return (
      <div className="placeholder-page">
        <div className="placeholder-icon">⚓</div>
        <h2>Loading vessel data…</h2>
      </div>
    )
  }

  const d = editing ? form : profile

  return (
    <div className="vessel-profile">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">VESSEL &amp; COI PROFILE</h1>
          <p className="page-subtitle">Configuration foundation — referenced by all compliance modules</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveState === 'saved' && (
            <span className="save-confirm">✓ Saved</span>
          )}
          {saveState === 'error' && (
            <span className="save-error">Save failed</span>
          )}
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit Profile</button>
          )}
        </div>
      </div>

      <div className="profile-grid">
        {/* Left: vessel info + COI */}
        <div className="profile-col">

          {/* Vessel information */}
          <section className="card profile-section">
            <div className="section-label">Vessel Information</div>
            <div className="profile-fields">
              <Field label="Vessel Name" name="vessel_name" value={d.vessel_name} onChange={handleChange} readOnly={!editing} span={2} />
              <Field label="Manufacturer" name="manufacturer" value={d.manufacturer} onChange={handleChange} readOnly={!editing} />
              <Field label="Year Built" name="year_built" value={d.year_built} onChange={handleChange} readOnly={!editing} type="number" />
              <Field label="Hull Material" name="hull_material" value={d.hull_material} onChange={handleChange} readOnly={!editing} />
              <Field label="LOA (ft)" name="loa_ft" value={d.loa_ft} onChange={handleChange} readOnly={!editing} type="number" />
              <Field label="USCG Doc Number" name="doc_number" value={d.doc_number} onChange={handleChange} readOnly={!editing} />
              <Field label="Hull ID (HIN)" name="hin" value={d.hin} onChange={handleChange} readOnly={!editing} />
              <Field label="Operator Organization" name="operator_org" value={d.operator_org} onChange={handleChange} readOnly={!editing} span={2} />
              <Field label="Home Port" name="home_port" value={d.home_port} onChange={handleChange} readOnly={!editing} span={2} />
              <Field label="Primary Engine" name="engine_description" value={d.engine_description} onChange={handleChange} readOnly={!editing} span={2} />
              <Field label="Fuel Capacity (gal)" name="fuel_capacity_gal" value={d.fuel_capacity_gal} onChange={handleChange} readOnly={!editing} type="number" />
            </div>
          </section>

          {/* COI fields */}
          <section className="card profile-section">
            <div className="section-label">Certificate of Inspection</div>
            <div className="profile-fields">
              <Field label="COI Issue Date" name="coi_issue_date" value={d.coi_issue_date} onChange={handleChange} readOnly={!editing} type="date" />
              <Field label="COI Expiry Date" name="coi_expiry_date" value={d.coi_expiry_date} onChange={handleChange} readOnly={!editing} type="date" />
              <Field label="Inspection Subchapter" name="inspection_subchapter" value={d.inspection_subchapter} onChange={handleChange} readOnly={!editing} />
              <Field label="Route / Operating Area" name="route" value={d.route} onChange={handleChange} readOnly={!editing} />
              <Field label="Souls Capacity" name="souls_capacity" value={d.souls_capacity} onChange={handleChange} readOnly={!editing} type="number" />
              <Field label="Minimum Manning" name="min_manning" value={d.min_manning} onChange={handleChange} readOnly={!editing} />
              <Field label="OCMI District" name="ocmi_district" value={d.ocmi_district} onChange={handleChange} readOnly={!editing} span={2} />
            </div>

            {/* COI status indicator */}
            <div className="coi-indicator">
              <div className="coi-indicator-row">
                <span className="coi-indicator-label">Status</span>
                <span className="status-badge status-ok">VALID</span>
              </div>
              <div className="coi-indicator-row">
                <span className="coi-indicator-label">Days Until Expiry</span>
                <span className="coi-indicator-val">~700 days</span>
              </div>
              <div className="coi-indicator-row">
                <span className="coi-indicator-label">Last Updated</span>
                <span className="coi-indicator-val font-mono" style={{ fontSize: 11 }}>
                  {profile.updated_at ? profile.updated_at.slice(0, 10) : '—'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right: equipment inventory */}
        <div className="profile-col">
          <section className="card profile-section equip-section">
            <div className="equip-header">
              <div className="section-label" style={{ marginBottom: 0 }}>Required Equipment Inventory</div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setEditingEquip({
                  item_name: '', quantity: '', specification: '',
                  cfr_reference: '', compliance_module: '', notes: ''
                })}
              >
                + Add Item
              </button>
            </div>

            <div className="equip-table-wrap">
              <table className="data-table equip-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Specification</th>
                    <th>CFR Ref</th>
                    <th>Module</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map(item => (
                    <EquipmentRow key={item.id} item={item} onEdit={setEditingEquip} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="equip-count">
              {equipment.length} items · click any row to edit
            </div>
          </section>
        </div>
      </div>

      {/* Equipment edit modal */}
      {editingEquip && (
        <EquipmentModal
          item={editingEquip}
          onSave={reloadEquipment}
          onDelete={reloadEquipment}
          onClose={() => setEditingEquip(null)}
        />
      )}
    </div>
  )
}
