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

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-full px-4 py-3 text-[0.95rem] font-medium transition-all duration-200 ${
      active
        ? "bg-app-surface text-app-primary shadow-app-sm"
        : "text-app-text-muted hover:bg-app-surface hover:text-app-text"
    }`

  return (
    <div className={`min-h-screen bg-app-bg ${isMobile ? 'flex flex-col' : 'flex flex-row'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-app-border bg-app-surface px-6 py-4">
          <h1 className="m-0 flex items-center gap-2 text-[1.2rem] font-bold tracking-[-0.02em] text-app-primary">
            <QrCode className="h-[22px] w-[22px]" />
            MenuQR
          </h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="app-icon-button">
            {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </header>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-x-0 bottom-0 top-[60px] z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`z-[45] flex flex-col ${
          isMobile
            ? isMobileMenuOpen
              ? 'fixed top-[60px] left-0 h-[calc(100vh-60px)] w-full bg-app-surface shadow-lg'
              : 'hidden'
            : 'sticky top-0 h-screen w-[260px] border-r border-app-border bg-transparent'
        }`}
      >
        {!isMobile && (
          <div className="px-6 pt-8 pb-4">
            <h1 className="m-0 flex items-center gap-2 text-[1.2rem] font-bold tracking-[-0.02em] text-app-primary">
              <QrCode className="h-[22px] w-[22px]" />
              MenuQR
            </h1>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-4 py-6">
          <Link
            to="/dashboard"
            onClick={closeMobileMenu}
            className={navLinkClass(location.pathname === '/dashboard')}
          >
            <LayoutDashboard size={18} />
            {t('dashboard.overview', 'Overview')}
          </Link>
          <Link
            to="/dashboard/menu"
            onClick={closeMobileMenu}
            className={navLinkClass(location.pathname === '/dashboard/menu')}
          >
            <Menu size={18} />
            {t('dashboard.menuItems', 'Edit Menu')}
          </Link>
          <Link
            to="/dashboard/settings"
            onClick={closeMobileMenu}
            className={navLinkClass(location.pathname === '/dashboard/settings')}
          >
            <Settings size={18} />
            {t('dashboard.settings', 'Settings')}
          </Link>
        </nav>

        <div className={`flex flex-col gap-4 p-6 ${isMobile ? 'border-t border-app-border' : ''}`}>
          <div className="flex items-center gap-2 px-2">
            <span className="text-[0.8rem] font-semibold uppercase text-app-text-muted">{t('common.language', 'Language')}</span>
            <select 
              value={i18n.language.split('-')[0]} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="app-inline-select flex-1"
            >
              <option value="en">{t('common.english', 'English')}</option>
              <option value="pt">{t('common.portuguese', 'Português')}</option>
            </select>
          </div>
          
          <button 
            className="btn btn-ghost w-full justify-start text-[0.9rem] text-app-text-muted" 
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
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 py-6' : 'px-8 py-12'}`}>
        <div className="mx-auto w-full max-w-[900px]">
          {children}
        </div>
      </main>
    </div>
  )
}
