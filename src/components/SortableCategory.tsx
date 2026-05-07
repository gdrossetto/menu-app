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
      <div className="mb-4 flex items-center justify-between border-b border-app-border pb-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <div
            {...attributes}
            {...listeners}
            className="flex cursor-grab touch-none text-app-text-muted"
          >
            <GripVertical className="h-[18px] w-[18px]" />
          </div>
          {category.name}
        </h2>
        <button
          onClick={() => onDeleteCategory(category.id)}
          className="btn btn-ghost btn-danger p-[0.4rem]"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[0.875rem] text-app-text-muted">
          {t("editMenu.noItemsInCategory", "No items in this category yet.")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onItemDragEnd}
        >
          <div className="flex flex-col gap-4 pt-1.5">
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
