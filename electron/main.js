const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

let db
let dbPath

async function initDatabase() {
  const initSqlJs = require('sql.js')
  const wasmPath = isDev
    ? path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')
    : path.join(process.resourcesPath, 'sql-wasm.wasm')
  const SQL = await initSqlJs({ locateFile: () => wasmPath })
  dbPath = isDev
    ? path.join(__dirname, '../vessellog-dev.db')
    : path.join(app.getPath('userData'), 'vessellog.db')
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath))
    console.log(`[DB] Loaded: ${dbPath}`)
  } else {
    db = new SQL.Database()
    console.log(`[DB] Created: ${dbPath}`)
  }
  db.run('PRAGMA foreign_keys = ON')
  runMigrations()
  saveDatabase()
}

function saveDatabase() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
}

// Run each statement in a migration separately (sql.js limitation)
function runMigration(sql) {
  sql.split(';').map(s => s.trim()).filter(Boolean).forEach(s => db.run(s))
}

function runMigrations() {
  db.run(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    ran_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const migrations = [
    { name: '001_vessel_profile',      fn: m001 },
    { name: '002_equipment_inventory', fn: m002 },
    { name: '003_crew_roster',         fn: m003 },
    { name: '004_trip_log',            fn: m004 },
    { name: '005_crew_credentials',    fn: m005 },
    { name: '006_training_records',    fn: m006 },
    { name: '007_crew_alter_columns',  fn: m007 },
    { name: '008_checklists',            fn: m008 },
    { name: '009_safety_log',             fn: m009 },
    { name: '010_coi_register',           fn: m010 },
    { name: '011_drills',                 fn: m011 },
    { name: '012_maintenance',            fn: m012 },
  ]

  for (const m of migrations) {
    const result = db.exec(`SELECT id FROM migrations WHERE name = '${m.name}'`)
    const alreadyRan = result.length > 0 && result[0].values.length > 0
    if (!alreadyRan) {
      m.fn()
      db.run(`INSERT INTO migrations (name) VALUES ('${m.name}')`)
      console.log(`[DB] Ran migration: ${m.name}`)
    }
  }
}

// ── Migrations ─────────────────────────────────────────────────

function m001() { runMigration(`
  CREATE TABLE IF NOT EXISTS vessel_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    vessel_name TEXT, manufacturer TEXT, year_built INTEGER,
    hull_material TEXT, loa_ft REAL, doc_number TEXT, hin TEXT,
    operator_org TEXT, home_port TEXT, engine_description TEXT,
    fuel_capacity_gal REAL, coi_issue_date TEXT, coi_expiry_date TEXT,
    inspection_subchapter TEXT, route TEXT, souls_capacity INTEGER,
    min_manning TEXT, ocmi_district TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO vessel_profile (
    id, vessel_name, manufacturer, year_built, hull_material, loa_ft,
    doc_number, hin, operator_org, home_port, engine_description,
    fuel_capacity_gal, coi_issue_date, coi_expiry_date,
    inspection_subchapter, route, souls_capacity, min_manning, ocmi_district
  ) VALUES (
    1, 'R/V Sunburst', 'Newton Boats', 2024, 'Fiberglass (FRP)', 36,
    '1345362', 'NWN36144A322', 'Smithsonian Marine Station', 'Fort Pierce, FL',
    'Cummins Q9 Diesel, 450 HP', 280, '2026-04-01', '2028-04-01',
    'Subchapter T', 'Coastal', 16, 'Captain + Mate', 'Sector Jacksonville'
  )
`) }

function m002() { runMigration(`
  CREATE TABLE IF NOT EXISTS equipment_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL, quantity TEXT, specification TEXT,
    cfr_reference TEXT, compliance_module TEXT, notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO equipment_inventory
    (id, item_name, quantity, specification, cfr_reference, compliance_module, sort_order)
  VALUES
    (1,  'Type I PFDs (Adult)',                '16',    'USCG-approved Type I offshore',        '46 CFR 180.71',  'Safety Log + COI Register', 1),
    (2,  'Type I PFDs (Child)',                '8',     'USCG-approved Type I',                 '46 CFR 180.75',  'Safety Log + COI Register', 2),
    (3,  'Life Ring with Light & Line (24")',  '1',     '24-inch ring buoy',                    '46 CFR 180.70',  'Safety Log + COI Register', 3),
    (4,  'Inflatable Life Raft — Revere HYF-K','1',    '8-person capacity',                    '46 CFR 180.130', 'Safety Log + COI Register', 4),
    (5,  'EPIRB — ACR GlobalFix V5 406 MHz',  '1',     'Hydrostatic release, 406 MHz',         '46 CFR 180.64',  'Safety Log + COI Register', 5),
    (6,  'Fixed Engine Space Fire Suppression','1',     'Engine compartment system',            '46 CFR 181.410', 'COI Register',              6),
    (7,  'Portable Fire Extinguishers',        '3',     'USCG-approved type',                   '46 CFR 181.500', 'Safety Log + COI Register', 7),
    (8,  'Flare Kit (Coastal)',                '1 set', '3 hand red + 3 orange smoke or equiv', '46 CFR 180.68',  'Safety Log + COI Register', 8),
    (9,  'First Aid Kit (CG approved)',        '1',     'Series 160.041 or Commandant std',     '46 CFR 184.710', 'COI Register',              9),
    (10, 'AED',                                '1',     'Institutional requirement',             'Institutional',  'COI Register',              10),
    (11, 'VHF Radio (Ch 13, 16, 22A)',         '2',     'Primary + handheld backup',            '46 CFR 183.310', 'COI Register',              11),
    (12, 'Magnetic Compass',                   '1',     'With current deviation table',         '46 CFR 184.402', 'COI Register',              12),
    (13, 'Radar',                              '1',     'Operational',                          '46 CFR 184.404', 'COI Register',              13),
    (14, 'MARPOL Placards (Oil + Garbage)',    '2',     'Posted per regulation',                '33 CFR 155.450', 'COI Register',              14),
    (15, 'Anchor System',                      '1',     'With chain and rode',                  '46 CFR 184.300', 'COI Register',              15),
    (16, 'General Alarm System',               '1',     'Audible throughout vessel',            '46 CFR 183.550', 'COI Register',              16)
`) }

function m003() { runMigration(`
  CREATE TABLE IF NOT EXISTS crew_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    role TEXT NOT NULL DEFAULT 'Crew',
    position_detail TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO crew_members
    (id, full_name, preferred_name, role, position_detail, status)
  VALUES
    (1, 'David R. Branson', 'Branson', 'Captain', 'Vessel Master — USCG Licensed', 'Active'),
    (2, 'Laurence J. Houk', 'Jay', 'Mate', 'Unlicensed Mate — License in progress', 'Active')
`) }

function m004() { runMigration(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_date TEXT NOT NULL,
    captain_id INTEGER REFERENCES crew_members(id),
    departure_location TEXT, departure_time TEXT,
    arrival_location TEXT, arrival_time TEXT,
    overnight INTEGER NOT NULL DEFAULT 0,
    operating_area TEXT,
    engine_hours_start REAL, engine_hours_end REAL,
    fuel_start_port REAL, fuel_start_stbd REAL, fuel_added REAL,
    generator_hours REAL,
    dive_operations INTEGER NOT NULL DEFAULT 0, dive_details TEXT,
    scientific_ops TEXT, weather_conditions TEXT, beaufort_scale INTEGER,
    incidents TEXT, notes TEXT, dock_fees REAL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS trip_crew (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    crew_id INTEGER NOT NULL REFERENCES crew_members(id),
    UNIQUE(trip_id, crew_id)
  );
  CREATE TABLE IF NOT EXISTS trip_scientific_personnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    affiliation TEXT
  )
`) }

function m005() { runMigration(`
  CREATE TABLE IF NOT EXISTS crew_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL,
    identifier TEXT, issuing_org TEXT, issue_date TEXT, expiry_date TEXT,
    notes TEXT, attachment_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO crew_credentials (id, crew_id, credential_type, notes)
  VALUES
    (1, 1, 'USCG License',    'Add license number and expiry'),
    (2, 1, 'TWIC',            'Add TWIC number and expiry'),
    (3, 1, 'Drug Consortium', 'Add consortium name and next test date')
`) }

function m006() { runMigration(`
  CREATE TABLE IF NOT EXISTS training_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, description TEXT,
    default_interval_months INTEGER,
    required_for_subchapter_t INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO training_types
    (id, name, description, default_interval_months, required_for_subchapter_t, sort_order)
  VALUES
    (1,  'First Aid / CPR',             'American Heart Assoc. or Red Cross certification', 24,   1, 1),
    (2,  'AED Operation',               'Automated External Defibrillator operation',        24,   1, 2),
    (3,  'Vessel Familiarization',      'Vessel-specific familiarization',                   NULL, 1, 3),
    (4,  'Firefighting Drill',          'Quarterly drill — linked from drill log',           3,    1, 4),
    (5,  'Abandon Ship / MOB Drill',    'Quarterly drill — linked from drill log',           3,    1, 5),
    (6,  'STCW Basic Safety',           'STCW VI/1 Basic Safety Training',                  60,   0, 6),
    (7,  'Dive Medical / Physical',     'Annual dive medical clearance (dive crew only)',    12,   0, 7),
    (8,  'Hazmat / HAZWOPER',           'Hazardous materials handling',                      12,   0, 8),
    (9,  'Bloodborne Pathogens',        'Annual BBP awareness training',                     12,   0, 9),
    (10, 'Boat Operator Certification', 'State or institutional boat operator cert',         NULL, 0, 10);
  CREATE TABLE IF NOT EXISTS training_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
    training_type_id INTEGER REFERENCES training_types(id),
    custom_type_name TEXT, completion_date TEXT NOT NULL,
    expiry_date TEXT, issuing_org TEXT, cert_number TEXT,
    notes TEXT, attachment_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`) }

// Adds preferred_name and position_detail to existing crew_members table
function m007() {
  try { db.run('ALTER TABLE crew_members ADD COLUMN preferred_name TEXT') } catch(e) {}
  try { db.run('ALTER TABLE crew_members ADD COLUMN position_detail TEXT') } catch(e) {}
}

function m008() { runMigration(`
  CREATE TABLE IF NOT EXISTS checklists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id     INTEGER REFERENCES trips(id) ON DELETE SET NULL,
    type        TEXT NOT NULL,
    date        TEXT NOT NULL,
    completed   INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    completed_by TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS checklist_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id  INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    group_name    TEXT,
    item_text     TEXT NOT NULL,
    required      INTEGER NOT NULL DEFAULT 1,
    checked       INTEGER NOT NULL DEFAULT 0,
    na            INTEGER NOT NULL DEFAULT 0,
    checked_by    TEXT,
    checked_at    TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0
  )
`) }

function m009() { runMigration(`
  CREATE TABLE IF NOT EXISTS safety_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_month       TEXT NOT NULL UNIQUE,
    inspected_by    TEXT,
    inspection_date TEXT NOT NULL,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS safety_log_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id          INTEGER NOT NULL REFERENCES safety_logs(id) ON DELETE CASCADE,
    item_key        TEXT NOT NULL,
    item_label      TEXT NOT NULL,
    result          TEXT,
    notes           TEXT,
    initials        TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0
  )
