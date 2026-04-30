import AppLayout from '../components/Layout/AppLayout'

export default function SettingsComingSoonPage({ onNavigate }) {
  return (
    <AppLayout pageTitle="Settings" activeItem="settings" onNavigate={onNavigate}>
      <section className="card">
        <h2 className="card-title">Settings (Coming Soon)</h2>
        <p className="card-subtitle">
          This module is under construction. Soon you will be able to configure providers, users,
          and account preferences here.
        </p>
      </section>
    </AppLayout>
  )
}
