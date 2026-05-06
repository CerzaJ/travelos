import { useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'
import StatsCards from '../components/Dashboard/StatsCards'
import RecentRequestsTable from '../components/Dashboard/RecentRequestsTable'

const INITIAL_ROWS = [
  {
    client: 'John Smith',
    destination: 'Paris, France',
    dates: 'Apr 15 - Apr 22, 2026',
    travelers: '2 people',
    status: 'Processing',
    projectedRevenue: 6200,
  },
  {
    client: 'Sarah Johnson',
    destination: 'Kyoto, Japan',
    dates: 'May 1 - May 10, 2026',
    travelers: '4 people',
    status: 'Ready',
    projectedRevenue: 9850,
  },
  {
    client: 'Michael Brown',
    destination: 'Maldives',
    dates: 'Jun 10 - Jun 20, 2026',
    travelers: '2 people',
    status: 'Pending',
    projectedRevenue: 8400,
  },
  {
    client: 'Emily Davis',
    destination: 'New York, USA',
    dates: 'Apr 5 - Apr 12, 2026',
    travelers: '3 people',
    status: 'Approved',
    projectedRevenue: 5300,
  },
]

export default function DashboardPage({ onNavigate }) {
  const [rows, setRows] = useState(INITIAL_ROWS)

  const handleStatusChange = (rowIndex, nextStatus) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex ? { ...row, status: nextStatus } : row,
      ),
    )
  }

  return (
    <AppLayout
      pageTitle="Dashboard"
      activeItem="dashboard"
      onNavigate={onNavigate}
    >
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <h2 className="card-title">AI Travel Operations Command Center</h2>
          <p className="card-subtitle">
            Monitor request pipeline, coordinate package generation, and keep SLA
            response times under control.
          </p>
        </div>
        <div className="dashboard-hero-media">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80"
            alt="Travel planning workstation with map and laptop"
          />
        </div>
      </section>

      <StatsCards rows={rows} />
      <RecentRequestsTable
        onNewRequest={() => onNavigate('new-request')}
        onViewRequest={(requestRow) =>
          onNavigate(requestRow?.status === 'Processing' ? 'request-processing' : 'request-review')
        }
        onStatusChange={handleStatusChange}
        rows={rows}
      />
    </AppLayout>
  )
}

