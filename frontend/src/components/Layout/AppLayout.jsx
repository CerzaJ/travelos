export default function AppLayout({ children, pageTitle, activeItem, onNavigate }) {
  const handleNavigate = (target) => {
    if (onNavigate) {
      onNavigate(target)
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">TravelOS</div>
          <p className="logo-subtitle">AI Travel Platform</p>
        </div>

        <nav className="nav">
          <button
            className={`nav-item ${activeItem === 'dashboard' ? 'nav-item--active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${activeItem === 'travel-requests' ? 'nav-item--active' : ''}`}
            onClick={() => handleNavigate('travel-requests')}
          >
            Travel Requests
          </button>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="topbar-right">
            <button className="topbar-link">Help</button>
            <div className="avatar">JD</div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}

