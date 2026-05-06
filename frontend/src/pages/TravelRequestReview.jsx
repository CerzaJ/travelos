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

export default function TravelRequestReviewPage({ onNavigate, reviewData }) {
  const packages = reviewData?.packages || []
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
              <p className="card-subtitle">Review and select the best option for your client</p>
            </div>
          </div>

          <div className="package-grid">
            {packages.map((pkg) => (
              <article
                key={pkg.id}
                className={`package-card ${selectedPackageId === pkg.id ? 'package-card--selected' : ''}`}
                onClick={() => setSelectedPackageId(pkg.id)}
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
