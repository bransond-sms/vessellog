import { useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import './Reports.css'

// ── PDF helpers ───────────────────────────────────────────────

const NAVY  = [7, 20, 40]
const BRASS = [201, 146, 74]
const SLATE = [176, 196, 212]
const DIM   = [100, 120, 140]
const WHITE = [232, 238, 244]
const RED   = [231, 76, 60]
const AMBER = [243, 156, 18]
const GREEN = [46, 204, 113]

function statusColor(s) {
  if (s === 'overdue') return RED
  if (s === 'warning') return AMBER
  return GREEN
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtDateShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit',
  })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000)
}

function dueLabel(item) {
  if (item.frequency === 'OneTime') return item.last_action_date ? 'Done' : 'Pending'
  if (!item._next_due) return 'No date'
  const d = daysUntil(item._next_due)
  if (d == null) return '—'
  if (d < 0) return `${Math.abs(d)}d over`
  return `${d}d`
}

function docHeader(doc, vessel, title) {
  const pw = doc.internal.pageSize.getWidth()

  // Dark header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pw, 22, 'F')

  // Vessel name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BRASS)
  doc.text(vessel?.vessel_name || 'R/V SUNBURST', 14, 9)

  // HIN / Doc
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...DIM)
  const meta = [vessel?.hin, vessel?.doc_number ? `DOC ${vessel.doc_number}` : null, vessel?.inspection_subchapter].filter(Boolean).join('  ·  ')
  doc.text(meta, 14, 14)

  // Report title right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(title, pw - 14, 9, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...DIM)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pw - 14, 14, { align: 'right' })

  return 28
}

function docFooter(doc) {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.3)
    doc.line(14, ph - 10, pw - 14, ph - 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...DIM)
    doc.text('VesselLog · Smithsonian Marine Station · Fort Pierce, FL', 14, ph - 5)
    doc.text(`Page ${i} of ${pages}`, pw - 14, ph - 5, { align: 'right' })
  }
}

function sectionTitle(doc, y, text) {
  doc.setFillColor(...NAVY)
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...BRASS)
  doc.text(text.toUpperCase(), 16, y + 4)
  return y + 10
}

// ── Report generators ─────────────────────────────────────────

