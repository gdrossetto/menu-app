import { ReactNode } from 'react'
import { LayoutDashboard, Menu, QrCode, Settings, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation()

  return (
    <div className="flex" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: 'transparent',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '2rem 1.5rem 1rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em' }}>
            <QrCode size={22} color="var(--color-text)" />
            MenuQR
          </h1>
        </div>

        <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link
            to="/dashboard/menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard/menu' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard/menu' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard/menu' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard/menu' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <Menu size={18} />
            Edit Menu
          </Link>
          <Link
            to="/dashboard/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard/settings' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard/settings' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard/settings' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard/settings' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>

        <div style={{ padding: '1.5rem' }}>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}
            onClick={() => {
              localStorage.removeItem('menuqr_restaurant_id')
              window.location.reload()
            }}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '3rem 2rem', overflowY: 'auto' }}>
        <div className="container" style={{ maxWidth: '900px', padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
