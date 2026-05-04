import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default function PublicMenu() {
  const { restaurantId } = useParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeCategory, setActiveCategory] = useState<string>('')

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
      setActiveCategory(cats[0].id)
    }
    if (itms) {
      setItems(itms as unknown as MenuItem[])
    }
    
    setLoading(false)
  }

  // Smooth scroll to category
  const scrollToCategory = (id: string) => {
    setActiveCategory(id)
    const element = document.getElementById(`category-${id}`)
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 140 // offset for sticky header
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  // Update active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offsets = categories.map(c => {
        const el = document.getElementById(`category-${c.id}`)
        return { id: c.id, top: el ? el.getBoundingClientRect().top : Infinity }
      })
      
      const current = offsets.filter(o => o.top <= 160).pop()
      if (current && current.id !== activeCategory) {
        setActiveCategory(current.id)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [categories, activeCategory])


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }}></div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '2rem', textAlign: 'center' }}>
        <h2>{error || 'Menu not found'}</h2>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '2.5rem 1.5rem 1rem', 
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 1px 0 rgba(0,0,0,0.03)'
      }}>
        {restaurant.logo_url && (
          <img src={restaurant.logo_url} alt={restaurant.name} style={{ height: '60px', margin: '0 auto 1rem', borderRadius: 'var(--radius-sm)' }} />
        )}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em', margin: 0 }}>{restaurant.name}</h1>
        
        {/* Horizontal scrollable categories */}
        {categories.length > 0 && (
          <div style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '0.5rem', 
            marginTop: '1.5rem',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none',  // IE and Edge
          }} className="hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  backgroundColor: activeCategory === cat.id ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                  color: activeCategory === cat.id ? 'white' : 'var(--color-text-muted)',
                  border: 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Content */}
      <main style={{ padding: '2rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        {categories.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Menu is empty.</p>
        ) : (
          categories.map(category => {
            const catItems = items.filter(i => i.category_id === category.id)
            if (catItems.length === 0) return null

            return (
              <section key={category.id} id={`category-${category.id}`} style={{ marginBottom: '3.5rem', scrollMarginTop: '160px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
                  {category.name}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {catItems.map(item => (
                    <div key={item.id} className="card" style={{ display: 'flex', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-sm)', backgroundColor: 'var(--color-surface)' }}>
                      <div style={{ flex: 1, padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--color-primary)' }}>{item.name}</h3>
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>${item.price.toFixed(2)}</span>
                        </div>
                        {item.description && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.image_url && (
                        <div style={{ width: '120px', flexShrink: 0, padding: '0.75rem', paddingLeft: 0 }}>
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </main>
      
      <footer style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-border)', fontSize: '0.85rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Powered by MenuQR</p>
      </footer>
    </div>
  )
}