function genCOIDossier(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const { vessel, coiItems } = data
  const pw = doc.internal.pageSize.getWidth()

  let y = docHeader(doc, vessel, 'COI COMPLIANCE DOSSIER')

  // Vessel summary block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text('VESSEL INFORMATION', 14, y)
  y += 5

  const vFields = [
    ['Operator', vessel?.operator_org || '—'],
    ['Home Port', vessel?.home_port || '—'],
    ['Route', vessel?.route || '—'],
    ['Subchapter', vessel?.inspection_subchapter ? `${vessel.inspection_subchapter} (46 CFR 175–185)` : '—'],
    ['Souls', String(vessel?.souls_capacity || '—')],
    ['Manning', vessel?.min_manning || '—'],
    ['Engine', vessel?.engine_description || '—'],
    ['OCMI District', vessel?.ocmi_district || '—'],
    ['COI Issued', fmtDate(vessel?.coi_issue_date)],
    ['COI Expires', fmtDate(vessel?.coi_expiry_date)],
  ]

  const colW = (pw - 28) / 2
  vFields.forEach((f, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 14 + col * colW
    const fy = y + row * 5.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...DIM)
    doc.text(f[0].toUpperCase(), x, fy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...WHITE)
    doc.text(f[1], x + 22, fy)
  })

  y += Math.ceil(vFields.length / 2) * 5.5 + 8

  // Status summary
  const over = coiItems.filter(i => i._status === 'overdue').length
  const warn = coiItems.filter(i => i._status === 'warning').length
  const ok   = coiItems.filter(i => i._status === 'ok').length

  const summaryRows = [['Total Items', String(coiItems.length)], ['OK', String(ok)], ['Warning', String(warn)], ['Overdue', String(over)]]
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text('REGISTER SUMMARY', 14, y)
  y += 5

  const chipW = (pw - 28) / 4
  summaryRows.forEach(([label, val], i) => {
    const x = 14 + i * chipW
    doc.setFillColor(...NAVY)
    doc.rect(x, y, chipW - 2, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const color = label === 'Overdue' ? RED : label === 'Warning' ? AMBER : label === 'OK' ? GREEN : SLATE
    doc.setTextColor(...color)
    doc.text(val, x + (chipW - 2) / 2, y + 6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...DIM)
    doc.text(label.toUpperCase(), x + (chipW - 2) / 2, y + 9.5, { align: 'center' })
  })
  y += 16

  // Group items by category
  const CATS = ['Life Saving Equipment', 'Fire Fighting', 'Navigation & Comms', 'Documentation', 'Drills', 'Training', 'General Safety']

  for (const cat of CATS) {
    const items = coiItems.filter(i => i.category === cat)
    if (!items.length) continue

    y = sectionTitle(doc, y, cat)

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Status', 'Requirement', 'CFR Reference', 'Frequency', 'Last Action', 'Next Due']],
      body: items.map(item => [
        item._status.toUpperCase(),
        item.item_name,
        item.cfr_reference || '—',
        item.frequency,
        fmtDateShort(item.last_action_date),
        item._next_due ? fmtDateShort(item._next_due) : (item.frequency === 'OneTime' && item.last_action_date ? 'Done' : '—'),
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: WHITE,
        fillColor: [12, 31, 61],
        lineColor: [30, 50, 80],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [18, 40, 80],
        textColor: BRASS,
        fontSize: 6.5,
        fontStyle: 'bold',
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 28, fontStyle: 'normal', textColor: DIM },
        3: { cellWidth: 20, halign: 'center', textColor: DIM },
        4: { cellWidth: 22, halign: 'center', textColor: DIM },
        5: { cellWidth: 20, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [9, 25, 50] },
      didParseCell(d) {
        if (d.column.index === 0 && d.section === 'body') {
          const s = d.cell.raw.toLowerCase()
          d.cell.styles.textColor = s === 'overdue' ? RED : s === 'warning' ? AMBER : GREEN
          d.cell.styles.fontStyle = 'bold'
        }
        if (d.column.index === 5 && d.section === 'body') {
          const raw = items[d.row.index]
          if (raw?._status === 'overdue') d.cell.styles.textColor = RED
          else if (raw?._status === 'warning') d.cell.styles.textColor = AMBER
        }
      },
      didDrawPage() { y = doc.lastAutoTable.finalY + 6 },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  docFooter(doc)
  return doc.output('arraybuffer')
}

function genDrillLog(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const { vessel, drills, coiItems } = data

  let y = docHeader(doc, vessel, 'DRILL LOG')

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...DIM)
  doc.text('46 CFR 185.506 — Abandon ship and firefighting drills required at least quarterly.', 14, y)
  y += 8

  const DRILL_TYPES = ['Abandon Ship / MOB', 'Firefighting']
  const drillCOI = {
    'Abandon Ship / MOB': coiItems.find(i => i.item_name?.includes('Abandon Ship')),
    'Firefighting': coiItems.find(i => i.item_name?.includes('Firefighting Drill')),
  }

  for (const dtype of DRILL_TYPES) {
    const typeDrills = drills.filter(d => d.drill_type === dtype)
    const coiItem = drillCOI[dtype]

    y = sectionTitle(doc, y, `${dtype} Drill`)

    // Compliance status line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...statusColor(coiItem?._status || 'overdue'))
    const statusText = coiItem?._status === 'ok' ? 'COMPLIANT'
      : coiItem?._status === 'warning' ? 'DUE SOON — schedule drill'
      : 'OVERDUE — drill required immediately'
    doc.text(statusText, 14, y)
    if (coiItem?._next_due) {
      doc.setTextColor(...DIM)
      doc.text(`Next due: ${fmtDate(coiItem._next_due)}  ·  ${coiItem.cfr_reference}`, 14, y + 4.5)
      y += 5
    }
    y += 7

    if (typeDrills.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(...DIM)
      doc.text('No drills on record.', 14, y)
      y += 8
      continue
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Duration', 'Conducted By', 'Location', 'Participants', 'Observations']],
      body: typeDrills.map(d => [
        fmtDateShort(d.drill_date),
        d.duration_minutes ? `${d.duration_minutes} min` : '—',
        d.conducted_by || '—',
        d.location || '—',
        d.participants || '—',
        d.observations || (d.corrective_actions ? `CA: ${d.corrective_actions}` : '—'),
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: WHITE,
        fillColor: [12, 31, 61],
        lineColor: [30, 50, 80],
        lineWidth: 0.2,
      },
      headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 6.5, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [9, 25, 50] },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // Summary table
  y = sectionTitle(doc, y, 'Drill Summary by Quarter')
  const quarters = {}
  drills.forEach(d => {
    const dt = new Date(d.drill_date + 'T00:00:00')
    const q = `${dt.getFullYear()} Q${Math.ceil((dt.getMonth() + 1) / 3)}`
    if (!quarters[q]) quarters[q] = { 'Abandon Ship / MOB': 0, 'Firefighting': 0 }
    if (quarters[q][d.drill_type] !== undefined) quarters[q][d.drill_type]++
  })

  if (Object.keys(quarters).length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Quarter', 'Abandon Ship / MOB', 'Firefighting']],
      body: Object.entries(quarters).sort(([a], [b]) => b.localeCompare(a)).map(([q, v]) => [
        q,
        v['Abandon Ship / MOB'] > 0 ? `✓ ${v['Abandon Ship / MOB']}` : '✗ 0',
        v['Firefighting'] > 0 ? `✓ ${v['Firefighting']}` : '✗ 0',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: WHITE, fillColor: [12, 31, 61] },
      headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 6.5, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      didParseCell(d) {
        if (d.section === 'body' && d.column.index > 0) {
          d.cell.styles.textColor = d.cell.raw.startsWith('✓') ? GREEN : RED
        }
      },
      alternateRowStyles: { fillColor: [9, 25, 50] },
    })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...DIM)
    doc.text('No drill records on file.', 14, y)
  }

  docFooter(doc)
  return doc.output('arraybuffer')
}

function genSafetyLog(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const { vessel, safetyLogs, safetyLogItems } = data

  let y = docHeader(doc, vessel, 'MONTHLY SAFETY INSPECTION LOG')

  if (safetyLogs.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...DIM)
    doc.text('No safety log entries on record.', 14, y + 10)
    docFooter(doc)
    return doc.output('arraybuffer')
  }

  for (const log of safetyLogs) {
    const items = safetyLogItems.filter(i => i.log_id === log.id)
    const monthLabel = new Date(log.log_month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    y = sectionTitle(doc, y, monthLabel)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...DIM)
    doc.text(`Inspection date: ${fmtDate(log.inspection_date)}   Inspected by: ${log.inspected_by || '—'}`, 14, y)
    y += 6

    if (items.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Inspection Item', 'Result', 'Initials', 'Notes']],
        body: items.map(i => [i.item_label, i.result || '—', i.initials || '—', i.notes || '']),
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: WHITE,
          fillColor: [12, 31, 61],
          lineColor: [30, 50, 80],
          lineWidth: 0.2,
        },
        headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 6, fontStyle: 'bold' },
        columnStyles: {
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 16, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [9, 25, 50] },
        didParseCell(d) {
          if (d.column.index === 1 && d.section === 'body') {
            const v = d.cell.raw.toLowerCase()
            if (v === 'pass' || v === 'ok') d.cell.styles.textColor = GREEN
            else if (v === 'fail' || v === 'no') d.cell.styles.textColor = RED
            else if (v === 'attention') d.cell.styles.textColor = AMBER
          }
        },
      })
      y = doc.lastAutoTable.finalY + 6
    }

    if (log.notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(...DIM)
      doc.text(`Notes: ${log.notes}`, 14, y)
      y += 5
    }

    y += 4
    if (y > 240) { doc.addPage(); y = docHeader(doc, vessel, 'MONTHLY SAFETY INSPECTION LOG') }
  }

  docFooter(doc)
  return doc.output('arraybuffer')
}

