import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
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
  const [pendingRequest, setPendingRequest] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const initialPage = session ? 'dashboard' : 'login'
      if (session) {
        setSessionUser({ email: session.user.email, name: session.user.user_metadata?.full_name })
        setCurrentPage('dashboard')
      }
      // Registrar la página inicial para que el browser back funcione
      window.history.replaceState({ page: initialPage }, '')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // Solo actuar en logout real — nunca en TOKEN_REFRESHED ni tab switch
        setSessionUser(null)
        setCurrentPage('login')
        window.history.replaceState({ page: 'login' }, '')
      }
    })

    // Botón de regresar del browser — solo cuando el usuario lo presiona manualmente
    const onPopState = (e) => {
      const page = e.state?.page
      if (page) setCurrentPage(page)
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  const handleReviewReady = (reviewData) => {
    setLatestReviewData(reviewData)
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewData))
  }

  const handleNavigate = (target) => {
    if (target === 'providers' || target === 'analytics') return
    window.history.pushState({ page: target }, '')
    setCurrentPage(target)
  }

  const handleLogin = (userData) => {
    setSessionUser(userData)
    window.history.pushState({ page: 'dashboard' }, '')
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
        onRequestSubmit={(payload, formContext) => setPendingRequest({ payload, formContext })}
      />
    )
  }

  if (currentPage === 'request-review') {
    return <TravelRequestReviewPage onNavigate={handleNavigate} reviewData={latestReviewData} />
  }

  if (currentPage === 'request-processing') {
    return (
      <TravelRequestProcessingPage
        onNavigate={handleNavigate}
        onReviewReady={handleReviewReady}
        pendingRequest={pendingRequest}
      />
    )
  }

  if (currentPage === 'settings') {
    return <SettingsComingSoonPage onNavigate={handleNavigate} />
  }

  return <DashboardPage onNavigate={handleNavigate} sessionUser={sessionUser} />
}

export default App