`) }

function m010() { runMigration(`
  CREATE TABLE IF NOT EXISTS coi_register_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    cfr_reference TEXT,
    frequency TEXT NOT NULL DEFAULT 'Annual',
    last_action_date TEXT,
    next_due_date TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO coi_register_items
    (id, category, item_name, cfr_reference, frequency, last_action_date, next_due_date, sort_order)
  VALUES
    (1,  'Life Saving Equipment', 'Life Raft — annual shore-side servicing (Revere HYF-K)',              '46 CFR 180.130',    'Annual',    NULL,         NULL,         10),
    (2,  'Life Saving Equipment', 'EPIRB — annual battery and hydrostatic release inspection',            '46 CFR 180.64',     'Annual',    NULL,         NULL,         20),
    (3,  'Life Saving Equipment', 'EPIRB — NOAA/FCC registration renewal',                               '47 CFR 80.1085',    'Biennial',  '2025-02-01', NULL,         30),
    (4,  'Life Saving Equipment', 'Flare Kit — replace before expiry',                                   '46 CFR 180.68',     'PerExpiry', NULL,         '2026-06-30', 40),
    (5,  'Life Saving Equipment', 'Life Jackets / PFDs — annual serviceability inspection',               '46 CFR 180.71',     'Annual',    '2026-04-01', NULL,         50),
    (6,  'Fire Fighting',         'Fixed Engine Space Fire Suppression — annual inspection by certified technician', '46 CFR 181.410', 'Annual', NULL, NULL, 60),
    (7,  'Fire Fighting',         'Portable Fire Extinguishers (3) — annual professional service',        '46 CFR 181.500',    'Annual',    '2026-04-01', NULL,         70),
    (8,  'Navigation & Comms',    'FCC Ship Station License — obtain and post aboard',                    '46 CFR 184.502',    'OneTime',   NULL,         NULL,         80),
    (9,  'Navigation & Comms',    'Magnetic Compass — deviation table current and posted',                '46 CFR 184.402',    'Annual',    '2026-04-01', NULL,         90),
    (10, 'Navigation & Comms',    'Radar — operational check and log',                                   '46 CFR 184.404',    'Annual',    '2026-04-01', NULL,        100),
    (11, 'Documentation',         'MARPOL Oil Pollution Placard — verify posted',                        '33 CFR 155.450',    'Annual',    '2026-04-01', NULL,        110),
    (12, 'Documentation',         'MARPOL Garbage Placard — verify posted',                             '33 CFR 151.59',     'Annual',    '2026-04-01', NULL,        120),
    (13, 'Documentation',         'Certificate of Inspection — verify current',                         '46 CFR 175.5',      'PerExpiry', NULL,         '2028-04-01', 130),
    (14, 'Drills',                'Abandon Ship / Man Overboard Drill',                                 '46 CFR 185.506(a)', 'Quarterly', NULL,         NULL,        140),
    (15, 'Drills',                'Firefighting Drill',                                                  '46 CFR 185.506(b)', 'Quarterly', NULL,         NULL,        150),
    (16, 'Training',              'First Aid / CPR — all active crew current',                           '46 CFR 185.500',    'Biennial',  NULL,         NULL,        160),
    (17, 'General Safety',        'General Alarm System — functional test and log',                      '46 CFR 183.550',    'Annual',    '2026-04-01', NULL,        170),
    (18, 'General Safety',        'First Aid Kit — annual inventory and restock',                        '46 CFR 184.710',    'Annual',    '2026-04-01', NULL,        180),
    (19, 'General Safety',        'AED — annual service (battery, pads, software update)',               'Institutional',     'Annual',    NULL,         NULL,        190),
    (20, 'General Safety',        'Anchor System — annual inspection',                                   '46 CFR 184.300',    'Annual',    '2026-04-01', NULL,        200)
