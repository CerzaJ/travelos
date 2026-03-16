const rows = [
  {
    client: 'John Smith',
    destination: 'Paris, France',
    dates: 'Apr 15 - Apr 22, 2026',
    travelers: '2 people',
    status: 'Processing',
  },
  {
    client: 'Sarah Johnson',
    destination: 'Kyoto, Japan',
    dates: 'May 1 - May 10, 2026',
    travelers: '4 people',
    status: 'Ready',
  },
  {
    client: 'Michael Brown',
    destination: 'Maldives',
    dates: 'Jun 10 - Jun 20, 2026',
    travelers: '2 people',
    status: 'Pending',
  },
  {
    client: 'Emily Davis',
    destination: 'New York, USA',
    dates: 'Apr 5 - Apr 12, 2026',
    travelers: '3 people',
    status: 'Approved',
  },
]

export default function RecentRequestsTable({ onNewRequest }) {
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
          {rows.map((row) => (
            <tr key={row.client}>
              <td>{row.client}</td>
              <td>{row.destination}</td>
              <td>{row.dates}</td>
              <td>{row.travelers}</td>
              <td>
                <span className={`status-pill status-${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
              <td>
                <button className="link-button">View →</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

