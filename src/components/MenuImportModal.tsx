import { useRef, useState } from "react";
import {
  Check,
  FileImage,
  FileUp,
  FileText,
  LoaderCircle,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractMenuImportProposal, updateImportCategory, updateImportItem } from "../lib/menuImport";
import type { MenuImportProposal } from "../types/menu";

interface MenuImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  onClose: () => void;
  onImport: (proposal: MenuImportProposal) => Promise<void>;
}

export default function MenuImportModal({
  isOpen,
  isImporting,
  onClose,
  onImport,
}: MenuImportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proposal, setProposal] = useState<MenuImportProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) {
    return null;
  }

  const itemCount = proposal?.categories.reduce(
    (count, category) => count + category.items.length,
    0,
  ) || 0;

  const analyzeFile = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const nextProposal = await extractMenuImportProposal(selectedFile);
      setProposal(nextProposal);
      if (nextProposal.categories.length === 0) {
        setError(
          t(
            "editMenu.importNoItemsDetected",
            "We could not confidently detect any menu items. Try a clearer photo or a cleaner PDF.",
          ),
        );
      }
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : t(
              "editMenu.importUnexpectedError",
              "The import failed. Please try again.",
            ),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!proposal) return;
    await onImport(proposal);
  };

  return (
    <div className="modal-overlay" onClick={() => !isAnalyzing && !isImporting && onClose()}>
      <div
        className="modal-content"
        style={{ maxWidth: "880px", padding: "0" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "1.5rem 1.5rem 1rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                color: "var(--color-primary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <Sparkles size={14} />
              {t("editMenu.importAiBadge", "AI import")}
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              {t("editMenu.importTitle", "Import menu from photo or PDF")}
            </h3>
            <p style={{ color: "var(--color-text-muted)", maxWidth: "580px" }}>
              {t(
                "editMenu.importSubtitle",
                "Upload a current menu and we will draft categories and items for review before anything is added.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isAnalyzing || isImporting}
            style={{ padding: "0.45rem" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {!proposal ? (
            <>
              <div
                style={{
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "2rem",
                  background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      width: "3.25rem",
                      height: "3.25rem",
                      borderRadius: "999px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "var(--color-surface-hover)",
                    }}
                  >
                    {selectedFile?.type === "application/pdf" ? (
                      <FileText size={18} />
                    ) : (
                      <FileImage size={18} />
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
                      {selectedFile
                        ? selectedFile.name
                        : t("editMenu.importChooseFile", "Choose a menu photo or PDF")}
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
                      {t(
                        "editMenu.importFileHint",
                        "Supported formats: JPG, PNG, WebP, and PDF. Clear scans work best.",
                      )}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                    >
                      <FileUp size={16} />
                      {selectedFile
                        ? t("editMenu.importReplaceFile", "Replace file")
                        : t("editMenu.importBrowse", "Browse files")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={analyzeFile}
                      disabled={!selectedFile || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <LoaderCircle size={16} className="spin" />
                          {t("editMenu.importAnalyzing", "Analyzing...")}
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          {t("editMenu.importAnalyze", "Create import draft")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setSelectedFile(nextFile);
                    setError(null);
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {[
                  t("editMenu.importStepOne", "Extract categories, items, descriptions, and prices"),
                  t("editMenu.importStepTwo", "Keep uncertainty in warnings instead of guessing silently"),
                  t("editMenu.importStepThree", "Let you review and edit the draft before import"),
                ].map((step) => (
                  <div
                    key={step}
                    style={{
                      padding: "0.9rem 1rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-surface)",
                      fontSize: "0.92rem",
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                  padding: "1rem 1.1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-surface-hover)",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600 }}>
                    {proposal.sourceFileName}
                  </p>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    {proposal.categories.length} {t("editMenu.importCategoriesCount", "categories")} · {itemCount} {t("editMenu.importItemsCount", "items")}
                    {proposal.detectedLanguage
                      ? ` · ${t("editMenu.importDetectedLanguage", "detected language")}: ${proposal.detectedLanguage}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setProposal(null);
                    setError(null);
                  }}
                  disabled={isImporting}
                >
                  {t("editMenu.importStartOver", "Start over")}
                </button>
              </div>

              {proposal.warnings.length > 0 && (
                <div
                  style={{
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #f2d8a7",
                    backgroundColor: "#fff8eb",
                    padding: "1rem 1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                    <TriangleAlert size={16} />
                    {t("editMenu.importWarnings", "Warnings to review")}
                  </div>
                  {proposal.warnings.map((warning) => (
                    <p key={warning} style={{ fontSize: "0.92rem", color: "#7c5f1f" }}>
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "50vh", overflowY: "auto", paddingRight: "0.25rem" }}>
                {proposal.categories.map((category) => (
                  <section
                    key={category.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.9rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        className="form-input"
                        value={category.name}
                        onChange={(event) =>
                          setProposal((current) =>
                            current
                              ? updateImportCategory(current, category.id, (draftCategory) => ({
                                  ...draftCategory,
                                  name: event.target.value,
                                }))
                              : current,
                          )
                        }
                        placeholder={t("editMenu.importCategoryName", "Category name")}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-danger"
                        onClick={() =>
                          setProposal((current) =>
                            current
                              ? {
                                  ...current,
                                  categories: current.categories.filter(
                                    (draftCategory) => draftCategory.id !== category.id,
                                  ),
                                }
                              : current,
                          )
                        }
                        style={{ padding: "0.45rem" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) 120px auto",
                            gap: "0.75rem",
                            alignItems: "start",
                          }}
                          className="menu-import-item-grid"
                        >
                          <input
                            className="form-input"
                            value={item.name}
                            onChange={(event) =>
                              setProposal((current) =>
                                current
                                  ? updateImportItem(current, category.id, item.id, (draftItem) => ({
                                      ...draftItem,
                                      name: event.target.value,
                                    }))
                                  : current,
                              )
                            }
                            placeholder={t("editMenu.itemName", "Item Name")}
                          />
                          <input
                            className="form-input"
                            value={item.description}
                            onChange={(event) =>
                              setProposal((current) =>
                                current
                                  ? updateImportItem(current, category.id, item.id, (draftItem) => ({
                                      ...draftItem,
                                      description: event.target.value,
                                    }))
                                  : current,
                              )
                            }
                            placeholder={t("editMenu.descriptionOptional", "Description (Optional)")}
                          />
                          <input
                            className="form-input"
                            value={item.price}
                            onChange={(event) =>
                              setProposal((current) =>
                                current
                                  ? updateImportItem(current, category.id, item.id, (draftItem) => ({
                                      ...draftItem,
                                      price: event.target.value,
                                    }))
                                  : current,
                              )
                            }
                            placeholder={t("editMenu.priceLabel", "Price")}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() =>
                              setProposal((current) =>
                                current
                                  ? updateImportCategory(current, category.id, (draftCategory) => ({
                                      ...draftCategory,
                                      items: draftCategory.items.filter(
                                        (draftItem) => draftItem.id !== item.id,
                                      ),
                                    }))
                                  : current,
                              )
                            }
                            style={{ padding: "0.7rem 0.55rem" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid #ffd4d4",
                backgroundColor: "#fff5f5",
                color: "#9d2b2b",
                padding: "0.95rem 1rem",
                fontSize: "0.92rem",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1rem 1.5rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isAnalyzing || isImporting}
          >
            {t("editMenu.cancel", "Cancel")}
          </button>
          {proposal && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={isImporting || itemCount === 0}
            >
              {isImporting ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  {t("editMenu.importSaving", "Importing...")}
                </>
              ) : (
                <>
                  <Check size={16} />
                  {t("editMenu.importConfirm", "Import reviewed items")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
