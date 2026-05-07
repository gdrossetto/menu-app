import { useRef, useState } from "react";
import {
  Check,
  FileImage,
  FileText,
  FileUp,
  LoaderCircle,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  extractMenuImportProposal,
  updateImportCategory,
  updateImportItem,
} from "../lib/menuImport";
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

  const itemCount =
    proposal?.categories.reduce(
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
    <div
      className="modal-overlay"
      onClick={() => !isAnalyzing && !isImporting && onClose()}
    >
      <div
        className="app-modal-shell max-w-[880px] p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-modal-header">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-app-primary">
              <Sparkles size={14} />
              {t("editMenu.importAiBadge", "AI import")}
            </div>
            <h3 className="mb-1.5 text-[1.3rem] font-semibold">
              {t("editMenu.importTitle", "Import menu from photo or PDF")}
            </h3>
            <p className="max-w-[580px] text-app-text-muted">
              {t(
                "editMenu.importSubtitle",
                "Upload a current menu and we will draft categories and items for review before anything is added.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button"
            disabled={isAnalyzing || isImporting}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {!proposal ? (
            <>
              <div className="rounded-[1.25rem] border border-dashed border-app-border bg-gradient-to-b from-white to-slate-50 p-8">
                <div className="flex flex-col items-center gap-3.5 text-center">
                  <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-app-surface-hover">
                    {selectedFile?.type === "application/pdf" ? (
                      <FileText size={18} />
                    ) : (
                      <FileImage size={18} />
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 font-semibold">
                      {selectedFile
                        ? selectedFile.name
                        : t("editMenu.importChooseFile", "Choose a menu photo or PDF")}
                    </p>
                    <p className="text-[0.92rem] text-app-text-muted">
                      {t(
                        "editMenu.importFileHint",
                        "Supported formats: JPG, PNG, WebP, and PDF. Clear scans work best.",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
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
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setSelectedFile(nextFile);
                    setError(null);
                  }}
                />
              </div>

              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                {[
                  t(
                    "editMenu.importStepOne",
                    "Extract categories, items, descriptions, and prices",
                  ),
                  t(
                    "editMenu.importStepTwo",
                    "Keep uncertainty in warnings instead of guessing silently",
                  ),
                  t(
                    "editMenu.importStepThree",
                    "Let you review and edit the draft before import",
                  ),
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-[0.75rem] border border-app-border bg-app-surface px-4 py-3.5 text-[0.92rem]"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[0.75rem] bg-app-surface-hover px-[1.1rem] py-4">
                <div>
                  <p className="font-semibold">{proposal.sourceFileName}</p>
                  <p className="text-[0.9rem] text-app-text-muted">
                    {proposal.categories.length}{" "}
                    {t("editMenu.importCategoriesCount", "categories")} ·{" "}
                    {itemCount} {t("editMenu.importItemsCount", "items")}
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
                <div className="app-warning-panel">
                  <div className="flex items-center gap-2 font-semibold">
                    <TriangleAlert size={16} />
                    {t("editMenu.importWarnings", "Warnings to review")}
                  </div>
                  {proposal.warnings.map((warning) => (
                    <p key={warning} className="text-[0.92rem] text-amber-800">
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
                {proposal.categories.map((category) => (
                  <section
                    key={category.id}
                    className="flex flex-col gap-4 rounded-[1.25rem] border border-app-border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        className="form-input"
                        value={category.name}
                        onChange={(event) =>
                          setProposal((current) =>
                            current
                              ? updateImportCategory(
                                  current,
                                  category.id,
                                  (draftCategory) => ({
                                    ...draftCategory,
                                    name: event.target.value,
                                  }),
                                )
                              : current,
                          )
                        }
                        placeholder={t(
                          "editMenu.importCategoryName",
                          "Category name",
                        )}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-danger p-[0.45rem]"
                        onClick={() =>
                          setProposal((current) =>
                            current
                              ? {
                                  ...current,
                                  categories: current.categories.filter(
                                    (draftCategory) =>
                                      draftCategory.id !== category.id,
                                  ),
                                }
                              : current,
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="menu-import-item-grid grid items-start gap-3 [grid-template-columns:minmax(0,1.2fr)_minmax(0,1fr)_120px_auto]"
                        >
                          <input
                            className="form-input"
                            value={item.name}
                            onChange={(event) =>
                              setProposal((current) =>
                                current
                                  ? updateImportItem(
                                      current,
                                      category.id,
                                      item.id,
                                      (draftItem) => ({
                                        ...draftItem,
                                        name: event.target.value,
                                      }),
                                    )
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
                                  ? updateImportItem(
                                      current,
                                      category.id,
                                      item.id,
                                      (draftItem) => ({
                                        ...draftItem,
                                        description: event.target.value,
                                      }),
                                    )
                                  : current,
                              )
                            }
                            placeholder={t(
                              "editMenu.descriptionOptional",
                              "Description (Optional)",
                            )}
                          />
                          <input
                            className="form-input"
                            value={item.price}
                            onChange={(event) =>
                              setProposal((current) =>
                                current
                                  ? updateImportItem(
                                      current,
                                      category.id,
                                      item.id,
                                      (draftItem) => ({
                                        ...draftItem,
                                        price: event.target.value,
                                      }),
                                    )
                                  : current,
                              )
                            }
                            placeholder={t("editMenu.priceLabel", "Price")}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost px-[0.55rem] py-[0.7rem]"
                            onClick={() =>
                              setProposal((current) =>
                                current
                                  ? updateImportCategory(
                                      current,
                                      category.id,
                                      (draftCategory) => ({
                                        ...draftCategory,
                                        items: draftCategory.items.filter(
                                          (draftItem) =>
                                            draftItem.id !== item.id,
                                        ),
                                      }),
                                    )
                                  : current,
                              )
                            }
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

          {error && <div className="app-error-panel">{error}</div>}
        </div>

        <div className="app-modal-footer">
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
