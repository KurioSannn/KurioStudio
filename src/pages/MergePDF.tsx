import React, { useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { formatBytes } from "@/src/lib/utils";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderUp,
  GripVertical,
  Layers,
  Trash2,
} from "lucide-react";

interface PdfMergeItem {
  id: string;
  file: File;
  pageCount: number;
}

const ACCEPTED_EXTENSIONS = [".pdf"];
const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024;

function createLocalId(file: File) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${file.name}-${file.size}-${randomId}`;
}

function isAcceptedPdfFile(file: File) {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return extension === ".pdf" || file.type === "application/pdf";
}

function formatMergedName(files: PdfMergeItem[]) {
  if (files.length === 1) {
    return files[0].file.name.replace(/\.pdf$/i, "") || "kurio-merged";
  }
  return `kurio-merged-${files.length}-pdfs`;
}

async function loadPdfPageCount(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPageCount();
}

function getPdfErrorMessage(error: any, fallback: string) {
  const rawMessage = String(error?.message || error || "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes("encrypted") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("parse encrypted")
  ) {
    return "Password-protected or encrypted PDFs are not supported yet. Please unlock the PDF first, then upload it again.";
  }

  return error?.message || fallback;
}

export function MergePDF() {
  const inputRef = useRef<HTMLInputElement>(null);
  const outputUrlRef = useRef<string | null>(null);
  const [pdfs, setPdfs] = useState<PdfMergeItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedSize, setMergedSize] = useState<number | undefined>(undefined);
  const [draggedPdfId, setDraggedPdfId] = useState<string | null>(null);

  useEffect(() => {
    outputUrlRef.current = mergedUrl;
  }, [mergedUrl]);

  useEffect(() => {
    return () => {
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, []);

  const resetOutput = () => {
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setMergedUrl(null);
    setMergedSize(undefined);
    setSuccessText(null);
    setErrorText(null);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    resetOutput();
    const files = Array.from(fileList);
    const validFiles = files.filter(isAcceptedPdfFile);
    const rejectedFiles = files.filter((file) => !isAcceptedPdfFile(file));
    const queuedSize = pdfs.reduce((total, item) => total + item.file.size, 0);
    const selectedSize = validFiles.reduce((total, file) => total + file.size, 0);

    if (rejectedFiles.length > 0) {
      setErrorText(
        `Rejected unsupported file${rejectedFiles.length === 1 ? "" : "s"}: ${rejectedFiles
          .map((file) => file.name)
          .join(", ")}. Please use PDF files only.`
      );
      rejectedFiles.forEach((file) => {
        trackEvent("conversion_failed", {
          toolId: "pdf-merge",
          message: `Unsupported file rejected: ${file.name}`,
          fileType: file.type || file.name,
        });
      });
    }

    if (validFiles.length === 0) {
      if (rejectedFiles.length === 0) {
        setErrorText("Choose at least two PDF files to merge.");
      }
      return;
    }

    if (queuedSize + selectedSize > MAX_TOTAL_UPLOAD_BYTES) {
      setErrorText(
        `Total PDF queue is limited to ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)}. Current queue is ${formatBytes(
          queuedSize
        )}, selected files add ${formatBytes(selectedSize)}.`
      );
      trackEvent("conversion_failed", {
        toolId: "pdf-merge",
        message: "Total upload size exceeded",
        fileSize: queuedSize + selectedSize,
        limit: MAX_TOTAL_UPLOAD_BYTES,
      });
      return;
    }

    setLoading(true);
    const loadedItems: PdfMergeItem[] = [];

    try {
      for (const file of validFiles) {
        const pageCount = await loadPdfPageCount(file);
        if (pageCount <= 0) {
          throw new Error(`${file.name} does not contain any pages.`);
        }

        loadedItems.push({
          id: createLocalId(file),
          file,
          pageCount,
        });
        trackEvent("file_processed", {
          toolId: "pdf-merge",
          fileType: file.type || "application/pdf",
          fileSize: file.size,
          pages: pageCount,
        });
      }

      setPdfs((current) => [...current, ...loadedItems]);
      if (rejectedFiles.length === 0) setErrorText(null);
    } catch (error: any) {
      const message = getPdfErrorMessage(error, "Could not read one of the PDF files.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "pdf-merge",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const removePdf = (id: string) => {
    resetOutput();
    setPdfs((current) => current.filter((item) => item.id !== id));
  };

  const movePdf = (index: number, direction: -1 | 1) => {
    resetOutput();
    setPdfs((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const reorderPdf = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    resetOutput();
    setPdfs((current) => {
      const draggedIndex = current.findIndex((item) => item.id === draggedId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (draggedIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedItem);
      return next;
    });
  };

  const clearAll = () => {
    setPdfs([]);
    resetOutput();
    if (inputRef.current) inputRef.current.value = "";
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) {
      setErrorText("Add at least two PDF files before merging.");
      return;
    }

    setLoading(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const outputPdf = await PDFDocument.create();

      for (const item of pdfs) {
        const sourceBytes = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(sourceBytes);
        const pageIndexes = sourcePdf.getPageIndices();
        const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes);
        copiedPages.forEach((page) => outputPdf.addPage(page));
      }

      const mergedBytes = await outputPdf.save();
      if (mergedBytes.length === 0) {
        throw new Error("PDF output is empty. No file was generated.");
      }

      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (mergedUrl) URL.revokeObjectURL(mergedUrl);
      setMergedUrl(url);
      setMergedSize(blob.size);
      setSuccessText(`Merged ${pdfs.length} PDF files into ${totalPages} pages successfully.`);

      addToWorkspaceHistory({
        toolId: "pdf-merge",
        toolName: "Merge PDF Docs",
        fileName: `${formatMergedName(pdfs)}.pdf`,
        fileSize: totalInputSize,
        outputType: "PDF",
        status: "completed",
      });
      trackEvent("conversion_success", {
        toolId: "pdf-merge",
        fileType: "application/pdf",
        fileSize: totalInputSize,
        outputSize: blob.size,
        files: pdfs.length,
        pages: totalPages,
      });
    } catch (error: any) {
      const message = getPdfErrorMessage(error, "PDF merge failed.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "pdf-merge",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadMergedPdf = () => {
    if (!mergedUrl) return;
    const link = document.createElement("a");
    link.href = mergedUrl;
    link.download = `${formatMergedName(pdfs)}.pdf`;
    link.click();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const openMergedPreview = () => {
    if (!mergedUrl) return;
    window.open(mergedUrl, "_blank", "noopener,noreferrer");
  };

  const totalPages = pdfs.reduce((total, item) => total + item.pageCount, 0);
  const totalInputSize = pdfs.reduce((total, item) => total + item.file.size, 0);

  return (
    <ToolPageShell toolId="pdf-merge">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <SettingsPanel title="Merge Controls">
            <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-secondary" />
                <span className="font-bold text-text-primary">Queue summary</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Files</span>
                  <span className="mt-0.5 block font-mono font-bold text-text-primary">{pdfs.length}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Pages</span>
                  <span className="mt-0.5 block font-mono font-bold text-text-primary">{totalPages}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-brand-soft-border">
              <Button
                variant="primary"
                onClick={mergePdfs}
                disabled={loading || pdfs.length < 2}
                className="w-full text-xs font-bold"
              >
                {loading ? "Merging PDFs..." : "Merge PDF Files"}
              </Button>
              {pdfs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="w-full gap-2 text-xs border border-brand-border">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all PDFs
                </Button>
              )}
            </div>
          </SettingsPanel>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-accent-primary bg-accent-bg/20"
                : "border-brand-border bg-brand-secondary hover:border-accent-primary hover:bg-brand-soft/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-bg text-accent-secondary">
              <FolderUp className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Upload multiple PDF files</h3>
            <p className="mt-1 text-xs text-text-secondary">Drop PDFs here. The queue order becomes the final document order.</p>
          </div>

          {errorText && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
              <span>{errorText}</span>
            </div>
          )}

          {successText && !errorText && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-700">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-600" />
              <span>{successText}</span>
            </div>
          )}

          {pdfs.length > 0 ? (
            <OutputPanel
              title={`PDF merge order (${pdfs.length} file${pdfs.length === 1 ? "" : "s"})`}
              originalSize={totalInputSize}
              compressedSize={mergedSize}
              onDownloadAll={mergedUrl ? downloadMergedPdf : undefined}
              downloadLabel="Download merged PDF"
              isProcessing={loading}
            >
              {mergedUrl && (
                <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">Merged PDF preview</h4>
                      <p className="mt-0.5 text-[10px] text-text-secondary">Review the generated document before downloading.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openMergedPreview}
                      className="gap-2 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open preview
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
                    <iframe
                      src={mergedUrl}
                      title="Merged PDF preview"
                      className="h-[360px] w-full"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {pdfs.map((item, index) => (
                  <div
                    key={item.id}
                    draggable={!loading}
                    onDragStart={(event) => {
                      setDraggedPdfId(item.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedId = event.dataTransfer.getData("text/plain") || draggedPdfId;
                      if (droppedId) reorderPdf(droppedId, item.id);
                      setDraggedPdfId(null);
                    }}
                    onDragEnd={() => setDraggedPdfId(null)}
                    className={`flex flex-col gap-4 rounded-xl border bg-white p-3 transition-colors sm:flex-row sm:items-center ${
                      draggedPdfId === item.id
                        ? "border-accent-primary bg-accent-bg/20 opacity-70"
                        : "border-brand-border"
                    } ${loading ? "" : "cursor-grab active:cursor-grabbing"}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center gap-1 rounded-lg border border-brand-border bg-brand-secondary">
                        <GripVertical className="h-4 w-4 text-text-muted" aria-hidden="true" />
                        <FileText className="h-5 w-5 text-accent-secondary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-accent-bg px-1.5 font-mono text-[10px] font-bold text-accent-secondary">
                            {index + 1}
                          </span>
                          <span className="truncate text-xs font-bold text-text-primary">{item.file.name}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-text-secondary">
                          {item.pageCount} page{item.pageCount === 1 ? "" : "s"} · {formatBytes(item.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => movePdf(index, -1)}
                        disabled={index === 0 || loading}
                        className="h-8 w-8"
                        aria-label={`Move ${item.file.name} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => movePdf(index, 1)}
                        disabled={index === pdfs.length - 1 || loading}
                        className="h-8 w-8"
                        aria-label={`Move ${item.file.name} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePdf(item.id)}
                        disabled={loading}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel title="PDF merge queue">
              <div className="flex flex-col items-center justify-center py-16 text-center text-text-secondary">
                <FileText className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-xs">Add at least two PDFs to create a merged document.</p>
              </div>
            </PreviewPanel>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

export default MergePDF;
