import { useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'

const formatMoney = (amount, currency = 'MXN') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '-'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function NewTravelRequestPage({ onNavigate }) {
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [responseData, setResponseData] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setResponseData(null)

    if (!startDate || !endDate || startDate > endDate) {
      setSubmitError('Please provide a valid travel date range.')
      return
    }

    const [adultsRaw, childrenRaw] = travelers.split('-')
    const adults = Number(adultsRaw || 2)
    const children = Number(childrenRaw || 0)
    const budgetValue = Number(maxBudget || minBudget)

    if (!budgetValue || budgetValue <= 0) {
      setSubmitError('Please provide a valid budget amount.')
      return
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const payload = {
      request_id: `req-${Date.now()}`,
      origin: departureCity,
      destination,
      departure_date: startDate,
      return_date: endDate,
      travelers: {
        adults,
        children,
      },
      budget_mxn: budgetValue,
      preferences: {
        hotel_stars: 4,
        hotel_type: 'standard',
        flight_class: 'economy',
        extras: preferences
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      },
      notes: [clientName, clientEmail, preferences].filter(Boolean).join(' | ') || null,
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/plan-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setResponseData(data)
    } catch (error) {
      setSubmitError(error.message || 'Unable to generate travel packages.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Travel Requests"
      activeItem="travel-requests"
      onNavigate={onNavigate}
    >
      <div className="page-header-row">
        <div>
          <h2 className="page-section-title">Create New Travel Request</h2>
          <p className="page-section-subtitle">
            Enter your client&apos;s details to generate personalized travel packages.
          </p>
        </div>
      </div>

      <form className="form-layout form-workspace-layout" onSubmit={handleSubmit}>
        <div className="workspace-column">
          {submitError ? (
            <section className="status-banner status-banner-error">
              <h3 className="status-banner-title">Request failed</h3>
              <p className="status-banner-message">{submitError}</p>
            </section>
          ) : null}

          {responseData ? (
            <section className="status-banner status-banner-success">
              <h3 className="status-banner-title">Proposal generated successfully</h3>
              <p className="status-banner-message">
                Review the generated options and fine-tune your request if needed.
              </p>
            </section>
          ) : null}

          <section className="form-card">
            <h3 className="form-card-title">Client Information</h3>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="client-name">
                  Client name
                </label>
                <input
                  id="client-name"
                  type="text"
                  className="form-input"
                  placeholder="John Smith"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="client-email">
                  Email
                </label>
                <input
                  id="client-email"
                  type="email"
                  className="form-input"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="form-card">
            <h3 className="form-card-title">Travel Details</h3>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="destination">
                  Destination
                </label>
                <input
                  id="destination"
                  type="text"
                  className="form-input"
                  placeholder="Paris, France"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="departure-city">
                  Departure city
                </label>
                <input
                  id="departure-city"
                  type="text"
                  className="form-input"
                  placeholder="New York, USA"
                  value={departureCity}
                  onChange={(event) => setDepartureCity(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid form-grid-3">
              <div className="form-field">
                <label className="form-label" htmlFor="start-date">
                  Start date
                </label>
                <input
                  id="start-date"
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="end-date">
                  End date
                </label>
                <input
                  id="end-date"
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="travelers">
                  Travelers
                </label>
                <select
                  id="travelers"
                  className="form-input"
                  value={travelers}
                  onChange={(event) => setTravelers(event.target.value)}
                >
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
                <label className="form-label" htmlFor="min-budget">
                  Minimum budget
                </label>
                <input
                  id="min-budget"
                  type="number"
                  className="form-input"
                  placeholder="$ 5,000"
                  value={minBudget}
                  onChange={(event) => setMinBudget(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="max-budget">
                  Maximum budget
                </label>
                <input
                  id="max-budget"
                  type="number"
                  className="form-input"
                  placeholder="$ 10,000"
                  value={maxBudget}
                  onChange={(event) => setMaxBudget(event.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-card">
            <h3 className="form-card-title">Travel Preferences</h3>
            <div className="form-field">
              <label className="form-label" htmlFor="preferences">
                Special preferences
              </label>
              <textarea
                id="preferences"
                className="form-input form-textarea"
                placeholder="Include preferences like nearby attractions, accessibility needs, or any special requests."
                value={preferences}
                onChange={(event) => setPreferences(event.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="workspace-column workspace-column-results">
          {responseData ? (
            <>
            <section className="form-card">
              <h3 className="form-card-title">Generated Travel Package</h3>
              <div className="result-summary-grid">
                <div className="result-summary-item">
                  <span className="result-summary-label">Destination</span>
                  <strong>{responseData.itinerary?.destination || destination || '-'}</strong>
                </div>
                <div className="result-summary-item">
                  <span className="result-summary-label">Duration</span>
                  <strong>{responseData.itinerary?.days ? `${responseData.itinerary.days} days` : '-'}</strong>
                </div>
                <div className="result-summary-item">
                  <span className="result-summary-label">Total Price</span>
                  <strong>
                    {formatMoney(
                      responseData.pricing?.grand_total,
                      responseData.pricing?.currency || 'MXN',
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="form-card">
              <h3 className="form-card-title">Flight Options</h3>
              {responseData.flights?.length ? (
                <div className="result-list">
                  {responseData.flights.map((flight, index) => (
                    <article className="result-list-item" key={`${flight.airline}-${index}`}>
                      <div className="result-list-head">
                        <strong>{flight.airline || 'Airline unavailable'}</strong>
                        <span>
                          {formatMoney(
                            flight.price,
                            responseData.pricing?.currency || 'MXN',
                          )}
                        </span>
                      </div>
                      <p className="result-list-meta">
                        {flight.departure_time || '-'} to {flight.arrival_time || '-'} |{' '}
                        {flight.duration_hours ? `${flight.duration_hours}h` : '-'}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="page-section-subtitle">No flight options returned.</p>
              )}
            </section>

            <section className="form-card">
              <h3 className="form-card-title">Hotel Options</h3>
              {responseData.hotels?.length ? (
                <div className="result-list">
                  {responseData.hotels.map((hotel, index) => (
                    <article className="result-list-item" key={`${hotel.name}-${index}`}>
                      <div className="result-list-head">
                        <strong>{hotel.name || 'Hotel unavailable'}</strong>
                        <span>
                          {formatMoney(
                            hotel.price_per_night,
                            responseData.pricing?.currency || 'MXN',
                          )}{' '}
                          / night
                        </span>
                      </div>
                      <p className="result-list-meta">
                        {hotel.stars ? `${hotel.stars} stars` : 'No stars'} |{' '}
                        {hotel.location || 'Location unavailable'}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="page-section-subtitle">No hotel options returned.</p>
              )}
            </section>

            <section className="form-card">
              <h3 className="form-card-title">Price Breakdown</h3>
              <div className="result-pricing-grid">
                <div className="result-pricing-row">
                  <span>Flights</span>
                  <strong>
                    {formatMoney(
                      responseData.pricing?.flights_total,
                      responseData.pricing?.currency || 'MXN',
                    )}
                  </strong>
                </div>
                <div className="result-pricing-row">
                  <span>Hotels</span>
                  <strong>
                    {formatMoney(
                      responseData.pricing?.hotel_total,
                      responseData.pricing?.currency || 'MXN',
                    )}
                  </strong>
                </div>
                <div className="result-pricing-row">
                  <span>Extras</span>
                  <strong>
                    {formatMoney(
                      responseData.pricing?.extras_total,
                      responseData.pricing?.currency || 'MXN',
                    )}
                  </strong>
                </div>
                <div className="result-pricing-row result-pricing-row-total">
                  <span>Total</span>
                  <strong>
                    {formatMoney(
                      responseData.pricing?.grand_total,
                      responseData.pricing?.currency || 'MXN',
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="form-card">
              <h3 className="form-card-title">Itinerary</h3>
              {responseData.itinerary?.plan?.length ? (
                <div className="result-list">
                  {responseData.itinerary.plan.map((dayPlan) => (
                    <article className="result-list-item" key={`day-${dayPlan.day}`}>
                      <div className="result-list-head">
                        <strong>Day {dayPlan.day}</strong>
                      </div>
                      <ul className="result-activities">
                        {(dayPlan.activities || []).map((activity, index) => (
                          <li key={`activity-${dayPlan.day}-${index}`}>{activity}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="page-section-subtitle">No itinerary details returned.</p>
              )}
            </section>
            </>
          ) : (
            <section className="form-card form-card-placeholder">
              <h3 className="form-card-title">Package preview</h3>
              <p className="page-section-subtitle">
                Fill in the request and click Generate Travel Packages to preview flights,
                hotels, pricing, and itinerary here.
              </p>
            </section>
          )}
        </div>

        <div className="form-actions-row form-actions-sticky">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="button-loading-content">
                <span className="button-spinner" />
                Generating...
              </span>
            ) : (
              'Generate Travel Packages'
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}

