import React, { useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { Trash2, CheckCircle, AlertCircle } from "lucide-react";

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
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Presets configurations
  const PRESETS: PresetItem[] = [
    { id: "instagram-1-1", label: "Instagram 1:1 post", width: 1080, height: 1080, ratio: "1:1" },
    { id: "tiktok-vertical", label: "TikTok cover page", width: 1080, height: 1920, ratio: "9:16" },
    { id: "youtube-thumb", label: "YouTube thumbnail", width: 1280, height: 720, ratio: "16:9" },
    { id: "square-spec", label: "Standard 800x800", width: 800, height: 800, ratio: "1:1" },
  ];

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setStatusText(null);
    setErrorText(null);
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
      
      // Auto compile initial canvas preview
      processResize(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      setErrorText("Failed to decode the selected image. Try another JPG, PNG, or WebP file.");
      setLoading(false);
      trackEvent("conversion_failed", { toolId: "resize-image", message: "Image decode failed" });
    };
  };

  const processResize = (
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ) => {
    setLoading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image centered in output frame with containment scaling
      ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

      const rUrl = canvas.toDataURL(file?.type || "image/png");
      setResizedUrl(rUrl);
      setStatusText(`Rendered ${targetWidth} x ${targetHeight}px output successfully.`);
      setErrorText(null);
      
      // Log workspace history record
      addToWorkspaceHistory({
        toolId: "resize-image",
        toolName: "Image Resizer",
        fileName: file?.name || "graphic_asset.png",
        fileSize: file?.size || 0,
        outputType: "PNG",
        status: "completed",
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
      setErrorText("Failed to render canvas dimensions.");
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
    link.download = `${tokenName}_resized_${width}x${height}${ext}`;
    link.click();
  };

  const clearCanvasArea = () => {
    setFile(null);
    setImgElement(null);
    setOriginalUrl(null);
    setResizedUrl(null);
    setLockRatio(true);
    setStatusText(null);
    setErrorText(null);
  };

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
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
                  <span>{errorText}</span>
                </div>
              )}
              {statusText && !loading && !errorText && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs text-green-700">
                  <CheckCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-600" />
                  <span>{statusText}</span>
                </div>
              )}
              <div className="rounded-xl border border-brand-border bg-brand-secondary p-5 flex items-center justify-center relative min-h-[350px]">
                {loading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
                ) : (
                  resizedUrl && (
                    <img
                      src={resizedUrl}
                      alt="Current scaled preview"
                      style={{ maxHeight: "350px", maxWidth: "100%" }}
                      className="object-contain rounded-lg shadow-xs"
                    />
                  )
                )}
              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel title="Dimension visualizer window" />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default ResizeImage;
