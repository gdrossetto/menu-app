import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ExternalLink, Printer } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>Welcome to MenuQR</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>Enter your restaurant's name to get started.</p>
          
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
              Create My Menu
            </button>
          </form>
        </div>
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/m/${restaurant.id}`

  return (
    <DashboardLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Overview</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Manage your digital menu and QR code.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="card" style={{ border: 'none', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem' }}>
            <div style={{ padding: '1rem', background: 'white', borderRadius: '1.5rem', boxShadow: 'var(--shadow-md)', marginBottom: '2rem' }}>
              <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin={true} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your QR Code</h2>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Customers can scan this to view your menu instantly.
            </p>
            <div className="flex gap-3" style={{ width: '100%' }}>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
                <ExternalLink size={18} /> Open
              </a>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.75rem' }}
                onClick={() => {
                  window.print()
                }}
              >
                <Printer size={18} /> Print
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card" style={{ border: 'none', background: 'var(--color-surface)' }}>
              <div className="card-body">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Actions</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                  Update your categories and items. Changes are saved automatically.
                </p>
                <a href="/dashboard/menu" className="btn btn-primary" style={{ width: '100%' }}>
                  Edit Menu Items
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
