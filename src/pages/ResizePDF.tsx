import React, { useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { takePendingToolFile } from "@/src/lib/workspace/pending-file";
import { trackEvent } from "@/src/lib/analytics";
import { formatBytes } from "@/src/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Maximize2,
  Trash2,
} from "lucide-react";

type PagePresetId = "a4" | "letter" | "legal" | "a3" | "a5" | "slide-16-9" | "custom";
type Unit = "mm" | "inch" | "pt";
type Orientation = "auto" | "portrait" | "landscape";
type ScaleMode = "fit" | "fill" | "original";
type MarginPreset = "none" | "small" | "medium" | "custom";

interface LoadedPdfInfo {
  file: File;
  pageCount: number;
}

interface PageSizePreset {
  id: Exclude<PagePresetId, "custom">;
  label: string;
  width: number;
  height: number;
}

const PAGE_SIZE_PRESETS: PageSizePreset[] = [
  { id: "a4", label: "A4", width: 595.28, height: 841.89 },
  { id: "letter", label: "Letter", width: 612, height: 792 },
  { id: "legal", label: "Legal", width: 612, height: 1008 },
  { id: "a3", label: "A3", width: 841.89, height: 1190.55 },
  { id: "a5", label: "A5", width: 419.53, height: 595.28 },
  { id: "slide-16-9", label: "Slide 16:9", width: 960, height: 540 },
];

const UNIT_LABELS: Record<Unit, string> = {
  mm: "mm",
  inch: "inch",
  pt: "pt",
};

const MARGIN_LABELS: Record<MarginPreset, string> = {
  none: "None",
  small: "Small",
  medium: "Medium",
  custom: "Custom",
};

function convertToPoints(value: number, unit: Unit) {
  if (!Number.isFinite(value)) return 0;
  if (unit === "mm") return (value / 25.4) * 72;
  if (unit === "inch") return value * 72;
  return value;
}

function pointsToUnit(value: number, unit: Unit) {
  if (unit === "mm") return (value / 72) * 25.4;
  if (unit === "inch") return value / 72;
  return value;
}

function formatDimension(value: number, unit: Unit) {
  const converted = pointsToUnit(value, unit);
  const decimals = unit === "pt" ? 0 : 1;
  return `${converted.toFixed(decimals)} ${UNIT_LABELS[unit]}`;
}

function isPdfFile(file: File) {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return extension === ".pdf" || file.type === "application/pdf";
}

function getPdfErrorMessage(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes("encrypted") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("parse encrypted")
  ) {
    return "Password-protected or encrypted PDFs are not supported yet. Please unlock the PDF first, then upload it again.";
  }

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("corrupt") ||
    normalizedMessage.includes("failed to parse") ||
    normalizedMessage.includes("no pdf header")
  ) {
    return "This PDF looks corrupted or incomplete. Try exporting a fresh copy and upload it again.";
  }

  return rawMessage || fallback;
}

function buildResizedFileName(fileName: string) {
  const cleanedName = fileName
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();

  return `${cleanedName || "document"}-resized.pdf`;
}

function getPresetSize(presetId: PagePresetId, customWidth: number, customHeight: number, unit: Unit) {
  if (presetId === "custom") {
    return {
      width: convertToPoints(customWidth, unit),
      height: convertToPoints(customHeight, unit),
      label: "Custom",
    };
  }

  const preset = PAGE_SIZE_PRESETS.find((item) => item.id === presetId) || PAGE_SIZE_PRESETS[0];
  return {
    width: preset.width,
    height: preset.height,
    label: preset.label,
  };
}

function orientTargetSize(
  baseSize: { width: number; height: number },
  sourceSize: { width: number; height: number },
  orientation: Orientation
) {
  const shortSide = Math.min(baseSize.width, baseSize.height);
  const longSide = Math.max(baseSize.width, baseSize.height);

  if (orientation === "portrait") {
    return { width: shortSide, height: longSide };
  }

  if (orientation === "landscape") {
    return { width: longSide, height: shortSide };
  }

  return sourceSize.width > sourceSize.height
    ? { width: longSide, height: shortSide }
    : { width: shortSide, height: longSide };
}

