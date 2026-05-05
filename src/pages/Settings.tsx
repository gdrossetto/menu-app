import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']

export default function Settings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [currencySymbol, setCurrencySymbol] = useState('$')

  useEffect(() => {
    fetchRestaurant()
  }, [])

  const fetchRestaurant = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', session.user.id)
        .limit(1)
        .single()
      
      if (data) {
        setRestaurant(data)
        // Since we didn't add currency_symbol to the TS types yet, we use any or fallback
        setCurrencySymbol((data as any).currency_symbol || '$')
      }
    }
    setLoading(false)
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurant) return

    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({
        currency_symbol: currencySymbol
      })
      .eq('id', restaurant.id)

    if (error) {
      alert('Error saving settings: ' + error.message)
    } else {
      alert('Settings saved successfully!')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }}></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h2>Please create a restaurant first in the Overview tab.</h2>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Configure your brand and localization.</p>
        </div>

        <div className="card" style={{ border: 'none', background: 'var(--color-surface)', maxWidth: '600px' }}>
          <div className="card-body">
            <form onSubmit={saveSettings} className="flex flex-col gap-6">
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Currency Symbol</label>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  This symbol will be displayed next to prices on your public menu.
                </p>
                <select 
                  className="form-input" 
                  value={currencySymbol} 
                  onChange={e => setCurrencySymbol(e.target.value)}
                  style={{ maxWidth: '200px' }}
                >
                  <option value="$">$ (USD/CAD/AUD)</option>
                  <option value="R$">R$ (BRL)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="¥">¥ (JPY/CNY)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="Fr">Fr (CHF)</option>
                </select>
              </div>

              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
