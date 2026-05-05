import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { ExternalLink, Printer, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const { t } = useTranslation()
  
  const [timeframe, setTimeframe] = useState<'7' | '30'>('7')
  const [chartData, setChartData] = useState<{ date: string, count: number }[]>([])

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUserId(session.user.id)
      // Fetch restaurant owned by this user
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', session.user.id)
        .limit(1)
        .maybeSingle()
      
      if (data) {
        setRestaurant(data)
        // Store for other components that might need it synchronously
        localStorage.setItem('menuqr_restaurant_id', data.id)
        
        // Fetch views for analytics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: views } = await supabase
          .from('menu_views')
          .select('viewed_at')
          .eq('restaurant_id', data.id)
          .gte('viewed_at', thirtyDaysAgo.toISOString())
          
        if (views) {
          // Aggregate by day
          const counts: Record<string, number> = {};
          // Initialize last 30 days with 0
          for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            counts[d.toISOString().split('T')[0]] = 0;
          }
          
          views.forEach(v => {
            const dateStr = v.viewed_at.split('T')[0];
            if (counts[dateStr] !== undefined) counts[dateStr]++;
          });
          
          setChartData(Object.entries(counts).map(([date, count]) => ({ date, count })));
        }
      } else {
        localStorage.removeItem('menuqr_restaurant_id')
      }
    }
    setLoading(false)
  }

  const createRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRestaurantName.trim() || !userId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('restaurants')
      .insert([{ name: newRestaurantName }]) // owner_id is set by default to auth.uid() in the database schema
      .select()
      .single()

    if (data) {
      localStorage.setItem('menuqr_restaurant_id', data.id)
      setRestaurant(data)
    } else {
      alert('Error creating restaurant: ' + error?.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }}></div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', border: 'none', boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>{t('dashboard.welcome', 'Welcome to MenuQR')}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>{t('dashboard.enterRestaurantName', 'Enter your restaurant\'s name to get started.')}</p>
          
          <form onSubmit={createRestaurant} className="form-group" style={{ gap: '1rem' }}>
            <input 
              id="name"
              type="text" 
              className="form-input" 
              value={newRestaurantName}
              onChange={(e) => setNewRestaurantName(e.target.value)}
              placeholder="e.g. Mario's Pizza"
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
              {t('dashboard.createMenuBtn', 'Create My Menu')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/m/${restaurant.id}`
  const filteredChartData = timeframe === '7' ? chartData.slice(-7) : chartData;

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `menu-qr-${restaurant.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{t('dashboard.overview', 'Overview')}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{t('dashboard.manageMenu', 'Manage your digital menu and QR code.')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="card" style={{ border: 'none', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem' }}>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '1.5rem', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}>
              <QRCodeCanvas id="qr-canvas" value={publicUrl} size={180} level="H" includeMargin={true} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('dashboard.yourQrCode', 'Your QR Code')}</h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              {t('dashboard.customersCanScan', 'Customers can scan this to view your menu instantly.')}
            </p>
            <div className="flex gap-2" style={{ width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: '1 1 auto', padding: '0.75rem', minWidth: '100px' }}
                onClick={downloadQRCode}
              >
                <Download size={18} /> {t('dashboard.save', 'Save')}
              </button>
              <button 
                className="btn btn-outline" 
                style={{ flex: '1 1 auto', padding: '0.75rem', minWidth: '100px' }}
                onClick={() => {
                  window.open(`/m/${restaurant.id}/print`, '_blank')
                }}
              >
                <Printer size={18} /> {t('dashboard.print', 'Print')}
              </button>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ flex: '1 1 auto', padding: '0.75rem', minWidth: '100px' }}>
                <ExternalLink size={18} /> {t('dashboard.open', 'Open')}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card" style={{ border: 'none', background: 'var(--color-surface)' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{t('dashboard.menuViews', 'Menu Views')}</h3>
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value as '7' | '30')}
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  >
                    <option value="7">{t('dashboard.last7Days', 'Last 7 Days')}</option>
                    <option value="30">{t('dashboard.last30Days', 'Last 30 Days')}</option>
                  </select>
                </div>

                <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                  {filteredChartData.length === 0 ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                      {t('dashboard.noViewsYet', 'No views yet. Share your link!')}
                    </div>
                  ) : (
                    filteredChartData.map((d, i) => {
                      const maxCount = Math.max(...filteredChartData.map(c => c.count), 1);
                      const heightPercent = `${(d.count / maxCount) * 100}%`;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                          <div style={{ 
                            flex: 1, 
                            width: '100%', 
                            display: 'flex', 
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            position: 'relative'
                          }}>
                            <div 
                              title={`${d.count} views on ${d.date}`}
                              style={{ 
                                width: timeframe === '30' ? '100%' : '20px', 
                                maxWidth: '30px',
                                height: heightPercent, 
                                backgroundColor: 'var(--color-primary)', 
                                borderRadius: '4px 4px 0 0',
                                opacity: 0.8,
                                minHeight: d.count > 0 ? '4px' : '0'
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', display: timeframe === '30' && i % 5 !== 0 ? 'none' : 'block' }}>
                            {d.date.split('-')[2]}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                <div style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 600, fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                  {filteredChartData.reduce((acc, curr) => acc + curr.count, 0)} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{t('dashboard.totalViews', 'total views')}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ border: 'none', background: 'var(--color-surface)' }}>
              <div className="card-body">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('dashboard.quickActions', 'Quick Actions')}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                  {t('dashboard.updateCategories', 'Update your categories and items. Changes are saved automatically.')}
                </p>
                <a href="/dashboard/menu" className="btn btn-primary" style={{ width: '100%' }}>
                  {t('dashboard.editMenuItems', 'Edit Menu Items')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
