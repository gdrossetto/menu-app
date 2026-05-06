import { GripVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter } from "@dnd-kit/core";
import type {
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SortableMenuItem from "./SortableMenuItem";
import type { Category, MenuItem } from "../types/menu";

interface SortableCategoryProps {
  category: Category;
  items: MenuItem[];
  sensors: SensorDescriptor<SensorOptions>[];
  currencySymbol: string;
  onDeleteCategory: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: MenuItem) => void;
  onItemDragEnd: (event: DragEndEvent) => void;
}

export default function SortableCategory({
  category,
  items,
  sensors,
  currencySymbol,
  onDeleteCategory,
  onDeleteItem,
  onEditItem,
  onItemDragEnd,
}: SortableCategoryProps) {
  const { t } = useTranslation();
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
          onClick={() => onDeleteCategory(category.id)}
          className="btn btn-ghost btn-danger"
          style={{ padding: "0.4rem" }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
          {t("editMenu.noItemsInCategory", "No items in this category yet.")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onItemDragEnd}
        >
          <div className="flex flex-col gap-4" style={{ paddingTop: "0.35rem" }}>
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableMenuItem
                  key={item.id}
                  item={item}
                  currencySymbol={currencySymbol}
                  onDelete={onDeleteItem}
                  onEdit={onEditItem}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </div>
  );
}
