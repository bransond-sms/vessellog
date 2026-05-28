import { useState, useEffect } from 'react'
import Shell from './components/Shell'
import Dashboard from './pages/Dashboard'
import VesselProfile from './pages/VesselProfile'
import TripLog from './pages/TripLog'
import Checklists from './pages/Checklists'
import SafetyLog from './pages/SafetyLog'
import Maintenance from './pages/Maintenance'
import ComplianceRegister from './pages/ComplianceRegister'
import CrewTraining from './pages/CrewTraining'
import Reports from './pages/Reports'

const PAGES = {
  dashboard: Dashboard,
  vessel: VesselProfile,
  trips: TripLog,
  checklists: Checklists,
  safety: SafetyLog,
  maintenance: Maintenance,
  compliance: ComplianceRegister,
  crew: CrewTraining,
  reports: Reports,
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [alertCounts, setAlertCounts] = useState({})
  const PageComponent = PAGES[currentPage] || Dashboard

  useEffect(() => { refreshAlerts() }, [currentPage])

  async function refreshAlerts() {
    try {
      const summary = await window.vesselAPI.dashboard.getSummary()
      const coiItems = summary.coiItems || []
      const overdue = coiItems.filter(i => i._status === 'overdue').length
      const warning = coiItems.filter(i => i._status === 'warning').length
      const safetyLog = summary.latestSafetyLog
      let safetyWarn = 0
      if (safetyLog) {
        const days = Math.floor(
          (new Date() - new Date(safetyLog.log_month + '-01')) / 86400000)
        if (days > 23 && days <= 37) safetyWarn = 1
        else if (days > 37) safetyWarn = 2
      } else {
        safetyWarn = 1
      }
      const maintOver = summary.maintenanceOverdue || 0
      const maintWarn = summary.maintenanceWarning || 0
      setAlertCounts({
        compliance: overdue > 0 || warning > 0
          ? { red: overdue || undefined, yellow: warning || undefined }
          : undefined,
        safety: safetyWarn > 0 ? { yellow: safetyWarn } : undefined,
        maintenance: maintOver > 0 || maintWarn > 0
          ? { red: maintOver || undefined, yellow: maintWarn || undefined }
          : undefined,
      })
    } catch (_) {}
  }

  return (
    <Shell currentPage={currentPage} onNavigate={setCurrentPage} alertCounts={alertCounts}>
      <PageComponent onNavigate={setCurrentPage} onRefreshAlerts={refreshAlerts} />
    </Shell>
  )
}