function genTripSummary(data) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const { vessel, trips, tripCrew } = data

  let y = docHeader(doc, vessel, 'TRIP LOG SUMMARY')

  // Stats
  const totalTrips = trips.length
  const closedTrips = trips.filter(t => t.status === 'closed')
  const totalEngineHours = closedTrips.reduce((sum, t) => {
    if (t.engine_hours_start != null && t.engine_hours_end != null) {
      return sum + (t.engine_hours_end - t.engine_hours_start)
    }
    return sum
  }, 0)
  const maxHours = trips.reduce((max, t) => t.engine_hours_end != null && t.engine_hours_end > max ? t.engine_hours_end : max, 0)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...DIM)
  doc.text(`Total trips: ${totalTrips}   ·   Closed: ${closedTrips.length}   ·   Engine hours accumulated: ${totalEngineHours.toFixed(1)}h   ·   Highest meter reading: ${maxHours.toFixed(1)}h`, 14, y)
  y += 8

  if (trips.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...DIM)
    doc.text('No trips on record.', 14, y)
    docFooter(doc)
    return doc.output('arraybuffer')
  }

  // Build crew column per trip
  const crewByTrip = {}
  tripCrew.forEach(tc => {
    if (!crewByTrip[tc.trip_id]) crewByTrip[tc.trip_id] = []
    crewByTrip[tc.trip_id].push(tc.preferred_name || tc.full_name.split(' ')[0])
  })

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Status', 'Operating Area', 'Departure', 'Arrival', 'Crew', 'Eng Start', 'Eng End', 'Delta', 'Gen Hrs', 'Dive', 'Incidents']],
    body: trips.map(t => [
      t.trip_date,
      t.status,
      t.operating_area || '—',
      t.departure_location || '—',
      t.arrival_location || '—',
      (crewByTrip[t.id] || []).join(', ') || '—',
      t.engine_hours_start != null ? t.engine_hours_start.toFixed(1) : '—',
      t.engine_hours_end != null ? t.engine_hours_end.toFixed(1) : '—',
      t.engine_hours_start != null && t.engine_hours_end != null
        ? (t.engine_hours_end - t.engine_hours_start).toFixed(1) : '—',
      t.generator_hours != null ? t.generator_hours.toFixed(1) : '—',
      t.dive_operations ? 'Yes' : 'No',
      t.incidents || '—',
    ]),
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      textColor: WHITE,
      fillColor: [12, 31, 61],
      lineColor: [30, 50, 80],
      lineWidth: 0.2,
    },
    headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 6, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 13, halign: 'center' },
      10: { cellWidth: 10, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [9, 25, 50] },
    didParseCell(d) {
      if (d.column.index === 1 && d.section === 'body') {
        d.cell.styles.textColor = d.cell.raw === 'closed' ? GREEN : AMBER
      }
    },
  })

  docFooter(doc)
  return doc.output('arraybuffer')
}