`) }

function m011() { runMigration(`
  CREATE TABLE IF NOT EXISTS drills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drill_type TEXT NOT NULL,
    drill_date TEXT NOT NULL,
    conducted_by TEXT,
    participants TEXT,
    duration_minutes INTEGER,
    location TEXT,
    observations TEXT,
    corrective_actions TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`) }

function m012() { runMigration(`
  CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system TEXT NOT NULL,
    task_name TEXT NOT NULL,
    interval_type TEXT NOT NULL DEFAULT 'date',
    interval_months INTEGER,
    interval_hours REAL,
    warn_days INTEGER,
    warn_hours REAL,
    last_service_date TEXT,
    last_service_hours REAL,
    next_due_date TEXT,
    next_due_hours REAL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS maintenance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    service_date TEXT NOT NULL,
    engine_hours REAL,
    performed_by TEXT,
    work_description TEXT,
    parts_used TEXT,
    cost REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO maintenance_tasks
    (id, system, task_name, interval_type, interval_months, interval_hours, warn_days, warn_hours, sort_order)
  VALUES
    (1,  'Main Engine', 'Engine Oil & Filter Change',           'hybrid',  12,   250,  30,  25,  10),
    (2,  'Main Engine', 'Primary Fuel Filter',                  'hours',   NULL, 250,  NULL,25,  20),
    (3,  'Main Engine', 'Racor Secondary Fuel Filter',          'hours',   NULL, 250,  NULL,25,  30),
    (4,  'Main Engine', 'Raw Water Pump Impeller',              'hybrid',  12,   200,  30,  20,  40),
    (5,  'Main Engine', 'Drive Belt Inspection & Replacement',  'hybrid',  24,   500,  45,  50,  50),
    (6,  'Main Engine', 'Coolant System Service',               'date',    24,   NULL, 60,  NULL,60),
    (7,  'Main Engine', 'Valve Clearance Check',                'hours',   NULL, 1000, NULL,100, 70),
    (8,  'Main Engine', 'Engine Zincs (Pencil Anodes)',         'date',    3,    NULL, 14,  NULL,80),
    (9,  'Generator',   'Generator Oil & Filter Change',        'hours',   NULL, 250,  NULL,25,  110),
    (10, 'Generator',   'Generator Fuel Filter',                'hours',   NULL, 250,  NULL,25,  120),
    (11, 'Generator',   'Generator Raw Water Impeller',         'hours',   NULL, 200,  NULL,20,  130),
    (12, 'Generator',   'Generator Zincs (Pencil Anodes)',      'date',    3,    NULL, 14,  NULL,140),
    (13, 'Hydraulics',  'Hydraulic Fluid Level Check',          'date',    3,    NULL, 14,  NULL,210),
    (14, 'Hydraulics',  'Hydraulic Fluid Change',               'date',    24,   NULL, 60,  NULL,220),
    (15, 'Hydraulics',  'Hose & Fitting Inspection',            'date',    12,   NULL, 45,  NULL,230),
    (16, 'Bow Thruster','Thruster Oil Change',                  'date',    12,   NULL, 45,  NULL,310),
    (17, 'Bow Thruster','Thruster Zinc Inspection',             'date',    3,    NULL, 14,  NULL,320),
    (18, 'Stabilizers', 'Stabilizer System Service',            'date',    12,   NULL, 45,  NULL,410),
    (19, 'Stabilizers', 'Stabilizer Zinc Inspection',           'date',    3,    NULL, 14,  NULL,420),
    (20, 'General',     'Hull Zincs — Inspect',                 'date',    3,    NULL, 14,  NULL,510),
    (21, 'General',     'Hull Zincs — Replace',                 'date',    12,   NULL, 45,  NULL,520),
    (22, 'General',     'Shaft & Rudder Zincs Replace',         'date',    12,   NULL, 45,  NULL,530),
    (23, 'General',     'Cutlass Bearing Inspection',           'date',    12,   NULL, 45,  NULL,540),
    (24, 'General',     'Bilge Pumps — Annual Service',         'date',    12,   NULL, 45,  NULL,550),
    (25, 'General',     'Seacocks — Lubricate & Exercise',      'date',    3,    NULL, 14,  NULL,560),
    (26, 'General',     'Steering System Inspection',           'date',    12,   NULL, 45,  NULL,570),
    (27, 'General',     'Battery Service',                      'date',    12,   NULL, 45,  NULL,580)