function getMarginPoints(marginPreset: MarginPreset, customMargin: number, unit: Unit) {
  if (marginPreset === "none") return 0;
  if (marginPreset === "small") return 18;
  if (marginPreset === "medium") return 36;
  return convertToPoints(customMargin, unit);
}

function getScaleFactor(
  scaleMode: ScaleMode,
  sourceSize: { width: number; height: number },
  availableSize: { width: number; height: number }
) {
  if (scaleMode === "original") return 1;

  const widthRatio = availableSize.width / sourceSize.width;
  const heightRatio = availableSize.height / sourceSize.height;

  return scaleMode === "fill" ? Math.max(widthRatio, heightRatio) : Math.min(widthRatio, heightRatio);
}

export function ResizePDF() {
  const outputUrlRef = useRef<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<LoadedPdfInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [resizedSize, setResizedSize] = useState<number | undefined>(undefined);
  const [progressText, setProgressText] = useState<string | null>(null);

  const [presetId, setPresetId] = useState<PagePresetId>("a4");
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [customUnit, setCustomUnit] = useState<Unit>("mm");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("fit");
  const [marginPreset, setMarginPreset] = useState<MarginPreset>("none");
  const [customMargin, setCustomMargin] = useState(10);

  useEffect(() => {
    outputUrlRef.current = resizedUrl;
  }, [resizedUrl]);

  useEffect(() => {
    return () => {
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const pending = takePendingToolFile("resize-pdf");
    if (pending) handleFileSelected(pending.file);
  }, []);

  const selectedSize = getPresetSize(presetId, customWidth, customHeight, customUnit);
  const marginPoints = getMarginPoints(marginPreset, customMargin, customUnit);
  const outputFileName = pdfInfo ? buildResizedFileName(pdfInfo.file.name) : "document-resized.pdf";

  const resetOutput = () => {
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    setResizedUrl(null);
    setResizedSize(undefined);
    setSuccessText(null);
    setErrorText(null);
    setProgressText(null);
  };

  const handleFileSelected = async (selectedFile: File) => {
    resetOutput();
    setPdfInfo(null);

    if (!isPdfFile(selectedFile)) {
      const message = "Unsupported file type. Please choose a PDF file ending in .pdf.";
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "resize-pdf",
        message,
        fileType: selectedFile.type || selectedFile.name,
      });
      return;
    }

    setLoading(true);
    setProgressText("Reading PDF metadata...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pageCount = pdf.getPageCount();

      if (pageCount <= 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      setPdfInfo({ file: selectedFile, pageCount });
      setErrorText(null);
      trackEvent("file_processed", {
        toolId: "resize-pdf",
        fileType: selectedFile.type || "application/pdf",
        fileSize: selectedFile.size,
        pages: pageCount,
      });
    } catch (error) {
      const message = getPdfErrorMessage(error, "Could not read this PDF. Please try another file.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "resize-pdf",
        message,
      });
    } finally {
      setProgressText(null);
      setLoading(false);
    }
  };

  const validateSettings = () => {
    if (!pdfInfo) {
      return "Upload a valid PDF before exporting.";
    }

    if (selectedSize.width <= 0 || selectedSize.height <= 0) {
      return "Page width and height must be greater than zero.";
    }

    if (selectedSize.width > 14400 || selectedSize.height > 14400) {
      return "Page size is too large for browser-side PDF export. Use dimensions under 200 inches.";
    }

    if (marginPoints < 0) {
      return "Margin cannot be negative.";
    }

    return null;
  };

  const resizePdf = async () => {
    const settingsError = validateSettings();
    if (settingsError) {
      setErrorText(settingsError);
      return;
    }

    if (!pdfInfo) return;

    resetOutput();
    setLoading(true);
    setProgressText("Preparing PDF pages...");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const sourceBytes = await pdfInfo.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const outputPdf = await PDFDocument.create();
      const sourcePages = sourcePdf.getPages();

      if (sourcePages.length === 0) {
        throw new Error("This PDF does not contain any pages.");
      }

      for (let pageIndex = 0; pageIndex < sourcePages.length; pageIndex++) {
        const sourcePage = sourcePages[pageIndex];
        const sourceSize = sourcePage.getSize();
        const targetSize = orientTargetSize(selectedSize, sourceSize, orientation);
        const availableWidth = targetSize.width - marginPoints * 2;
        const availableHeight = targetSize.height - marginPoints * 2;

        if (availableWidth <= 0 || availableHeight <= 0) {
          throw new Error("Selected margin is too large for the target page size.");
        }

        setProgressText(`Resizing page ${pageIndex + 1} of ${sourcePages.length}...`);

        const embeddedPage = await outputPdf.embedPage(sourcePage);
        const targetPage = outputPdf.addPage([targetSize.width, targetSize.height]);
        const scale = getScaleFactor(scaleMode, sourceSize, {
          width: availableWidth,
          height: availableHeight,
        });
        const drawWidth = sourceSize.width * scale;
        const drawHeight = sourceSize.height * scale;
        const x = marginPoints + (availableWidth - drawWidth) / 2;
        const y = marginPoints + (availableHeight - drawHeight) / 2;

        targetPage.drawPage(embeddedPage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      if (outputPdf.getPageCount() === 0) {
        throw new Error("No pages were generated. Export was cancelled.");
      }

      setProgressText("Finalizing resized PDF...");
      const resizedBytes = await outputPdf.save();

      if (resizedBytes.length === 0) {
        throw new Error("PDF output is empty. No file was generated.");
      }

      const blob = new Blob([resizedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResizedUrl(url);
      setResizedSize(blob.size);
      setSuccessText(`Resized ${sourcePages.length} page${sourcePages.length === 1 ? "" : "s"} successfully as ${outputFileName}.`);

      addToWorkspaceHistory({
        toolId: "resize-pdf",
        toolName: "Resize PDF",
        fileName: outputFileName,
        fileSize: pdfInfo.file.size,
        outputType: "PDF",
        status: "completed",
        metadata: {
          pages: sourcePages.length,
          preset: selectedSize.label,
          orientation,
          scaleMode,
          margin: marginPreset,
          outputSize: blob.size,
        },
      });
      trackEvent("conversion_success", {
        toolId: "resize-pdf",
        fileType: "application/pdf",
        fileSize: pdfInfo.file.size,
        outputSize: blob.size,
        pages: sourcePages.length,
        preset: selectedSize.label,
        orientation,
        scaleMode,
        margin: marginPreset,
      });
    } catch (error) {
      const message = getPdfErrorMessage(error, "PDF resize failed. No output file was downloaded.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "resize-pdf",
        message,
      });
    } finally {
      setProgressText(null);
      setLoading(false);
    }
  };

  const downloadResizedPdf = () => {
    if (!resizedUrl) return;
    const link = document.createElement("a");
    link.href = resizedUrl;
    link.download = outputFileName;
    link.click();
  };

  const openPreview = () => {
    if (!resizedUrl) return;
    window.open(resizedUrl, "_blank", "noopener,noreferrer");
  };

  const clearAll = () => {
    resetOutput();
    setPdfInfo(null);
    setPresetId("a4");
    setCustomWidth(210);
    setCustomHeight(297);
    setCustomUnit("mm");
    setOrientation("auto");
    setScaleMode("fit");
    setMarginPreset("none");
    setCustomMargin(10);
  };

  const pageSizeLabel =
    presetId === "custom"
      ? `${formatDimension(selectedSize.width, customUnit)} x ${formatDimension(selectedSize.height, customUnit)}`
      : selectedSize.label;
  const marginLabel =
    marginPreset === "custom"
      ? `${customMargin || 0} ${UNIT_LABELS[customUnit]}`
      : MARGIN_LABELS[marginPreset];
  const scaleModeLabel =
    scaleMode === "fit"
      ? "Fit to page"
      : scaleMode === "fill"
        ? "Fill page"
        : "Keep original size centered";
  const orientationLabel =
    orientation === "auto"
      ? "Auto"
      : orientation === "portrait"
        ? "Portrait"
        : "Landscape";

  return (
    <ToolPageShell toolId="resize-pdf">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <SettingsPanel title="Resize settings">
            <div className="rounded-xl border border-amber-500/20 bg-[#FFF8E6] p-3 text-xs leading-relaxed text-[#7A4A05]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-bold">Browser-only beta:</span> your PDF stays in this tab. Kurio Studio does not upload it or send it to any AI endpoint.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase text-text-secondary">Page size</span>
              <div className="grid grid-cols-2 gap-2">
                {[...PAGE_SIZE_PRESETS, { id: "custom" as const, label: "Custom", width: 0, height: 0 }].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPresetId(preset.id);
                      if (preset.id === "slide-16-9") setOrientation("landscape");
                      resetOutput();
                    }}
                    disabled={loading}
                    aria-label={`Use ${preset.label} page size preset`}
                    aria-pressed={presetId === preset.id}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      presetId === preset.id
                        ? "border-accent-primary bg-accent-bg text-accent-secondary"
                        : "border-brand-border bg-white text-text-secondary hover:border-accent-primary"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {presetId === "custom" && (
              <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="resize-pdf-width" className="block text-[10px] font-bold uppercase text-text-secondary">
                      Width
                    </label>
                    <Input
                      id="resize-pdf-width"
                      type="number"
                      min="1"
                      value={customWidth || ""}
                      onChange={(event) => {
                        setCustomWidth(Number(event.target.value) || 0);
                        resetOutput();
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="resize-pdf-height" className="block text-[10px] font-bold uppercase text-text-secondary">
                      Height
                    </label>
                    <Input
                      id="resize-pdf-height"
                      type="number"
                      min="1"
                      value={customHeight || ""}
                      onChange={(event) => {
                        setCustomHeight(Number(event.target.value) || 0);
                        resetOutput();
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="resize-pdf-unit" className="block text-[10px] font-bold uppercase text-text-secondary">
                    Unit
                  </label>
                  <select
                    id="resize-pdf-unit"
                    value={customUnit}
                    onChange={(event) => {
                      setCustomUnit(event.target.value as Unit);
                      resetOutput();
                    }}
                    disabled={loading}
                    className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-xs font-semibold text-text-primary outline-none focus:border-accent-primary"
                  >
                    <option value="mm">mm</option>
                    <option value="inch">inch</option>
                    <option value="pt">pt</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-brand-soft-border pt-4">
              <span className="block text-[10px] font-bold uppercase text-text-secondary">Orientation</span>
              <div className="grid grid-cols-3 gap-2">
                {(["auto", "portrait", "landscape"] as Orientation[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setOrientation(item);
                      resetOutput();
                    }}
                    disabled={loading}
                    aria-label={`Set PDF orientation to ${item}`}
                    aria-pressed={orientation === item}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition-colors ${
                      orientation === item
                        ? "border-accent-primary bg-accent-bg text-accent-secondary"
                        : "border-brand-border bg-white text-text-secondary hover:border-accent-primary"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-brand-soft-border pt-4">
              <span className="block text-[10px] font-bold uppercase text-text-secondary">Content scaling</span>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "fit" as const, label: "Fit to page" },
                  { id: "fill" as const, label: "Fill page" },
                  { id: "original" as const, label: "Keep original size centered" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setScaleMode(item.id);
                      resetOutput();
                    }}
                    disabled={loading}
                    aria-label={`Set content scaling to ${item.label}`}
                    aria-pressed={scaleMode === item.id}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      scaleMode === item.id
                        ? "border-accent-primary bg-accent-bg text-accent-secondary"
                        : "border-brand-border bg-white text-text-secondary hover:border-accent-primary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-brand-soft-border pt-4">
              <span className="block text-[10px] font-bold uppercase text-text-secondary">Margin</span>
              <div className="grid grid-cols-2 gap-2">
                {(["none", "small", "medium", "custom"] as MarginPreset[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMarginPreset(item);
                      resetOutput();
                    }}
                    disabled={loading}
                    aria-label={`Set PDF margin to ${MARGIN_LABELS[item]}`}
                    aria-pressed={marginPreset === item}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                      marginPreset === item
                        ? "border-accent-primary bg-accent-bg text-accent-secondary"
                        : "border-brand-border bg-white text-text-secondary hover:border-accent-primary"
                    }`}
                  >
                    {MARGIN_LABELS[item]}
                  </button>
                ))}
              </div>
              {marginPreset === "custom" && (
                <div className="space-y-1.5">
                  <label htmlFor="resize-pdf-margin" className="block text-[10px] font-bold uppercase text-text-secondary">
                    Custom margin ({UNIT_LABELS[customUnit]})
                  </label>
                  <Input
                    id="resize-pdf-margin"
                    type="number"
                    min="0"
                    value={customMargin}
                    onChange={(event) => {
                      setCustomMargin(Number(event.target.value) || 0);
                      resetOutput();
                    }}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-brand-soft-border pt-4">
              <Button
                variant="primary"
                onClick={resizePdf}
                disabled={!pdfInfo || loading}
                className="w-full gap-2 text-xs font-bold"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {loading ? "Resizing PDF..." : "Resize PDF"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={loading && !pdfInfo}
                className="w-full gap-2 border border-brand-border text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset tool
              </Button>
            </div>
          </SettingsPanel>
        </div>

        <div className="space-y-6 lg:col-span-8">
          {!pdfInfo && (
            <UploadDropZone
              acceptedExtensions={[".pdf"]}
              maxSizeMB={100}
              onFileSelected={handleFileSelected}
              title="Upload a PDF to resize"
              subtitle="Drop one PDF here or click to browse. The file is parsed and resized locally in your browser."
            />
          )}

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

          {progressText && (
            <div className="rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs text-text-secondary" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
                <span className="font-bold text-text-primary">{progressText}</span>
              </div>
            </div>
          )}

          {pdfInfo ? (
            <OutputPanel
              title="Resize export"
              originalSize={pdfInfo.file.size}
              compressedSize={resizedSize}
              onDownloadAll={resizedUrl ? downloadResizedPdf : undefined}
              downloadLabel="Download resized PDF"
              isProcessing={loading}
            >
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs text-text-secondary sm:grid-cols-3">
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">File</span>
                  <span className="mt-1 block truncate font-bold text-text-primary">{pdfInfo.file.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px]">{formatBytes(pdfInfo.file.size)}</span>
                </div>
                <div className="border-brand-border sm:border-l sm:pl-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Estimated pages</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{pdfInfo.pageCount}</span>
                </div>
                <div className="border-brand-border sm:border-l sm:pl-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Download name</span>
                  <span className="mt-1 block truncate font-mono font-bold text-text-primary">{outputFileName}</span>
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-secondary" />
                  <h4 className="text-xs font-bold text-text-primary">Selected resize settings</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary md:grid-cols-4">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Target size</span>
                    <span className="mt-1 block font-bold text-text-primary">{pageSizeLabel}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Orientation</span>
                    <span className="mt-1 block font-bold text-text-primary">{orientationLabel}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Scaling</span>
                    <span className="mt-1 block font-bold text-text-primary">{scaleModeLabel}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Margin</span>
                    <span className="mt-1 block font-bold text-text-primary">{marginLabel}</span>
                  </div>
                </div>
              </div>

              {resizedUrl && (
                <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">Resized PDF preview</h4>
                      <p className="mt-0.5 text-[10px] text-text-secondary">Review the generated document before downloading.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openPreview} className="gap-2 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open preview
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
                    <iframe src={resizedUrl} title="Resized PDF preview" className="h-[420px] w-full" />
                  </div>
                </div>
              )}
            </OutputPanel>
          ) : (
            <PreviewPanel title="Resize PDF workspace">
              <div className="flex flex-col items-center justify-center py-16 text-center text-text-secondary">
                <FileText className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-xs">Upload a PDF to inspect its page count and export a resized copy.</p>
              </div>
            </PreviewPanel>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

export default ResizePDF;
