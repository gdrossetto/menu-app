import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Edit2, GripVertical, Image as ImageIcon, X, Upload } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

type Category = Database['public']['Tables']['categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default function EditMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const restaurantId = localStorage.getItem('menuqr_restaurant_id')

  // Forms state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newItem, setNewItem] = useState({ category_id: '', name: '', description: '', price: '', image_url: '' })
  const [newItemImageFile, setNewItemImageFile] = useState<File | null>(null)
  
  // Edit state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingItemImageFile, setEditingItemImageFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (restaurantId) {
      fetchMenuData()
    }
  }, [restaurantId])

  const fetchMenuData = async () => {
    setLoading(true)
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId!)
      .order('order_index')

    const { data: itms } = await supabase
      .from('menu_items')
      .select('*, categories!inner(restaurant_id)')
      .eq('categories.restaurant_id', restaurantId!)

    if (cats) setCategories(cats)
    if (itms) setItems(itms as unknown as MenuItem[])
    setLoading(false)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!restaurantId) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${restaurantId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      alert('Failed to upload image. Please make sure you ran the SQL to create the storage bucket.')
      return null
    }

    const { data } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath)
      
    return data.publicUrl
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim() || !restaurantId) return

    const { data } = await supabase
      .from('categories')
      .insert([{ 
        restaurant_id: restaurantId, 
        name: newCategoryName,
        order_index: categories.length 
      }])
      .select()
      .single()

    if (data) {
      setCategories([...categories, data])
      setNewCategoryName('')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its items?')) return
    await supabase.from('categories').delete().eq('id', id)
    setCategories(categories.filter(c => c.id !== id))
    setItems(items.filter(i => i.category_id !== id))
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.category_id || !newItem.name || !newItem.price) return

    setUploading(true)
    let imageUrl = newItem.image_url
    if (newItemImageFile) {
      const uploadedUrl = await uploadImage(newItemImageFile)
      if (uploadedUrl) imageUrl = uploadedUrl
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert([{
        category_id: newItem.category_id,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        image_url: imageUrl || null,
        order_index: items.filter(i => i.category_id === newItem.category_id).length
      }])
      .select()
      .single()

    if (data) {
      setItems([...items, data])
      setNewItem({ category_id: newItem.category_id, name: '', description: '', price: '', image_url: '' })
      setNewItemImageFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      console.error(error)
    }
    setUploading(false)
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setUploading(true)
    let imageUrl = editingItem.image_url
    if (editingItemImageFile) {
      const uploadedUrl = await uploadImage(editingItemImageFile)
      if (uploadedUrl) imageUrl = uploadedUrl
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        image_url: imageUrl || null
      })
      .eq('id', editingItem.id)
      .select()
      .single()

    if (data) {
      setItems(items.map(i => i.id === editingItem.id ? data : i))
      setEditingItem(null)
      setEditingItemImageFile(null)
    } else {
      console.error(error)
    }
    setUploading(false)
  }

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h2>Please create a restaurant first in the Dashboard.</h2>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Edit Menu</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Organize your categories and items.</p>
          </div>
        </div>

        {/* Add Category Form */}
        <div className="card" style={{ marginBottom: '2rem', border: 'none', background: 'var(--color-surface)' }}>
          <div className="card-body">
            <form onSubmit={addCategory} className="flex gap-4 items-center">
              <input 
                type="text" 
                className="form-input" 
                style={{ flex: 1 }}
                placeholder="New Category Name (e.g., Starters)" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={!newCategoryName.trim()}>
                <Plus size={18} /> Add Category
              </button>
            </form>
          </div>
        </div>

        {/* Add Item Form */}
        {categories.length > 0 && (
          <div className="card" style={{ marginBottom: '3rem', border: 'none', background: 'var(--color-bg)', boxShadow: 'none' }}>
            <div className="card-body" style={{ padding: '0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Item</h3>
              <form onSubmit={addItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <select 
                  className="form-input"
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({...newItem, category_id: e.target.value})}
                  required
                >
                  <option value="" disabled>Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" className="form-input" placeholder="Item Name" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} required />
                <input type="text" className="form-input" style={{ gridColumn: '1 / -1' }} placeholder="Description (Optional)" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} />
                <input type="number" step="0.01" className="form-input" placeholder="Price (e.g. 10.50)" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} required />
                
                <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem' }} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} color="var(--color-text-muted)" />
                  <span style={{ fontSize: '0.9rem', color: newItemImageFile ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {newItemImageFile ? newItemImageFile.name : 'Upload Image (Optional)'}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewItemImageFile(e.target.files[0])
                      }
                    }} 
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Adding...' : <><Plus size={18} /> Add Item</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories and Items List */}
        {loading ? (
           <div className="flex justify-center p-8"><div className="spinner" style={{ width: '30px', height: '30px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }}></div></div>
        ) : (
          <div className="flex flex-col gap-8">
            {categories.map(category => (
              <div key={category.id}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GripVertical size={18} color="var(--color-text-muted)" />
                    {category.name}
                  </h2>
                  <button onClick={() => deleteCategory(category.id)} className="btn btn-ghost btn-danger" style={{ padding: '0.4rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {items.filter(i => i.category_id === category.id).length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No items in this category yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.filter(i => i.category_id === category.id).map(item => (
                      <div key={item.id} className="card flex justify-between items-center" style={{ padding: '1rem', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex gap-4 items-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                          ) : (
                            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={20} color="var(--color-border)" />
                            </div>
                          )}
                          <div>
                            <p style={{ fontWeight: 500, fontSize: '1rem' }}>{item.name}</p>
                            {item.description && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{item.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{ fontWeight: 600, color: 'var(--color-text)', marginRight: '1rem' }}>${item.price.toFixed(2)}</span>
                          <button onClick={() => { setEditingItem(item); setEditingItemImageFile(null); }} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-text-muted)' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => { if(!uploading) setEditingItem(null) }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit Item</h3>
              <button onClick={() => { if(!uploading) setEditingItem(null) }} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={updateItem} className="flex flex-col gap-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} rows={2} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Price</label>
                <input type="number" step="0.01" className="form-input" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} required />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Image</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {(editingItemImageFile || editingItem.image_url) ? (
                    <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img 
                        src={editingItemImageFile ? URL.createObjectURL(editingItemImageFile) : editingItem.image_url!} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ) : null}
                  <div className="form-input" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => editFileInputRef.current?.click()}>
                    <Upload size={16} color="var(--color-text-muted)" />
                    <span style={{ fontSize: '0.9rem', color: editingItemImageFile ? 'var(--color-text)' : 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editingItemImageFile ? editingItemImageFile.name : (editingItem.image_url ? 'Replace Image' : 'Upload Image')}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={editFileInputRef}
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditingItemImageFile(e.target.files[0])
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={() => { if(!uploading) setEditingItem(null) }} className="btn btn-ghost" disabled={uploading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
