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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const REVIEW_STORAGE_KEY = 'travelos-latest-review'

const readStoredReview = () => {
  try {
    const rawValue = window.localStorage.getItem(REVIEW_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

const getDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  return Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
}

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '-'
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

const formatMoney = (amount, currency = 'MXN') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

const buildReviewDataFromHistory = (data) => {
  const { request, flights, hotels, pricing } = data
  const { origin, destination, departure_date, return_date, adults, children, budget_max, notes } =
    request
  const currency = 'USD'
  const nights = getDurationDays(departure_date, return_date)

  const sortedFlights = [...(flights || [])].sort((a, b) => (a.price || 0) - (b.price || 0))
  const sortedHotels = [...(hotels || [])].sort(
    (a, b) => (a.price_per_night || 0) - (b.price_per_night || 0),
  )
  const flight = sortedFlights[Math.floor((sortedFlights.length - 1) / 2)] || null
  const hotel = sortedHotels[Math.floor((sortedHotels.length - 1) / 2)] || null

  // Precio total: si hay vuelo pero no hotel, usar solo el vuelo
  const flightPrice = flight?.price || 0
  const hotelPrice = hotel ? (hotel.price_per_night || 0) * nights : 0
  const totalPrice = flightPrice + hotelPrice

  const clientName = notes ? notes.split('|')[0]?.trim() : null

  return {
    requestSummary: {
      destination,
      dateRange: formatDateRange(departure_date, return_date),
      adults: adults || 1,
      children: children || 0,
      travelers: `${adults || 1}-${children || 0}`,
      budget: budget_max ? formatMoney(Number(budget_max), currency) : '-',
      preferences: clientName || 'No additional preferences.',
    },
    tripContext: {
      origin: origin || '',
      destination: destination || '',
      departureDate: departure_date,
      returnDate: return_date,
      nights,
    },
    packages: [
      {
        id: 'recommended',
        title: 'Recommended Package',
        recommended: true,
        totalPrice,
        currency,
        flight,
        hotel,
        imageUrl: hotel?.image_url || null,
      },
    ],
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
      window.history.replaceState({ page: initialPage }, '')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setSessionUser(null)
        setCurrentPage('login')
        window.history.replaceState({ page: 'login' }, '')
      }
    })

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

  const handleViewRequest = async (row) => {
    if (row?.status === 'Processing') {
      handleNavigate('request-processing')
      return
    }
    // Navegar primero para feedback inmediato
    handleNavigate('request-review')
    if (row?.id) {
      try {
        const res = await fetch(`${API_URL}/requests/${row.id}/packages`)
        if (res.ok) {
          const data = await res.json()
          handleReviewReady(buildReviewDataFromHistory(data))
        }
      } catch (e) {
        console.error('Error loading packages:', e)
      }
    }
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
    return <TravelRequestsPage onNavigate={handleNavigate} onViewRequest={handleViewRequest} />
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

  return (
    <DashboardPage
      onNavigate={handleNavigate}
      onViewRequest={handleViewRequest}
      sessionUser={sessionUser}
    />
  )
}

export default App
