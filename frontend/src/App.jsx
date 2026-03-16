import { useState } from 'react'
import './App.css'
import DashboardPage from './pages/Dashboard'
import NewTravelRequestPage from './pages/NewTravelRequest'
import TravelRequestsPage from './pages/TravelRequests'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const handleNavigate = (target) => {
    setCurrentPage(target)
  }

  if (currentPage === 'travel-requests') {
    return <TravelRequestsPage onNavigate={handleNavigate} />
  }

  if (currentPage === 'new-request') {
    return <NewTravelRequestPage onNavigate={handleNavigate} />
  }

  return <DashboardPage onNavigate={handleNavigate} />
}

export default App
