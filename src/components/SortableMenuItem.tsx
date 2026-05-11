import { Edit2, EyeOff, GripVertical, Image as ImageIcon, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import type { MenuItem } from "../types/menu";

interface SortableMenuItemProps {
  item: MenuItem;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: MenuItem) => void;
}

export default function SortableMenuItem({
  item,
  currencySymbol,
  onDelete,
  onEdit,
}: SortableMenuItemProps) {
  const { t } = useTranslation();
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
    opacity: isDragging ? 0.95 : item.is_available ? 1 : 0.6,
    position: "relative" as const,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={`card flex flex-wrap items-center justify-between gap-4 border p-4 transition-all duration-200 ${
        isDragging
          ? "scale-[1.02] border-app-primary bg-white shadow-app-lg"
          : "border-transparent shadow-app-sm"
      }`}
      style={style}
    >
      <div className="flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="flex cursor-grab touch-none text-app-text-muted"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className={`h-12 w-12 rounded-[0.5rem] object-cover ${item.is_available ? "" : "grayscale"}`}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-[0.5rem] bg-app-surface-hover">
            <ImageIcon className="h-5 w-5 text-app-border" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-medium">{item.name}</p>
            {!item.is_available && (
              <span className="flex items-center gap-1 rounded-[0.5rem] bg-app-surface-hover px-1.5 py-0.5 text-[0.75rem] font-semibold text-app-text-muted">
                <EyeOff size={12} /> {t("editMenu.hidden", "Hidden")}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 text-[0.85rem] text-app-text-muted">
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="mr-4 font-semibold text-app-text">
          {currencySymbol}
          {item.price.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="btn btn-ghost p-[0.4rem] text-app-text-muted"
          aria-label={t("editMenu.editItemAction", {
            defaultValue: "Edit {{name}}",
            name: item.name,
          })}
        >
          <Edit2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="btn btn-ghost p-[0.4rem] text-app-danger"
          aria-label={t("editMenu.deleteItemAction", {
            defaultValue: "Delete {{name}}",
            name: item.name,
          })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
