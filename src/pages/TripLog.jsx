import { useState, useEffect } from 'react'
import './TripLog.css'

const SCIENTIFIC_OPS_OPTIONS = [
  'CTD / Water column', 'Trawl', 'Dredge', 'Plankton net', 'eDNA sampling',
  'Tagging / Telemetry', 'Benthic survey', 'ROV / Camera', 'Sediment core',
  'Water quality', 'Fish survey', 'Coral survey', 'Other',
]

const BEAUFORT = [
  { val: 0, label: '0 — Calm' },
  { val: 1, label: '1 — Light Air' },
  { val: 2, label: '2 — Light Breeze' },
  { val: 3, label: '3 — Gentle Breeze' },
  { val: 4, label: '4 — Moderate Breeze' },
  { val: 5, label: '5 — Fresh Breeze' },
  { val: 6, label: '6 — Strong Breeze' },
  { val: 7, label: '7 — Near Gale' },
  { val: 8, label: '8 — Gale' },
]

const COMMON_LOCATIONS = [
  'Fort Pierce Inlet', 'Fort Pierce Marina', 'Indian River Lagoon',
  'Sebastian Inlet', 'St. Lucie Inlet', 'Offshore — nearshore',
  'Offshore — coastal', 'Cape Canaveral', 'Lake Okeechobee',
]

function emptyForm(crew) {
  const today = new Date().toISOString().slice(0, 10)
  const captain = crew.find(c => c.role === 'Captain')
  return {
    trip_date: today,
    captain_id: captain?.id ?? '',
    departure_location: 'Fort Pierce Marina',
    departure_time: '',
    arrival_location: 'Fort Pierce Marina',
    arrival_time: '',
    overnight: false,
    operating_area: '',
    engine_hours_start: '',
    engine_hours_end: '',
    fuel_start_port: '',
    fuel_start_stbd: '',
    fuel_added: '',
    generator_hours: '',
    dive_operations: false,
    dive_details: '',
    scientific_ops: '',
    weather_conditions: '',
    beaufort_scale: '',
    incidents: '',
    notes: '',
    dock_fees: '',
    status: 'open',
    crew_ids: captain ? [captain.id] : [],
    scientific_personnel: [],
  }
}

