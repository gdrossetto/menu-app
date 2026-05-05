import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { fetchMenuData } from '../lib/menuData'
import type { Category, MenuItem, Restaurant } from '../types/menu'

export default function PrintMenu() {
  const { restaurantId } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    setError('')

    try {
      const {
        restaurant: rest,
        categories: menuCategories,
        items: menuItems,
      } = await fetchMenuData(restaurantId)

      setRestaurant(rest)
      setCategories(menuCategories)
      setItems(menuItems.filter((item) => item.is_available))
      setLoading(false)

      setTimeout(() => {
        window.print()
      }, 500)
    } catch (menuError) {
      console.error('Error loading printable menu:', menuError)
      setError('Restaurant not found.')
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    void Promise.resolve().then(loadMenu)
  }, [loadMenu])

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
    } as CSSProperties}>
      
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
                        {restaurant.currency_symbol || '$'}{item.price.toFixed(2)}
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
