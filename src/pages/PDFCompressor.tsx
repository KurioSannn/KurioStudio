import React, { useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { formatBytes } from "@/src/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gauge,
  Info,
  Trash2,
} from "lucide-react";

type CompressionMode = "light" | "recommended" | "strong";

interface LoadedPdfInfo {
  file: File;
  pageCount: number;
}

interface CompressedResult {
  url: string;
  size: number;
  fileName: string;
  mode: CompressionMode;
  pages: number;
  rasterized: boolean;
}

interface PdfJsDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
}

interface PdfJsPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (context: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
  cleanup?: () => void;
}

const MODE_DETAILS: Record<
  CompressionMode,
  {
    label: string;
    description: string;
    jpegQuality?: number;
    renderScale?: number;
  }
> = {
  light: {
    label: "Light Compression",
    description: "Re-saves the PDF cleanly while preserving text and layout as much as possible.",
  },
  recommended: {
    label: "Recommended Compression",
    description: "Prioritizes readability and compatibility with a more compact regenerated PDF structure.",
  },
  strong: {
    label: "Strong Compression",
    description: "Rasterizes pages to compressed JPEG images for smaller files. Text may become less sharp.",
    jpegQuality: 0.62,
    renderScale: 1.35,
  },
};

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

function buildCompressedFileName(fileName: string) {
  const cleanedName = fileName
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();

  return `${cleanedName || "document"}-compressed.pdf`;
}

function getReductionPercent(originalSize: number, compressedSize: number) {
  if (originalSize <= 0 || compressedSize >= originalSize) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

function loadPdfEngine(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.pdfjsLib) {
      resolve(win.pdfjsLib);
      return;
    }

    let script = document.querySelector('script[src*="pdf.min.js"]') as HTMLScriptElement | null;
    if (script) {
      script.addEventListener("load", () => {
        if (!win.pdfjsLib) {
          reject(new Error("PDF rendering engine failed to initialize."));
          return;
        }
        win.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        resolve(win.pdfjsLib);
      });
      script.addEventListener("error", () => reject(new Error("Failed to load PDF rendering engine.")));
      return;
    }

    script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (!win.pdfjsLib) {
        reject(new Error("PDF rendering engine failed to initialize."));
        return;
      }
      win.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
      resolve(win.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF engine dependency from CDN. Please check your internet connection."));
    document.body.appendChild(script);
  });
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Browser failed to encode one PDF page as JPEG."));
          return;
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (bytes.length === 0) {
          reject(new Error("Browser produced empty JPEG data for one PDF page."));
          return;
        }
        resolve(bytes);
      },
      "image/jpeg",
      quality
    );
  });
}

async function copyCompressPdf(file: File) {
  const { PDFDocument } = await import("pdf-lib");
  const sourceBytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const outputPdf = await PDFDocument.create();
  const pageIndexes = sourcePdf.getPageIndices();

  if (pageIndexes.length === 0) {
    throw new Error("This PDF does not contain any pages.");
  }

  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes);
  copiedPages.forEach((page) => outputPdf.addPage(page));

  if (outputPdf.getPageCount() === 0) {
    throw new Error("No pages were generated. Export was cancelled.");
  }

  return outputPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

