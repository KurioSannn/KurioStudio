import React, { useState, useEffect } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { takePendingToolFile } from "@/src/lib/workspace/pending-file";
import { trackEvent } from "@/src/lib/analytics";
import { formatBytes } from "@/src/lib/utils";
import { Download, FileCheck, Layers, Info, Trash2, AlertCircle } from "lucide-react";
import JSZip from "jszip";

interface PDFPageItem {
  number: number;
  label: string;
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

export function PDFToPNG() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pages, setPages] = useState<PDFPageItem[]>([]);
  const [scale, setScale] = useState<number>(2.0); // Default high resolution scale factor (2x HD)
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Helper to load pdfjs dynamically with absolute stability
  const loadPdfEngine = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const win = window as any;
      if (win.pdfjsLib) {
        resolve(win.pdfjsLib);
        return;
      }

      // Check if script already appended
      let script = document.querySelector('script[src*="pdf.min.js"]') as HTMLScriptElement;
      if (script) {
        if (win.pdfjsLib) {
          resolve(win.pdfjsLib);
          return;
        }
        script.addEventListener("load", () => {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
          resolve(win.pdfjsLib);
        });
        return;
      }

      script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      script.async = true;
      script.onload = () => {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        resolve(win.pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error("Failed to load PDF engine dependency from CDN. Please check your internet connection."));
      };
      document.body.appendChild(script);
    });
  };

  // Prefetch/init PDFJS Engine
  useEffect(() => {
    loadPdfEngine().catch((err) => console.warn(err.message));
  }, []);

  // Cleanup Object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      pages.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, []);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setPages([]);
    setExportProgress(0);
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);
    trackEvent("file_processed", { toolId: "pdf-to-png", fileType: selectedFile.type || ".pdf", fileSize: selectedFile.size });

    try {
      const pdfjsLib = await loadPdfEngine();
      if (!pdfjsLib) {
        throw new Error("PDF processing engine failed to initialize. Please upload raw document again.");
      }

      // Read file into ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({
            data: typedarray,
            cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/standard_fonts/",
          }).promise;
          setPdfDoc(pdf);
          await loadPagePreviews(pdf, scale, selectedFile);
        } catch (err: any) {
          console.error(err);
          setErrorText(err.message || "Invalid or corrupt PDF document.");
          trackEvent("conversion_failed", { toolId: "pdf-to-png", message: err.message || "Invalid PDF document" });
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setErrorText("Could not read uploaded PDF file bytes.");
        trackEvent("conversion_failed", { toolId: "pdf-to-png", message: "FileReader failed" });
        setLoading(false);
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err: any) {
      setErrorText(err.message || "Failed to initialize PDF engine.");
      trackEvent("conversion_failed", { toolId: "pdf-to-png", message: err.message || "PDF engine failed" });
      setLoading(false);
    }
  };

  useEffect(() => {
    const pending = takePendingToolFile("pdf-to-png");
    if (pending) handleFileSelected(pending.file);
  }, []);

  const getCanvasBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  };

  const loadPagePreviews = async (pdf: any, activeScale: number, currentFile: File) => {
    setLoading(true);
    setErrorText(null);
    
    // Revoke previous URLs to free up memory before rendering anew
    pages.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setPages([]);

    const numPages = pdf.numPages;
    const pageList: PDFPageItem[] = [];

    try {
      for (let i = 1; i <= numPages; i++) {
        // Set dynamic conversion progress percentage
        setExportProgress(Math.round(((i - 1) / numPages) * 100));

        const page = await pdf.getPage(i);
        
        // Intelligent viewport normalization to safeguard browser GPU and memory limits.
        // Extremely large canvasses (e.g., width or height > 4000px) will exhaust hardware resources and fail silently
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        let fitScale = activeScale;
        
        if (unscaledViewport.width > 2048 || unscaledViewport.height > 2048) {
          fitScale = Math.min(activeScale, 1.25);
        } else if (unscaledViewport.width > 1200 || unscaledViewport.height > 1200) {
          fitScale = Math.min(activeScale, 1.75);
        }
        
        const viewport = page.getViewport({ scale: fitScale });
        
        // Render to virtual Canvas element
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not construct 2D graphics render node.");
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        
        // Strict Transparent Area Patching as per instructions:
        // Fill canvas with white before rendering page sequence
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        
        // Sequential await of renderTask promise to guarantee stability and prevent skips
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        
        // Export to high fidelity Blob
        const blob = await getCanvasBlob(canvas);
        if (!blob) {
          throw new Error(`Failed to generate PNG blob for page ${i}`);
        }

        const url = URL.createObjectURL(blob);
        
        // Only trigger standard page level cleanup AFTER blob creation completes
        if (page.cleanup) {
          page.cleanup();
        }

        const pageItem: PDFPageItem = {
          number: i,
          label: `Page ${i}`,
          url,
          blob,
          width: canvas.width,
          height: canvas.height,
        };

        pageList.push(pageItem);
        // Incremental rendering updates so users see pages load sequentially on screen
        setPages([...pageList]);
      }
      
      setExportProgress(100);
      setSuccessText(`Converted ${numPages} page${numPages === 1 ? "" : "s"} into PNG successfully.`);

      // Log success history
      addToWorkspaceHistory({
        toolId: "pdf-to-png",
        toolName: "PDF to PNG",
        fileName: currentFile.name,
        fileSize: currentFile.size,
        outputType: "PNG Zip",
        status: "completed",
      });
      trackEvent("conversion_success", {
        toolId: "pdf-to-png",
        fileType: currentFile.type || ".pdf",
        fileSize: currentFile.size,
        pages: numPages,
      });
    } catch (e: any) {
      console.error("Renderer issue:", e);
      setErrorText(`Rendering failed on canvas pipeline: ${e.message || e}`);
      trackEvent("conversion_failed", { toolId: "pdf-to-png", message: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const triggerScaleTuning = async (newScale: number) => {
    setScale(newScale);
    if (pdfDoc && file) {
      await loadPagePreviews(pdfDoc, newScale, file);
    }
  };

  const downloadSinglePage = (page: PDFPageItem) => {
    if (!file || !page.url) return;
    const cleanPrefix = file.name.replace(/\.pdf$/i, "");
    const link = document.createElement("a");
    link.href = page.url;
    link.download = `${cleanPrefix}_page_${page.number}.png`;
    link.click();
  };

  const downloadAllAsZip = async () => {
    if (pages.length === 0 || !file) return;
    setLoading(true);
    
    try {
      const zip = new JSZip();
      const cleanPrefix = file.name.replace(/\.pdf$/i, "");
      
      pages.forEach((page) => {
        // Feed direct raw binary blobs into JSZip for faster compression
        zip.file(`${cleanPrefix}_page_${page.number}.png`, page.blob);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      const zipUrl = URL.createObjectURL(zipBlob);
      link.href = zipUrl;
      link.download = `${cleanPrefix}_png_slides.zip`;
      link.click();
      
      // Cleanup ZIP download URL dynamically
      setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);
    } catch (e: any) {
      console.error("ZIP Assembly Error:", e);
      setErrorText(`ZIP compilation failed on pipeline: ${e.message || e}`);
      trackEvent("conversion_failed", { toolId: "pdf-to-png", message: e.message || String(e), phase: "zip" });
    } finally {
      setLoading(false);
    }
  };

  const clearApplet = () => {
    pages.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setFile(null);
    setPdfDoc(null);
    setPages([]);
    setExportProgress(0);
    setErrorText(null);
    setSuccessText(null);
  };

  return (
    <ToolPageShell toolId="pdf-to-png">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column configuration */}
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <UploadDropZone
              acceptedExtensions={[".pdf"]}
              onFileSelected={handleFileSelected}
              title="Upload your PDF file"
              subtitle="Drag & drop document here or click to choose from local disk. Works securely inside the local sandbox."
            />
          ) : (
            <SettingsPanel title="PDF Rasterizer Options">
              
              {/* Scale quality selectors */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6B6258] uppercase tracking-wide">
                  Tuning Scale Factor (Resolution)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1.0, 2.0, 3.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => triggerScaleTuning(val)}
                      disabled={loading}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer ${
                        scale === val
                          ? "bg-[#F59E0B] text-[#171717] border-[#F59E0B]"
                          : "bg-white border-[#E7E2D8] text-[#6B6258] hover:bg-[#F3F0EA] select-none"
                      }`}
                    >
                      {val}x {val === 1.0 ? "(Web)" : val === 2.0 ? "(HD)" : "(Print)"}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-[#9A9187] mt-1 block leading-normal">
                  Higher scale values yield extremely crisp lines but consume more memory and graphics power.
                </span>
              </div>

              {/* Reset layout */}
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={clearApplet} className="w-full gap-2 text-xs border border-[#E7E2D8]">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear active file
                </Button>
              </div>

            </SettingsPanel>
          )}

          {pdfDoc && file && (
            <div className="rounded-xl border border-[#E7E2D8] bg-white p-4 text-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4.5 w-4.5 text-[#F59E0B]" />
                <span className="font-bold text-[#171717]">Source statistics</span>
              </div>
              <ul className="space-y-1.5 text-[#6B6258] list-disc pl-4 leading-normal">
                <li>Name: <span className="font-mono text-[#171717] truncate font-semibold max-w-[130px] inline-block align-bottom">{file.name}</span></li>
                <li>Pages: <span className="font-mono text-[#171717] font-semibold">{pdfDoc.numPages}</span></li>
                <li>Size: <span className="font-mono text-[#171717] font-semibold">{formatBytes(file.size)}</span></li>
              </ul>
              <div className="flex items-start gap-1.5 bg-[#FFF3D6] p-2.5 rounded-lg text-[10px] text-[#E07A2F] border border-[#F59E0B]/15 leading-relaxed">
                <Layers className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                <span>Sequential rendering renders 100% of all PDF visual components and annotations sequentially.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column displays outputs */}
        <div className="lg:col-span-8">
          {file ? (
            <OutputPanel
              title={`Page extracts directory (${pages.length} / ${pdfDoc ? pdfDoc.numPages : "?"} pages generated)`}
              onDownloadAll={pages.length > 0 && pages.length === (pdfDoc?.numPages || 0) ? downloadAllAsZip : undefined}
              downloadLabel={`Compress as ZIP Archive (${pages.length} PNGs)`}
              isProcessing={loading}
              originalSize={file.size}
            >
              {errorText && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Conversion Error:</span>
                    <p className="mt-1 font-mono">{errorText}</p>
                  </div>
                </div>
              )}

              {successText && !loading && !errorText && (
                <div className="flex items-start gap-2 bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-xs">
                  <FileCheck className="h-4.5 w-4.5 shrink-0 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Conversion complete</span>
                    <p className="mt-1">{successText}</p>
                  </div>
                </div>
              )}

              {loading && pages.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
                  <span className="text-xs text-[#6B6258] block">
                    Initializing PDFJS engine and converting full-vector page structures... {exportProgress}%
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {loading && pages.length > 0 && (
                    <div className="flex items-center gap-3 bg-[#FFF3D6] border border-[#F59E0B]/20 p-3 rounded-xl text-xs text-[#E07A2F]">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
                      <span>Rendering sequence in progress... page {pages.length + 1} of {pdfDoc?.numPages || "?"} ({exportProgress}%)</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4.5 max-h-[500px] overflow-y-auto pr-1">
                    {pages.map((item) => (
                      <div
                        key={item.number}
                        className="group border border-[#E7E2D8] bg-[#FAFAF7] rounded-xl overflow-hidden shadow-xs hover:border-[#F59E0B] transition-colors duration-200"
                      >
                        {/* Image Preview Container */}
                        <div className="relative bg-white aspect-[4/3] flex items-center justify-center p-3 overflow-hidden border-b border-[#E7E2D8]">
                          <img
                            src={item.url}
                            alt={item.label}
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/70 py-1.5 px-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center font-mono">
                            <span>{item.width} x {item.height} px</span>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-2.5 flex items-center justify-between gap-1.5 bg-white">
                          <span className="text-xs font-bold text-[#171717] font-sans">{item.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadSinglePage(item)}
                            className="h-7 w-7 rounded-lg text-[#6B6258] hover:text-[#F59E0B]"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </OutputPanel>
          ) : (
            <PreviewPanel title="Slide inspection viewport" />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default PDFToPNG;
