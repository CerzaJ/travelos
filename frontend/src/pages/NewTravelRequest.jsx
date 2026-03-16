import AppLayout from '../components/Layout/AppLayout'

export default function NewTravelRequestPage({ onNavigate }) {
  const handleSubmit = (event) => {
    event.preventDefault()
    // Placeholder: aquí luego se conectará con backend
    // Por ahora solo volvemos al dashboard
    if (onNavigate) {
      onNavigate('dashboard')
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

      <form className="form-layout" onSubmit={handleSubmit}>
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
              />
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <div className="form-field">
              <label className="form-label" htmlFor="start-date">
                Start date
              </label>
              <input id="start-date" type="date" className="form-input" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="end-date">
                End date
              </label>
              <input id="end-date" type="date" className="form-input" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="travelers">
                Travelers
              </label>
              <select id="travelers" className="form-input">
                <option>2 Adults</option>
                <option>2 Adults, 1 Child</option>
                <option>Family</option>
                <option>Group</option>
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
            />
          </div>
        </section>

        <div className="form-actions-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
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

