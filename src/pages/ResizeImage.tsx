import React, { useEffect, useState } from "react";
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
import { buildKurioFileName, formatBytes } from "@/src/lib/utils";
import { getFriendlyToolError, type FriendlyToolError } from "@/src/lib/tool-errors";
import { Trash2, CheckCircle, AlertCircle, Gauge } from "lucide-react";

interface PresetItem {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
}

export function ResizeImage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Resolution dimensions
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockRatio, setLockRatio] = useState<boolean>(true);

  // Metric logs
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<FriendlyToolError | null>(null);

  // Presets configurations
  const PRESETS: PresetItem[] = [
    { id: "instagram-1-1", label: "Instagram 1:1 post", width: 1080, height: 1080, ratio: "1:1" },
    { id: "instagram-story", label: "Instagram Story", width: 1080, height: 1920, ratio: "9:16" },
    { id: "tiktok-vertical", label: "TikTok cover page", width: 1080, height: 1920, ratio: "9:16" },
    { id: "youtube-thumb", label: "YouTube thumbnail", width: 1280, height: 720, ratio: "16:9" },
    { id: "linkedin-banner", label: "LinkedIn banner", width: 1584, height: 396, ratio: "4:1" },
    { id: "x-header", label: "X / Twitter header", width: 1500, height: 500, ratio: "3:1" },
    { id: "facebook-cover", label: "Facebook cover", width: 1640, height: 624, ratio: "2.63:1" },
    { id: "square-spec", label: "Standard 800x800", width: 800, height: 800, ratio: "1:1" },
  ];

  const estimateDataUrlBytes = (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1] || "";
    return Math.max(0, Math.round((base64.length * 3) / 4));
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setStatusText(null);
    setErrorText(null);
    setFriendlyError(null);
    setOutputSize(null);
    setOriginalDimensions(null);
    trackEvent("file_processed", { toolId: "resize-image", fileType: selectedFile.type, fileSize: selectedFile.size });

    const objUrl = URL.createObjectURL(selectedFile);
    setOriginalUrl(objUrl);

    const img = new Image();
    img.src = objUrl;
    img.onload = () => {
      setImgElement(img);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Auto compile initial canvas preview
      processResize(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      const friendly = getFriendlyToolError(new Error("Failed to decode the selected image."), "Image decode failed.");
      setFriendlyError(friendly);
      setErrorText(friendly.message);
      setLoading(false);
      trackEvent("conversion_failed", { toolId: "resize-image", message: "Image decode failed" });
    };
  };

  useEffect(() => {
    const pending = takePendingToolFile("resize-image");
    if (pending) handleFileSelected(pending.file);
  }, []);

  const processResize = (
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ) => {
    setLoading(true);
    try {
      if (targetWidth <= 0 || targetHeight <= 0) {
        throw new Error("Invalid canvas dimensions.");
      }

      if (targetWidth * targetHeight > 80000000) {
        throw new Error("Canvas memory limit reached for the selected dimensions.");
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image centered in output frame with containment scaling
      ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

      const rUrl = canvas.toDataURL(file?.type || "image/png");
      setResizedUrl(rUrl);
      setOutputSize(estimateDataUrlBytes(rUrl));
      setStatusText(`Rendered ${targetWidth} x ${targetHeight}px output successfully.`);
      setErrorText(null);
      setFriendlyError(null);
      
      // Log workspace history record
      addToWorkspaceHistory({
        toolId: "resize-image",
        toolName: "Image Resizer",
        fileName: file?.name || "graphic_asset.png",
        fileSize: file?.size || 0,
        outputType: "PNG",
        status: "completed",
        metadata: {
          width: targetWidth,
          height: targetHeight,
          lockRatio,
          format: file?.type || "image/png",
        },
      });
      trackEvent("conversion_success", {
        toolId: "resize-image",
        fileType: file?.type,
        fileSize: file?.size,
        width: targetWidth,
        height: targetHeight,
      });
    } catch (e) {
      console.error(e);
      const friendly = getFriendlyToolError(e, "Failed to render canvas dimensions.");
      setFriendlyError(friendly);
      setErrorText(friendly.message);
      trackEvent("conversion_failed", { toolId: "resize-image", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) || 0;
    setWidth(val);
    
    if (lockRatio) {
      const freshHeight = Math.round(val / aspectRatio);
      setHeight(freshHeight);
      if (imgElement && val > 0) {
        processResize(imgElement, val, freshHeight);
      }
    } else {
      if (imgElement && val > 0) {
        processResize(imgElement, val, height);
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) || 0;
    setHeight(val);

    if (lockRatio) {
      const freshWidth = Math.round(val * aspectRatio);
      setWidth(freshWidth);
      if (imgElement && val > 0) {
        processResize(imgElement, freshWidth, val);
      }
    } else {
      if (imgElement && val > 0) {
        processResize(imgElement, width, val);
      }
    }
  };

  const applyPresetValue = (preset: PresetItem) => {
    setWidth(preset.width);
    setHeight(preset.height);
    // Overrule ratio
    setLockRatio(false);
    if (imgElement) {
      processResize(imgElement, preset.width, preset.height);
    }
  };

  const downloadResized = () => {
    if (!resizedUrl || !file) return;
    
    const tokenName = file.name.substring(0, file.name.lastIndexOf("."));
    const ext = file.name.substring(file.name.lastIndexOf("."));
    
    const link = document.createElement("a");
    link.href = resizedUrl;
    link.download = buildKurioFileName(tokenName || file.name, `resized_${width}x${height}`, ext);
    link.click();
  };

  const clearCanvasArea = () => {
    setFile(null);
    setImgElement(null);
    setOriginalUrl(null);
    setResizedUrl(null);
    setOutputSize(null);
    setOriginalDimensions(null);
    setLockRatio(true);
    setStatusText(null);
    setErrorText(null);
    setFriendlyError(null);
  };

  const sizeDeltaPercent =
    file && outputSize !== null && file.size > 0 ? Math.round(((file.size - outputSize) / file.size) * 100) : null;
  const outputFormat = file?.type ? file.type.replace("image/", "").toUpperCase() : "-";

  return (
    <ToolPageShell toolId="resize-image">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column configuration */}
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <UploadDropZone
              acceptedExtensions={[".jpg", ".jpeg", ".png", ".webp"]}
              onFileSelected={handleFileSelected}
              title="Upload your image to resize"
              subtitle="Drag & drop JPG, PNG or WebP files here or click to browse. Resizing occurs natively on your client engine."
            />
          ) : (
            <SettingsPanel title="Dimension controllers">
              
              {/* Width / Height dimensions entry */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Width (pixels)</label>
                    <Input
                      type="number"
                      value={width || ""}
                      onChange={handleWidthChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Height (pixels)</label>
                    <Input
                      type="number"
                      value={height || ""}
                      onChange={handleHeightChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary select-none">
                  <input
                    type="checkbox"
                    checked={lockRatio}
                    onChange={(e) => setLockRatio(e.target.checked)}
                    className="rounded border-brand-border text-accent-secondary focus:ring-accent-primary"
                  />
                  <span>Lock organic aspect ratio ({aspectRatio.toFixed(2)})</span>
                </label>
              </div>

              {/* Creator presets selector */}
              <div className="pt-4 border-t border-brand-soft-border space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-secondary font-sans block">
                  Creator Social Canvas presets
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPresetValue(p)}
                      disabled={loading}
                      aria-label={`Apply ${p.label} preset, ${p.width} by ${p.height} pixels`}
                      aria-pressed={width === p.width && height === p.height && !lockRatio}
                      style={{ contentVisibility: "auto" }}
                      className="flex items-center justify-between p-3 border border-brand-border bg-brand-surface rounded-xl text-left text-xs text-text-primary hover:bg-brand-bg hover:border-accent-primary font-semibold transition-all cursor-pointer shadow-xs select-none"
                    >
                      <span>{p.label}</span>
                      <span className="font-mono text-[10px] text-text-secondary bg-[#FAFAF7] px-2 py-0.5 border border-brand-soft-border rounded">
                        {p.width} x {p.height} px
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset layout */}
              <div className="pt-4 border-t border-brand-soft-border">
                <Button variant="ghost" size="sm" onClick={clearCanvasArea} className="w-full gap-2 text-xs border border-brand-border">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear active file
                </Button>
              </div>

            </SettingsPanel>
          )}
        </div>

        {/* Right column displays layouts */}
        <div className="lg:col-span-8">
          {file ? (
            <OutputPanel
              title={`Resizer Inspector Page (${width} x ${height} px active)`}
              onDownloadAll={resizedUrl ? downloadResized : undefined}
              downloadLabel="Export scaled graphic package"
              isProcessing={loading}
            >
              {errorText && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
                  <div>
                    <span className="font-bold text-red-800">{friendlyError?.title || "Resize failed"}</span>
                    <p className="mt-1">{errorText}</p>
                    {friendlyError?.suggestion && <p className="mt-1 font-semibold">{friendlyError.suggestion}</p>}
                  </div>
                </div>
              )}
              {statusText && !loading && !errorText && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs text-green-700">
                  <CheckCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-600" />
                  <span>{statusText}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Original</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{file ? formatBytes(file.size) : "-"}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Output</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{outputSize !== null ? formatBytes(outputSize) : "-"}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Size delta</span>
                  <span className="mt-1 flex items-center gap-1 font-mono font-bold text-text-primary">
                    <Gauge className="h-3.5 w-3.5 text-accent-secondary" />
                    {sizeDeltaPercent === null ? "-" : `${sizeDeltaPercent}%`}
                  </span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Format</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{outputFormat}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Original frame</span>
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-white p-3">
                    {originalUrl && (
                      <img
                        src={originalUrl}
                        alt="Original image preview"
                        className="max-h-full max-w-full rounded-lg object-contain"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary">
                    <span>Size: <strong className="font-mono text-text-primary">{file ? formatBytes(file.size) : "-"}</strong></span>
                    <span>Dims: <strong className="font-mono text-text-primary">{originalDimensions ? `${originalDimensions.width}x${originalDimensions.height}` : "-"}</strong></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-secondary">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resized output
                  </span>
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-white p-3">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/75" role="status" aria-label="Generating resized preview">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
                      </div>
                    ) : (
                      resizedUrl && (
                        <img
                          src={resizedUrl}
                          alt="Current scaled preview"
                          className="max-h-full max-w-full rounded-lg object-contain shadow-xs"
                        />
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary">
                    <span>Size: <strong className="font-mono text-text-primary">{outputSize !== null ? formatBytes(outputSize) : "-"}</strong></span>
                    <span>Dims: <strong className="font-mono text-text-primary">{width && height ? `${width}x${height}` : "-"}</strong></span>
                  </div>
                </div>
              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel
              title="Dimension visualizer"
              emptyTitle="No image selected"
              emptyDescription="Upload an image to compare original dimensions with the resized output before exporting."
            />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default ResizeImage;
