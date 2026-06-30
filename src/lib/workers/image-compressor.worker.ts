/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
  const { id, file, quality, scale, format } = e.data;

  try {
    // Decode image off the main thread
    const bmp = await createImageBitmap(file);
    
    const targetWidth = Math.max(1, Math.round(bmp.width * (scale / 100)));
    const targetHeight = Math.max(1, Math.round(bmp.height * (scale / 100)));

    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this browser worker.");
    }

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OffscreenCanvas 2D context not supported.");

    // Fill white background for transparent to JPG conversions
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Draw the scaled image
    ctx.drawImage(bmp, 0, 0, targetWidth, targetHeight);

    const isPNG = format === "image/png";
    
    // Export blob asynchronously
    const blob = await canvas.convertToBlob({
      type: format,
      quality: isPNG ? undefined : quality / 100,
    });

    self.postMessage({
      id,
      success: true,
      blob,
      width: targetWidth,
      height: targetHeight,
      originalWidth: bmp.width,
      originalHeight: bmp.height,
    });
    
    // Cleanup memory
    bmp.close();
  } catch (error: any) {
    self.postMessage({
      id,
      success: false,
      error: error.message || "Unknown worker compression error",
    });
  }
};
