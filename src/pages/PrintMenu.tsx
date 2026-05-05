import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default function PrintMenu() {
  const { restaurantId } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (restaurantId) {
      fetchData()
    }
  }, [restaurantId])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch Restaurant
    const { data: rest, error: rErr } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId!)
      .single()

    if (rErr || !rest) {
      setError('Restaurant not found.')
      setLoading(false)
      return
    }

    setRestaurant(rest)

    // Fetch Categories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId!)
      .order('order_index')

    // Fetch Items
    const { data: itms } = await supabase
      .from('menu_items')
      .select('*, categories!inner(restaurant_id)')
      .eq('categories.restaurant_id', restaurantId!)
      .order('order_index')

    if (cats && cats.length > 0) {
      setCategories(cats)
    }
    if (itms) {
      // Filter out unavailable items for the print version
      setItems(itms.filter((item: any) => item.is_available) as unknown as MenuItem[])
    }
    
    setLoading(false)
    
    // Trigger print dialog after a short delay to ensure rendering is complete
    setTimeout(() => {
      window.print()
    }, 500)
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Loading printable menu...</p>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>{error || 'Menu not found'}</h2>
      </div>
    )
  }

  // Use a custom style tag for print-specific resets
  return (
    <div style={{ 
      backgroundColor: 'white', 
      minHeight: '100vh', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'black',
      maxWidth: '1000px',
      margin: '0 auto',
      ...((restaurant.primary_color && restaurant.primary_color !== '#000000') ? { '--color-primary': restaurant.primary_color } : {}) 
    } as React.CSSProperties}>
      
      <style>
        {`
          @media print {
            body { background: white; margin: 0; padding: 0; }
            @page { margin: 1.5cm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}
      </style>

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        {restaurant.logo_url && (
          <img 
            src={restaurant.logo_url} 
            alt={restaurant.name} 
            style={{ height: '80px', margin: '0 auto 1rem', objectFit: 'contain' }} 
          />
        )}
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          margin: 0, 
          color: 'var(--color-primary, black)'
        }}>
          {restaurant.name}
        </h1>
        <p style={{ marginTop: '0.5rem', color: '#666', fontStyle: 'italic' }}>Menu</p>
      </header>

      {/* Menu Content - Two Column Layout for space efficiency */}
      <main style={{ 
        columnCount: categories.length > 2 ? 2 : 1, 
        columnGap: '4rem',
      }}>
        {categories.map(category => {
          const catItems = items.filter(i => i.category_id === category.id)
          if (catItems.length === 0) return null

          return (
            <section key={category.id} style={{ 
              marginBottom: '2.5rem', 
              breakInside: 'avoid-column',
              pageBreakInside: 'avoid'
            }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                marginBottom: '1rem', 
                color: 'var(--color-primary, black)',
                borderBottom: '2px solid var(--color-primary, black)',
                paddingBottom: '0.25rem'
              }}>
                {category.name}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {catItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                        {item.name}
                      </h3>
                      {/* Dotted leader */}
                      <div style={{ flex: 1, borderBottom: '1px dotted #ccc', margin: '0 0.5rem', position: 'relative', top: '-4px' }}></div>
                      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {(restaurant as any).currency_symbol || '$'}{item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#555', lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </main>
      
      <footer style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #eee', fontSize: '0.85rem', color: '#999' }}>
        <p>Powered by MenuQR</p>
      </footer>
    </div>
  )
}
