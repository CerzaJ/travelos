import { useState } from 'react'
import './App.css'
import DashboardPage from './pages/Dashboard'
import LoginPage from './pages/Login'
import NewTravelRequestPage from './pages/NewTravelRequest'
import SettingsComingSoonPage from './pages/SettingsComingSoon'
import TravelRequestsPage from './pages/TravelRequests'
import TravelRequestProcessingPage from './pages/TravelRequestProcessing'
import TravelRequestReviewPage from './pages/TravelRequestReview'

const REVIEW_STORAGE_KEY = 'travelos-latest-review'

const readStoredReview = () => {
  try {
    const rawValue = window.localStorage.getItem(REVIEW_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const [latestReviewData, setLatestReviewData] = useState(() => readStoredReview())
  const [sessionUser, setSessionUser] = useState(null)

  const handleReviewReady = (reviewData) => {
    setLatestReviewData(reviewData)
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewData))
  }

  const handleNavigate = (target) => {
    if (target === 'providers' || target === 'analytics') {
      return
    }

    setCurrentPage(target)
  }

  const handleLogin = (userData) => {
    setSessionUser(userData)
    setCurrentPage('dashboard')
  }

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} />
  }

  if (currentPage === 'travel-requests') {
    return <TravelRequestsPage onNavigate={handleNavigate} />
  }

  if (currentPage === 'new-request') {
    return (
      <NewTravelRequestPage
        onNavigate={handleNavigate}
        onReviewReady={handleReviewReady}
      />
    )
  }

  if (currentPage === 'request-review') {
    return <TravelRequestReviewPage onNavigate={handleNavigate} reviewData={latestReviewData} />
  }

  if (currentPage === 'request-processing') {
    return <TravelRequestProcessingPage onNavigate={handleNavigate} />
  }

  if (currentPage === 'settings') {
    return <SettingsComingSoonPage onNavigate={handleNavigate} />
  }

  return <DashboardPage onNavigate={handleNavigate} sessionUser={sessionUser} />
}

export default App
