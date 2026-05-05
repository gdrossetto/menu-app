import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LayoutDashboard, Menu, QrCode, Settings, LogOut, Menu as MenuIcon, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const sidebarWidth = '260px'

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Mobile Header */}
      {isMobile && (
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em', margin: 0 }}>
            <QrCode size={22} color="var(--color-text)" />
            MenuQR
          </h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
            {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </header>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobile && isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? '100%' : sidebarWidth,
        backgroundColor: isMobile ? 'var(--color-surface)' : 'transparent',
        borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
        display: isMobile ? (isMobileMenuOpen ? 'flex' : 'none') : 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: isMobile ? '60px' : 0,
        height: isMobile ? 'calc(100vh - 60px)' : '100vh',
        zIndex: 45,
        boxShadow: isMobile && isMobileMenuOpen ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none'
      }}>
        {!isMobile && (
          <div style={{ padding: '2rem 1.5rem 1rem' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.02em', margin: 0 }}>
              <QrCode size={22} color="var(--color-text)" />
              MenuQR
            </h1>
          </div>
        )}

        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link
            to="/dashboard"
            onClick={closeMobileMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <LayoutDashboard size={18} />
            {t('dashboard.overview', 'Overview')}
          </Link>
          <Link
            to="/dashboard/menu"
            onClick={closeMobileMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard/menu' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard/menu' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard/menu' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard/menu' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <Menu size={18} />
            {t('dashboard.menuItems', 'Edit Menu')}
          </Link>
          <Link
            to="/dashboard/settings"
            onClick={closeMobileMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: location.pathname === '/dashboard/settings' ? 'var(--color-surface)' : 'transparent',
              boxShadow: location.pathname === '/dashboard/settings' ? 'var(--shadow-sm)' : 'none',
              color: location.pathname === '/dashboard/settings' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: location.pathname === '/dashboard/settings' ? 600 : 500,
              transition: 'all var(--transition-fast)'
            }}
          >
            <Settings size={18} />
            {t('dashboard.settings', 'Settings')}
          </Link>
        </nav>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: isMobile ? '1px solid var(--color-border)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('common.language', 'Language')}</span>
            <select 
              value={i18n.language.split('-')[0]} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              style={{
                flex: 1,
                padding: '0.25rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'transparent'
              }}
            >
              <option value="en">{t('common.english', 'English')}</option>
              <option value="pt">{t('common.portuguese', 'Português')}</option>
            </select>
          </div>
          
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}
            onClick={async () => {
              localStorage.removeItem('menuqr_restaurant_id')
              await supabase.auth.signOut()
              window.location.reload()
            }}
          >
            <LogOut size={18} />
            {t('dashboard.logout', 'Log out')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: isMobile ? '1.5rem 1rem' : '3rem 2rem', overflowY: 'auto' }}>
        <div className="container" style={{ maxWidth: '900px', padding: 0 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
