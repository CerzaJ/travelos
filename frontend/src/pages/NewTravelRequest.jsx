import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../components/Layout/AppLayout'

export default function NewTravelRequestPage({ onNavigate, onRequestSubmit }) {
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [destination, setDestination] = useState('')
  const [departureCity, setDepartureCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [travelers, setTravelers] = useState('2-0')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [preferences, setPreferences] = useState('')
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    if (!startDate || !endDate || startDate > endDate) {
      setSubmitError('Please provide a valid travel date range.')
      return
    }

    const budgetValue = Number(maxBudget || minBudget)
    if (!budgetValue || budgetValue <= 0) {
      setSubmitError('Please provide a valid budget amount.')
      return
    }

    const [adultsRaw, childrenRaw] = travelers.split('-')
    const adults = Number(adultsRaw || 2)
    const children = Number(childrenRaw || 0)

    const { data: { session } } = await supabase.auth.getSession()

    const payload = {
      user_id: session?.user?.id || null,
      request_id: `req-${Date.now()}`,
      origin: departureCity,
      destination,
      departure_date: startDate,
      return_date: endDate,
      travelers: { adults, children },
      budget_mxn: budgetValue,
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
      destination,
      departureCity,
      clientName,
      clientEmail,
      preferences,
      travelers,
      minBudget,
      maxBudget,
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
              <input id="destination" type="text" className="form-input" placeholder="Paris, France"
                value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="departure-city">Departure city</label>
              <input id="departure-city" type="text" className="form-input" placeholder="New York, USA"
                value={departureCity} onChange={(e) => setDepartureCity(e.target.value)} required />
            </div>
          </div>
          <div className="form-grid form-grid-3">
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
            <div className="form-field">
              <label className="form-label" htmlFor="travelers">Travelers</label>
              <select id="travelers" className="form-input" value={travelers}
                onChange={(e) => setTravelers(e.target.value)}>
                <option value="1-0">1 Adult</option>
                <option value="2-0">2 Adults</option>
                <option value="2-1">2 Adults, 1 Child</option>
                <option value="2-2">2 Adults, 2 Children</option>
                <option value="4-0">Group (4 Adults)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="form-card">
          <h3 className="form-card-title">Budget</h3>
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="min-budget">Minimum budget</label>
              <input id="min-budget" type="number" className="form-input" placeholder="$ 5,000"
                value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="max-budget">Maximum budget</label>
              <input id="max-budget" type="number" className="form-input" placeholder="$ 10,000"
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
