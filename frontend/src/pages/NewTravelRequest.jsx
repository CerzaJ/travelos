import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../components/Layout/AppLayout'
import AirportSearch from '../components/AirportSearch'

export default function NewTravelRequestPage({ onNavigate, onRequestSubmit }) {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationDisplay, setDestinationDisplay] = useState('')
  const [departureCity, setDepartureCity] = useState('')
  const [departureCityDisplay, setDepartureCityDisplay] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [preferences, setPreferences] = useState('')
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    const today = new Date().toISOString().split('T')[0]
    if (!startDate || !endDate) {
      setSubmitError('Por favor ingresa las fechas de viaje.')
      return
    }
    if (startDate < today) {
      setSubmitError('La fecha de salida debe ser a partir de hoy.')
      return
    }
    if (startDate >= endDate) {
      setSubmitError('La fecha de regreso debe ser posterior a la de salida.')
      return
    }
    if (departureCity && destination && departureCity.toUpperCase() === destination.toUpperCase()) {
      setSubmitError('El origen y el destino no pueden ser iguales.')
      return
    }

    const budgetValue = Number(maxBudget || minBudget)
    if (!budgetValue || budgetValue <= 0) {
      setSubmitError('Por favor ingresa un presupuesto válido.')
      return
    }

    const adultsNum = Number(adults) || 2
    const childrenNum = Number(children) || 0

    const { data: { session } } = await supabase.auth.getSession()

    const payload = {
      user_id: session?.user?.id || null,
      request_id: `req-${Date.now()}`,
      origin: departureCity,
      destination,
      origin_display: departureCityDisplay || departureCity,
      destination_display: destinationDisplay || destination,
      departure_date: startDate,
      return_date: endDate,
      travelers: { adults: adultsNum, children: childrenNum },
      budget_mxn: budgetValue,
      currency: 'USD',
      preferences: {
        hotel_stars: 4,
        hotel_type: 'standard',
        flight_class: 'economy',
        extras: preferences.split(',').map((s) => s.trim()).filter(Boolean),
      },
      notes: [clientName, clientEmail, preferences].filter(Boolean).join(' | ') || null,
    }

    const formContext = {
      startDate,
      endDate,
      destination: destinationDisplay || destination,
      departureCity: departureCityDisplay || departureCity,
      clientName,
      clientEmail,
      preferences,
      travelers: `${adultsNum}-${childrenNum}`,
      minBudget,
      maxBudget,
      currency: 'USD',
    }

    if (onRequestSubmit) onRequestSubmit(payload, formContext)
    if (onNavigate) onNavigate('request-processing')
  }

  return (
    <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
      <div className="page-header-row">
        <div>
          <h2 className="page-section-title">Create New Travel Request</h2>
          <p className="page-section-subtitle">
            Enter your client&apos;s details to generate personalized travel packages.
          </p>
        </div>
      </div>

      <form className="form-layout" onSubmit={handleSubmit}>
        {submitError ? (
          <section className="status-banner status-banner-error">
            <h3 className="status-banner-title">Request failed</h3>
            <p className="status-banner-message">{submitError}</p>
          </section>
        ) : null}

        <section className="form-card">
          <h3 className="form-card-title">Client Information</h3>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="client-name">Client name</label>
              <input id="client-name" type="text" className="form-input" placeholder="John Smith"
                value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="client-email">Email</label>
              <input id="client-email" type="email" className="form-input" placeholder="client@example.com"
                value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="form-card">
          <h3 className="form-card-title">Travel Details</h3>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="destination">Destination</label>
              <AirportSearch
                id="destination"
                placeholder="Cancún, París, Miami…"
                required
                onSelect={(iata, display) => {
                  setDestination(iata)
                  setDestinationDisplay(display)
                }}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="departure-city">Departure city</label>
              <AirportSearch
                id="departure-city"
                placeholder="Ciudad de México, Monterrey…"
                required
                onSelect={(iata, display) => {
                  setDepartureCity(iata)
                  setDepartureCityDisplay(display)
                }}
              />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="start-date">Start date</label>
              <input id="start-date" type="date" className="form-input"
                value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="end-date">End date</label>
              <input id="end-date" type="date" className="form-input"
                value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="adults">Adults</label>
              <select id="adults" className="form-input" value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="children">Children</label>
              <select id="children" className="form-input" value={children}
                onChange={(e) => setChildren(Number(e.target.value))}>
                {Array.from({ length: 7 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n === 0 ? 'No children' : `${n} ${n === 1 ? 'Child' : 'Children'}`}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-card">
          <h3 className="form-card-title">Budget <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>(USD)</span></h3>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="min-budget">Minimum budget</label>
              <input id="min-budget" type="number" className="form-input" placeholder="300"
                value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="max-budget">Maximum budget</label>
              <input id="max-budget" type="number" className="form-input" placeholder="600"
                value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} required />
            </div>
          </div>
        </section>

        <section className="form-card">
          <h3 className="form-card-title">Travel Preferences</h3>
          <div className="form-field">
            <label className="form-label" htmlFor="preferences">Special preferences</label>
            <textarea id="preferences" className="form-input form-textarea"
              placeholder="Include preferences like nearby attractions, accessibility needs, or any special requests."
              value={preferences} onChange={(e) => setPreferences(e.target.value)} />
          </div>
        </section>

        <div className="form-actions-row form-actions-sticky">
          <button type="button" className="secondary-button"
            onClick={() => onNavigate && onNavigate('dashboard')}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Generate Travel Packages
          </button>
        </div>
      </form>
    </AppLayout>
  )
}