async function rasterCompressPdf(
  file: File,
  quality: number,
  renderScale: number,
  onProgress: (message: string) => void
) {
  const [{ PDFDocument }, pdfjsLib] = await Promise.all([import("pdf-lib"), loadPdfEngine()]);
  const sourceBytes = await file.arrayBuffer();
  const pdf: PdfJsDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(sourceBytes),
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/standard_fonts/",
  }).promise;

  if (pdf.numPages <= 0) {
    throw new Error("This PDF does not contain any pages.");
  }

  const outputPdf = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress(`Rasterizing page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const pageSize = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create canvas context for PDF compression.");
    }

    const maxCanvasEdge = 2800;
    const canvasScale = Math.min(1, maxCanvasEdge / Math.max(viewport.width, viewport.height));
    const renderViewport = page.getViewport({ scale: renderScale * canvasScale });

    canvas.width = Math.max(1, Math.floor(renderViewport.width));
    canvas.height = Math.max(1, Math.floor(renderViewport.height));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: renderViewport,
    }).promise;

    const jpegBytes = await canvasToJpegBytes(canvas, quality);
    const image = await outputPdf.embedJpg(jpegBytes);
    const outputPage = outputPdf.addPage([pageSize.width, pageSize.height]);
    outputPage.drawImage(image, {
      x: 0,
      y: 0,
      width: pageSize.width,
      height: pageSize.height,
    });

    if (page.cleanup) page.cleanup();
    canvas.width = 1;
    canvas.height = 1;
  }

  if (outputPdf.getPageCount() === 0) {
    throw new Error("No pages were generated. Export was cancelled.");
  }

  return outputPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

export function PDFCompressor() {
  const outputUrlRef = useRef<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<LoadedPdfInfo | null>(null);
  const [mode, setMode] = useState<CompressionMode>("recommended");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [result, setResult] = useState<CompressedResult | null>(null);

  useEffect(() => {
    outputUrlRef.current = result?.url || null;
  }, [result]);

  useEffect(() => {
    return () => {
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, []);

  const resetOutput = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setSuccessText(null);
    setNoticeText(null);
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
        toolId: "pdf-compressor",
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
        toolId: "pdf-compressor",
        fileType: selectedFile.type || "application/pdf",
        fileSize: selectedFile.size,
        pages: pageCount,
      });
    } catch (error) {
      const message = getPdfErrorMessage(error, "Could not read this PDF. Please try another file.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "pdf-compressor",
        message,
      });
    } finally {
      setProgressText(null);
      setLoading(false);
    }
  };

  const compressPdf = async () => {
    if (!pdfInfo) {
      setErrorText("Upload a valid PDF before compressing.");
      return;
    }

    resetOutput();
    setLoading(true);
    setProgressText(mode === "strong" ? "Preparing rasterized compression..." : "Optimizing PDF structure...");

    try {
      const compressedBytes =
        mode === "strong"
          ? await rasterCompressPdf(
              pdfInfo.file,
              MODE_DETAILS.strong.jpegQuality || 0.62,
              MODE_DETAILS.strong.renderScale || 1.35,
              setProgressText
            )
          : await copyCompressPdf(pdfInfo.file);

      if (compressedBytes.length === 0) {
        throw new Error("PDF output is empty. No file was generated.");
      }

      setProgressText("Validating compressed PDF...");
      const { PDFDocument } = await import("pdf-lib");
      const validationPdf = await PDFDocument.load(compressedBytes);
      const outputPages = validationPdf.getPageCount();

      if (outputPages <= 0) {
        throw new Error("Compressed PDF has zero pages. Export was cancelled.");
      }

      if (outputPages !== pdfInfo.pageCount) {
        throw new Error("Compressed PDF page count does not match the original file.");
      }

      const fileName = buildCompressedFileName(pdfInfo.file.name);
      const blob = new Blob([compressedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const reductionPercent = getReductionPercent(pdfInfo.file.size, blob.size);
      const alreadyOptimized =
        blob.size >= pdfInfo.file.size ||
        (pdfInfo.file.size > 0 && (pdfInfo.file.size - blob.size) / pdfInfo.file.size < 0.01);

      setResult({
        url,
        size: blob.size,
        fileName,
        mode,
        pages: outputPages,
        rasterized: mode === "strong",
      });
      setSuccessText(
        alreadyOptimized
          ? `Generated a readable PDF copy as ${fileName}.`
          : `Compressed ${outputPages} page${outputPages === 1 ? "" : "s"} by ${reductionPercent}% as ${fileName}.`
      );
      setNoticeText(
        alreadyOptimized
          ? "This PDF is already optimized, so the compressed result may not be smaller."
          : mode === "strong"
            ? "Strong Compression rebuilt pages as JPEG images, so text may be less sharp."
            : null
      );

      addToWorkspaceHistory({
        toolId: "pdf-compressor",
        toolName: "PDF Compressor",
        fileName,
        fileSize: pdfInfo.file.size,
        outputType: "PDF",
        status: "completed",
      });
      trackEvent("conversion_success", {
        toolId: "pdf-compressor",
        fileType: "application/pdf",
        fileSize: pdfInfo.file.size,
        outputSize: blob.size,
        pages: outputPages,
        mode,
        reductionPercent,
        rasterized: mode === "strong",
      });
    } catch (error) {
      const message = getPdfErrorMessage(error, "PDF compression failed. No output file was downloaded.");
      setErrorText(message);
      trackEvent("conversion_failed", {
        toolId: "pdf-compressor",
        message,
        mode,
      });
    } finally {
      setProgressText(null);
      setLoading(false);
    }
  };

  const downloadCompressedPdf = () => {
    if (!result?.url) return;
    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.fileName;
    link.click();
  };

  const openPreview = () => {
    if (!result?.url) return;
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const clearAll = () => {
    resetOutput();
    setPdfInfo(null);
    setMode("recommended");
  };

  const reductionPercent =
    pdfInfo && result ? getReductionPercent(pdfInfo.file.size, result.size) : 0;
  const activeMode = MODE_DETAILS[mode];

  return (
    <ToolPageShell toolId="pdf-compressor">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <SettingsPanel title="Compression settings">
            <div className="rounded-xl border border-amber-500/20 bg-[#FFF8E6] p-3 text-xs leading-relaxed text-[#7A4A05]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-bold">Browser-only beta:</span> compression runs in this tab. Kurio Studio does not upload PDFs or send them to Gemini.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase text-text-secondary">Compression mode</span>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(MODE_DETAILS) as CompressionMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      resetOutput();
                    }}
                    disabled={loading}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      mode === item
                        ? "border-accent-primary bg-accent-bg text-accent-secondary"
                        : "border-brand-border bg-white text-text-secondary hover:border-accent-primary"
                    }`}
                  >
                    <span className="block text-xs font-bold text-text-primary">{MODE_DETAILS[item].label}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed">{MODE_DETAILS[item].description}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === "strong" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                Strong Compression can create smaller PDFs by converting each page to an image. This keeps page order and dimensions, but text may no longer be selectable.
              </div>
            )}

            <div className="space-y-2 border-t border-brand-soft-border pt-4">
              <Button
                variant="primary"
                onClick={compressPdf}
                disabled={!pdfInfo || loading}
                className="w-full gap-2 text-xs font-bold"
              >
                <Gauge className="h-3.5 w-3.5" />
                {loading ? "Compressing PDF..." : "Compress PDF"}
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
              title="Upload a PDF to compress"
              subtitle="Drop one PDF here or click to browse. Compression stays local in your browser."
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

          {noticeText && !errorText && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
              <span>{noticeText}</span>
            </div>
          )}

          {progressText && (
            <div className="rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs text-text-secondary">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
                <span className="font-bold text-text-primary">{progressText}</span>
              </div>
            </div>
          )}

          {pdfInfo ? (
            <OutputPanel
              title="Compression output"
              originalSize={pdfInfo.file.size}
              compressedSize={result?.size}
              onDownloadAll={result ? downloadCompressedPdf : undefined}
              downloadLabel="Download compressed PDF"
              isProcessing={loading}
            >
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs text-text-secondary sm:grid-cols-3">
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">File</span>
                  <span className="mt-1 block truncate font-bold text-text-primary">{pdfInfo.file.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px]">{formatBytes(pdfInfo.file.size)}</span>
                </div>
                <div className="border-brand-border sm:border-l sm:pl-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Pages</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{pdfInfo.pageCount}</span>
                </div>
                <div className="border-brand-border sm:border-l sm:pl-3">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Active mode</span>
                  <span className="mt-1 block font-bold text-text-primary">{activeMode.label}</span>
                </div>
              </div>

              <div className="rounded-xl border border-brand-border bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-secondary" />
                  <h4 className="text-xs font-bold text-text-primary">Compression metrics</h4>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs text-text-secondary sm:grid-cols-3">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Original size</span>
                    <span className="mt-1 block font-mono font-bold text-text-primary">{formatBytes(pdfInfo.file.size)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Compressed size</span>
                    <span className="mt-1 block font-mono font-bold text-text-primary">{result ? formatBytes(result.size) : "Not generated"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted">Reduction</span>
                    <span className="mt-1 block font-mono font-bold text-text-primary">{result ? `${reductionPercent}%` : "Not generated"}</span>
                  </div>
                </div>
              </div>

              {result && (
                <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">Compressed PDF preview</h4>
                      <p className="mt-0.5 text-[10px] text-text-secondary">
                        {result.pages} page{result.pages === 1 ? "" : "s"} generated. Page dimensions are preserved.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openPreview} className="gap-2 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open preview
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-brand-border bg-white">
                    <iframe src={result.url} title="Compressed PDF preview" className="h-[420px] w-full" />
                  </div>
                </div>
              )}
            </OutputPanel>
          ) : (
            <PreviewPanel title="PDF compressor workspace">
              <div className="flex flex-col items-center justify-center py-16 text-center text-text-secondary">
                <FileText className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-xs">Upload a PDF to inspect file size and generate a compressed browser-side copy.</p>
              </div>
            </PreviewPanel>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

export default PDFCompressor;
