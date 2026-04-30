import AppLayout from '../components/Layout/AppLayout'
import RecentRequestsTable from '../components/Dashboard/RecentRequestsTable'

export default function TravelRequestsPage({ onNavigate }) {
  return (
    <AppLayout
      pageTitle="Travel Requests"
      activeItem="travel-requests"
      onNavigate={onNavigate}
    >
      <div className="page-header-row">
        <div>
          <h2 className="page-section-title">Travel Requests</h2>
          <p className="page-section-subtitle">
            Manage all travel inquiries and generated packages.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => onNavigate && onNavigate('new-request')}
        >
          + New Request
        </button>
      </div>

      <RecentRequestsTable onNewRequest={() => onNavigate && onNavigate('new-request')} />
    </AppLayout>
  )
}

