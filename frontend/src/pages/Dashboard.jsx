import AppLayout from '../components/Layout/AppLayout'
import StatsCards from '../components/Dashboard/StatsCards'
import RecentRequestsTable from '../components/Dashboard/RecentRequestsTable'

export default function DashboardPage({ onNavigate }) {
  return (
    <AppLayout
      pageTitle="Dashboard"
      activeItem="dashboard"
      onNavigate={onNavigate}
    >
      <StatsCards />
      <RecentRequestsTable onNewRequest={() => onNavigate('new-request')} />
    </AppLayout>
  )
}