function genSeaDays(data, crewId) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const { vessel, trips, tripCrew, crew } = data

  const member = crew.find(c => c.id === crewId)
  const name = member?.full_name || 'Unknown'

  let y = docHeader(doc, vessel, 'CREW SEA DAYS REPORT')

  const memberTrips = tripCrew
    .filter(tc => tc.crew_id === crewId)
    .map(tc => trips.find(t => t.id === tc.trip_id))
    .filter(Boolean)
    .filter(t => t.status === 'closed')
    .sort((a, b) => b.trip_date.localeCompare(a.trip_date))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BRASS)
  doc.text(name, 14, y)
  if (member?.role) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DIM)
    doc.text(member.role + (member.position_detail ? ` — ${member.position_detail}` : ''), 14, y + 5)
    y += 5
  }
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(`Total Sea Days: ${memberTrips.length}`, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DIM)
  doc.text('Closed trips only. Each trip date counts as one sea day.', 14, y + 4.5)
  y += 11

  if (memberTrips.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...DIM)
    doc.text('No closed trips on record for this crew member.', 14, y)
    docFooter(doc)
    return doc.output('arraybuffer')
  }

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Date', 'Operating Area', 'Departure', 'Return', 'Overnight', 'Beaufort']],
    body: memberTrips.map((t, i) => [
      String(memberTrips.length - i),
      t.trip_date,
      t.operating_area || '—',
      t.departure_location || '—',
      t.arrival_location || '—',
      t.overnight ? 'Yes' : 'No',
      t.beaufort_scale != null ? String(t.beaufort_scale) : '—',
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: WHITE,
      fillColor: [12, 31, 61],
      lineColor: [30, 50, 80],
      lineWidth: 0.2,
    },
    headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 6.5, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [9, 25, 50] },
  })

  // Year breakdown
  y = doc.lastAutoTable.finalY + 12
  const byYear = {}
  memberTrips.forEach(t => {
    const yr = t.trip_date.slice(0, 4)
    byYear[yr] = (byYear[yr] || 0) + 1
  })

  y = sectionTitle(doc, y, 'Sea Days by Year')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Year', 'Sea Days']],
    body: Object.entries(byYear).sort(([a], [b]) => b.localeCompare(a)).map(([yr, n]) => [yr, String(n)]),
    styles: { fontSize: 8, cellPadding: 3, textColor: WHITE, fillColor: [12, 31, 61] },
    headStyles: { fillColor: [18, 40, 80], textColor: BRASS, fontSize: 7, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center', textColor: GREEN, fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [9, 25, 50] },
    tableWidth: 60,
  })

  docFooter(doc)
  return doc.output('arraybuffer')
}

