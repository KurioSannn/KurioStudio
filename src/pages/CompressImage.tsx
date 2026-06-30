import React, { useRef, useState, useEffect } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { takePendingToolFile } from "@/src/lib/workspace/pending-file";
import { trackEvent } from "@/src/lib/analytics";
import { buildKurioFileName, formatBytes } from "@/src/lib/utils";
import { getFriendlyToolError, type FriendlyToolError } from "@/src/lib/tool-errors";
import { Trash2, Image as ImageIcon, CheckCircle, AlertCircle, Files, Download, Gauge } from "lucide-react";
import JSZip from "jszip";

interface CompressionResult {
  blob: Blob;
  url: string;
  mime: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  warningText: string | null;
  successText: string | null;
}

interface BatchCompressionItem {
  id: string;
  fileName: string;
  originalSize: number;
  outputSize: number;
  outputUrl: string;
  outputBlob: Blob;
  extension: string;
  status: "completed" | "error";
  errorMessage?: string;
}

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
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [outputDimensions, setOutputDimensions] = useState<{ width: number; height: number } | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<FriendlyToolError | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchCompressionItem[]>([]);
  const batchResultsRef = useRef<BatchCompressionItem[]>([]);

  useEffect(() => {
    batchResultsRef.current = batchResults;
  }, [batchResults]);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
      if (compressedFileUrl) URL.revokeObjectURL(compressedFileUrl);
    };
  }, [originalFileUrl, compressedFileUrl]);

  useEffect(() => {
    return () => {
      batchResultsRef.current.forEach((item) => {
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      });
    };
  }, []);

  const getExportMime = (sourceFile: File, activeFormat: string) => {
    let exportMime = sourceFile.type;
    if (activeFormat === "jpeg") exportMime = "image/jpeg";
    if (activeFormat === "png") exportMime = "image/png";
    if (activeFormat === "webp") exportMime = "image/webp";
    if (activeFormat === "same" && sourceFile.type === "image/jpg") exportMime = "image/jpeg";
    return exportMime || "image/png";
  };

  const getOutputExtension = (sourceFile: File, activeFormat: string) => {
    if (activeFormat === "jpeg") return ".jpg";
    if (activeFormat === "png") return ".png";
    if (activeFormat === "webp") return ".webp";
    if (sourceFile.type === "image/png") return ".png";
    if (sourceFile.type === "image/webp") return ".webp";
    if (sourceFile.type === "image/jpeg" || sourceFile.type === "image/jpg") return ".jpg";
    return sourceFile.name.substring(sourceFile.name.lastIndexOf(".")) || ".png";
  };

  const compressImageFile = (
    sourceFile: File,
    activeQuality: number,
    activeFormat: string,
    activeScale: number
  ): Promise<CompressionResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const sourceUrl = URL.createObjectURL(sourceFile);
      img.src = sourceUrl;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const scaleFactor = activeScale / 100;
        const targetWidth = Math.max(1, Math.round(img.naturalWidth * scaleFactor));
        const targetHeight = Math.max(1, Math.round(img.naturalHeight * scaleFactor));

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        const exportMime = getExportMime(sourceFile, activeFormat);
        const isPNG = exportMime === "image/png";
        const qualityFactor = activeQuality / 100;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(sourceUrl);
            if (!blob) {
              reject(new Error("The browser could not create an optimized image blob."));
              return;
            }

            const outputUrl = URL.createObjectURL(blob);
            let nextWarning: string | null = null;
            let nextSuccess: string | null = null;

            if (blob.size >= sourceFile.size) {
              nextWarning =
                isPNG && activeScale === 100
                  ? "PNG is lossless. Try lowering Resolution Scale, or convert to WebP/JPG for larger savings."
                  : "The output is not smaller than the original. Try lower quality, lower scale, or WebP format.";
            } else {
              const saved = Math.round(((sourceFile.size - blob.size) / sourceFile.size) * 100);
              nextSuccess = `Optimized image successfully. Estimated size reduction: ${saved}%.`;
            }

            resolve({
              blob,
              url: outputUrl,
              mime: exportMime,
              width: targetWidth,
              height: targetHeight,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              warningText: nextWarning,
              successText: nextSuccess,
            });
          },
          exportMime,
          isPNG ? undefined : qualityFactor
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("Failed to correctly decode graphic reference."));
      };
    });
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setWarningText(null);
    setFriendlyError(null);
    setSuccessText(null);
    setOriginalDimensions(null);
    setOutputDimensions(null);
    setResolutionScale(100); // Reset scale on new file select
    setBatchResults([]);
    
    const objUrl = URL.createObjectURL(selectedFile);
    setOriginalFileUrl(objUrl);
    trackEvent("file_processed", { toolId: "compress-image", fileType: selectedFile.type, fileSize: selectedFile.size });
    
    // Process initial compression
    processCompression(selectedFile, quality, outputFormat, 100);
  };

  useEffect(() => {
    const pending = takePendingToolFile("compress-image");
    if (pending) handleFileSelected(pending.file);
  }, []);

  const processCompression = (
    sourceFile: File,
    activeQuality: number,
    activeFormat: string,
    activeScale: number = resolutionScale
  ) => {
    setLoading(true);
    setWarningText(null);
    setFriendlyError(null);
    setSuccessText(null);

    compressImageFile(sourceFile, activeQuality, activeFormat, activeScale)
      .then((result) => {
        setOriginalDimensions({ width: result.originalWidth, height: result.originalHeight });
        setOutputDimensions({ width: result.width, height: result.height });
        setCompressedFileUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return result.url;
        });
        setCompressedSize(result.blob.size);
        setWarningText(result.warningText);
        setSuccessText(result.successText);

        addToWorkspaceHistory({
          toolId: "compress-image",
          toolName: "Image Compressor",
          fileName: sourceFile.name,
          fileSize: sourceFile.size,
          outputType: result.mime.replace("image/", "").toUpperCase(),
          status: "completed",
          metadata: {
            quality: activeQuality,
            scale: `${activeScale}%`,
            format: activeFormat,
            outputSize: result.blob.size,
          },
        });
        trackEvent("conversion_success", {
          toolId: "compress-image",
          fileType: sourceFile.type,
          fileSize: sourceFile.size,
          outputSize: result.blob.size,
          outputFormat: result.mime,
        });
      })
      .catch((error: Error) => {
        const friendly = getFriendlyToolError(error, "Image compression failed.");
        setFriendlyError(friendly);
        setWarningText(null);
        trackEvent("conversion_failed", { toolId: "compress-image", message: error.message });
      })
      .finally(() => setLoading(false));
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    handleFileSelected(selectedFiles[0]);
    if (selectedFiles.length === 1) return;

    batchResults.forEach((item) => URL.revokeObjectURL(item.outputUrl));
    setBatchResults([]);
    setLoading(true);
    trackEvent("batch_file_processed", {
      toolId: "compress-image",
      files: selectedFiles.length,
      totalSize: selectedFiles.reduce((sum, current) => sum + current.size, 0),
    });

    const results: BatchCompressionItem[] = [];

    for (const sourceFile of selectedFiles) {
      try {
        const result = await compressImageFile(sourceFile, quality, outputFormat, 100);
        results.push({
          id: `${sourceFile.name}-${sourceFile.size}-${Math.random().toString(36).slice(2)}`,
          fileName: sourceFile.name,
          originalSize: sourceFile.size,
          outputSize: result.blob.size,
          outputUrl: result.url,
          outputBlob: result.blob,
          extension: getOutputExtension(sourceFile, outputFormat),
          status: "completed",
        });
      } catch (error: any) {
        const friendly = getFriendlyToolError(error, "Compression failed.");
        results.push({
          id: `${sourceFile.name}-${sourceFile.size}-${Math.random().toString(36).slice(2)}`,
          fileName: sourceFile.name,
          originalSize: sourceFile.size,
          outputSize: 0,
          outputUrl: "",
          outputBlob: new Blob(),
          extension: getOutputExtension(sourceFile, outputFormat),
          status: "error",
          errorMessage: `${friendly.title}: ${friendly.suggestion}`,
        });
      }
      setBatchResults([...results]);
    }

    const completed = results.filter((item) => item.status === "completed");
    if (completed.length > 0) {
      addToWorkspaceHistory({
        toolId: "compress-image",
        toolName: "Image Compressor",
        fileName: `${completed.length} image batch`,
        fileSize: selectedFiles.reduce((sum, current) => sum + current.size, 0),
        outputType: "ZIP",
        status: "completed",
        metadata: {
          files: completed.length,
          failed: results.length - completed.length,
          quality,
          format: outputFormat,
          inputSize: selectedFiles.reduce((sum, current) => sum + current.size, 0),
          outputSize: completed.reduce((sum, item) => sum + item.outputSize, 0),
        },
      });
      trackEvent("conversion_success", {
        toolId: "compress-image",
        files: completed.length,
        failed: results.length - completed.length,
        mode: "batch",
      });
    }
    setLoading(false);
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

    const link = document.createElement("a");
    link.href = compressedFileUrl;
    link.download = buildKurioFileName(file.name, "compressed", fileExt);
    link.click();
  };

  const downloadBatchZip = async () => {
    const completed = batchResults.filter((item) => item.status === "completed");
    if (completed.length === 0) return;

    setLoading(true);
    try {
      const zip = new JSZip();
      completed.forEach((item) => {
        zip.file(buildKurioFileName(item.fileName, "compressed", item.extension), item.outputBlob);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `kurio_image_compression_${completed.length}_files.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);
    } catch (error: any) {
      setFriendlyError(getFriendlyToolError(error, "Failed to assemble batch ZIP."));
      setWarningText(null);
      trackEvent("conversion_failed", { toolId: "compress-image", message: error.message || "Batch ZIP failed", mode: "batch" });
    } finally {
      setLoading(false);
    }
  };

  const clearWorkspace = () => {
    if (originalFileUrl) URL.revokeObjectURL(originalFileUrl);
    if (compressedFileUrl) URL.revokeObjectURL(compressedFileUrl);
    setFile(null);
    setOriginalFileUrl(null);
    setCompressedFileUrl(null);
    setCompressedSize(undefined);
    setOriginalDimensions(null);
    setOutputDimensions(null);
    setWarningText(null);
    setFriendlyError(null);
    setSuccessText(null);
    setResolutionScale(100);
    batchResults.forEach((item) => URL.revokeObjectURL(item.outputUrl));
    setBatchResults([]);
  };

  // Check if active output sequence is PNG
  const isLosslessPNG =
    outputFormat === "png" || (outputFormat === "same" && file?.type === "image/png");
  const completedBatchResults = batchResults.filter((item) => item.status === "completed");
  const batchOriginalSize = batchResults.reduce((total, item) => total + item.originalSize, 0);
  const batchOutputSize = completedBatchResults.reduce((total, item) => total + item.outputSize, 0);
  const batchSavedBytes = Math.max(0, batchOriginalSize - batchOutputSize);
  const activeOutputFormat = compressedFileUrl && file ? getExportMime(file, outputFormat).replace("image/", "").toUpperCase() : "-";
  const reductionPercent =
    file && compressedSize !== undefined && file.size > 0
      ? Math.round(((file.size - compressedSize) / file.size) * 100)
      : null;

  return (
    <ToolPageShell toolId="compress-image">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left pane configuration settings */}
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <UploadDropZone
              acceptedExtensions={[".png", ".jpg", ".jpeg", ".webp"]}
              onFileSelected={handleFileSelected}
              onFilesSelected={handleFilesSelected}
              multiple
              title="Upload an image to compress"
              subtitle="Drag & drop one or many PNG, JPG, or WebP files here. Compression runs inside your browser."
            />
          ) : (
            <SettingsPanel title="Compression settings">
              
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
                      Lower quality usually creates smaller files. 80% keeps strong visual detail for most web assets.
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

              {/* Reset buttons */}
              <div className="pt-4 border-t border-[#E7E2D8]">
                <Button variant="ghost" size="sm" onClick={clearWorkspace} className="w-full gap-2 text-xs border border-[#E7E2D8]">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear image
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
                {originalDimensions && (
                  <li>Original: <span className="text-[#171717] font-semibold">{originalDimensions.width} x {originalDimensions.height} px</span></li>
                )}
                {outputDimensions && (
                  <li>Output: <span className="text-[#171717] font-semibold">{outputDimensions.width} x {outputDimensions.height} px ({resolutionScale}%)</span></li>
                )}
              </ul>
            </div>
          )}

          {batchResults.length > 1 && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 text-xs space-y-3.5">
              <div className="flex items-center gap-2">
                <Files className="h-4.5 w-4.5 text-accent-secondary" />
                <span className="font-bold text-text-primary">Batch summary</span>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-brand-border bg-brand-secondary p-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-text-muted">Completed</span>
                  <span className="mt-0.5 block font-mono font-bold text-text-primary">{completedBatchResults.length}/{batchResults.length}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold text-text-muted">Saved</span>
                  <span className="mt-0.5 block font-mono font-bold text-text-primary">{formatBytes(batchSavedBytes)}</span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadBatchZip}
                disabled={loading || completedBatchResults.length === 0}
                className="w-full gap-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download batch ZIP
              </Button>
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
              downloadLabel="Download optimized image"
              isProcessing={loading}
            >
              {friendlyError && !loading && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-600" />
                  <div>
                    <span className="font-bold text-red-800">{friendlyError.title}</span>
                    <p className="mt-1">{friendlyError.message}</p>
                    <p className="mt-1 font-semibold">{friendlyError.suggestion}</p>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-brand-border bg-brand-secondary p-4 text-xs sm:grid-cols-4">
                <div>
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Original</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{file ? formatBytes(file.size) : "-"}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Output</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{compressedSize ? formatBytes(compressedSize) : "-"}</span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Reduction</span>
                  <span className="mt-1 flex items-center gap-1 font-mono font-bold text-text-primary">
                    <Gauge className="h-3.5 w-3.5 text-accent-secondary" />
                    {reductionPercent === null ? "-" : `${reductionPercent}%`}
                  </span>
                </div>
                <div className="border-l border-brand-border pl-3">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-text-muted">Format</span>
                  <span className="mt-1 block font-mono font-bold text-text-primary">{activeOutputFormat}</span>
                </div>
              </div>

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
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary">
                    <span>Size: <strong className="font-mono text-text-primary">{file ? formatBytes(file.size) : "-"}</strong></span>
                    <span>Dims: <strong className="font-mono text-text-primary">{originalDimensions ? `${originalDimensions.width}x${originalDimensions.height}` : "-"}</strong></span>
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
                      <div className="absolute inset-0 flex items-center justify-center bg-white/75" role="status" aria-label="Generating compressed preview">
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
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary">
                    <span>Size: <strong className="font-mono text-text-primary">{compressedSize ? formatBytes(compressedSize) : "-"}</strong></span>
                    <span>Dims: <strong className="font-mono text-text-primary">{outputDimensions ? `${outputDimensions.width}x${outputDimensions.height}` : "-"}</strong></span>
                  </div>
                </div>

              </div>

              {batchResults.length > 1 && (
                <div className="space-y-3 rounded-xl border border-brand-border bg-brand-secondary p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-text-primary">Batch output queue</h5>
                      <p className="text-[10px] text-text-secondary">
                        {completedBatchResults.length} of {batchResults.length} files compressed. Total input {formatBytes(batchOriginalSize)}.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={downloadBatchZip}
                      disabled={loading || completedBatchResults.length === 0}
                      className="gap-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download ZIP
                    </Button>
                  </div>

                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {batchResults.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-brand-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 shrink-0 text-accent-secondary" />
                            <span className="truncate text-xs font-bold text-text-primary">{item.fileName}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-text-secondary">
                            {item.status === "completed"
                              ? `${formatBytes(item.originalSize)} -> ${formatBytes(item.outputSize)}`
                              : item.errorMessage}
                          </p>
                        </div>
                        {item.status === "completed" && (
                          <a
                            href={item.outputUrl}
                            download={buildKurioFileName(item.fileName, "compressed", item.extension)}
                            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-brand-bg"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </OutputPanel>
          ) : (
            <PreviewPanel
              title="Optimized output preview"
              emptyTitle="No image selected"
              emptyDescription="Upload one or more JPG, PNG, or WebP files to compare original and optimized output before downloading."
            />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default CompressImage;
