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

const formatDestinationLabel = (raw) => {
  if (!raw) return 'travel destination'
  // "Ibiza (IBZ)" → "Ibiza", "IBZ" → "IBZ"
  const m = raw.match(/^(.+?)\s*\([A-Z]{3}\)$/)
  return m ? m[1].trim() : raw
}

export default function TravelRequestReviewPage({ onNavigate, reviewData }) {
  const packages = reviewData?.packages || []
  const tripContext = reviewData?.tripContext || null
  const destinationLabel = formatDestinationLabel(reviewData?.requestSummary?.destination)
  const packageImageUrls = useMemo(
    () =>
      packages.reduce((accumulator, pkg) => {
        accumulator[pkg.id] = pkg.imageUrl ||
          `https://picsum.photos/seed/${encodeURIComponent(destinationLabel)}/640/360`
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
  const [imageLoadingMap, setImageLoadingMap] = useState(() =>
    packages.reduce((acc, pkg) => ({ ...acc, [pkg.id]: true }), {}),
  )

  useEffect(() => {
    setSelectedPackageId(defaultPackageId)
  }, [defaultPackageId])

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
    const adults = reviewData?.requestSummary?.adults ?? 1
    const children = reviewData?.requestSummary?.children ?? 0
    const totalPassengers = adults + children
    const flightCost = typeof detailPackage.flight.price === 'number' ? detailPackage.flight.price : 0
    const flightPerPerson = totalPassengers > 0 ? Math.round(flightCost / totalPassengers) : flightCost
    const nightly = typeof detailPackage.hotel.price_per_night === 'number' ? detailPackage.hotel.price_per_night : 0
    const hotelSubtotal = nightly * nights
    return {
      currency,
      nights,
      adults,
      children,
      totalPassengers,
      flightCost,
      flightPerPerson,
      nightly,
      hotelSubtotal,
      componentTotal: flightCost + hotelSubtotal,
      packageTotal: typeof detailPackage.totalPrice === 'number' ? detailPackage.totalPrice : flightCost + hotelSubtotal,
    }
  }, [detailPackage, tripContext, reviewData])

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
    const missingFlights = !detailPackage.flight
    const missingHotels  = !detailPackage.hotel
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="card package-detail-empty">
          <h2 className="card-title">Resultados incompletos</h2>
          <p className="card-subtitle">
            {missingFlights && missingHotels
              ? 'El agente no encontró vuelos ni hoteles para esta ruta.'
              : missingFlights
              ? 'Se encontraron hoteles pero no vuelos para esta ruta.'
              : 'Se encontraron vuelos pero no hoteles para esta ruta.'}
          </p>
          <ul style={{ margin: '12px 0 0', paddingLeft: '1.2em', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
            <li>Intenta con otra moneda — USD suele tener mejor cobertura internacional</li>
            <li>Verifica que el nombre de la ciudad de origen y destino sea correcto</li>
            <li>Prueba con fechas diferentes o un rango más amplio</li>
          </ul>
          <div className="form-actions-row" style={{ marginTop: 20 }}>
            <button type="button" className="secondary-button" onClick={() => setDetailPackageId(null)}>
              Volver
            </button>
            <button type="button" className="primary-button" onClick={() => onNavigate && onNavigate('new-request')}>
              Nueva búsqueda
            </button>
          </div>
        </section>
      </AppLayout>
    )
  }

  if (!reviewData) {
    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <section className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <span className="processing-spinner" style={{ display: 'inline-block', marginBottom: 16 }} />
          <h2 className="card-title">Cargando paquete…</h2>
          <p className="card-subtitle">
            Recuperando vuelos y hoteles guardados.
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
    const flight = detailPackage.flight
    const hotel = detailPackage.hotel
    // picsum.photos es un CDN de imágenes placeholder sin restricciones de CORS
    const heroFallback = `https://picsum.photos/seed/${encodeURIComponent(destinationLabel)}/1200/400`
    const heroImage = (hotel?.image_url && hotel.image_url.startsWith('http'))
      ? hotel.image_url
      : heroFallback
    const extractIATA = (display) => {
      if (!display) return null
      const m = display.match(/\(([A-Z]{3})\)/)
      return m ? m[1] : display.slice(0, 3).toUpperCase()
    }
    const originCode = extractIATA(tripContext?.origin) || 'ORG'
    const destCode = extractIATA(tripContext?.destination) || destinationLabel.slice(0, 3).toUpperCase() || 'DST'

    return (
      <AppLayout pageTitle="Travel Requests" activeItem="travel-requests" onNavigate={onNavigate}>
        <div className="package-detail">
          <div className="package-detail-hero">
            <img
              src={heroImage}
              alt={`Destination ${destinationLabel}`}
              className="package-detail-hero-image"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = e.target.src === heroFallback
                  ? `https://picsum.photos/1200/400`
                  : heroFallback
              }}
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
                      {flight.via
                        ? `${originCode} → ${flight.via} → ${destCode}`
                        : `${originCode} → ${destCode}`}{' '}
                      <span className="package-detail-leg-muted">
                        {flight.via ? 'Con escala' : 'Directo'} · {flight.duration_hours ?? '—'}h
                      </span>
                    </p>
                    <p className="package-detail-leg-airline">{flight.airline || '—'}</p>
                    {(flight.departure_time || flight.arrival_time) && (
                      <p className="package-detail-leg-times">
                        Departs <strong>{flight.departure_time || '—'}</strong> · Arrives{' '}
                        <strong>{flight.arrival_time || '—'}</strong>
                      </p>
                    )}
                  </article>
                  <article className="package-detail-leg">
                    <div className="package-detail-leg-top">
                      <span className="package-detail-leg-label">Return</span>
                      <time className="package-detail-leg-date">{formatShortDate(tripContext?.returnDate)}</time>
                    </div>
                    <p className="package-detail-leg-route">
                      {flight.via
                        ? `${destCode} → ${flight.via} → ${originCode}`
                        : `${destCode} → ${originCode}`}
                    </p>
                    <p className="package-detail-leg-airline">{flight.airline || '—'}</p>
                    <p className="package-detail-leg-times" style={{ color: '#9ca3af' }}>
                      Times confirmed at booking
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
                  <div className="package-detail-hotel-thumb">
                    <img
                      src={hotel.image_url || `https://picsum.photos/seed/${encodeURIComponent(hotel.name || destinationLabel)}/560/320`}
                      alt={hotel.name || destinationLabel}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://picsum.photos/560/320'
                      }}
                    />
                  </div>
                  <div className="package-detail-hotel-body">
                    <h4 className="package-detail-hotel-name">{hotel.name || 'Property from agent quote'}</h4>
                    <p className="package-detail-hotel-meta">
                      {hotel.stars ? `${hotel.stars}-star preferred property` : 'Lodging pairing'} ·{' '}
                      {hotel.location || reviewData.requestSummary.destination}
                    </p>
                    <p className="package-detail-hotel-stay">
                      {flightHotelBreakdown.nights} nights
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="package-detail-aside card">
              <h3 className="package-detail-aside-title">Component breakdown</h3>

              <div style={{ marginBottom: 12, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#374151' }}>Passengers quoted</p>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {flightHotelBreakdown.adults} {flightHotelBreakdown.adults === 1 ? 'adult' : 'adults'}
                  {flightHotelBreakdown.children > 0
                    ? ` · ${flightHotelBreakdown.children} ${flightHotelBreakdown.children === 1 ? 'child' : 'children'}`
                    : ' · no children'}
                </p>
              </div>

              <ul className="package-detail-price-list">
                <li>
                  <span>
                    Flights
                    <br />
                    <small style={{ color: '#9ca3af', fontWeight: 400 }}>
                      {formatMoney(flightHotelBreakdown.flightPerPerson, flightHotelBreakdown.currency)}/person × {flightHotelBreakdown.totalPassengers}
                    </small>
                  </span>
                  <strong>{formatMoney(flightHotelBreakdown.flightCost, flightHotelBreakdown.currency)}</strong>
                </li>
                <li>
                  <span>
                    Hotel
                    <br />
                    <small style={{ color: '#9ca3af', fontWeight: 400 }}>
                      {formatMoney(flightHotelBreakdown.nightly, flightHotelBreakdown.currency)}/night × {flightHotelBreakdown.nights} {flightHotelBreakdown.nights === 1 ? 'night' : 'nights'}
                    </small>
                  </span>
                  <strong>{formatMoney(flightHotelBreakdown.hotelSubtotal, flightHotelBreakdown.currency)}</strong>
                </li>
              </ul>
              <div className="package-detail-price-divider" />
              <div className="package-detail-price-row package-detail-price-row--total">
                <span>Total (USD)</span>
                <strong>{formatMoney(flightHotelBreakdown.packageTotal, 'USD')}</strong>
              </div>
              <div className="package-detail-price-row" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  Aprox. en MXN
                  <br />
                  <span style={{ fontSize: 11 }}>Tipo de cambio ~$17.50</span>
                </span>
                <strong style={{ color: '#6b7280' }}>
                  {formatMoney(Math.round(flightHotelBreakdown.packageTotal * 17.5), 'MXN')}
                </strong>
              </div>
              <button
                type="button"
                className="primary-button package-detail-appraise-btn"
                onClick={() => setApproveNote('Package approved.')}
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
              <span>Adults</span>
              <strong>
                {reviewData.requestSummary.adults != null
                  ? reviewData.requestSummary.adults
                  : (reviewData.requestSummary.travelers?.split('-')[0] ?? '—')}
              </strong>
            </div>
            <div className="review-summary-item">
              <span>Children</span>
              <strong>
                {(() => {
                  const c = reviewData.requestSummary.children
                  if (c != null) return c > 0 ? c : 'None'
                  const fromStr = Number(reviewData.requestSummary.travelers?.split('-')[1] ?? 0)
                  return fromStr > 0 ? fromStr : 'None'
                })()}
              </strong>
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

        {reviewData.warnings?.length > 0 && (
          <section className="card" style={{ borderLeft: '3px solid #f59e0b', padding: '14px 18px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>
              Partial results — some data may be missing
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2em', fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
              {reviewData.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </section>
        )}

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
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = `https://picsum.photos/640/360`
                      handleImageResolved(pkg.id)
                    }}
                  />
                </div>
                <h3 className="package-title">{pkg.title}</h3>
                <p className="package-price">{formatMoney(pkg.totalPrice, pkg.currency)}</p>
                <div className="package-meta">
                  <p>{pkg.hotel?.name || <span style={{ color: '#f59e0b' }}>No hotel found</span>}</p>
                  <p>{pkg.flight?.airline || <span style={{ color: '#f59e0b' }}>No flight found</span>}</p>
                </div>
                <div className="package-card-actions">
                  {pkg.flight && pkg.hotel ? (
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
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Intenta con otra moneda o ruta</span>
                  )}
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
