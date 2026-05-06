const STATUS_OPTIONS = ['Pending', 'Processing', 'Ready', 'Approved']

export default function RecentRequestsTable({ rows = [], onNewRequest, onViewRequest, onStatusChange }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Recent Travel Requests</h2>
          <p className="card-subtitle">Latest travel inquiries from your clients</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onNewRequest}
        >
          + New Travel Request
        </button>
      </div>

      <table className="requests-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Destination</th>
            <th>Dates</th>
            <th>Travelers</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>{row.client}</td>
              <td>{row.destination}</td>
              <td>{row.dates}</td>
              <td>{row.travelers}</td>
              <td>
                <div className="status-control">
                  <span className={`status-dot status-dot--${row.status.toLowerCase()}`} />
                  <select
                    className={`status-select status-select--${row.status.toLowerCase()}`}
                    value={row.status}
                    onChange={(event) =>
                      onStatusChange && onStatusChange(index, event.target.value)
                    }
                    aria-label={`Status for ${row.client}`}
                  >
                    {STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td>
                <button className="link-button" onClick={() => onViewRequest && onViewRequest(row)}>
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

