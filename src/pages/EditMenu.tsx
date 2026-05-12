import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, FileUp, Lock, Plus, X, Upload, Smartphone, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import MenuImportModal from "../components/MenuImportModal";
import SortableCategory from "../components/SortableCategory";
import { useConfirm } from "../components/confirmContext";
import { useToast } from "../components/toastContext";
import {
  hasAiImportAccess,
  startAiImportCheckout,
  syncBillingStatus,
} from "../lib/billing";
import { supabase } from "../lib/supabase";
import { fetchMenuData as fetchRestaurantMenuData, sortItemsForCategory } from "../lib/menuData";
import { ImageUploadError, uploadMenuImage } from "../lib/imageUpload";
import { getErrorMessage, logger } from "../lib/logger";
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImportingMenu, setIsImportingMenu] = useState(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const { t } = useTranslation();
  const toast = useToast();
  const requestConfirmation = useConfirm();
  const location = useLocation();
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
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);

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
      logger.error("Failed to load menu editor data.", error, { restaurantId });
      toast.error(
        t("editMenu.loadError", "Could not load menu"),
        t("common.tryAgain", "Please try again. If it keeps failing, contact support."),
      );
    }
    setLoading(false);
  }, [restaurantId, t, toast]);

  useEffect(() => {
    void Promise.resolve().then(loadMenuData);
  }, [loadMenuData]);

  useEffect(() => {
    if (!restaurant || !location.search.includes("billing=success")) return;
    if (hasAiImportAccess(restaurant)) return;
    if (!restaurant.stripe_customer_id) return;

    let active = true;

    void (async () => {
      try {
        setIsRedirectingToCheckout(true);
        await syncBillingStatus();
        if (active) {
          await loadMenuData();
        }
      } catch (error) {
        logger.error("Failed to sync billing after menu checkout redirect.", error, {
          restaurantId: restaurant.id,
          stripeCustomerId: restaurant.stripe_customer_id,
        });
      } finally {
        if (active) {
          setIsRedirectingToCheckout(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadMenuData, location.search, restaurant]);

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurantId) return null;
    try {
      const publicUrl = await uploadMenuImage(rawFile, restaurantId);

      if (!publicUrl) {
        logger.error("Menu image upload returned no public URL.", undefined, {
          restaurantId,
          fileName: rawFile.name,
          fileType: rawFile.type,
          fileSize: rawFile.size,
        });
        toast.error(
          t("editMenu.imageUploadError", "Image upload failed"),
          t(
            "editMenu.imageUploadErrorDescription",
            "Please try another image or check that the menu-images storage bucket exists.",
          ),
        );
      }

      return publicUrl;
    } catch (error) {
      logger.error("Menu image upload failed.", error, {
        restaurantId,
        fileName: rawFile.name,
        fileType: rawFile.type,
        fileSize: rawFile.size,
        hint: error instanceof ImageUploadError ? error.details?.hint : undefined,
      });
      toast.error(
        t("editMenu.imageUploadError", "Image upload failed"),
        error instanceof ImageUploadError && error.details?.hint
          ? t("editMenu.imageUploadPolicyHint", "Storage permissions need to be fixed in Supabase.")
          : t(
              "editMenu.imageUploadErrorDescription",
              "Please try another image or check that the menu-images storage bucket exists.",
            ),
      );
      return null;
    }
  };

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !restaurantId) return;

    const { data, error } = await supabase
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
      toast.success(
        t("editMenu.categoryAdded", "Category added"),
        t("editMenu.categoryAddedDescription", "Your category is ready for items."),
      );
      // Auto-focus after adding
      setTimeout(() => categoryInputRef.current?.focus(), 100);
    } else {
      logger.error("Failed to add category.", error, {
        restaurantId,
        categoryName: newCategoryName,
      });
      toast.error(
        t("editMenu.categoryAddError", "Could not add category"),
        error?.message ?? t("common.tryAgain", "Please try again."),
      );
    }
  };

  const deleteCategory = async (id: string) => {
    const shouldDelete = await requestConfirmation({
      title: t("editMenu.deleteCategoryTitle", "Delete category?"),
      description: t(
        "editMenu.deleteCategoryDescription",
        "This will also delete every item in this category.",
      ),
      confirmLabel: t("editMenu.deleteConfirm", "Delete"),
      cancelLabel: t("editMenu.cancel", "Cancel"),
      tone: "danger",
    });

    if (!shouldDelete) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      logger.error("Failed to delete category.", error, { restaurantId, categoryId: id });
      toast.error(t("editMenu.categoryDeleteError", "Could not delete category"), error.message);
      return;
    }

    setCategories(categories.filter((c) => c.id !== id));
    setItems(items.filter((i) => i.category_id !== id));
    toast.success(t("editMenu.categoryDeleted", "Category deleted"));
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
      logger.error("Failed to update category order.", error, { restaurantId });
      toast.error(
        t("editMenu.categoryOrderError", "Could not save category order"),
        t("editMenu.revertingChanges", "We reverted the order so your menu stays consistent."),
      );
      void loadMenuData();
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const categoryItems = items
      .filter((i) => i.category_id === categoryId)
      .sort((a, b) => a.order_index - b.order_index);
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
      logger.error("Failed to update item order.", error, { restaurantId, categoryId });
      toast.error(
        t("editMenu.itemOrderError", "Could not save item order"),
        t("editMenu.revertingChanges", "We reverted the order so your menu stays consistent."),
      );
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
      if (!uploadedUrl) {
        setUploading(false);
        return;
      }
      imageUrl = uploadedUrl;
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
      toast.success(t("editMenu.itemAdded", "Item added"));
      // Auto-focus after adding
      setTimeout(() => itemInputRef.current?.focus(), 100);
    } else {
      logger.error("Failed to add menu item.", error, {
        restaurantId,
        categoryId: newItem.category_id,
        itemName: newItem.name,
      });
      toast.error(
        t("editMenu.itemAddError", "Could not add item"),
        error?.message ?? t("common.tryAgain", "Please try again."),
      );
    }
    setUploading(false);
  };

  const deleteItem = async (id: string) => {
    const shouldDelete = await requestConfirmation({
      title: t("editMenu.deleteItemTitle", "Delete item?"),
      description: t(
        "editMenu.deleteItemDescription",
        "This item will be removed from your menu.",
      ),
      confirmLabel: t("editMenu.deleteConfirm", "Delete"),
      cancelLabel: t("editMenu.cancel", "Cancel"),
      tone: "danger",
    });

    if (!shouldDelete) return;

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      logger.error("Failed to delete menu item.", error, { restaurantId, itemId: id });
      toast.error(t("editMenu.itemDeleteError", "Could not delete item"), error.message);
      return;
    }
    setItems(items.filter((i) => i.id !== id));
    toast.success(t("editMenu.itemDeleted", "Item deleted"));
  };

  const updateItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setUploading(true);
    let imageUrl = editingItem.image_url;
    if (editingItemImageFile) {
      const uploadedUrl = await uploadImage(editingItemImageFile);
      if (!uploadedUrl) {
        setUploading(false);
        return;
      }
      imageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        image_url: imageUrl || null,
        is_available: editingItem.is_available,
      })
      .eq("id", editingItem.id)
      .select()
      .single();

    if (data) {
      setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
      setEditingItem(null);
      setEditingItemImageFile(null);
      toast.success(t("editMenu.itemUpdated", "Item updated"));
    } else {
      logger.error("Failed to update menu item.", error, {
        restaurantId,
        itemId: editingItem.id,
      });
      toast.error(
        t("editMenu.itemUpdateError", "Could not update item"),
        error?.message ?? t("common.tryAgain", "Please try again."),
      );
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
      toast.success(
        t("editMenu.importSuccess", "Import complete"),
        t("editMenu.importSuccessDescription", "Your reviewed items were added to the menu."),
      );
    } catch (error) {
      const message = getErrorMessage(
        error,
        t("editMenu.importUnexpectedError", "The import failed. Please try again."),
      );
      logger.error("Failed to import reviewed menu draft.", error, { restaurantId });
      toast.error(t("editMenu.importError", "Import failed"), message);
    } finally {
      setIsImportingMenu(false);
    }
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Store size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            {t("editMenu.noRestaurant", "No Restaurant Found")}
          </h2>
          <p className="max-w-md text-slate-500 mb-8">
            {t("editMenu.noRestaurantDesc", "Please create a restaurant first in the Dashboard before managing your menu.")}
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            {t("editMenu.goToDashboard", "Go to Dashboard")}
          </Link>
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
          <div className="flex items-center gap-2">
            {hasExistingMenuItems && hasAiImportAccess(restaurant) && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="btn btn-outline hidden sm:flex"
              >
                <FileUp size={18} />
                {t("editMenu.importCta", "Import")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="btn btn-outline hidden sm:flex"
            >
              <Smartphone size={18} />
              {t("editMenu.livePreview", "Live Preview")}
            </button>
          </div>
        </div>

        {location.search.includes("billing=success") && (
          <div className="mb-6 rounded-[0.75rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.92rem] text-emerald-800">
            {t(
              "settings.billingSuccess",
              "Your checkout finished. If your plan does not update immediately, refresh in a few seconds.",
            )}
          </div>
        )}

        {location.search.includes("billing=cancel") && (
          <div className="mb-6 rounded-[0.75rem] border border-app-border bg-app-bg px-4 py-3 text-[0.92rem] text-app-text-muted">
            {t(
              "settings.billingCanceled",
              "Checkout was canceled. Your current plan has not changed.",
            )}
          </div>
        )}

        {!hasExistingMenuItems && (
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
                  {hasAiImportAccess(restaurant)
                    ? t(
                        "editMenu.importSellSubtitle",
                        "Import a photo or PDF, review the draft, and add the items without rebuilding everything by hand.",
                      )
                    : t(
                        "editMenu.importSellSubtitleLocked",
                        "AI import is part of the Professional plan. Upgrade to turn existing photos and PDFs into reviewed menu drafts.",
                      )}
                </p>
              </div>

              {hasAiImportAccess(restaurant) ? (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="btn btn-primary whitespace-nowrap"
                >
                  <FileUp size={18} />
                  {t("editMenu.importCta", "Import menu")}
                </button>
              ) : (
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-app-surface px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-app-text-muted shadow-app-sm">
                    <Lock className="h-3.5 w-3.5" />
                    {t("editMenu.importLockedBadge", "Professional")}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsRedirectingToCheckout(true);
                        await startAiImportCheckout("/dashboard/menu");
                      } catch (error) {
                        const message = getErrorMessage(
                          error,
                          t(
                            "editMenu.importUpgradeError",
                            "We could not start checkout right now.",
                          ),
                        );
                        logger.error("Failed to start checkout from menu editor.", error, {
                          restaurantId,
                          planTier: restaurant?.plan_tier,
                        });
                        toast.error(t("settings.billingCheckoutFailed", "Could not start checkout"), message);
                      } finally {
                        setIsRedirectingToCheckout(false);
                      }
                    }}
                    className="btn btn-primary whitespace-nowrap"
                    disabled={isRedirectingToCheckout}
                  >
                    <ArrowRight className="h-4 w-4" />
                    {isRedirectingToCheckout
                      ? t("editMenu.importUpgradeLoading", "Redirecting...")
                      : t("editMenu.importUpgradeCta", "Upgrade for AI import")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!hasExistingMenuItems && (
          <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="h-px bg-gradient-to-r from-black/4 to-app-border" />
            <div className="text-center">
              <p className="mb-1 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-app-text-muted">
                {t("editMenu.manualDividerEyebrow", "Or")}
              </p>
              <p className="text-[0.96rem] font-semibold text-app-text">
                {t("editMenu.manualDividerTitleEmpty", "Build your menu from scratch")}
              </p>
            </div>
            <div className="h-px bg-gradient-to-r from-app-border to-black/4" />
          </div>
        )}

        {/* Add Category Form */}
        <div className="card mb-8 bg-app-surface">
          <div className="card-body">
            <h3 className="mb-4 text-[1.1rem] font-semibold">
              {t('editMenu.addNewCategory', 'Add New Category')}
            </h3>
            <form onSubmit={addCategory} className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <input
                type="text"
                ref={categoryInputRef}
                className="form-input w-full sm:flex-1"
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
          <div className="card mb-12 bg-app-surface">
            <div className="card-body">
              <h3 className="mb-4 text-[1.1rem] font-semibold">
                {t('editMenu.addNewItem', 'Add New Item')}
              </h3>
              <form
                onSubmit={addItem}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                <select
                  aria-label={t("editMenu.selectCategory", "Select Category...")}
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
                  ref={itemInputRef}
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

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6" onClick={() => setIsPreviewOpen(false)}>
          <div 
            className="relative flex h-full w-full max-w-[400px] flex-col overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-white shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-200" />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            >
              <X size={16} />
            </button>
            <div className="h-10 w-full shrink-0 bg-white" />
            <iframe 
              src={`/m/${restaurantId}?previewTheme=${restaurant?.menu_theme}`} 
              className="h-full w-full flex-1 border-0" 
              title="Live Preview"
            />
          </div>
        </div>
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
