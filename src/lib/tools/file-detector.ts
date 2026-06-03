import { AppRoute } from "../types";

interface DetectedFileStats {
  category: "pdf" | "image" | "motion" | "video" | "developer" | "unsupported";
  recommendedToolId: string;
  name: string;
  extension: string;
  slug: AppRoute;
}

export function detectFileType(fileName: string, mimeType?: string): DetectedFileStats {
  const extension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  
  if (extension === ".pdf" || mimeType === "application/pdf") {
    return {
      category: "pdf",
      recommendedToolId: "pdf-to-png",
      name: "PDF Document",
      extension: ".pdf",
      slug: "/tools/pdf-to-png",
    };
  }

  if (["jpeg", "jpg", "png", "webp", "gif"].some(ext => extension === `.${ext}`) || mimeType?.startsWith("image/")) {
    const cleanExt = extension === ".jpeg" ? ".jpg" : extension;
    const recToolId = cleanExt === ".webp" ? "resize-image" : "compress-image";
    const recSlug: AppRoute = cleanExt === ".webp" ? "/tools/resize-image" : "/tools/compress-image";
    return {
      category: "image",
      recommendedToolId: recToolId,
      name: `Image Asset (${extension.toUpperCase().replace(".", "")})`,
      extension: extension,
      slug: recSlug,
    };
  }

  if (extension === ".json") {
    return {
      category: "motion", // Default to motion lottie or developer json
      recommendedToolId: "lottie-preview",
      name: "JSON Record",
      extension: ".json",
      slug: "/tools/lottie-preview",
    };
  }

  if (extension === ".mp4" || mimeType === "video/mp4") {
    return {
      category: "video",
      recommendedToolId: "lottie-to-mp4",
      name: "MP4 Video Clip",
      extension: ".mp4",
      slug: "/tools/lottie-to-mp4",
    };
  }

  return {
    category: "unsupported",
    recommendedToolId: "",
    name: "Unclassified Resource",
    extension: extension || "",
    slug: "/tools",
  };
}

/**
 * Deep-scans a raw JSON string to check if it represents a Lottie animation
 */
export function isLottieJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== "object" || parsed === null) return false;
    
    // Core Lottie requirements: has a frame rate (fr), in point (ip), out point (op), version (v), and layers array
    const hasVersion = typeof parsed.v === "string";
    const hasLayers = Array.isArray(parsed.layers);
    const hasFrameRate = typeof parsed.fr === "number";
    
    return hasVersion && (hasLayers || hasFrameRate);
  } catch (e) {
    return false;
  }
}
