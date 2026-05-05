import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Image as ImageIcon,
  X,
  Upload,
  EyeOff
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/supabase";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];

export default function EditMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<Database["public"]["Tables"]["restaurants"]["Row"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { t } = useTranslation();
  const restaurantId = localStorage.getItem("menuqr_restaurant_id");

  // Forms state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItem, setNewItem] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    image_url: "",
  });
  const [newItemImageFile, setNewItemImageFile] = useState<File | null>(null);

  // Edit state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingItemImageFile, setEditingItemImageFile] = useState<File | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (restaurantId) {
      fetchMenuData();
    }
  }, [restaurantId]);

  const fetchMenuData = async () => {
    setLoading(true);
    
    const { data: rest } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId!)
      .single();

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId!)
      .order("order_index");

    const { data: itms } = await supabase
      .from("menu_items")
      .select("*, categories!inner(restaurant_id)")
      .eq("categories.restaurant_id", restaurantId!)
      .order("order_index");

    if (rest) setRestaurant(rest);
    if (cats) setCategories(cats);
    if (itms) setItems(itms as unknown as MenuItem[]);
    setLoading(false);
  };

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurantId) return null;
    
    // Compress image before upload (max 800px width for menu items)
    const { compressImage } = await import('../lib/imageOptimization');
    const file = await compressImage(rawFile, 800, 0.8);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${restaurantId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      alert(
        "Failed to upload image. Please make sure you ran the SQL to create the storage bucket.",
      );
      return null;
    }

    const { data } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !restaurantId) return;

    const { data } = await supabase
      .from("categories")
      .insert([
        {
          restaurant_id: restaurantId,
          name: newCategoryName,
          order_index: categories.length,
        },
      ])
      .select()
      .single();

    if (data) {
      setCategories([...categories, data]);
      setNewCategoryName("");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;
    await supabase.from("categories").delete().eq("id", id);
    setCategories(categories.filter((c) => c.id !== id));
    setItems(items.filter((i) => i.category_id !== id));
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    const updatedCategories = newCategories.map((c, i) => ({
      ...c,
      order_index: i,
    }));

    // Optimistic UI update
    setCategories(updatedCategories);

    // Save to Supabase via Upsert
    const { error } = await supabase.from("categories").upsert(
      updatedCategories.map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        order_index: c.order_index,
        created_at: c.created_at,
      })),
    );

    if (error) {
      console.error("Error updating order:", error);
      alert("Failed to save the new order. Reverting changes.");
      fetchMenuData();
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categoryItems = items.filter(i => i.category_id === categoryId);
    const oldIndex = categoryItems.findIndex((i) => i.id === active.id);
    const newIndex = categoryItems.findIndex((i) => i.id === over.id);

    const newCategoryItems = arrayMove(categoryItems, oldIndex, newIndex);
    const updatedCategoryItems = newCategoryItems.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    // Update global items state optimistically
    setItems(items.map(item => {
      if (item.category_id === categoryId) {
        return updatedCategoryItems.find(u => u.id === item.id) || item;
      }
      return item;
    }));

    // Save to Supabase
    const { error } = await supabase.from("menu_items").upsert(
      updatedCategoryItems.map((i) => ({
        id: i.id,
        category_id: i.category_id,
        name: i.name,
        description: i.description,
        price: i.price,
        image_url: i.image_url,
        is_available: i.is_available,
        order_index: i.order_index,
        created_at: i.created_at,
      }))
    );

    if (error) {
      console.error("Error updating item order:", error);
      alert("Failed to save the item order. Reverting changes.");
      fetchMenuData();
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.category_id || !newItem.name || !newItem.price) return;

    setUploading(true);
    let imageUrl = newItem.image_url;
    if (newItemImageFile) {
      const uploadedUrl = await uploadImage(newItemImageFile);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          category_id: newItem.category_id,
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
          image_url: imageUrl || null,
          order_index: items.filter(
            (i) => i.category_id === newItem.category_id,
          ).length,
        },
      ])
      .select()
      .single();

    if (data) {
      setItems([...items, data]);
      setNewItem({
        category_id: newItem.category_id,
        name: "",
        description: "",
        price: "",
        image_url: "",
      });
      setNewItemImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      console.error(error);
    }
    setUploading(false);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setUploading(true);
    let imageUrl = editingItem.image_url;
    if (editingItemImageFile) {
      const uploadedUrl = await uploadImage(editingItemImageFile);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        image_url: imageUrl || null,
        is_available: editingItem.is_available
      })
      .eq("id", editingItem.id)
      .select()
      .single();

    if (data) {
      setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
      setEditingItem(null);
      setEditingItemImageFile(null);
    } else {
      console.error(error);
    }
    setUploading(false);
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h2>Please create a restaurant first in the Dashboard.</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div
          className="flex justify-between items-center"
          style={{ marginBottom: "2rem" }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--color-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {t('editMenu.title', 'Edit Menu')}
            </h1>
            <p
              style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}
            >
              {t('editMenu.subtitle', 'Organize your categories and items.')}
            </p>
          </div>
        </div>

        {/* Add Category Form */}
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            border: "none",
            background: "var(--color-surface)",
          }}
        >
          <div className="card-body">
            <form
              onSubmit={addCategory}
              className="flex flex-col-mobile gap-4 items-center"
            >
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder={t('editMenu.newCategoryPlaceholder', 'New Category Name (e.g., Starters)')}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newCategoryName.trim()}
              >
                <Plus size={18} /> {t('editMenu.addCategory', 'Add Category')}
              </button>
            </form>
          </div>
        </div>

        {/* Add Item Form */}
        {categories.length > 0 && (
          <div
            className="card"
            style={{
              marginBottom: "3rem",
              border: "none",
              background: "var(--color-bg)",
              boxShadow: "none",
            }}
          >
            <div className="card-body" style={{ padding: "0" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                {t('editMenu.addNewItem', 'Add New Item')}
              </h3>
              <form
                onSubmit={addItem}
                className="grid-mobile-1"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <select
                  className="form-input"
                  value={newItem.category_id}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category_id: e.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    {t('editMenu.selectCategory', 'Select Category...')}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('editMenu.itemName', 'Item Name')}
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ gridColumn: "1 / -1" }}
                  placeholder={t('editMenu.descriptionOptional', 'Description (Optional)')}
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder={t('editMenu.pricePlaceholder', 'Price (e.g. 10.50)')}
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  required
                />

                <div
                  className="form-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    padding: "0.5rem 1rem",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} color="var(--color-text-muted)" />
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: newItemImageFile
                        ? "var(--color-text)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {newItemImageFile
                      ? newItemImageFile.name
                      : t('editMenu.uploadImageOptional', 'Upload Image (Optional)')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewItemImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? (
                      t('editMenu.adding', 'Adding...')
                    ) : (
                      <>
                        <Plus size={18} /> {t('editMenu.addItem', 'Add Item')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories and Items List (Sortable) */}
        {loading ? (
          <div className="flex justify-center p-8">
            <div
              className="spinner"
              style={{
                width: "30px",
                height: "30px",
                border: "2px solid var(--color-border)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
              }}
            ></div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <div className="flex flex-col gap-8">
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((category) => (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    items={items.filter((i) => i.category_id === category.id).sort((a,b) => a.order_index - b.order_index)}
                    deleteCategory={deleteCategory}
                    deleteItem={deleteItem}
                    setEditingItem={setEditingItem}
                    setEditingItemImageFile={setEditingItemImageFile}
                    handleItemDragEnd={(e) => handleItemDragEnd(e, category.id)}
                    sensors={sensors}
                    currencySymbol={(restaurant as any)?.currency_symbol || '$'}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!uploading) setEditingItem(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              className="flex justify-between items-center"
              style={{ marginBottom: "1.5rem" }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                {t('editMenu.editItemTitle', 'Edit Item')}
              </h3>
              <button
                onClick={() => {
                  if (!uploading) setEditingItem(null);
                }}
                className="btn btn-ghost"
                style={{ padding: "0.4rem" }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={updateItem} className="flex flex-col gap-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('editMenu.nameLabel', 'Name')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('editMenu.descriptionLabel', 'Description')}</label>
                <textarea
                  className="form-input"
                  value={editingItem.description || ""}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('editMenu.priceLabel', 'Price')}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={editingItem.price}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editingItem.is_available} 
                    onChange={e => setEditingItem({ ...editingItem, is_available: e.target.checked })} 
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  {t('editMenu.itemIsAvailable', 'Item is Available (In Stock)')}
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('editMenu.imageLabel', 'Image')}</label>
                <div
                  style={{ display: "flex", gap: "1rem", alignItems: "center" }}
                >
                  {editingItemImageFile || editingItem.image_url ? (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        flexShrink: 0,
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <img
                        src={
                          editingItemImageFile
                            ? URL.createObjectURL(editingItemImageFile)
                            : editingItem.image_url!
                        }
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  ) : null}
                  <div
                    className="form-input"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <Upload size={16} color="var(--color-text-muted)" />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color: editingItemImageFile
                          ? "var(--color-text)"
                          : "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {editingItemImageFile
                        ? editingItemImageFile.name
                        : editingItem.image_url
                          ? t('editMenu.replaceImage', 'Replace Image')
                          : t('editMenu.uploadImage', 'Upload Image')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={editFileInputRef}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditingItemImageFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex justify-end gap-3"
                style={{ marginTop: "1rem" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!uploading) setEditingItem(null);
                  }}
                  className="btn btn-ghost"
                  disabled={uploading}
                >
                  {t('editMenu.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? t('editMenu.saving', 'Saving...') : t('editMenu.saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

interface SortableCategoryProps {
  category: Category;
  items: MenuItem[];
  deleteCategory: (id: string) => void;
  deleteItem: (id: string) => void;
  setEditingItem: (item: MenuItem) => void;
  setEditingItemImageFile: (file: File | null) => void;
  handleItemDragEnd: (e: DragEndEvent) => void;
  sensors: any;
  currencySymbol: string;
}

function SortableCategory({
  category,
  items,
  deleteCategory,
  deleteItem,
  setEditingItem,
  setEditingItemImageFile,
  handleItemDragEnd,
  sensors,
  currencySymbol
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="flex justify-between items-center"
        style={{
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            {...attributes}
            {...listeners}
            style={{ cursor: "grab", display: "flex", touchAction: "none" }}
          >
            <GripVertical size={18} color="var(--color-text-muted)" />
          </div>
          {category.name}
        </h2>
        <button
          onClick={() => deleteCategory(category.id)}
          className="btn btn-ghost btn-danger"
          style={{ padding: "0.4rem" }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          {/* Note: In a real app we'd pass translation function down or use a context, but we will hardcode translation hook here is tricky since this is outside the main component. We will rely on simple fallback for now or we could use the i18n directly. */}
          No items in this category yet.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <div className="flex flex-col gap-3">
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableMenuItem 
                  key={item.id} 
                  item={item} 
                  setEditingItem={setEditingItem}
                  setEditingItemImageFile={setEditingItemImageFile}
                  deleteItem={deleteItem}
                  currencySymbol={currencySymbol}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </div>
  );
}

interface SortableMenuItemProps {
  item: MenuItem;
  setEditingItem: (item: MenuItem) => void;
  setEditingItemImageFile: (file: File | null) => void;
  deleteItem: (id: string) => void;
  currencySymbol: string;
}

function SortableMenuItem({ item, setEditingItem, setEditingItemImageFile, deleteItem, currencySymbol }: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : (item.is_available ? 1 : 0.6),
    position: "relative" as const,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        ...style,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem",
        border: "none",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex gap-4 items-center">
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", display: "flex", touchAction: "none" }}
        >
          <GripVertical size={16} color="var(--color-text-muted)" />
        </div>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{
              width: "48px",
              height: "48px",
              objectFit: "cover",
              borderRadius: "var(--radius-sm)",
              filter: item.is_available ? 'none' : 'grayscale(100%)'
            }}
          />
        ) : (
          <div
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "var(--color-surface-hover)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImageIcon size={20} color="var(--color-border)" />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <p style={{ fontWeight: 500, fontSize: "1rem" }}>
              {item.name}
            </p>
            {!item.is_available && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', backgroundColor: 'var(--color-surface-hover)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                <EyeOff size={12} /> Hidden
              </span>
            )}
          </div>
          {item.description && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                marginTop: "0.1rem",
              }}
            >
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div
        className="flex items-center gap-3"
        style={{ marginLeft: "auto" }}
      >
        <span
          style={{
            fontWeight: 600,
            color: "var(--color-text)",
            marginRight: "1rem",
          }}
        >
          {currencySymbol}{item.price.toFixed(2)}
        </span>
        <button
          onClick={() => {
            setEditingItem(item);
            setEditingItemImageFile(null);
          }}
          className="btn btn-ghost"
          style={{
            padding: "0.4rem",
            color: "var(--color-text-muted)",
          }}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => deleteItem(item.id)}
          className="btn btn-ghost"
          style={{ padding: "0.4rem", color: "var(--color-danger)" }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
