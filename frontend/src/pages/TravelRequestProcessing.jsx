import { useEffect, useRef, useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'

const AGENT_STEPS = [
  { id: 'parser',     name: 'Parser',     detail: 'Analyzing request and extracting travel parameters.' },
  { id: 'flights',    name: 'Flights',    detail: 'Searching available flights via SerpAPI.' },
  { id: 'hotels',     name: 'Hotels',     detail: 'Finding hotels at your destination.' },
  { id: 'summarizer', name: 'Summarizer', detail: 'Aggregating results and computing package tiers.' },
  { id: 'writer',     name: 'Writer',     detail: 'Polishing output with AI language model.' },
  { id: 'validator',  name: 'Validator',  detail: 'Validating final package structure.' },
]

// ── Helpers para construir reviewData ────────────────────────────────────────

const getDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  return Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
}

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '-'
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

const formatMoney = (amount, currency = 'MXN') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const buildPackageOptions = (data, startDate, endDate) => {
  const flights = [...(data.flights || [])].sort((a, b) => (a.price || 0) - (b.price || 0))
  const hotels  = [...(data.hotels  || [])].sort((a, b) => (a.price_per_night || 0) - (b.price_per_night || 0))
  const nights  = getDurationDays(startDate, endDate)
  const flight  = flights[Math.floor((flights.length - 1) / 2)] || null
  const hotel   = hotels[Math.floor((hotels.length  - 1) / 2)] || null
  const totalPrice = flight && hotel ? (flight.price || 0) + (hotel.price_per_night || 0) * nights : 0
  return [{
    id: 'recommended',
    title: 'Recommended Package',
    recommended: true,
    totalPrice,
    currency: data.pricing?.currency || 'MXN',
    flight,
    hotel,
    imageUrl: hotel?.image_url || null,
  }]
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function TravelRequestProcessingPage({ onNavigate, onReviewReady, pendingRequest }) {
  const [progress, setProgress]       = useState(5)
  const [elapsed, setElapsed]         = useState(0)
  const [error, setError]             = useState(null)
  const doneRef                       = useRef(false)

  const activeStepIndex = Math.min(
    AGENT_STEPS.length - 1,
    Math.floor((progress / 100) * AGENT_STEPS.length),
  )

  // Animación de progreso — se detiene en 90% hasta que el agente responde
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : Math.min(90, p + Math.random() * 7)))
    }, 900)
    return () => clearInterval(id)
  }, [])

  // Contador de tiempo transcurrido
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Llamada real al agente
  useEffect(() => {
    if (!pendingRequest || doneRef.current) return
    doneRef.current = true

    const { payload, formContext } = pendingRequest
    const {
      startDate, endDate, destination, departureCity,
      clientName, preferences, travelers, minBudget, maxBudget,
    } = formContext

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    fetch(`${apiBaseUrl}/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then((data) => {
        const [adultsRaw, childrenRaw] = (travelers || '2-0').split('-')
        const adults   = Number(adultsRaw  || 2)
        const children = Number(childrenRaw || 0)
        const currency = data.pricing?.currency || 'MXN'
        const nights   = getDurationDays(startDate, endDate)

        const reviewData = {
          requestSummary: {
            destination,
            dateRange:    formatDateRange(startDate, endDate),
            travelers:    `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
            budget:       `${formatMoney(Number(minBudget || maxBudget), currency)} – ${formatMoney(Number(maxBudget || minBudget), currency)}`,
            preferences:  preferences || 'No additional preferences.',
          },
          tripContext: {
            origin:        departureCity?.trim() || 'Origin pending',
            destination:   destination?.trim()   || '',
            departureDate: startDate,
            returnDate:    endDate,
            nights,
          },
          packages: buildPackageOptions(data, startDate, endDate),
        }

        if (onReviewReady) onReviewReady(reviewData)
        setProgress(100)
        setTimeout(() => onNavigate && onNavigate('request-review'), 500)
      })
      .catch((err) => setError(err.message || 'Could not generate travel packages.'))
  }, [pendingRequest])

  // ── Render de error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="processing-shell">
          <div className="processing-header">
            <h2 className="processing-title">Something went wrong</h2>
            <p className="processing-subtitle">{error}</p>
          </div>
          <div className="form-actions-row">
            <button className="secondary-button" onClick={() => onNavigate && onNavigate('new-request')}>
              Try again
            </button>
          </div>
        </section>
      </AppLayout>
    )
  }

  // ── Render normal ─────────────────────────────────────────────────────────
  return (
    <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
      <section className="processing-shell">
        <div className="processing-header">
          <span className="processing-spinner" />
          <h2 className="processing-title">AI Agents Processing Your Request</h2>
          <p className="processing-subtitle">
            Our AI agents are working together to create the best travel package.
          </p>
        </div>

        <article className="card processing-progress-card">
          <div className="processing-progress-head">
            <strong>Overall Progress</strong>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="processing-progress-track" aria-hidden="true">
            <span className="processing-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="processing-progress-label">
            Currently working: {AGENT_STEPS[activeStepIndex].name}
          </p>
          <p className="processing-progress-label">Elapsed: {elapsed}s</p>
        </article>

        <article className="card processing-timeline-card">
          <h3 className="card-title">Agent Timeline</h3>
          <div className="processing-timeline">
            {AGENT_STEPS.map((step, index) => {
              const state = index < activeStepIndex ? 'completed' : index === activeStepIndex ? 'active' : 'waiting'
              return (
                <div className="processing-step" key={step.id}>
                  <span className={`processing-step-dot processing-step-dot--${state}`} />
                  <div>
                    <p className="processing-step-name">{step.name}</p>
                    <p className="processing-step-detail">{step.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <div className="form-actions-row">
          <button className="secondary-button" onClick={() => onNavigate && onNavigate('new-request')}>
            Cancel
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
