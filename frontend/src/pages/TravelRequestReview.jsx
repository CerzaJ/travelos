import { useEffect, useMemo, useState } from 'react'
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

const formatShortDate = (isoDate) => {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TravelRequestReviewPage({ onNavigate, reviewData }) {
  const packages = reviewData?.packages || []
  const tripContext = reviewData?.tripContext || null
  const destinationLabel = reviewData?.requestSummary?.destination || 'travel destination'
  const packageImageUrls = useMemo(
    () =>
      packages.reduce((accumulator, pkg) => {
        accumulator[pkg.id] =
          pkg.imageUrl ||
          `https://source.unsplash.com/featured/640x360/?${encodeURIComponent(`${destinationLabel} ${pkg.title}`)}`
        return accumulator
      }, {}),
    [packages, destinationLabel],
  )
  const defaultPackageId = useMemo(() => {
    const recommended = packages.find((item) => item.recommended)
    return recommended?.id || packages[0]?.id || null
  }, [packages])
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackageId)
  const [detailPackageId, setDetailPackageId] = useState(null)
  const [imageLoadingMap, setImageLoadingMap] = useState({})

  useEffect(() => {
    setSelectedPackageId(defaultPackageId)
  }, [defaultPackageId])

  useEffect(() => {
    const nextLoadingState = packages.reduce((accumulator, pkg) => {
      accumulator[pkg.id] = true
      return accumulator
    }, {})
    setImageLoadingMap(nextLoadingState)
  }, [packages])

  const handleImageResolved = (packageId) => {
    setImageLoadingMap((previousState) => ({
      ...previousState,
      [packageId]: false,
    }))
  }

  const detailPackage = useMemo(
    () => packages.find((p) => p.id === detailPackageId) || null,
    [packages, detailPackageId],
  )

  const [approveNote, setApproveNote] = useState('')

  useEffect(() => {
    setApproveNote('')
  }, [detailPackageId])

  const flightHotelBreakdown = useMemo(() => {
    if (!detailPackage?.flight || !detailPackage?.hotel) return null
    const currency = detailPackage.currency || 'MXN'
    const nights = tripContext?.nights || 1
    const flightCost = typeof detailPackage.flight.price === 'number' ? detailPackage.flight.price : 0
    const nightly = typeof detailPackage.hotel.price_per_night === 'number' ? detailPackage.hotel.price_per_night : 0
    const hotelSubtotal = nightly * nights
    return {
      currency,
      nights,
      flightCost,
      hotelSubtotal,
      componentTotal: flightCost + hotelSubtotal,
      packageTotal: typeof detailPackage.totalPrice === 'number' ? detailPackage.totalPrice : flightCost + hotelSubtotal,
    }
  }, [detailPackage, tripContext])

  if (detailPackageId && !detailPackage) {
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="card package-detail-empty">
          <h2 className="card-title">Package not found</h2>
          <p className="card-subtitle">Return to the list and open a detail view again.</p>
          <div className="form-actions-row">
            <button type="button" className="primary-button" onClick={() => setDetailPackageId(null)}>
              Back to packages
            </button>
          </div>
        </section>
      </AppLayout>
    )
  }

  if (detailPackageId && detailPackage && !flightHotelBreakdown) {
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="card package-detail-empty">
          <h2 className="card-title">Flight or hotel unavailable</h2>
          <p className="card-subtitle">
            The agent payload must include paired flight and hotel records to compute this breakdown.
          </p>
          <div className="form-actions-row">
            <button type="button" className="secondary-button" onClick={() => setDetailPackageId(null)}>
              Back to packages
            </button>
            <button type="button" className="primary-button" onClick={() => onNavigate && onNavigate('new-request')}>
              New request
            </button>
          </div>
        </section>
      </AppLayout>
    )
  }

  if (!reviewData) {
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="card">
          <h2 className="card-title">No generated request to review</h2>
          <p className="card-subtitle">
            Generate travel packages first to view this review workspace.
          </p>
          <div className="form-actions-row">
            <button className="primary-button" onClick={() => onNavigate && onNavigate('new-request')}>
              Create New Request
            </button>
          </div>
        </section>
      </AppLayout>
    )
  }

  if (detailPackage && flightHotelBreakdown) {
    const heroImage =
      packageImageUrls[detailPackage.id] ||
      `https://source.unsplash.com/featured/1200x400/?${encodeURIComponent(destinationLabel)}`
    const flight = detailPackage.flight
    const hotel = detailPackage.hotel
    const originCode = tripContext?.origin?.slice(0, 3).toUpperCase() || 'ORG'
    const destCode =
      tripContext?.destination?.slice(0, 3).toUpperCase() ||
      destinationLabel.slice(0, 3).toUpperCase() ||
      'DST'

    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <div className="package-detail">
          <div className="package-detail-hero">
            <img
              src={heroImage}
              alt={`Destination ${destinationLabel}`}
              className="package-detail-hero-image"
              loading="lazy"
            />
            <div className="package-detail-hero-overlay">
              <p className="package-detail-hero-kicker">{detailPackage.title}</p>
              <h2 className="package-detail-hero-title">{reviewData.requestSummary.destination}</h2>
              <p className="package-detail-hero-meta">
                {reviewData.requestSummary.dateRange}
                {tripContext?.nights ? ` · ${tripContext.nights}-night stay` : null}
              </p>
            </div>
          </div>

          <div className="package-detail-toolbar">
            <button
              type="button"
              className="secondary-button package-detail-back"
              onClick={() => setDetailPackageId(null)}
            >
              Back to packages
            </button>
            <span className="package-detail-scope-label">Agent output: flights & accommodation only</span>
          </div>

          <div className="package-detail-grid">
            <div className="package-detail-main">
              <section className="card package-detail-card">
                <header className="package-detail-card-head">
                  <span className="package-detail-card-icon package-detail-card-icon--flight" aria-hidden />
                  <h3 className="package-detail-card-title">Flights</h3>
                </header>
                <div className="package-detail-flight-legs">
                  <article className="package-detail-leg">
                    <div className="package-detail-leg-top">
                      <span className="package-detail-leg-label">Outbound</span>
                      <time className="package-detail-leg-date">{formatShortDate(tripContext?.departureDate)}</time>
                    </div>
                    <p className="package-detail-leg-route">
                      {originCode} → {destCode}{' '}
                      <span className="package-detail-leg-muted">
                        Non-stop · {flight.duration_hours ?? '—'}h block
                      </span>
                    </p>
                    <p className="package-detail-leg-airline">{flight.airline || 'Carrier from agent payload'}</p>
                    <p className="package-detail-leg-times">
                      Departs <strong>{flight.departure_time || '—'}</strong> · Arrives{' '}
                      <strong>{flight.arrival_time || '—'}</strong>
                    </p>
                  </article>
                  <article className="package-detail-leg">
                    <div className="package-detail-leg-top">
                      <span className="package-detail-leg-label">Return</span>
                      <time className="package-detail-leg-date">{formatShortDate(tripContext?.returnDate)}</time>
                    </div>
                    <p className="package-detail-leg-route">
                      {destCode} → {originCode}{' '}
                      <span className="package-detail-leg-muted">Mirror itinerary from agent quote</span>
                    </p>
                    <p className="package-detail-leg-airline">{flight.airline || 'Same carrier pairing'}</p>
                    <p className="package-detail-leg-times">
                      Times modeled on outbound availability for this itinerary window.
                    </p>
                  </article>
                </div>
              </section>

              <section className="card package-detail-card">
                <header className="package-detail-card-head">
                  <span className="package-detail-card-icon package-detail-card-icon--hotel" aria-hidden />
                  <h3 className="package-detail-card-title">Hotel</h3>
                </header>
                <div className="package-detail-hotel">
                  <div
                    className="package-detail-hotel-thumb"
                    style={{
                      backgroundImage: `url(https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=560&q=80)`,
                    }}
                  />
                  <div className="package-detail-hotel-body">
                    <h4 className="package-detail-hotel-name">{hotel.name || 'Property from agent quote'}</h4>
                    <p className="package-detail-hotel-meta">
                      {hotel.stars ? `${hotel.stars}-star preferred property` : 'Lodging pairing'} ·{' '}
                      {hotel.location || reviewData.requestSummary.destination}
                    </p>
                    <p className="package-detail-hotel-stay">
                      {flightHotelBreakdown.nights} nights · Priced nightly from agent output
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="package-detail-aside card">
              <h3 className="package-detail-aside-title">Component breakdown</h3>
              <p className="package-detail-aside-intro">
                Subtotal reflecting only airfare and lodging from the orchestration response.
              </p>
              <ul className="package-detail-price-list">
                <li>
                  <span>Flights (quoted bucket)</span>
                  <strong>{formatMoney(flightHotelBreakdown.flightCost, flightHotelBreakdown.currency)}</strong>
                </li>
                <li>
                  <span>
                    Hotel ({flightHotelBreakdown.nights}{' '}
                    {flightHotelBreakdown.nights === 1 ? 'night' : 'nights'})
                  </span>
                  <strong>{formatMoney(flightHotelBreakdown.hotelSubtotal, flightHotelBreakdown.currency)}</strong>
                </li>
              </ul>
              <div className="package-detail-price-divider" />
              <div className="package-detail-price-row package-detail-price-row--subtotal">
                <span>Flight + hotel subtotal</span>
                <strong>{formatMoney(flightHotelBreakdown.componentTotal, flightHotelBreakdown.currency)}</strong>
              </div>
              <div className="package-detail-price-row package-detail-price-row--total">
                <span>Package total (shown on card)</span>
                <strong>{formatMoney(flightHotelBreakdown.packageTotal, flightHotelBreakdown.currency)}</strong>
              </div>
              <button
                type="button"
                className="primary-button package-detail-appraise-btn"
                onClick={() =>
                  setApproveNote(
                    'Approval recorded locally for this prototype. Backend handoff wires to orchestration in production.',
                  )
                }
              >
                Approve package
              </button>
              {approveNote ? <p className="package-detail-approve-note">{approveNote}</p> : null}
            </aside>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout pageTitle="TravelOS" activeItem="travel-requests" onNavigate={onNavigate}>
      <div className="review-layout">
        <section className="review-summary card">
          <h2 className="card-title">Travel Request Summary</h2>
          <div className="review-summary-list">
            <div className="review-summary-item">
              <span>Destination</span>
              <strong>{reviewData.requestSummary.destination}</strong>
            </div>
            <div className="review-summary-item">
              <span>Dates</span>
              <strong>{reviewData.requestSummary.dateRange}</strong>
            </div>
            <div className="review-summary-item">
              <span>Travelers</span>
              <strong>{reviewData.requestSummary.travelers}</strong>
            </div>
            <div className="review-summary-item">
              <span>Budget</span>
              <strong>{reviewData.requestSummary.budget}</strong>
            </div>
          </div>
          <div className="review-preferences">
            <span>Preferences</span>
            <p>{reviewData.requestSummary.preferences}</p>
          </div>
        </section>

        <section className="review-packages card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Generated Travel Packages</h2>
              <p className="card-subtitle">
                Agent-recommended itinerary for this request (review or open breakdown)
              </p>
            </div>
          </div>

          <div className={`package-grid ${packages.length === 1 ? 'package-grid--single' : ''}`}>
            {packages.map((pkg) => (
              <article
                key={pkg.id}
                role="button"
                tabIndex={0}
                className={`package-card ${selectedPackageId === pkg.id ? 'package-card--selected' : ''}`}
                onClick={() => setSelectedPackageId(pkg.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedPackageId(pkg.id)
                  }
                }}
              >
                <div className="package-image-shell">
                  {pkg.recommended ? <span className="package-badge">Recommended</span> : null}
                  {imageLoadingMap[pkg.id] ? <span className="package-image-skeleton" /> : null}
                  <img
                    className={`package-image ${imageLoadingMap[pkg.id] ? 'package-image--loading' : ''}`}
                    src={packageImageUrls[pkg.id]}
                    alt={`${pkg.title} for ${destinationLabel}`}
                    loading="lazy"
                    onLoad={() => handleImageResolved(pkg.id)}
                    onError={() => handleImageResolved(pkg.id)}
                  />
                </div>
                <h3 className="package-title">{pkg.title}</h3>
                <p className="package-price">{formatMoney(pkg.totalPrice, pkg.currency)}</p>
                <div className="package-meta">
                  <p>{pkg.hotel?.name || 'Hotel details pending'}</p>
                  <p>{pkg.flight?.airline || 'Flight details pending'}</p>
                </div>
                <div className="package-card-actions">
                  <button
                    type="button"
                    className="package-view-details-btn"
                    onClick={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      setSelectedPackageId(pkg.id)
                      setDetailPackageId(pkg.id)
                    }}
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="form-actions-row">
            <button className="secondary-button" onClick={() => onNavigate && onNavigate('new-request')}>
              Back
            </button>
            <button className="primary-button" onClick={() => onNavigate && onNavigate('travel-requests')}>
              Confirm Selected Package
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
