const stats = [
  { label: 'Active Requests', value: '24', change: '+12%' },
  { label: 'Processing Requests', value: '8', change: '+8%' },
  { label: 'Ready Packages', value: '16', change: '+24%' },
  { label: 'Total Revenue', value: '$124,500', change: '+18%' },
]

export default function StatsCards() {
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

