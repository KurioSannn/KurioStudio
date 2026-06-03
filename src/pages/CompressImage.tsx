import React, { useState, useEffect } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { Trash2, Image as ImageIcon, Sliders, CheckCircle, AlertCircle } from "lucide-react";

export function CompressImage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Compressor properties
  const [quality, setQuality] = useState<number>(80);
  const [outputFormat, setOutputFormat] = useState<string>("same"); // same, png, jpeg, webp
  const [resolutionScale, setResolutionScale] = useState<number>(100); // 10% to 100%

  // Metric states
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [compressedFileUrl, setCompressedFileUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | undefined>(undefined);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
      if (compressedFileUrl) URL.revokeObjectURL(compressedFileUrl);
    };
  }, [originalFileUrl, compressedFileUrl]);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setWarningText(null);
    setSuccessText(null);
    setDimensions(null);
    setResolutionScale(100); // Reset scale on new file select
    
    const objUrl = URL.createObjectURL(selectedFile);
    setOriginalFileUrl(objUrl);
    trackEvent("file_processed", { toolId: "compress-image", fileType: selectedFile.type, fileSize: selectedFile.size });
    
    // Process initial compression
    processCompression(selectedFile, quality, outputFormat, 100);
  };

  const processCompression = (
    sourceFile: File,
    activeQuality: number,
    activeFormat: string,
    activeScale: number = resolutionScale
  ) => {
    setLoading(true);
    setWarningText(null);
    setSuccessText(null);
    
    const img = new Image();
    img.src = URL.createObjectURL(sourceFile);
    
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      const scaleFactor = activeScale / 100;
      const targetWidth = Math.max(1, Math.round(img.naturalWidth * scaleFactor));
      const targetHeight = Math.max(1, Math.round(img.naturalHeight * scaleFactor));
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      if (ctx) {
        ctx.fillStyle = "#ffffff"; // Clear canvas default alpha buffer
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      // Determine correct target export MIME type
      let exportMime = sourceFile.type;
      if (activeFormat === "jpeg") exportMime = "image/jpeg";
      if (activeFormat === "png") exportMime = "image/png";
      if (activeFormat === "webp") exportMime = "image/webp";
      if (activeFormat === "same") {
        // Fallback to same as source but standardise JPEG/JPG
        if (sourceFile.type === "image/jpg") exportMime = "image/jpeg";
      }

      const qualityFactor = activeQuality / 100;
      const isPNG = exportMime === "image/png";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compUrl = URL.createObjectURL(blob);
            setCompressedFileUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return compUrl;
            });
            setCompressedSize(blob.size);
            
            // Check for realistic compression results & construct warnings honestly
            if (blob.size >= sourceFile.size) {
              if (isPNG && activeScale === 100) {
                setWarningText(
                  "PNG is lossless. Redrawing at 100% resolution stripped metadata, but kept size identical. Try lowering the 'Resolution Scale' slider, or converting to WebP/JPG format for massive size saves."
                );
              } else {
                setWarningText(
                  "The output file is not smaller than the original reference. Try lowering the quality slider, scaling down the resolution, or selecting WebP format."
                );
              }
            } else {
              const saved = Math.round(((sourceFile.size - blob.size) / sourceFile.size) * 100);
              setSuccessText(`Optimized image successfully. Estimated size reduction: ${saved}%.`);
            }

            // Log to workspace history
            addToWorkspaceHistory({
              toolId: "compress-image",
              toolName: "Image Compressor",
              fileName: sourceFile.name,
              fileSize: sourceFile.size,
              outputType: exportMime.replace("image/", "").toUpperCase(),
              status: "completed",
            });
            trackEvent("conversion_success", {
              toolId: "compress-image",
              fileType: sourceFile.type,
              fileSize: sourceFile.size,
              outputSize: blob.size,
              outputFormat: exportMime,
            });
          } else {
            setWarningText("The browser could not create an optimized image blob. Try a different output format.");
            trackEvent("conversion_failed", { toolId: "compress-image", message: "Canvas toBlob returned null" });
          }
          setLoading(false);
          // Revoke memory helper object URL
          URL.revokeObjectURL(img.src);
        },
        exportMime,
        isPNG ? undefined : qualityFactor // Only parse factor parameter to lossy JPG/WebP
      );
    };

    img.onerror = () => {
      setWarningText("Failed to correctly decode graphic reference.");
      trackEvent("conversion_failed", { toolId: "compress-image", message: "Image decode failed" });
      setLoading(false);
      URL.revokeObjectURL(img.src);
    };
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const freshQuality = Number(e.target.value);
    setQuality(freshQuality);
    if (file) {
      processCompression(file, freshQuality, outputFormat, resolutionScale);
    }
  };

  const handleResolutionScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const freshScale = Number(e.target.value);
    setResolutionScale(freshScale);
    if (file) {
      processCompression(file, quality, outputFormat, freshScale);
    }
  };

  const handleFormatChange = (newFormat: string) => {
    setOutputFormat(newFormat);
    if (file) {
      processCompression(file, quality, newFormat, resolutionScale);
    }
  };

  const downloadCompressed = () => {
    if (!compressedFileUrl || !file) return;
    
    let fileExt = file.name.substring(file.name.lastIndexOf("."));
    if (outputFormat === "jpeg") fileExt = ".jpg";
    if (outputFormat === "png") fileExt = ".png";
    if (outputFormat === "webp") fileExt = ".webp";
    
    // Adjust Auto same fallback extension
    if (outputFormat === "same") {
      if (file.type === "image/png") fileExt = ".png";
      if (file.type === "image/webp") fileExt = ".webp";
      if (file.type === "image/jpeg" || file.type === "image/jpg") fileExt = ".jpg";
    }

    const termName = file.name.substring(0, file.name.lastIndexOf("."));
    const link = document.createElement("a");
    link.href = compressedFileUrl;
    link.download = `${termName}_optimized${fileExt}`;
    link.click();
  };

  const clearWorkspace = () => {
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
    if (compressedFileUrl) URL.revokeObjectURL(compressedFileUrl);
    setFile(null);
    setOriginalFileUrl(null);
    setCompressedFileUrl(null);
    setCompressedSize(undefined);
    setDimensions(null);
    setWarningText(null);
    setSuccessText(null);
    setResolutionScale(100);
  };

  // Check if active output sequence is PNG
  const isLosslessPNG =
    outputFormat === "png" || (outputFormat === "same" && file?.type === "image/png");

  return (
    <ToolPageShell toolId="compress-image">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left pane configuration settings */}
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <UploadDropZone
              acceptedExtensions={[".png", ".jpg", ".jpeg", ".webp"]}
              onFileSelected={handleFileSelected}
              title="Upload an image to compress"
              subtitle="Drag & drop PNG, JPG, or WebP here or browse local folders. Processed securely inside your browser."
            />
          ) : (
            <SettingsPanel title="Tuning Parameters">
              
              {/* Quality slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#6B6258] uppercase">
                  <span>Compression Level</span>
                  <span className="font-mono text-[#F59E0B]">{quality}% Quality</span>
                </div>
                
                {isLosslessPNG ? (
                  <div className="bg-[#FFF3D6] p-3 rounded-xl text-[11px] text-[#E07A2F] border border-[#F59E0B]/20 leading-relaxed space-y-1">
                    <p className="font-bold">Lossless Format Active</p>
                    <p>PNG outputs use lossless structural arrays. The quality slider cannot reduce file sizes here. Choose <strong>WebP</strong> or <strong>JPG</strong> output format if you desire significant compression saves.</p>
                  </div>
                ) : (
                  <>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={handleQualityChange}
                      className="w-full h-1.5 bg-[#F3F0EA] rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
                      disabled={loading}
                    />
                    <span className="text-[10px] text-[#9A9187] mt-0.5 block leading-normal">
                      Lower percentages create smaller payloads. 80% contains pristine professional fidelity.
                    </span>
                  </>
                )}
              </div>

              {/* Resolution Scale Slider */}
              <div className="space-y-2 pt-4 border-t border-[#E7E2D8]">
                <div className="flex items-center justify-between text-xs font-bold text-[#6B6258] uppercase">
                  <span>Resolution Scale</span>
                  <span className="font-mono text-[#F59E0B]">{resolutionScale}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={resolutionScale}
                  onChange={handleResolutionScaleChange}
                  className="w-full h-1.5 bg-[#F3F0EA] rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
                  disabled={loading}
                />
                <span className="text-[10px] text-[#9A9187] mt-0.5 block leading-normal">
                  Reduces visual width & height dimensions. Outstanding tool for shrinking large PNG or JPG images.
                </span>
              </div>

              {/* Format selection toggles */}
              <div className="space-y-2 pt-4 border-t border-[#E7E2D8]">
                <label className="text-xs font-bold text-[#6B6258] uppercase">
                  Export format conversion
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "same", label: "Auto (Same)" },
                    { id: "jpeg", label: "JPG Format" },
                    { id: "png", label: "PNG Lossless" },
                    { id: "webp", label: "WebP Format" },
                  ].map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => handleFormatChange(format.id)}
                      disabled={loading}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer ${
                        outputFormat === format.id
                          ? "bg-[#F59E0B] text-[#171717] border-[#F59E0B]"
                          : "bg-white border-[#E7E2D8] text-[#6B6258] hover:bg-[#F3F0EA] select-none"
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flush buttons */}
              <div className="pt-4 border-t border-[#E7E2D8]">
                <Button variant="ghost" size="sm" onClick={clearWorkspace} className="w-full gap-2 text-xs border border-[#E7E2D8]">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear graphic
                </Button>
              </div>

            </SettingsPanel>
          )}

          {file && (
            <div className="rounded-xl border border-[#E7E2D8] bg-white p-4 text-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4.5 w-4.5 text-[#F59E0B]" />
                <span className="font-bold text-[#171717]">Source properties</span>
              </div>
              <ul className="space-y-1.5 text-[#6B6258] list-disc pl-4 leading-normal font-mono">
                <li>Name: <span className="text-[#171717] truncate font-semibold max-w-[130px] inline-block align-bottom">{file.name}</span></li>
                <li>Mime: <span className="text-[#171717] font-semibold">{file.type}</span></li>
                {dimensions && (
                  <li>Original: <span className="text-[#171717] font-semibold">{dimensions.width} x {dimensions.height} px</span></li>
                )}
                {dimensions && resolutionScale < 100 && (
                  <li>Target: <span className="text-[#171717] font-semibold">{Math.max(1, Math.round(dimensions.width * (resolutionScale / 100)))} x {Math.max(1, Math.round(dimensions.height * (resolutionScale / 100)))} px ({resolutionScale}%)</span></li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Right pane display inspect results */}
        <div className="lg:col-span-8">
          {file ? (
            <OutputPanel
              title="Image Optimize Outputs"
              originalSize={file.size}
              compressedSize={loading ? undefined : compressedSize}
              onDownloadAll={compressedFileUrl && !loading ? downloadCompressed : undefined}
              downloadLabel="Download optimized graphic"
              isProcessing={loading}
            >
              {warningText && !loading && (
                <div className="flex items-start gap-2 bg-[#FFF3D6] text-[#E07A2F] p-3.5 rounded-xl border border-[#F59E0B]/20 text-xs leading-relaxed">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-[#F59E0B] mt-0.5" />
                  <div>
                    <span className="font-bold text-[#171717]">Optimization Notice:</span>
                    <p className="mt-0.5">{warningText}</p>
                  </div>
                </div>
              )}

              {successText && !loading && !warningText && (
                <div className="flex items-start gap-2 bg-green-50 text-green-700 p-3.5 rounded-xl border border-green-200 text-xs leading-relaxed">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#171717]">Optimization complete</span>
                    <p className="mt-0.5">{successText}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Before pane */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#9A9187] tracking-wider block">Original reference frame</span>
                  <div className="rounded-xl border border-[#E7E2D8] bg-white aspect-square overflow-hidden flex items-center justify-center p-3 relative">
                    {originalFileUrl && (
                      <img
                        src={originalFileUrl}
                        alt="Unoptimized source"
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    )}
                  </div>
                </div>

                {/* After pane */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider block flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Tuned output frame
                  </span>
                  <div className="rounded-xl border border-[#E7E2D8] bg-white aspect-square overflow-hidden flex items-center justify-center p-3 relative">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
                      </div>
                    ) : (
                      compressedFileUrl && (
                        <img
                          src={compressedFileUrl}
                          alt="Compressed output reference"
                          className="max-h-full max-w-full object-contain pointer-events-none"
                        />
                      )
                    )}
                  </div>
                </div>

              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel title="Optimized output preview container" />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default CompressImage;
