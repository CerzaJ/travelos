import { useEffect, useState } from 'react'
import AppLayout from '../components/Layout/AppLayout'
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

export default function TravelRequestsPage({ onNavigate, onViewRequest }) {
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

      {loading ? (
        <section className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading requests…
        </section>
      ) : (
        <RecentRequestsTable
          rows={rows}
          onNewRequest={() => onNavigate && onNavigate('new-request')}
          onViewRequest={(row) => onViewRequest && onViewRequest(row)}
          onStatusChange={handleStatusChange}
        />
      )}
    </AppLayout>
  )
}
