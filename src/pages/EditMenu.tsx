import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FileUp, Plus, X, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import MenuImportModal from "../components/MenuImportModal";
import SortableCategory from "../components/SortableCategory";
import { supabase } from "../lib/supabase";
import { fetchMenuData as fetchRestaurantMenuData, sortItemsForCategory } from "../lib/menuData";
import { uploadMenuImage } from "../lib/imageUpload";
import type {
  Category,
  MenuImportDraftCategory,
  MenuImportProposal,
  MenuItem,
  Restaurant,
} from "../types/menu";

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
} from "@dnd-kit/sortable";

export default function EditMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportingMenu, setIsImportingMenu] = useState(false);
  const { t } = useTranslation();
  const restaurantId = localStorage.getItem("menuqr_restaurant_id");
  const hasExistingMenuItems = items.length > 0;

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

  const loadMenuData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await fetchRestaurantMenuData(restaurantId);
      setRestaurant(data.restaurant);
      setCategories(data.categories);
      setItems(data.items);
    } catch (error) {
      console.error("Error fetching menu data:", error);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void Promise.resolve().then(loadMenuData);
  }, [loadMenuData]);

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurantId) return null;
    const publicUrl = await uploadMenuImage(rawFile, restaurantId);

    if (!publicUrl) {
      alert(
        "Failed to upload image. Please make sure you ran the SQL to create the storage bucket.",
      );
    }

    return publicUrl;
  };

  const addCategory = async (e: FormEvent) => {
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
      void loadMenuData();
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
      void loadMenuData();
    }
  };

  const addItem = async (e: FormEvent) => {
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

  const updateItem = async (e: FormEvent) => {
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

  const importMenuDraft = async (proposal: MenuImportProposal) => {
    if (!restaurantId) return;

    setIsImportingMenu(true);

    try {
      const categoryItemsCount = new Map<string, number>();
      const categoryByName = new Map<string, Category>();

      categories.forEach((category) => {
        categoryByName.set(normalizeCategoryKey(category.name), category);
        categoryItemsCount.set(
          category.id,
          items.filter((item) => item.category_id === category.id).length,
        );
      });

      const createdCategories: Category[] = [];
      const createdItems: MenuItem[] = [];

      for (const draftCategory of proposal.categories) {
        const categoryName = draftCategory.name.trim();
        if (!categoryName) continue;

        const targetCategory = await resolveImportCategory({
          draftCategory,
          restaurantId,
          categories,
          categoryByName,
          createdCategories,
        });

        if (!targetCategory) continue;

        const startingOrder = categoryItemsCount.get(targetCategory.id) || 0;
        const validItems = buildImportableItems(
          draftCategory,
          targetCategory.id,
          startingOrder,
        );

        if (validItems.length === 0) continue;

        const { data: insertedItems, error } = await supabase
          .from("menu_items")
          .insert(validItems)
          .select();

        if (error) {
          throw error;
        }

        categoryItemsCount.set(targetCategory.id, startingOrder + validItems.length);
        createdItems.push(...(insertedItems ?? []));
      }

      setCategories([...categories, ...createdCategories]);
      setItems([...items, ...createdItems]);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error("Error importing menu draft:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("editMenu.importUnexpectedError", "The import failed. Please try again."),
      );
    } finally {
      setIsImportingMenu(false);
    }
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className="app-empty-state">
          <h2>Please create a restaurant first in the Dashboard.</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="app-page-title">
              {t('editMenu.title', 'Edit Menu')}
            </h1>
            <p className="app-page-subtitle">
              {t('editMenu.subtitle', 'Organize your categories and items.')}
            </p>
          </div>
        </div>

        <div
          className="card mb-6 border-none bg-gradient-to-b from-app-surface to-app-surface-hover"
        >
          <div className="card-body flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="max-w-[560px]">
              <p className="mb-1.5 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-app-primary">
                {t("editMenu.importSellEyebrow", "Speed up setup")}
              </p>
              <h3 className="mb-1.5 text-[1.1rem] font-semibold">
                {t(
                  "editMenu.importSellTitle",
                  "Already have a printed or existing menu?",
                )}
              </h3>
              <p className="text-[0.94rem] text-app-text-muted">
                {t(
                  "editMenu.importSellSubtitle",
                  "Import a photo or PDF, review the draft, and add the items without rebuilding everything by hand.",
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="btn btn-primary whitespace-nowrap"
            >
              <FileUp size={18} />
              {t("editMenu.importCta", "Import menu")}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="h-px bg-gradient-to-r from-black/4 to-app-border" />
          <div className="text-center">
            <p className="mb-1 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-app-text-muted">
              {t("editMenu.manualDividerEyebrow", "Or")}
            </p>
            <p className="text-[0.96rem] font-semibold text-app-text">
              {hasExistingMenuItems
                ? t(
                    "editMenu.manualDividerTitleExisting",
                    "Or keep editing your menu manually",
                  )
                : t("editMenu.manualDividerTitleEmpty", "Build your menu from scratch")}
            </p>
          </div>
          <div className="h-px bg-gradient-to-r from-app-border to-black/4" />
        </div>

        {/* Add Category Form */}
        <div
          className="card mb-8 border-none bg-app-surface"
        >
          <div className="card-body">
            <form onSubmit={addCategory} className="flex flex-col items-center gap-4 md:flex-row">
              <input
                type="text"
                className="form-input flex-1"
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
            className="card mb-12 border-none bg-app-bg shadow-none"
          >
            <div className="p-0">
              <h3 className="mb-4 text-base font-semibold">
                {t('editMenu.addNewItem', 'Add New Item')}
              </h3>
              <form
                onSubmit={addItem}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
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
                  className="form-input md:col-span-2"
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
                  className="app-upload-trigger py-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 text-app-text-muted" />
                  <span className={`text-[0.9rem] ${newItemImageFile ? "text-app-text" : "text-app-text-muted"}`}>
                    {newItemImageFile
                      ? newItemImageFile.name
                      : t('editMenu.uploadImageOptional', 'Upload Image (Optional)')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewItemImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end md:col-span-2">
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
            <LoadingSpinner label="Loading menu" />
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
                    items={sortItemsForCategory(items, category)}
                    onDeleteCategory={deleteCategory}
                    onDeleteItem={deleteItem}
                    onEditItem={(item) => {
                      setEditingItem(item);
                      setEditingItemImageFile(null);
                    }}
                    onItemDragEnd={(e) => handleItemDragEnd(e, category.id)}
                    sensors={sensors}
                    currencySymbol={restaurant?.currency_symbol || "$"}
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
          <div className="app-modal-shell max-w-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[1.25rem] font-semibold">
                {t('editMenu.editItemTitle', 'Edit Item')}
              </h3>
              <button
                onClick={() => {
                  if (!uploading) setEditingItem(null);
                }}
                className="app-icon-button"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={updateItem} className="flex flex-col gap-4">
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label flex cursor-pointer items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={editingItem.is_available} 
                    onChange={e => setEditingItem({ ...editingItem, is_available: e.target.checked })} 
                    className="h-4 w-4"
                  />
                  {t('editMenu.itemIsAvailable', 'Item is Available (In Stock)')}
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">{t('editMenu.imageLabel', 'Image')}</label>
                <div className="flex items-center gap-4">
                  {editingItemImageFile || editingItem.image_url ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[0.5rem] border border-app-border">
                      <img
                        src={
                          editingItemImageFile
                            ? URL.createObjectURL(editingItemImageFile)
                            : editingItem.image_url!
                        }
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div
                    className="app-upload-trigger flex-1"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 text-app-text-muted" />
                    <span className={`truncate text-[0.9rem] ${editingItemImageFile ? "text-app-text" : "text-app-text-muted"}`}>
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
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditingItemImageFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
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

      {isImportModalOpen && (
        <MenuImportModal
          isOpen={isImportModalOpen}
          isImporting={isImportingMenu}
          onClose={() => {
            if (!isImportingMenu) {
              setIsImportModalOpen(false);
            }
          }}
          onImport={importMenuDraft}
        />
      )}
    </DashboardLayout>
  );
}

async function resolveImportCategory({
  draftCategory,
  restaurantId,
  categories,
  categoryByName,
  createdCategories,
}: {
  draftCategory: MenuImportDraftCategory;
  restaurantId: string;
  categories: Category[];
  categoryByName: Map<string, Category>;
  createdCategories: Category[];
}): Promise<Category | null> {
  const categoryKey = normalizeCategoryKey(draftCategory.name);
  if (!categoryKey) return null;

  const existingCategory = categoryByName.get(categoryKey);
  if (existingCategory) {
    return existingCategory;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name: draftCategory.name.trim(),
      order_index: categories.length + createdCategories.length,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  categoryByName.set(categoryKey, data);
  createdCategories.push(data);
  return data;
}

function buildImportableItems(
  draftCategory: MenuImportDraftCategory,
  categoryId: string,
  startingOrder: number,
) {
  return draftCategory.items
    .map((item, index) => ({
      category_id: categoryId,
      name: item.name.trim(),
      description: item.description.trim() || null,
      price: parseImportedPrice(item.price),
      image_url: null,
      order_index: startingOrder + index,
    }))
    .filter((item) => item.name && item.price !== null)
    .map((item) => ({
      ...item,
      price: item.price as number,
    }));
}

function normalizeCategoryKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseImportedPrice(value: string): number | null {
  const sanitized = value.replace(/[^\d,.-]/g, "").trim();
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.includes(",") && !sanitized.includes(".")
    ? sanitized.replace(",", ".")
    : sanitized.replace(/,/g, "");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
