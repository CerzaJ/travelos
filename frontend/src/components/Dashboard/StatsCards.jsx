const formatMoney = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

export default function StatsCards({ rows = [] }) {
  const activeRequests = rows.length
  const processingRequests = rows.filter((row) => row.status === 'Processing').length
  const readyPackages = rows.filter((row) => row.status === 'Ready').length
  const projectedRevenue = rows.reduce((total, row) => total + (row.projectedRevenue || 0), 0)

  const stats = [
    { label: 'Active Requests', value: String(activeRequests), change: '+12%' },
    { label: 'Processing Requests', value: String(processingRequests), change: '+8%' },
    { label: 'Ready Packages', value: String(readyPackages), change: '+24%' },
    { label: 'Projected Revenue', value: formatMoney(projectedRevenue), change: '+18%' },
  ]

  return (
    <div className="stats-grid">
      {stats.map((item) => (
        <div key={item.label} className="stat-card">
          <div className="stat-header">
            <span className="stat-label">{item.label}</span>
          </div>
          <div className="stat-value-row">
            <span className="stat-value">{item.value}</span>
            <span className="stat-change">{item.change}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