// ── Report card component ─────────────────────────────────────
function ReportCard({ icon, title, description, children, onGenerate, generating }) {
  return (
    <div className="report-card">
      <div className="report-card-header">
        <span className="report-card-icon">{icon}</span>
        <div>
          <div className="report-card-title font-display">{title}</div>
          <div className="report-card-desc">{description}</div>
        </div>
      </div>
      {children && <div className="report-card-options">{children}</div>}
      <div className="report-card-footer">
        <button className="btn btn-primary" onClick={onGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate PDF'}
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Reports() {
  const [generating, setGenerating] = useState(null)
  const [seaDaysCrew, setSeaDaysCrew] = useState(null)
  const [crew, setCrew] = useState([])
  const [crewLoaded, setCrewLoaded] = useState(false)
  const [status, setStatus] = useState(null)

  async function ensureCrew() {
    if (!crewLoaded) {
      const all = await window.vesselAPI.crew.getAllIncludingInactive()
      setCrew(all)
      setCrewLoaded(true)
      if (all.length > 0 && !seaDaysCrew) setSeaDaysCrew(all[0].id)
      return all
    }
    return crew
  }

  async function handleGenerate(reportType) {
    setGenerating(reportType)
    setStatus(null)
    try {
      const data = await window.vesselAPI.reports.getAllData()

      let buffer, filename
      if (reportType === 'coi') {
        buffer = genCOIDossier(data)
        filename = `COI-Compliance-Dossier-${new Date().toISOString().slice(0, 10)}.pdf`
      } else if (reportType === 'drills') {
        buffer = genDrillLog(data)
        filename = `Drill-Log-${new Date().toISOString().slice(0, 10)}.pdf`
      } else if (reportType === 'safety') {
        buffer = genSafetyLog(data)
        filename = `Monthly-Safety-Log-${new Date().toISOString().slice(0, 10)}.pdf`
      } else if (reportType === 'trips') {
        buffer = genTripSummary(data)
        filename = `Trip-Log-Summary-${new Date().toISOString().slice(0, 10)}.pdf`
      } else if (reportType === 'seadays') {
        buffer = genSeaDays(data, seaDaysCrew)
        const member = data.crew.find(c => c.id === seaDaysCrew)
        const namePart = member?.full_name?.replace(/\s+/g, '-') || 'crew'
        filename = `Sea-Days-${namePart}-${new Date().toISOString().slice(0, 10)}.pdf`
      }

      const result = await window.vesselAPI.reports.savePdf({ filename, data: buffer })
      if (result.success) {
        setStatus({ type: 'ok', msg: `Saved: ${result.filePath}` })
      } else if (!result.cancelled) {
        setStatus({ type: 'err', msg: 'Failed to save PDF.' })
      }
    } catch (e) {
      setStatus({ type: 'err', msg: `Error: ${e.message}` })
    } finally {
      setGenerating(null)
    }
  }

  async function handleJsonExport() {
    setGenerating('json')
    setStatus(null)
    try {
      const data = await window.vesselAPI.reports.getAllData()
      const json = JSON.stringify(data, null, 2)
      const filename = `VesselLog-Export-${new Date().toISOString().slice(0, 10)}.json`
      const result = await window.vesselAPI.reports.saveJson({ filename, data: json })
      if (result.success) {
        setStatus({ type: 'ok', msg: `Saved: ${result.filePath}` })
      } else if (!result.cancelled) {
        setStatus({ type: 'err', msg: 'Failed to save export.' })
      }
    } catch (e) {
      setStatus({ type: 'err', msg: `Error: ${e.message}` })
    } finally {
      setGenerating(null)
    }
  }

  const g = generating

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">REPORTS & EXPORT</h1>
          <p className="page-subtitle">
            Generate PDF compliance reports and data exports for R/V Sunburst
          </p>
        </div>
      </div>

      {status && (
        <div className={`reports-status ${status.type}`}>
          {status.type === 'ok' ? '✓ ' : '✕ '}{status.msg}
          <button className="reports-status-close" onClick={() => setStatus(null)}>✕</button>
        </div>
      )}

      <div className="reports-grid">
        <ReportCard
          icon="⊞"
          title="COI Compliance Dossier"
          description="Full USCG compliance register with status, CFR references, and vessel info. Use for OCMI inspections."
          onGenerate={() => handleGenerate('coi')}
          generating={g === 'coi'}>
        </ReportCard>

        <ReportCard
          icon="◉"
          title="Drill Log"
          description="Complete drill history by type with quarterly compliance summary. 46 CFR 185.506."
          onGenerate={() => handleGenerate('drills')}
          generating={g === 'drills'}>
        </ReportCard>

        <ReportCard
          icon="◎"
          title="Monthly Safety Log"
          description="All monthly safety inspection records with results, initials, and inspection dates."
          onGenerate={() => handleGenerate('safety')}
          generating={g === 'safety'}>
        </ReportCard>

        <ReportCard
          icon="◫"
          title="Trip Log Summary"
          description="Complete trip history with crew, engine hours, operating area, and incident log."
          onGenerate={() => handleGenerate('trips')}
          generating={g === 'trips'}>
        </ReportCard>

        <ReportCard
          icon="◈"
          title="Crew Sea Days Report"
          description="Individual crew member sea days for license applications and record-keeping."
          onGenerate={() => handleGenerate('seadays')}
          generating={g === 'seadays'}>
          <div className="field">
            <label className="field-label">Crew Member</label>
            <select className="field-input"
              value={seaDaysCrew || ''}
              onChange={e => setSeaDaysCrew(Number(e.target.value))}
              onFocus={ensureCrew}>
              {!crewLoaded && <option value="">Loading…</option>}
              {crew.map(c => (
                <option key={c.id} value={c.id}>
                  {c.preferred_name || c.full_name} — {c.role}
                </option>
              ))}
            </select>
          </div>
        </ReportCard>

        <div className="report-card report-card-json">
          <div className="report-card-header">
            <span className="report-card-icon">⊟</span>
            <div>
              <div className="report-card-title font-display">Full Data Export</div>
              <div className="report-card-desc">
                Complete database export as JSON — all trips, crew, logs, compliance, and maintenance records.
              </div>
            </div>
          </div>
          <div className="report-card-footer">
            <button className="btn btn-ghost" onClick={handleJsonExport} disabled={g === 'json'}>
              {g === 'json' ? 'Exporting…' : 'Export JSON'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