`) }

// ── Query helpers ──────────────────────────────────────────────
function queryAll(sql, params = []) {
  const result = db.exec(sql, params)
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])))
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null
}

function computeItemStatus(item) {
  if (item.frequency === 'OneTime') return item.last_action_date ? 'ok' : 'overdue'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let nextDue = null
  if (item.frequency === 'PerExpiry') {
    nextDue = item.next_due_date ? new Date(item.next_due_date) : null
  } else if (item.last_action_date) {
    const DAYS = { Monthly: 30, Quarterly: 90, Annual: 365, Biennial: 730 }
    nextDue = new Date(item.last_action_date)
    nextDue.setDate(nextDue.getDate() + (DAYS[item.frequency] || 365))
  }
  if (!nextDue) return 'overdue'
  const WARN = { Monthly: 7, Quarterly: 21, Annual: 45, Biennial: 60, PerExpiry: 45 }
  const daysUntil = Math.floor((nextDue - today) / 86400000)
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= (WARN[item.frequency] || 30)) return 'warning'
  return 'ok'
}

function computeNextDue(item) {
  if (item.frequency === 'OneTime') return null
  if (item.frequency === 'PerExpiry') return item.next_due_date ?? null
  if (!item.last_action_date) return null
  const DAYS = { Monthly: 30, Quarterly: 90, Annual: 365, Biennial: 730 }
  const d = new Date(item.last_action_date)
  d.setDate(d.getDate() + (DAYS[item.frequency] || 365))
  return d.toISOString().slice(0, 10)
}

function computeMaintenanceStatus(task, currentHours) {
  if (task.acknowledged) return 'acknowledged'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const statuses = []

  if (task.interval_type === 'date' || task.interval_type === 'hybrid') {
    if (!task.next_due_date) {
      statuses.push('overdue')
    } else {
      const daysUntil = Math.floor((new Date(task.next_due_date + 'T00:00:00') - today) / 86400000)
      if (daysUntil < 0) statuses.push('overdue')
      else if (daysUntil <= (task.warn_days || 30)) statuses.push('warning')
      else statuses.push('ok')
    }
  }

  if (task.interval_type === 'hours' || task.interval_type === 'hybrid') {
    if (!task.next_due_hours) {
      statuses.push('overdue')
    } else if (currentHours == null) {
      statuses.push('ok')
    } else {
      const hoursUntil = task.next_due_hours - currentHours
      if (hoursUntil < 0) statuses.push('overdue')
      else if (hoursUntil <= (task.warn_hours || 25)) statuses.push('warning')
      else statuses.push('ok')
    }
  }

  if (!statuses.length) return 'ok'
  if (statuses.includes('overdue')) return 'overdue'
  if (statuses.includes('warning')) return 'warning'
  return 'ok'
}

function getMaintenanceTasks() {
  const currentHours = queryOne('SELECT MAX(engine_hours_end) as hours FROM trips')?.hours ?? null
  const tasks = queryAll('SELECT * FROM maintenance_tasks ORDER BY sort_order')
  return tasks.map(task => ({
    ...task,
    _status: computeMaintenanceStatus(task, currentHours),
    _current_hours: currentHours,
    _log: queryAll('SELECT * FROM maintenance_log WHERE task_id=? ORDER BY service_date DESC LIMIT 5', [task.id]),
  }))
}

// ── IPC Handlers ───────────────────────────────────────────────
function registerIpcHandlers() {

  ipcMain.handle('vessel:getProfile', () =>
    queryOne('SELECT * FROM vessel_profile WHERE id = 1'))

  ipcMain.handle('vessel:saveProfile', (_e, d) => {
    db.run(`UPDATE vessel_profile SET
      vessel_name=:vessel_name, manufacturer=:manufacturer, year_built=:year_built,
      hull_material=:hull_material, loa_ft=:loa_ft, doc_number=:doc_number, hin=:hin,
      operator_org=:operator_org, home_port=:home_port, engine_description=:engine_description,
      fuel_capacity_gal=:fuel_capacity_gal, coi_issue_date=:coi_issue_date,
      coi_expiry_date=:coi_expiry_date, inspection_subchapter=:inspection_subchapter,
      route=:route, souls_capacity=:souls_capacity, min_manning=:min_manning,
      ocmi_district=:ocmi_district, updated_at=datetime('now') WHERE id=1`, {
      ':vessel_name': d.vessel_name, ':manufacturer': d.manufacturer,
      ':year_built': d.year_built, ':hull_material': d.hull_material,
      ':loa_ft': d.loa_ft, ':doc_number': d.doc_number, ':hin': d.hin,
      ':operator_org': d.operator_org, ':home_port': d.home_port,
      ':engine_description': d.engine_description, ':fuel_capacity_gal': d.fuel_capacity_gal,
      ':coi_issue_date': d.coi_issue_date, ':coi_expiry_date': d.coi_expiry_date,
      ':inspection_subchapter': d.inspection_subchapter, ':route': d.route,
      ':souls_capacity': d.souls_capacity, ':min_manning': d.min_manning,
      ':ocmi_district': d.ocmi_district,
    })
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('equipment:getAll', () =>
    queryAll('SELECT * FROM equipment_inventory ORDER BY sort_order'))

  ipcMain.handle('equipment:saveItem', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE equipment_inventory SET item_name=:item_name, quantity=:quantity,
        specification=:specification, cfr_reference=:cfr_reference,
        compliance_module=:compliance_module, notes=:notes, updated_at=datetime('now')
        WHERE id=:id`, {
        ':id': d.id, ':item_name': d.item_name, ':quantity': d.quantity,
        ':specification': d.specification, ':cfr_reference': d.cfr_reference,
        ':compliance_module': d.compliance_module, ':notes': d.notes ?? null,
      })
    } else {
      db.run(`INSERT INTO equipment_inventory
        (item_name, quantity, specification, cfr_reference, compliance_module, notes, sort_order)
        VALUES (:item_name, :quantity, :specification, :cfr_reference, :compliance_module, :notes,
        (SELECT COALESCE(MAX(sort_order),0)+1 FROM equipment_inventory))`, {
        ':item_name': d.item_name, ':quantity': d.quantity ?? null,
        ':specification': d.specification ?? null, ':cfr_reference': d.cfr_reference ?? null,
        ':compliance_module': d.compliance_module ?? null, ':notes': d.notes ?? null,
      })
    }
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('equipment:deleteItem', (_e, id) => {
    db.run('DELETE FROM equipment_inventory WHERE id=?', [id])
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('crew:getAll', () =>
    queryAll(`SELECT * FROM crew_members WHERE status='Active' ORDER BY
      CASE role WHEN 'Captain' THEN 0 WHEN 'Mate' THEN 1 ELSE 2 END, full_name`))

  ipcMain.handle('crew:getAllIncludingInactive', () =>
    queryAll(`SELECT * FROM crew_members ORDER BY
      CASE role WHEN 'Captain' THEN 0 WHEN 'Mate' THEN 1 ELSE 2 END, full_name`))

  ipcMain.handle('crew:saveMember', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE crew_members SET
        full_name=:full_name, preferred_name=:preferred_name,
        role=:role, position_detail=:position_detail,
        emergency_contact_name=:emergency_contact_name,
        emergency_contact_phone=:emergency_contact_phone,
        status=:status, notes=:notes, updated_at=datetime('now')
        WHERE id=:id`, {
        ':id': d.id, ':full_name': d.full_name, ':preferred_name': d.preferred_name ?? null,
        ':role': d.role, ':position_detail': d.position_detail ?? null,
        ':emergency_contact_name': d.emergency_contact_name ?? null,
        ':emergency_contact_phone': d.emergency_contact_phone ?? null,
        ':status': d.status ?? 'Active', ':notes': d.notes ?? null,
      })
    } else {
      db.run(`INSERT INTO crew_members
        (full_name, preferred_name, role, position_detail,
         emergency_contact_name, emergency_contact_phone, status, notes)
        VALUES (:full_name, :preferred_name, :role, :position_detail,
         :emergency_contact_name, :emergency_contact_phone, :status, :notes)`, {
        ':full_name': d.full_name, ':preferred_name': d.preferred_name ?? null,
        ':role': d.role ?? 'Crew', ':position_detail': d.position_detail ?? null,
        ':emergency_contact_name': d.emergency_contact_name ?? null,
        ':emergency_contact_phone': d.emergency_contact_phone ?? null,
        ':status': d.status ?? 'Active', ':notes': d.notes ?? null,
      })
    }
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('trips:getAll', () =>
    queryAll(`SELECT t.*, c.full_name as captain_name FROM trips t
      LEFT JOIN crew_members c ON t.captain_id=c.id
      ORDER BY t.trip_date DESC, t.id DESC`))

  ipcMain.handle('trips:getOne', (_e, id) => {
    const trip = queryOne(`SELECT t.*, c.full_name as captain_name FROM trips t
      LEFT JOIN crew_members c ON t.captain_id=c.id WHERE t.id=?`, [id])
    if (!trip) return null
    trip.crew = queryAll(`SELECT cm.* FROM trip_crew tc
      JOIN crew_members cm ON tc.crew_id=cm.id WHERE tc.trip_id=?`, [id])
    trip.scientific_personnel = queryAll(
      'SELECT * FROM trip_scientific_personnel WHERE trip_id=?', [id])
    return trip
  })

  ipcMain.handle('trips:save', (_e, d) => {
    let tripId = d.id
    const p = buildTripParams(d)
    if (tripId) {
      db.run(`UPDATE trips SET trip_date=:trip_date, captain_id=:captain_id,
        departure_location=:departure_location, departure_time=:departure_time,
        arrival_location=:arrival_location, arrival_time=:arrival_time,
        overnight=:overnight, operating_area=:operating_area,
        engine_hours_start=:engine_hours_start, engine_hours_end=:engine_hours_end,
        fuel_start_port=:fuel_start_port, fuel_start_stbd=:fuel_start_stbd,
        fuel_added=:fuel_added, generator_hours=:generator_hours,
        dive_operations=:dive_operations, dive_details=:dive_details,
        scientific_ops=:scientific_ops, weather_conditions=:weather_conditions,
        beaufort_scale=:beaufort_scale, incidents=:incidents, notes=:notes,
        dock_fees=:dock_fees, status=:status, updated_at=datetime('now')
        WHERE id=:id`, p)
    } else {
      db.run(`INSERT INTO trips (trip_date, captain_id, departure_location, departure_time,
        arrival_location, arrival_time, overnight, operating_area,
        engine_hours_start, engine_hours_end, fuel_start_port, fuel_start_stbd,
        fuel_added, generator_hours, dive_operations, dive_details,
        scientific_ops, weather_conditions, beaufort_scale, incidents, notes, dock_fees, status)
        VALUES (:trip_date, :captain_id, :departure_location, :departure_time,
        :arrival_location, :arrival_time, :overnight, :operating_area,
        :engine_hours_start, :engine_hours_end, :fuel_start_port, :fuel_start_stbd,
        :fuel_added, :generator_hours, :dive_operations, :dive_details,
        :scientific_ops, :weather_conditions, :beaufort_scale, :incidents, :notes, :dock_fees, :status)`, p)
      tripId = queryOne('SELECT last_insert_rowid() as id').id
    }
    db.run('DELETE FROM trip_crew WHERE trip_id=?', [tripId])
    for (const crewId of (d.crew_ids || []))
      db.run('INSERT INTO trip_crew (trip_id, crew_id) VALUES (?,?)', [tripId, crewId])
    db.run('DELETE FROM trip_scientific_personnel WHERE trip_id=?', [tripId])
    for (const p of (d.scientific_personnel || []))
      if (p.full_name?.trim())
        db.run('INSERT INTO trip_scientific_personnel (trip_id, full_name, affiliation) VALUES (?,?,?)',
          [tripId, p.full_name.trim(), p.affiliation ?? null])
    saveDatabase(); return { success: true, id: tripId }
  })

  ipcMain.handle('trips:delete', (_e, id) => {
    db.run('DELETE FROM trip_crew WHERE trip_id=?', [id])
    db.run('DELETE FROM trip_scientific_personnel WHERE trip_id=?', [id])
    db.run('DELETE FROM trips WHERE id=?', [id])
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('credentials:getForCrew', (_e, crewId) =>
    queryAll('SELECT * FROM crew_credentials WHERE crew_id=? ORDER BY credential_type', [crewId]))

  ipcMain.handle('credentials:save', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE crew_credentials SET credential_type=:credential_type,
        identifier=:identifier, issuing_org=:issuing_org, issue_date=:issue_date,
        expiry_date=:expiry_date, notes=:notes, attachment_path=:attachment_path,
        updated_at=datetime('now') WHERE id=:id`, {
        ':id': d.id, ':credential_type': d.credential_type, ':identifier': d.identifier ?? null,
        ':issuing_org': d.issuing_org ?? null, ':issue_date': d.issue_date ?? null,
        ':expiry_date': d.expiry_date ?? null, ':notes': d.notes ?? null,
        ':attachment_path': d.attachment_path ?? null,
      })
    } else {
      db.run(`INSERT INTO crew_credentials
        (crew_id, credential_type, identifier, issuing_org, issue_date, expiry_date, notes, attachment_path)
        VALUES (:crew_id, :credential_type, :identifier, :issuing_org, :issue_date, :expiry_date, :notes, :attachment_path)`, {
        ':crew_id': d.crew_id, ':credential_type': d.credential_type,
        ':identifier': d.identifier ?? null, ':issuing_org': d.issuing_org ?? null,
        ':issue_date': d.issue_date ?? null, ':expiry_date': d.expiry_date ?? null,
        ':notes': d.notes ?? null, ':attachment_path': d.attachment_path ?? null,
      })
    }
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('credentials:delete', (_e, id) => {
    db.run('DELETE FROM crew_credentials WHERE id=?', [id])
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('trainingTypes:getAll', () =>
    queryAll('SELECT * FROM training_types ORDER BY sort_order'))

  ipcMain.handle('trainingTypes:save', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE training_types SET name=:name, description=:description,
        default_interval_months=:default_interval_months,
        required_for_subchapter_t=:required_for_subchapter_t WHERE id=:id`, {
        ':id': d.id, ':name': d.name, ':description': d.description ?? null,
        ':default_interval_months': d.default_interval_months ?? null,
        ':required_for_subchapter_t': d.required_for_subchapter_t ? 1 : 0,
      })
    } else {
      db.run(`INSERT INTO training_types
        (name, description, default_interval_months, required_for_subchapter_t, sort_order)
        VALUES (:name, :description, :default_interval_months, :required_for_subchapter_t,
        (SELECT COALESCE(MAX(sort_order),0)+1 FROM training_types))`, {
        ':name': d.name, ':description': d.description ?? null,
        ':default_interval_months': d.default_interval_months ?? null,
        ':required_for_subchapter_t': d.required_for_subchapter_t ? 1 : 0,
      })
    }
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('training:getForCrew', (_e, crewId) =>
    queryAll(`SELECT tr.*, tt.name as type_name, tt.default_interval_months
      FROM training_records tr
      LEFT JOIN training_types tt ON tr.training_type_id=tt.id
      WHERE tr.crew_id=? ORDER BY tr.completion_date DESC`, [crewId]))

  ipcMain.handle('training:getAll', () =>
    queryAll(`SELECT tr.*, tt.name as type_name, cm.full_name as crew_name,
      cm.preferred_name, cm.role FROM training_records tr
      LEFT JOIN training_types tt ON tr.training_type_id=tt.id
      LEFT JOIN crew_members cm ON tr.crew_id=cm.id
      ORDER BY tr.expiry_date ASC, tr.completion_date DESC`))

  ipcMain.handle('training:save', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE training_records SET crew_id=:crew_id,
        training_type_id=:training_type_id, custom_type_name=:custom_type_name,
        completion_date=:completion_date, expiry_date=:expiry_date,
        issuing_org=:issuing_org, cert_number=:cert_number,
        notes=:notes, attachment_path=:attachment_path, updated_at=datetime('now')
        WHERE id=:id`, {
        ':id': d.id, ':crew_id': d.crew_id,
        ':training_type_id': d.training_type_id ?? null,
        ':custom_type_name': d.custom_type_name ?? null,
        ':completion_date': d.completion_date, ':expiry_date': d.expiry_date ?? null,
        ':issuing_org': d.issuing_org ?? null, ':cert_number': d.cert_number ?? null,
        ':notes': d.notes ?? null, ':attachment_path': d.attachment_path ?? null,
      })
    } else {
      db.run(`INSERT INTO training_records
        (crew_id, training_type_id, custom_type_name, completion_date,
         expiry_date, issuing_org, cert_number, notes, attachment_path)
        VALUES (:crew_id, :training_type_id, :custom_type_name, :completion_date,
         :expiry_date, :issuing_org, :cert_number, :notes, :attachment_path)`, {
        ':crew_id': d.crew_id, ':training_type_id': d.training_type_id ?? null,
        ':custom_type_name': d.custom_type_name ?? null,
        ':completion_date': d.completion_date, ':expiry_date': d.expiry_date ?? null,
        ':issuing_org': d.issuing_org ?? null, ':cert_number': d.cert_number ?? null,
        ':notes': d.notes ?? null, ':attachment_path': d.attachment_path ?? null,
      })
    }
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('training:delete', (_e, id) => {
    db.run('DELETE FROM training_records WHERE id=?', [id])
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('seaDays:getForCrew', (_e, crewId) => {
    const rows = queryAll(`SELECT t.trip_date, t.operating_area,
      t.departure_location, t.arrival_location,
      t.engine_hours_start, t.engine_hours_end
      FROM trip_crew tc JOIN trips t ON tc.trip_id=t.id
      WHERE tc.crew_id=? AND t.status='closed'
      ORDER BY t.trip_date DESC`, [crewId])
    return { records: rows, total: rows.length }
  })

  ipcMain.handle('attachments:copyFile', async (_e, sourcePath) => {
    const attachDir = isDev
      ? path.join(__dirname, '../attachments')
      : path.join(app.getPath('userData'), 'attachments')
    if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true })
    const fileName = `${Date.now()}${path.extname(sourcePath)}`
    const destPath = path.join(attachDir, fileName)
    fs.copyFileSync(sourcePath, destPath)
    return destPath
  })

  ipcMain.handle('attachments:openFile', (_e, filePath) => {
    require('electron').shell.openPath(filePath)
  })

  // ── Checklists ──
  ipcMain.handle('checklists:getAll', () =>
    queryAll(`SELECT cl.*, t.trip_date,
      (SELECT COUNT(*) FROM checklist_items WHERE checklist_id=cl.id) as item_count,
      (SELECT COUNT(*) FROM checklist_items WHERE checklist_id=cl.id AND checked=1) as checked_count
      FROM checklists cl LEFT JOIN trips t ON cl.trip_id=t.id
      ORDER BY cl.date DESC, cl.id DESC`))

  ipcMain.handle('checklists:getOne', (_e, id) => {
    const cl = queryOne('SELECT * FROM checklists WHERE id=?', [id])
    if (!cl) return null
    cl.items = queryAll('SELECT * FROM checklist_items WHERE checklist_id=? ORDER BY sort_order', [id])
    return cl
  })

  ipcMain.handle('checklists:create', (_e, d) => {
    // Create checklist and seed items from template
    db.run(`INSERT INTO checklists (trip_id, type, date) VALUES (?,?,?)`,
      [d.trip_id ?? null, d.type, d.date])
    const row = queryOne('SELECT last_insert_rowid() as id')
    const checklistId = row.id
    const template = d.type === 'pre-departure' ? PRE_DEPARTURE_ITEMS : POST_RETURN_ITEMS
    let order = 0
    for (const group of template) {
      for (const item of group.items) {
        db.run(`INSERT INTO checklist_items
          (checklist_id, group_name, item_text, required, sort_order)
          VALUES (?,?,?,?,?)`,
          [checklistId, group.group, item.text, item.required ? 1 : 0, order++])
      }
    }
    saveDatabase()
    return { success: true, id: checklistId }
  })

  ipcMain.handle('checklists:checkItem', (_e, d) => {
    // d: { item_id, checked, na, checked_by }
    db.run(`UPDATE checklist_items SET
      checked=:checked, na=:na, checked_by=:checked_by,
      checked_at=CASE WHEN :checked=1 OR :na=1 THEN datetime('now') ELSE NULL END
      WHERE id=:id`, {
      ':id': d.item_id,
      ':checked': d.checked ? 1 : 0,
      ':na': d.na ? 1 : 0,
      ':checked_by': d.checked_by ?? null,
    })
    // Auto-complete checklist if all required items are done
    const pending = queryOne(`SELECT COUNT(*) as n FROM checklist_items
      WHERE checklist_id=(
        SELECT checklist_id FROM checklist_items WHERE id=?
      ) AND required=1 AND checked=0 AND na=0`, [d.item_id])
    if (pending && pending.n === 0) {
      db.run(`UPDATE checklists SET completed=1, completed_at=datetime('now'),
        completed_by=? WHERE id=(
          SELECT checklist_id FROM checklist_items WHERE id=?
        )`, [d.checked_by ?? null, d.item_id])
    } else {
      db.run(`UPDATE checklists SET completed=0 WHERE id=(
        SELECT checklist_id FROM checklist_items WHERE id=?
      )`, [d.item_id])
    }
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('checklists:delete', (_e, id) => {
    db.run('DELETE FROM checklist_items WHERE checklist_id=?', [id])
    db.run('DELETE FROM checklists WHERE id=?', [id])
    saveDatabase()
    return { success: true }
  })

  // ── Safety Log ──
  ipcMain.handle('safetyLog:getAll', () =>
    queryAll(`SELECT sl.*,
      (SELECT COUNT(*) FROM safety_log_items
        WHERE log_id=sl.id AND result IS NOT NULL) as completed_items,
      (SELECT COUNT(*) FROM safety_log_items WHERE log_id=sl.id) as total_items
      FROM safety_logs sl ORDER BY sl.log_month DESC`))

  ipcMain.handle('safetyLog:getOne', (_e, id) => {
    const log = queryOne('SELECT * FROM safety_logs WHERE id=?', [id])
    if (!log) return null
    log.items = queryAll(
      'SELECT * FROM safety_log_items WHERE log_id=? ORDER BY sort_order', [id])
    return log
  })

  ipcMain.handle('safetyLog:getLatest', () => {
    const log = queryOne(
      'SELECT * FROM safety_logs ORDER BY log_month DESC LIMIT 1')
    if (!log) return null
    log.items = queryAll(
      'SELECT * FROM safety_log_items WHERE log_id=? ORDER BY sort_order', [log.id])
    return log
  })

  ipcMain.handle('safetyLog:create', (_e, d) => {
    // d: { log_month, inspection_date, inspected_by, notes }
    db.run(`INSERT OR IGNORE INTO safety_logs
      (log_month, inspection_date, inspected_by, notes)
      VALUES (?,?,?,?)`,
      [d.log_month, d.inspection_date, d.inspected_by ?? null, d.notes ?? null])
    const log = queryOne('SELECT * FROM safety_logs WHERE log_month=?', [d.log_month])
    // Seed the 7 standard inspection items if not already present
    const existing = queryAll(
      'SELECT id FROM safety_log_items WHERE log_id=?', [log.id])
    if (existing.length === 0) {
      SAFETY_ITEMS.forEach((item, i) => {
        db.run(`INSERT INTO safety_log_items
          (log_id, item_key, item_label, sort_order)
          VALUES (?,?,?,?)`,
          [log.id, item.key, item.label, i])
      })
    }
    saveDatabase()
    return { success: true, id: log.id }
  })

  ipcMain.handle('safetyLog:saveItem', (_e, d) => {
    // d: { id, result, notes, initials }
    db.run(`UPDATE safety_log_items SET
      result=:result, notes=:notes, initials=:initials
      WHERE id=:id`, {
      ':id': d.id,
      ':result': d.result ?? null,
      ':notes': d.notes ?? null,
      ':initials': d.initials ?? null,
    })
    // Update the parent log's updated_at
    db.run(`UPDATE safety_logs SET updated_at=datetime('now')
      WHERE id=(SELECT log_id FROM safety_log_items WHERE id=?)`, [d.id])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('safetyLog:update', (_e, d) => {
    db.run(`UPDATE safety_logs SET
      inspection_date=:inspection_date,
      inspected_by=:inspected_by,
      notes=:notes,
      updated_at=datetime('now')
      WHERE id=:id`, {
      ':id': d.id,
      ':inspection_date': d.inspection_date,
      ':inspected_by': d.inspected_by ?? null,
      ':notes': d.notes ?? null,
    })
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('safetyLog:delete', (_e, id) => {
    db.run('DELETE FROM safety_log_items WHERE log_id=?', [id])
    db.run('DELETE FROM safety_logs WHERE id=?', [id])
    saveDatabase()
    return { success: true }
  })

  // ── COI Register ──
  ipcMain.handle('coiRegister:getAll', () => {
    const items = queryAll('SELECT * FROM coi_register_items ORDER BY sort_order')
    return items.map(item => ({
      ...item,
      _status: computeItemStatus(item),
      _next_due: computeNextDue(item),
    }))
  })

  ipcMain.handle('coiRegister:logAction', (_e, d) => {
    db.run(`UPDATE coi_register_items SET
      last_action_date=:last_action_date,
      next_due_date=:next_due_date,
      notes=:notes,
      updated_at=datetime('now')
      WHERE id=:id`, {
      ':id': d.id,
      ':last_action_date': d.last_action_date ?? null,
      ':next_due_date': d.next_due_date ?? null,
      ':notes': d.notes ?? null,
    })
    saveDatabase(); return { success: true }
  })

  // ── Drills ──
  const DRILL_COI_IDS = { 'Abandon Ship / MOB': 14, 'Firefighting': 15 }

  function syncDrillToCOI(drillType) {
    const coiId = DRILL_COI_IDS[drillType]
    if (!coiId) return
    const latest = queryOne('SELECT MAX(drill_date) as max_date FROM drills WHERE drill_type=?', [drillType])
    db.run(`UPDATE coi_register_items SET last_action_date=?, updated_at=datetime('now') WHERE id=?`,
      [latest?.max_date ?? null, coiId])
  }

  ipcMain.handle('drills:getAll', () =>
    queryAll('SELECT * FROM drills ORDER BY drill_date DESC, id DESC'))

  ipcMain.handle('drills:save', (_e, d) => {
    if (d.id) {
      db.run(`UPDATE drills SET drill_type=:drill_type, drill_date=:drill_date,
        conducted_by=:conducted_by, participants=:participants,
        duration_minutes=:duration_minutes, location=:location,
        observations=:observations, corrective_actions=:corrective_actions,
        notes=:notes, updated_at=datetime('now') WHERE id=:id`, {
        ':id': d.id, ':drill_type': d.drill_type, ':drill_date': d.drill_date,
        ':conducted_by': d.conducted_by ?? null, ':participants': d.participants ?? null,
        ':duration_minutes': d.duration_minutes ?? null, ':location': d.location ?? null,
        ':observations': d.observations ?? null, ':corrective_actions': d.corrective_actions ?? null,
        ':notes': d.notes ?? null,
      })
    } else {
      db.run(`INSERT INTO drills
        (drill_type, drill_date, conducted_by, participants,
         duration_minutes, location, observations, corrective_actions, notes)
        VALUES (:drill_type, :drill_date, :conducted_by, :participants,
         :duration_minutes, :location, :observations, :corrective_actions, :notes)`, {
        ':drill_type': d.drill_type, ':drill_date': d.drill_date,
        ':conducted_by': d.conducted_by ?? null, ':participants': d.participants ?? null,
        ':duration_minutes': d.duration_minutes ?? null, ':location': d.location ?? null,
        ':observations': d.observations ?? null, ':corrective_actions': d.corrective_actions ?? null,
        ':notes': d.notes ?? null,
      })
    }
    syncDrillToCOI(d.drill_type)
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('drills:delete', (_e, id) => {
    const drill = queryOne('SELECT drill_type FROM drills WHERE id=?', [id])
    db.run('DELETE FROM drills WHERE id=?', [id])
    if (drill) syncDrillToCOI(drill.drill_type)
    saveDatabase(); return { success: true }
  })

  // ── Dashboard Summary ──
  ipcMain.handle('dashboard:getSummary', () => {
    const coiItems = queryAll('SELECT * FROM coi_register_items ORDER BY sort_order')
      .map(item => ({ ...item, _status: computeItemStatus(item), _next_due: computeNextDue(item) }))
    const recentTrips = queryAll(`SELECT t.id, t.trip_date, t.status, t.operating_area,
      c.full_name as captain_name FROM trips t
      LEFT JOIN crew_members c ON t.captain_id=c.id ORDER BY t.trip_date DESC LIMIT 5`)
    const latestSafetyLog = queryOne('SELECT * FROM safety_logs ORDER BY log_month DESC LIMIT 1')
    const recentDrills = queryAll('SELECT * FROM drills ORDER BY drill_date DESC LIMIT 3')
    const vesselProfile = queryOne('SELECT * FROM vessel_profile WHERE id=1')
    const tripCount = queryOne('SELECT COUNT(*) as n FROM trips')?.n ?? 0
    const safetyLogCount = queryOne('SELECT COUNT(*) as n FROM safety_logs')?.n ?? 0
    const checklistCount = queryOne('SELECT COUNT(*) as n FROM checklists')?.n ?? 0
    const crewCount = queryOne("SELECT COUNT(*) as n FROM crew_members WHERE status='Active'")?.n ?? 0
    const maintTasks = getMaintenanceTasks()
    const maintenanceOverdue = maintTasks.filter(t => t._status === 'overdue').length
    const maintenanceWarning = maintTasks.filter(t => t._status === 'warning').length
    const maintenanceOk = maintTasks.filter(t => t._status === 'ok' || t._status === 'acknowledged').length
    return { coiItems, recentTrips, latestSafetyLog, recentDrills, vesselProfile,
             tripCount, safetyLogCount, checklistCount, crewCount,
             maintenanceOverdue, maintenanceWarning, maintenanceOk }
  })
  // ── Maintenance ──
  ipcMain.handle('maintenance:getAll', () => getMaintenanceTasks())

  ipcMain.handle('maintenance:logService', (_e, d) => {
    const task = queryOne('SELECT * FROM maintenance_tasks WHERE id=?', [d.task_id])
    if (!task) return { success: false }

    db.run(`INSERT INTO maintenance_log
      (task_id, service_date, engine_hours, performed_by, work_description, parts_used, cost, notes)
      VALUES (?,?,?,?,?,?,?,?)`, [
      d.task_id, d.service_date,
      d.engine_hours ?? null, d.performed_by ?? null,
      d.work_description ?? null, d.parts_used ?? null,
      d.cost ?? null, d.notes ?? null,
    ])

    let next_due_date = null
    if (task.interval_months && d.service_date) {
      const nd = new Date(d.service_date + 'T00:00:00')
      nd.setMonth(nd.getMonth() + task.interval_months)
      next_due_date = nd.toISOString().slice(0, 10)
    }
    let next_due_hours = null
    if (task.interval_hours && d.engine_hours != null) {
      next_due_hours = d.engine_hours + task.interval_hours
    }

    db.run(`UPDATE maintenance_tasks SET
      last_service_date=:last_service_date, last_service_hours=:last_service_hours,
      next_due_date=:next_due_date, next_due_hours=:next_due_hours,
      acknowledged=0, acknowledged_at=NULL, updated_at=datetime('now')
      WHERE id=:id`, {
      ':id': d.task_id,
      ':last_service_date': d.service_date,
      ':last_service_hours': d.engine_hours ?? null,
      ':next_due_date': next_due_date,
      ':next_due_hours': next_due_hours,
    })
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('maintenance:acknowledge', (_e, taskId) => {
    db.run(`UPDATE maintenance_tasks SET acknowledged=1, acknowledged_at=datetime('now'),
      updated_at=datetime('now') WHERE id=?`, [taskId])
    saveDatabase(); return { success: true }
  })

  ipcMain.handle('maintenance:deleteLog', (_e, logId) => {
    const entry = queryOne('SELECT task_id FROM maintenance_log WHERE id=?', [logId])
    db.run('DELETE FROM maintenance_log WHERE id=?', [logId])
    if (entry) {
      const latest = queryOne(
        'SELECT * FROM maintenance_log WHERE task_id=? ORDER BY service_date DESC LIMIT 1',
        [entry.task_id])
      const task = queryOne('SELECT * FROM maintenance_tasks WHERE id=?', [entry.task_id])
      if (latest && task) {
        let next_due_date = null
        if (task.interval_months) {
          const nd = new Date(latest.service_date + 'T00:00:00')
          nd.setMonth(nd.getMonth() + task.interval_months)
          next_due_date = nd.toISOString().slice(0, 10)
        }
        let next_due_hours = null
        if (task.interval_hours && latest.engine_hours != null) {
          next_due_hours = latest.engine_hours + task.interval_hours
        }
        db.run(`UPDATE maintenance_tasks SET
          last_service_date=?, last_service_hours=?,
          next_due_date=?, next_due_hours=?, updated_at=datetime('now') WHERE id=?`,
          [latest.service_date, latest.engine_hours ?? null, next_due_date, next_due_hours, entry.task_id])
      } else if (task) {
        db.run(`UPDATE maintenance_tasks SET
          last_service_date=NULL, last_service_hours=NULL,
          next_due_date=NULL, next_due_hours=NULL, updated_at=datetime('now') WHERE id=?`,
          [entry.task_id])
      }
    }
    saveDatabase(); return { success: true }
  })

  // ── Reports ──
  ipcMain.handle('reports:savePdf', async (_e, { filename, data }) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (!filePath) return { success: false, cancelled: true }
    fs.writeFileSync(filePath, Buffer.from(data))
    return { success: true, filePath }
  })

  ipcMain.handle('reports:saveJson', async (_e, { filename, data }) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })
    if (!filePath) return { success: false, cancelled: true }
    fs.writeFileSync(filePath, data, 'utf8')
    return { success: true, filePath }
  })

  ipcMain.handle('reports:getAllData', () => {
    const currentHours = queryOne('SELECT MAX(engine_hours_end) as hours FROM trips')?.hours ?? null
    const maintTasks = getMaintenanceTasks()
    const allTrips = queryAll(`SELECT t.*, c.full_name as captain_name FROM trips t
      LEFT JOIN crew_members c ON t.captain_id=c.id ORDER BY t.trip_date DESC`)
    return {
      vessel: queryOne('SELECT * FROM vessel_profile WHERE id=1'),
      crew: queryAll(`SELECT * FROM crew_members ORDER BY
        CASE role WHEN 'Captain' THEN 0 WHEN 'Mate' THEN 1 ELSE 2 END, full_name`),
      credentials: queryAll(`SELECT cc.*, cm.full_name as crew_name FROM crew_credentials cc
        JOIN crew_members cm ON cc.crew_id=cm.id ORDER BY cm.full_name, cc.credential_type`),
      training: queryAll(`SELECT tr.*, tt.name as type_name, cm.full_name as crew_name
        FROM training_records tr
        LEFT JOIN training_types tt ON tr.training_type_id=tt.id
        LEFT JOIN crew_members cm ON tr.crew_id=cm.id
        ORDER BY tr.completion_date DESC`),
      trips: allTrips,
      tripCrew: queryAll(`SELECT tc.trip_id, cm.full_name, cm.preferred_name, cm.role, cm.id as crew_id
        FROM trip_crew tc JOIN crew_members cm ON tc.crew_id=cm.id`),
      tripScientific: queryAll('SELECT * FROM trip_scientific_personnel ORDER BY trip_id'),
      safetyLogs: queryAll('SELECT * FROM safety_logs ORDER BY log_month DESC'),
      safetyLogItems: queryAll('SELECT * FROM safety_log_items ORDER BY log_id, sort_order'),
      coiItems: queryAll('SELECT * FROM coi_register_items ORDER BY sort_order').map(item => ({
        ...item,
        _status: computeItemStatus(item),
        _next_due: computeNextDue(item),
      })),
      drills: queryAll('SELECT * FROM drills ORDER BY drill_date DESC'),
      maintenance: maintTasks,
      maintenanceLogs: queryAll('SELECT * FROM maintenance_log ORDER BY task_id, service_date DESC'),
      currentEngineHours: currentHours,
      generatedAt: new Date().toISOString(),
    }
  })
}

// ── Safety inspection item templates ────────────────────────
const SAFETY_ITEMS = [
  { key: 'fire_extinguishers', label: 'Fire Extinguishers (3) — gauge charged, pin intact, no corrosion; invert 2–3 times' },
  { key: 'throw_ring',         label: 'Throw Ring — examine line for flaking; push and rub to test buoyancy' },
  { key: 'life_raft',          label: 'Life Raft (Revere HYF-K) — check expiry on canister, clips, bands, sea painter; inspect for damage' },
  { key: 'pfds',               label: 'Life Jackets / PFDs (16 adult + 8 child) — squeeze test, check straps and clips for wear' },
  { key: 'epirb',              label: 'EPIRB (ACR GlobalFix V5) — monthly self-test per manufacturer procedure' },
  { key: 'flares',             label: 'Flares — check expiration dates; inspect overall condition' },
  { key: 'freeing_ports',      label: 'Freeing Ports / Scuppers — clear of debris, drain freely (46 CFR 178.420)' },
]

// ── Checklist templates ───────────────────────────────────────
const PRE_DEPARTURE_ITEMS = [
  { group: 'Safety Equipment', items: [
    { text: 'Log Book aboard', required: true },
    { text: 'Charts / GPS operational', required: true },
    { text: "Captain's License aboard", required: true },
    { text: 'PFDs equal to number of passengers', required: true },
    { text: 'Life ring aboard', required: true },
    { text: 'EPIRB aboard and armed', required: true },
    { text: 'Fire extinguishers — 3 (charged)', required: true },
    { text: 'Flares aboard (check expiry)', required: true },
    { text: 'Horn (test)', required: true },
    { text: 'First Aid Kit aboard', required: true },
    { text: 'AED aboard', required: true },
    { text: 'Life raft aboard and secured', required: true },
    { text: 'Anchor, chain, and rode', required: true },
    { text: 'Boat hook, fenders, dock lines', required: true },
    { text: 'Dive flag aboard (if dive ops)', required: false },
    { text: 'Hard hats aboard', required: false },
    { text: 'Flashlights', required: true },
  ]},
  { group: 'Pre-Departure Procedures', items: [
    { text: 'Visual walk-around of vessel', required: true },
    { text: 'Check holds for fluids / flooding', required: true },
    { text: 'Operate bilge pumps manually', required: true },
    { text: 'Turn off battery charger', required: true },
    { text: 'Switch panel: Shore to Generator', required: true },
    { text: 'Remove shorepower', required: true },
    { text: 'Check engine oil level', required: true },
    { text: 'Check transmission fluid', required: true },
    { text: 'Check coolant level', required: true },
    { text: 'Check generator oil', required: true },
    { text: 'Check fuel filter', required: true },
    { text: 'Check fuel levels: Port and Starboard tanks', required: true },
    { text: 'Radio check (Ch 16)', required: true },
    { text: 'Start generator', required: true },
    { text: 'Start engine — check rudder response', required: true },
    { text: 'Test control levers — fwd / reverse', required: true },
    { text: 'Test bow thruster', required: true },
    { text: 'Verify nav lights operational', required: true },
    { text: 'Conduct safety talk with all aboard', required: true },
  ]},
]

const POST_RETURN_ITEMS = [
  { group: 'Post-Return Procedures', items: [
    { text: 'Shut off A/C', required: true },
    { text: 'Shut off generator', required: true },
    { text: 'Shut off engine', required: true },
    { text: 'Lockout enable switch', required: true },
    { text: 'All electrical switches to OFF', required: true },
    { text: 'Attach shorepower', required: true },
    { text: 'Switch panel to Shore', required: true },
    { text: 'Activate battery charger', required: true },
    { text: 'Record fuel levels: Port and Starboard', required: true },
    { text: 'Clean vessel', required: false },
    { text: 'Record any maintenance issues noted', required: false },
  ]},
]

function buildTripParams(d) {
  return {
    ':id': d.id ?? null, ':trip_date': d.trip_date, ':captain_id': d.captain_id ?? null,
    ':departure_location': d.departure_location ?? null, ':departure_time': d.departure_time ?? null,
    ':arrival_location': d.arrival_location ?? null, ':arrival_time': d.arrival_time ?? null,
    ':overnight': d.overnight ? 1 : 0, ':operating_area': d.operating_area ?? null,
    ':engine_hours_start': d.engine_hours_start ?? null, ':engine_hours_end': d.engine_hours_end ?? null,
    ':fuel_start_port': d.fuel_start_port ?? null, ':fuel_start_stbd': d.fuel_start_stbd ?? null,
    ':fuel_added': d.fuel_added ?? null, ':generator_hours': d.generator_hours ?? null,
    ':dive_operations': d.dive_operations ? 1 : 0, ':dive_details': d.dive_details ?? null,
    ':scientific_ops': d.scientific_ops ?? null, ':weather_conditions': d.weather_conditions ?? null,
    ':beaufort_scale': d.beaufort_scale ?? null, ':incidents': d.incidents ?? null,
    ':notes': d.notes ?? null, ':dock_fees': d.dock_fees ?? null,
    ':status': d.status ?? 'open',
  }
}

// ── Window ─────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    title: 'VesselLog',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
