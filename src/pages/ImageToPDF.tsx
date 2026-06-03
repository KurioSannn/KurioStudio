import React, { useEffect, useRef, useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { trackEvent } from "@/src/lib/analytics";
import { AlertCircle, ArrowDown, ArrowUp, FileImage, FileText, FolderUp, Trash2, CheckCircle2 } from "lucide-react";

type PageSizeMode = "auto" | "a4";
type OrientationMode = "portrait" | "landscape";
type MarginMode = "none" | "small" | "medium";

interface ImagePdfItem {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
}

const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const POINTS_PER_PX = 0.75;
const MAX_AUTO_PAGE_POINTS = 1440;
const MIN_AUTO_PAGE_POINTS = 72;

function getFileExtension(fileName: string) {
  return fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
}

function formatImageListName(files: ImagePdfItem[]) {
  if (files.length === 1) {
    return files[0].file.name.replace(/\.[^.]+$/, "") || "kurio-image";
  }
  return `kurio-image-stack-${files.length}`;
}

function createLocalId(file: File) {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${file.name}-${file.size}-${randomId}`;
}

function isAcceptedImageFile(file: File) {
  const extension = getFileExtension(file.name);
  const hasValidExtension = ACCEPTED_EXTENSIONS.includes(extension);
  const hasValidMime = !file.type || file.type.startsWith("image/");
  return hasValidExtension && hasValidMime;
}

function getAutoPageSize(width: number, height: number) {
  const rawWidth = Math.max(MIN_AUTO_PAGE_POINTS, width * POINTS_PER_PX);
  const rawHeight = Math.max(MIN_AUTO_PAGE_POINTS, height * POINTS_PER_PX);
  const scale = Math.min(1, MAX_AUTO_PAGE_POINTS / Math.max(rawWidth, rawHeight));
  return {
    width: Math.max(MIN_AUTO_PAGE_POINTS, rawWidth * scale),
    height: Math.max(MIN_AUTO_PAGE_POINTS, rawHeight * scale),
  };
}

function textBytes(text: string) {
  return new TextEncoder().encode(text);
}

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function countToken(source: string, token: string) {
  return source.split(token).length - 1;
}

function validatePdfEmbedsImages(pdfBytes: Uint8Array, expectedImages: number) {
  const pdfText = new TextDecoder().decode(pdfBytes);
  const imageObjects = countToken(pdfText, "/Subtype /Image");
  const drawCommands = countToken(pdfText, " Do");
  const contentReferences = countToken(pdfText, "/Contents");

  if (imageObjects < expectedImages || drawCommands < expectedImages || contentReferences < expectedImages) {
    throw new Error("PDF validation failed before download. The image was not embedded into every page.");
  }
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode one of the selected images."));
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Browser failed to encode image data for PDF."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

async function imageToJpegBytes(item: ImagePdfItem) {
  if (!item.width || !item.height || item.width <= 0 || item.height <= 0) {
    throw new Error(`${item.file.name} has invalid image dimensions.`);
  }

  const img = await loadImageFromUrl(item.url);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error(`${item.file.name} did not finish loading correctly.`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = item.width;
  canvas.height = item.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context for image processing.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToJpegBlob(canvas);
  const bytes = await blobToUint8Array(blob);
  if (bytes.length === 0) {
    throw new Error(`${item.file.name} produced empty image data.`);
  }
  return bytes;
}

function createPdfBytes(
  pages: Array<{
    item: ImagePdfItem;
    imageBytes: Uint8Array;
  }>,
  pageSize: PageSizeMode,
  orientation: OrientationMode,
  margin: MarginMode
) {
  if (pages.length === 0) {
    throw new Error("No image pages were prepared for PDF generation.");
  }

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;

  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };
  const pushText = (text: string) => push(textBytes(text));
  const beginObject = (objectId: number) => {
    offsets[objectId] = offset;
    pushText(`${objectId} 0 obj\n`);
  };

  const marginPoints = margin === "none" ? 0 : margin === "small" ? 24 : 48;

  pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  beginObject(1);
  pushText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const pageObjectIds = pages.map((_, index) => 3 + index * 3);

  beginObject(2);
  pushText(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach(({ item, imageBytes }, index) => {
    const pageObjectId = 3 + index * 3;
    const contentObjectId = pageObjectId + 1;
    const imageObjectId = pageObjectId + 2;

    if (!item.width || !item.height || item.width <= 0 || item.height <= 0) {
      throw new Error(`${item.file.name} has invalid dimensions and cannot be embedded.`);
    }
    if (imageBytes.length === 0) {
      throw new Error(`${item.file.name} has empty encoded image data.`);
    }

    const autoPage = getAutoPageSize(item.width, item.height);
    let pageWidth = autoPage.width;
    let pageHeight = autoPage.height;

    if (pageSize === "a4") {
      pageWidth = orientation === "portrait" ? A4_PORTRAIT.width : A4_PORTRAIT.height;
      pageHeight = orientation === "portrait" ? A4_PORTRAIT.height : A4_PORTRAIT.width;
    }

    const contentWidth = Math.max(1, pageWidth - marginPoints * 2);
    const contentHeight = Math.max(1, pageHeight - marginPoints * 2);
    const imageRatio = item.width / item.height;
    if (!Number.isFinite(imageRatio) || imageRatio <= 0) {
      throw new Error(`${item.file.name} has an invalid aspect ratio.`);
    }

    let drawWidth = contentWidth;
    let drawHeight = drawWidth / imageRatio;

    if (drawHeight > contentHeight) {
      drawHeight = contentHeight;
      drawWidth = drawHeight * imageRatio;
    }

    const drawX = (pageWidth - drawWidth) / 2;
    const drawY = (pageHeight - drawHeight) / 2;
    if (
      drawWidth <= 0 ||
      drawHeight <= 0 ||
      drawX < 0 ||
      drawY < 0 ||
      drawX + drawWidth > pageWidth + 0.01 ||
      drawY + drawHeight > pageHeight + 0.01
    ) {
      throw new Error(`${item.file.name} could not be placed safely inside the PDF page.`);
    }

    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im${index + 1} Do\nQ\n`;

    beginObject(pageObjectId);
    pushText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im${index + 1} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj\n`
    );

    beginObject(contentObjectId);
    pushText(`<< /Length ${textBytes(content).length} >>\nstream\n${content}endstream\nendobj\n`);

    beginObject(imageObjectId);
    pushText(
      `<< /Type /XObject /Subtype /Image /Width ${item.width} /Height ${item.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
    );
    push(imageBytes);
    pushText("\nendstream\nendobj\n");
  });

  const xrefOffset = offset;
  const objectCount = 3 + pages.length * 3;
  pushText(`xref\n0 ${objectCount}\n`);
  pushText("0000000000 65535 f \n");
  for (let objectId = 1; objectId < objectCount; objectId++) {
    pushText(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  const embeddedImages = pages.length;
  if (embeddedImages !== pages.length) {
    throw new Error("PDF generation finished without embedding every image.");
  }

  return { bytes: output, embeddedImages };
}

export function ImageToPDF() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImagePdfItem[]>([]);
  const pdfUrlRef = useRef<string | null>(null);
  const [images, setImages] = useState<ImagePdfItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [pageSize, setPageSize] = useState<PageSizeMode>("auto");
  const [orientation, setOrientation] = useState<OrientationMode>("portrait");
  const [margin, setMargin] = useState<MarginMode>("none");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | undefined>(undefined);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    pdfUrlRef.current = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const resetOutput = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfSize(undefined);
    setSuccessText(null);
    setErrorText(null);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    resetOutput();
    const files = Array.from(fileList);
    const validFiles = files.filter(isAcceptedImageFile);
    const rejectedFiles = files.filter((file) => !isAcceptedImageFile(file));

    if (rejectedFiles.length > 0) {
      const rejectedNames = rejectedFiles.map((file) => file.name).join(", ");
      setErrorText(`Rejected unsupported file${rejectedFiles.length === 1 ? "" : "s"}: ${rejectedNames}. Please use PNG, JPG, JPEG, or WebP images only.`);
      rejectedFiles.forEach((file) => {
        trackEvent("conversion_failed", {
          toolId: "image-to-pdf",
          message: `Unsupported file rejected: ${file.name}`,
          fileType: file.type || getFileExtension(file.name),
        });
      });
    }

    if (validFiles.length === 0) {
      if (rejectedFiles.length === 0) {
        setErrorText("Please choose PNG, JPG, JPEG, or WebP images.");
      }
      return;
    }

    const loadedItems: ImagePdfItem[] = [];
    for (const file of validFiles) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImageFromUrl(url);
        if (!img.naturalWidth || !img.naturalHeight) {
          throw new Error(`${file.name} loaded with invalid dimensions.`);
        }
        loadedItems.push({
          id: createLocalId(file),
          file,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        trackEvent("file_processed", { toolId: "image-to-pdf", fileType: file.type, fileSize: file.size });
      } catch (error: any) {
        URL.revokeObjectURL(url);
        setErrorText(error.message || `Could not load ${file.name}.`);
        trackEvent("conversion_failed", { toolId: "image-to-pdf", message: error.message || "Image load failed" });
      }
    }

    if (loadedItems.length > 0) {
      setImages((current) => [...current, ...loadedItems]);
      if (rejectedFiles.length === 0) {
        setErrorText(null);
      }
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    resetOutput();
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((image) => image.id !== id);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    resetOutput();
    setImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setImages([]);
    resetOutput();
  };

  const generatePdf = async () => {
    if (images.length === 0) {
      setErrorText("Add at least one image before generating a PDF.");
      return;
    }

    setLoading(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      const pages = [];
      for (const item of images) {
        const imageBytes = await imageToJpegBytes(item);
        pages.push({ item, imageBytes });
      }

      if (pages.length !== images.length) {
        throw new Error("Not every image could be prepared for PDF embedding.");
      }

      const { bytes: pdfBytes, embeddedImages } = createPdfBytes(pages, pageSize, orientation, margin);
      if (embeddedImages !== images.length) {
        throw new Error("PDF generation finished without embedding every image.");
      }
      validatePdfEmbedsImages(pdfBytes, images.length);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      if (blob.size <= 0) {
        throw new Error("PDF output is empty. No file was generated.");
      }
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setPdfSize(blob.size);
      setSuccessText(`Generated a ${images.length}-page PDF successfully.`);

      const totalInputSize = images.reduce((total, item) => total + item.file.size, 0);
      addToWorkspaceHistory({
        toolId: "image-to-pdf",
        toolName: "Image to PDF",
        fileName: `${formatImageListName(images)}.pdf`,
        fileSize: totalInputSize,
        outputType: "PDF",
        status: "completed",
      });
      trackEvent("conversion_success", {
        toolId: "image-to-pdf",
        fileType: "application/pdf",
        fileSize: totalInputSize,
        outputSize: blob.size,
        pages: images.length,
      });
    } catch (error: any) {
      setErrorText(error.message || "Image to PDF conversion failed.");
      trackEvent("conversion_failed", { toolId: "image-to-pdf", message: error.message || "PDF generation failed" });
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${formatImageListName(images)}.pdf`;
    link.click();
  };

  const totalInputSize = images.reduce((total, item) => total + item.file.size, 0);

  return (
    <ToolPageShell toolId="image-to-pdf">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <SettingsPanel title="PDF Page Options">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-secondary block">Page size</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "auto", label: "Auto" },
                  { id: "a4", label: "A4" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setPageSize(option.id as PageSizeMode);
                      resetOutput();
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      pageSize === option.id
                        ? "bg-accent-secondary text-white border-accent-secondary"
                        : "bg-brand-surface border-brand-border text-text-secondary hover:bg-brand-bg"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-brand-soft-border">
              <span className="text-[10px] uppercase font-bold text-text-secondary block">Orientation</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "portrait", label: "Portrait" },
                  { id: "landscape", label: "Landscape" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setOrientation(option.id as OrientationMode);
                      resetOutput();
                    }}
                    disabled={pageSize === "auto"}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      orientation === option.id
                        ? "bg-accent-secondary text-white border-accent-secondary"
                        : "bg-brand-surface border-brand-border text-text-secondary hover:bg-brand-bg"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {pageSize === "auto" && (
                <span className="text-[10px] text-text-muted block">Auto page size follows each image's natural orientation.</span>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-brand-soft-border">
              <span className="text-[10px] uppercase font-bold text-text-secondary block">Margin</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "none", label: "None" },
                  { id: "small", label: "Small" },
                  { id: "medium", label: "Medium" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setMargin(option.id as MarginMode);
                      resetOutput();
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      margin === option.id
                        ? "bg-accent-secondary text-white border-accent-secondary"
                        : "bg-brand-surface border-brand-border text-text-secondary hover:bg-brand-bg"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-brand-soft-border space-y-2">
              <Button
                variant="primary"
                onClick={generatePdf}
                disabled={loading || images.length === 0}
                className="w-full text-xs font-bold"
              >
                {loading ? "Generating PDF..." : "Generate PDF"}
              </Button>
              {images.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="w-full gap-2 text-xs border border-brand-border">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all images
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
              dragActive ? "border-accent-primary bg-accent-bg/20" : "border-brand-border bg-brand-secondary hover:border-accent-primary hover:bg-brand-soft/40"
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
            <h3 className="text-sm font-bold text-text-primary">Upload one or multiple images</h3>
            <p className="mt-1 text-xs text-text-secondary">Drop PNG, JPG, JPEG, or WebP files here. Each image becomes one PDF page.</p>
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

          {images.length > 0 ? (
            <OutputPanel
              title={`Image page order (${images.length} page${images.length === 1 ? "" : "s"})`}
              originalSize={totalInputSize}
              compressedSize={pdfSize}
              onDownloadAll={pdfUrl ? downloadPdf : undefined}
              downloadLabel="Download generated PDF"
              isProcessing={loading}
            >
              <div className="space-y-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-brand-border bg-white p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-border bg-brand-secondary">
                        <img src={image.url} alt={image.file.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileImage className="h-4 w-4 text-accent-secondary" />
                          <span className="truncate text-xs font-bold text-text-primary">{image.file.name}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-text-secondary">
                          Page {index + 1} · {image.width} x {image.height}px
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" onClick={() => moveImage(index, -1)} disabled={index === 0 || loading} className="h-8 w-8">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1 || loading} className="h-8 w-8">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeImage(image.id)} disabled={loading} className="h-8 w-8 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel title="PDF page preview queue">
              <div className="flex flex-col items-center justify-center py-16 text-center text-text-secondary">
                <FileText className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-xs">Add images to build a multi-page PDF.</p>
              </div>
            </PreviewPanel>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

export default ImageToPDF;
