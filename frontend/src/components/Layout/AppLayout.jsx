export default function AppLayout({ children, pageTitle, activeItem, onNavigate }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'travel-requests', label: 'Travel Requests' },
  ]

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
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeItem === item.key ? 'nav-item--active' : ''}`}
              onClick={() => handleNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
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

