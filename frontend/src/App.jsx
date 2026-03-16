import { useState } from 'react'
import './App.css'
import DashboardPage from './pages/Dashboard'
import NewTravelRequestPage from './pages/NewTravelRequest'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const handleNavigate = (target) => {
    setCurrentPage(target)
  }

  if (currentPage === 'new-request') {
    return <NewTravelRequestPage onNavigate={handleNavigate} />
  }

  return <DashboardPage onNavigate={handleNavigate} />
}

export default App