// ── Trip form modal ────────────────────────────────────────────
function TripForm({ trip, crew, onSave, onClose }) {
  const isNew = !trip?.id
  const [form, setForm] = useState(() => {
    if (isNew) return emptyForm(crew)
    return {
      ...trip,
      overnight: !!trip.overnight,
      dive_operations: !!trip.dive_operations,
      crew_ids: (trip.crew || []).map(c => c.id),
      scientific_personnel: trip.scientific_personnel || [],
    }
  })
  const [saving, setSaving] = useState(false)
  const [sciOpsSelected, setSciOpsSelected] = useState(() => {
    if (!trip?.scientific_ops) return []
    return trip.scientific_ops.split(', ').filter(Boolean)
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleInput(e) {
    const { name, value, type, checked } = e.target
    set(name, type === 'checkbox' ? checked : value)
  }

  function toggleCrewMember(id) {
    setForm(f => {
      const ids = f.crew_ids.includes(id)
        ? f.crew_ids.filter(x => x !== id)
        : [...f.crew_ids, id]
      return { ...f, crew_ids: ids }
    })
  }

  function toggleSciOp(op) {
    setSciOpsSelected(prev => {
      const next = prev.includes(op) ? prev.filter(x => x !== op) : [...prev, op]
      setForm(f => ({ ...f, scientific_ops: next.join(', ') }))
      return next
    })
  }

  function addSciPerson() {
    setForm(f => ({
      ...f,
      scientific_personnel: [...f.scientific_personnel, { full_name: '', affiliation: '' }]
    }))
  }

  function updateSciPerson(i, field, value) {
    setForm(f => {
      const arr = [...f.scientific_personnel]
      arr[i] = { ...arr[i], [field]: value }
      return { ...f, scientific_personnel: arr }
    })
  }

  function removeSciPerson(i) {
    setForm(f => ({
      ...f,
      scientific_personnel: f.scientific_personnel.filter((_, idx) => idx !== i)
    }))
  }

  // Derived: souls on board
  const sciPersonnelCount = form.scientific_personnel.filter(p => p.full_name?.trim()).length
  const soulsOnBoard = form.crew_ids.length + sciPersonnelCount
  const soulsWarning = soulsOnBoard > 16

  async function handleSave(status) {
    setSaving(true)
    await window.vesselAPI.trips.save({ ...form, status })
    setSaving(false)
    onSave()
  }

  // Engine hours delta
  const hoursStart = parseFloat(form.engine_hours_start)
  const hoursEnd = parseFloat(form.engine_hours_end)
  const hoursDelta = (!isNaN(hoursStart) && !isNaN(hoursEnd) && hoursEnd >= hoursStart)
    ? (hoursEnd - hoursStart).toFixed(1)
    : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trip-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'NEW TRIP ENTRY' : `TRIP #${trip.id} — ${trip.trip_date}`}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="trip-modal-body">
          {/* Row 1: Date, Captain, Overnight */}
          <div className="form-section">
            <div className="form-row-3">
              <div className="field">
                <label className="field-label">Trip Date</label>
                <input className="field-input" type="date" name="trip_date"
                  value={form.trip_date} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Captain of Record</label>
                <select className="field-input" name="captain_id"
                  value={form.captain_id} onChange={handleInput}>
                  <option value="">— Select —</option>
                  {crew.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.role})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Overnight Trip</label>
                <label className="toggle-label">
                  <input type="checkbox" name="overnight"
                    checked={form.overnight} onChange={handleInput} />
                  <span className="toggle-text">{form.overnight ? 'Yes' : 'No'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Departure / Arrival */}
          <div className="form-section">
            <div className="form-section-label">Departure & Arrival</div>
            <div className="form-row-4">
              <div className="field">
                <label className="field-label">Departure Location</label>
                <input className="field-input" list="locations-list" name="departure_location"
                  value={form.departure_location} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Departure Time</label>
                <input className="field-input" type="time" name="departure_time"
                  value={form.departure_time} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Arrival Location</label>
                <input className="field-input" list="locations-list" name="arrival_location"
                  value={form.arrival_location} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Arrival Time</label>
                <input className="field-input" type="time" name="arrival_time"
                  value={form.arrival_time} onChange={handleInput} />
              </div>
            </div>
            <datalist id="locations-list">
              {COMMON_LOCATIONS.map(l => <option key={l} value={l} />)}
            </datalist>
            <div className="field" style={{ marginTop: 10 }}>
              <label className="field-label">Operating Area</label>
              <input className="field-input" name="operating_area"
                value={form.operating_area} onChange={handleInput}
                placeholder="e.g. Nearshore reefs 3–8 nm SE Fort Pierce Inlet" />
            </div>
          </div>

          {/* Row 3: Crew manifest */}
          <div className="form-section">
            <div className="form-section-label">Crew Manifest</div>
            <div className="crew-manifest">
              {crew.map(c => (
                <label key={c.id} className={`crew-chip ${form.crew_ids.includes(c.id) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.crew_ids.includes(c.id)}
                    onChange={() => toggleCrewMember(c.id)} />
                  <span className="crew-chip-name">{c.full_name}</span>
                  <span className="crew-chip-role">{c.role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Row 4: Scientific personnel */}
          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-label">Scientific Personnel Aboard</div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={addSciPerson}>+ Add Person</button>
            </div>
            {form.scientific_personnel.length === 0 && (
              <div className="empty-hint">No scientific personnel — crew only trip.</div>
            )}
            {form.scientific_personnel.map((p, i) => (
              <div key={i} className="sci-person-row">
                <input className="field-input" placeholder="Full name"
                  value={p.full_name} onChange={e => updateSciPerson(i, 'full_name', e.target.value)} />
                <input className="field-input" placeholder="Affiliation (optional)"
                  value={p.affiliation} onChange={e => updateSciPerson(i, 'affiliation', e.target.value)} />
                <button className="btn btn-danger" style={{ padding: '6px 10px' }}
                  onClick={() => removeSciPerson(i)}>✕</button>
              </div>
            ))}
            <div className={`souls-counter ${soulsWarning ? 'over' : ''}`}>
              <span className="souls-label">Souls on Board</span>
              <span className="souls-value">{soulsOnBoard} / 16</span>
              {soulsWarning && <span className="souls-warn">⚠ Exceeds COI capacity</span>}
            </div>
          </div>

          {/* Row 5: Engine hours & fuel */}
          <div className="form-section">
            <div className="form-section-label">Engine Hours & Fuel</div>
            <div className="form-row-3">
              <div className="field">
                <label className="field-label">Engine Hrs — Start</label>
                <input className="field-input" type="number" step="0.1" name="engine_hours_start"
                  value={form.engine_hours_start} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Engine Hrs — End</label>
                <input className="field-input" type="number" step="0.1" name="engine_hours_end"
                  value={form.engine_hours_end} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Hours This Trip</label>
                <div className="derived-value">{hoursDelta ?? '—'}</div>
              </div>
            </div>
            <div className="form-row-4" style={{ marginTop: 10 }}>
              <div className="field">
                <label className="field-label">Fuel Start — Port (gal)</label>
                <input className="field-input" type="number" step="1" name="fuel_start_port"
                  value={form.fuel_start_port} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Fuel Start — Stbd (gal)</label>
                <input className="field-input" type="number" step="1" name="fuel_start_stbd"
                  value={form.fuel_start_stbd} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Fuel Added (gal)</label>
                <input className="field-input" type="number" step="1" name="fuel_added"
                  value={form.fuel_added} onChange={handleInput} />
              </div>
              <div className="field">
                <label className="field-label">Generator Hrs</label>
                <input className="field-input" type="number" step="0.1" name="generator_hours"
                  value={form.generator_hours} onChange={handleInput} />
              </div>
            </div>
          </div>

          {/* Row 6: Scientific ops & dive */}
          <div className="form-section">
            <div className="form-section-label">Scientific Operations</div>
            <div className="sci-ops-grid">
              {SCIENTIFIC_OPS_OPTIONS.map(op => (
                <label key={op} className={`sci-op-chip ${sciOpsSelected.includes(op) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={sciOpsSelected.includes(op)}
                    onChange={() => toggleSciOp(op)} />
                  {op}
                </label>
              ))}
            </div>
            <div className="form-row-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label className="field-label">
                  <input type="checkbox" name="dive_operations"
                    checked={form.dive_operations} onChange={handleInput}
                    style={{ marginRight: 6 }} />
                  Dive Operations
                </label>
                {form.dive_operations && (
                  <input className="field-input" name="dive_details"
                    value={form.dive_details} onChange={handleInput}
                    placeholder="Divers, depth, type..." style={{ marginTop: 6 }} />
                )}
              </div>
            </div>
          </div>

          {/* Row 7: Weather */}
          <div className="form-section">
            <div className="form-section-label">Weather & Sea Conditions</div>
            <div className="form-row-2">
              <div className="field">
                <label className="field-label">Conditions Description</label>
                <input className="field-input" name="weather_conditions"
                  value={form.weather_conditions} onChange={handleInput}
                  placeholder="e.g. Partly cloudy, SE winds 10–15 kt, 2–3 ft seas" />
              </div>
              <div className="field">
                <label className="field-label">Beaufort Scale</label>
                <select className="field-input" name="beaufort_scale"
                  value={form.beaufort_scale} onChange={handleInput}>
                  <option value="">— Select —</option>
                  {BEAUFORT.map(b => (
                    <option key={b.val} value={b.val}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 8: Incidents, notes, fees */}
          <div className="form-section">
            <div className="form-section-label">Incidents & Notes</div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label className="field-label">
                Incidents / Unusual Events
                {form.incidents && <span className="incident-flag"> ⚠ Flagged for report</span>}
              </label>
              <textarea className="field-input field-textarea" name="incidents"
                value={form.incidents} onChange={handleInput}
                placeholder="Any safety, equipment, or personnel incidents..." rows={2} />
            </div>
            <div className="form-row-2">
              <div className="field">
                <label className="field-label">Notes</label>
                <textarea className="field-input field-textarea" name="notes"
                  value={form.notes} onChange={handleInput}
                  placeholder="General notes..." rows={2} />
              </div>
              <div className="field">
                <label className="field-label">Dock / Fuel Fees ($)</label>
                <input className="field-input" type="number" step="0.01" name="dock_fees"
                  value={form.dock_fees} onChange={handleInput} />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {!isNew && (
            <button className="btn btn-danger"
              onClick={async () => {
                if (window.confirm('Delete this trip entry?')) {
                  await window.vesselAPI.trips.delete(trip.id)
                  onSave()
                }
              }}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-ghost" onClick={() => handleSave('open')}
            disabled={saving}>
            Save Draft
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('closed')}
            disabled={saving || !form.arrival_time}>
            {saving ? 'Saving…' : 'Close Trip'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Trip list row ──────────────────────────────────────────────
function TripRow({ trip, onClick }) {
  const hrs = (trip.engine_hours_start != null && trip.engine_hours_end != null)
    ? (trip.engine_hours_end - trip.engine_hours_start).toFixed(1)
    : '—'
  const isOpen = trip.status === 'open'
  const hasIncident = !!trip.incidents

  return (
    <tr onClick={onClick} className={isOpen ? 'trip-row-open' : ''}>
      <td>
        <span className="font-mono" style={{ fontSize: 12 }}>{trip.trip_date}</span>
      </td>
      <td>
        <div className="trip-route">
          <span>{trip.departure_location || '—'}</span>
          <span className="route-arrow">→</span>
          <span>{trip.arrival_location || '—'}</span>
        </div>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        {trip.captain_name || '—'}
      </td>
      <td>
        <span className="font-mono" style={{ fontSize: 12 }}>{hrs} hrs</span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {isOpen && <span className="status-badge status-warn">OPEN</span>}
          {hasIncident && <span className="status-badge status-over">INCIDENT</span>}
          {trip.overnight ? <span className="trip-tag">OVERNIGHT</span> : null}
          {trip.dive_operations ? <span className="trip-tag">DIVE</span> : null}
        </div>
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function TripLog() {
  const [trips, setTrips] = useState([])
  const [crew, setCrew] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [t, c] = await Promise.all([
      window.vesselAPI.trips.getAll(),
      window.vesselAPI.crew.getAll(),
    ])
    setTrips(t)
    setCrew(c)
    setLoading(false)
  }

  async function openTrip(trip) {
    const full = await window.vesselAPI.trips.getOne(trip.id)
    setEditingTrip(full)
    setShowForm(true)
  }

  function handleSaved() {
    setShowForm(false)
    setEditingTrip(null)
    load()
  }

  // Summary stats
  const totalTrips = trips.length
  const totalHours = trips.reduce((acc, t) => {
    const h = (t.engine_hours_end ?? 0) - (t.engine_hours_start ?? 0)
    return acc + (h > 0 ? h : 0)
  }, 0)
  const openTrips = trips.filter(t => t.status === 'open').length
  const incidentTrips = trips.filter(t => t.incidents).length

  if (loading) return (
    <div className="placeholder-page">
      <div className="placeholder-icon">◫</div>
      <h2>Loading trip log…</h2>
    </div>
  )

  return (
    <div className="trip-log">
      <div className="page-header">
        <div>
          <h1 className="page-title">TRIP LOG</h1>
          <p className="page-subtitle">46 CFR 185.220 — Underway operations record</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTrip(null); setShowForm(true) }}>
          + New Trip
        </button>
      </div>

      {/* Summary stats */}
      <div className="trip-stats">
        <div className="trip-stat">
          <span className="trip-stat-val">{totalTrips}</span>
          <span className="trip-stat-label">Total Trips</span>
        </div>
        <div className="trip-stat">
          <span className="trip-stat-val">{totalHours.toFixed(0)}</span>
          <span className="trip-stat-label">Engine Hours</span>
        </div>
        <div className="trip-stat">
          <span className="trip-stat-val" style={{ color: openTrips > 0 ? 'var(--amber-400)' : 'inherit' }}>
            {openTrips}
          </span>
          <span className="trip-stat-label">Open / Draft</span>
        </div>
        <div className="trip-stat">
          <span className="trip-stat-val" style={{ color: incidentTrips > 0 ? 'var(--red-400)' : 'inherit' }}>
            {incidentTrips}
          </span>
          <span className="trip-stat-label">With Incidents</span>
        </div>
      </div>

      {/* Trip table */}
      <div className="card">
        {trips.length === 0 ? (
          <div className="empty-log">
            <div style={{ fontSize: 32, opacity: 0.2 }}>◫</div>
            <div>No trips logged yet.</div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Log First Trip
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th>Captain</th>
                <th>Engine Hrs</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <TripRow key={t.id} trip={t} onClick={() => openTrip(t)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <TripForm
          trip={editingTrip}
          crew={crew}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditingTrip(null) }}
        />
      )}
    </div>
  )
}
