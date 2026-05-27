import { useState } from 'react'
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
  const PageComponent = PAGES[currentPage] || Dashboard

  return (
    <Shell currentPage={currentPage} onNavigate={setCurrentPage}>
      <PageComponent onNavigate={setCurrentPage} />
    </Shell>
  )
}
