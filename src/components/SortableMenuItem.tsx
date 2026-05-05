import { Edit2, EyeOff, GripVertical, Image as ImageIcon, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    opacity: isDragging ? 0.4 : item.is_available ? 1 : 0.6,
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
              filter: item.is_available ? "none" : "grayscale(100%)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <p style={{ fontWeight: 500, fontSize: "1rem" }}>{item.name}</p>
            {!item.is_available && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.2rem",
                  fontSize: "0.75rem",
                  backgroundColor: "var(--color-surface-hover)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                }}
              >
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
      <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
        <span
          style={{
            fontWeight: 600,
            color: "var(--color-text)",
            marginRight: "1rem",
          }}
        >
          {currencySymbol}
          {item.price.toFixed(2)}
        </span>
        <button
          onClick={() => onEdit(item)}
          className="btn btn-ghost"
          style={{
            padding: "0.4rem",
            color: "var(--color-text-muted)",
          }}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="btn btn-ghost"
          style={{ padding: "0.4rem", color: "var(--color-danger)" }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
