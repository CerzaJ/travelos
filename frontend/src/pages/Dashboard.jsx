import { useEffect, useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'
import StatsCards from '../components/Dashboard/StatsCards'
import RecentRequestsTable from '../components/Dashboard/RecentRequestsTable'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STATUS_STORE_KEY = 'travelos-request-statuses'

const loadStatuses = () => {
  try {
    return JSON.parse(localStorage.getItem(STATUS_STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

const saveStatus = (id, status) => {
  if (!id) return
  const map = loadStatuses()
  map[id] = status
  localStorage.setItem(STATUS_STORE_KEY, JSON.stringify(map))
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const mapRow = (row) => {
  const notes = row.submitted_payload?.notes || ''
  const clientName = notes.split('|')[0]?.trim() || row.origin_label || '-'
  return {
    id: row.id,
    client: clientName,
    destination: row.destination_label || '-',
    dates: `${formatDate(row.depart_date)} – ${formatDate(row.return_date)}`,
    travelers: `${(row.adults || 1) + (row.children || 0)} people`,
    status: 'Ready',
    projectedRevenue: Number(row.budget_max) || 0,
  }
}

export default function DashboardPage({ onNavigate, onViewRequest }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/requests`)
      .then((r) => r.json())
      .then((data) => {
        const statuses = loadStatuses()
        const mapped = (data || []).map(mapRow).map((row) => ({
          ...row,
          status: statuses[row.id] || row.status,
        }))
        setRows(mapped)
      })
      .catch((err) => console.error('Error cargando solicitudes:', err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = (rowIndex, nextStatus) => {
    setRows((current) => {
      const next = current.map((row, i) => (i === rowIndex ? { ...row, status: nextStatus } : row))
      const updated = next[rowIndex]
      saveStatus(updated?.id, nextStatus)
      return next
    })
  }

  return (
    <AppLayout pageTitle="Dashboard" activeItem="dashboard" onNavigate={onNavigate}>
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <h2 className="card-title">AI Travel Operations Command Center</h2>
          <p className="card-subtitle">
            Monitor request pipeline, coordinate package generation, and keep SLA response times
            under control.
          </p>
        </div>
        <div className="dashboard-hero-media">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80"
            alt="Travel planning workstation"
          />
        </div>
      </section>

      <StatsCards rows={rows} />

      {loading ? (
        <section className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading recent requests…
        </section>
      ) : (
        <RecentRequestsTable
          rows={rows}
          onNewRequest={() => onNavigate('new-request')}
          onViewRequest={(row) => onViewRequest && onViewRequest(row)}
          onStatusChange={handleStatusChange}
        />
      )}
    </AppLayout>
  )
}
