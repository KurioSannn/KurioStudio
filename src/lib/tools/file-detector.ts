import { AppRoute } from "../types";

export interface DetectedFileStats {
  category: "pdf" | "image" | "motion" | "video" | "developer" | "unsupported";
  recommendedToolId: string;
  name: string;
  extension: string;
  slug: AppRoute;
}

export function detectFileType(fileName: string, mimeType?: string): DetectedFileStats {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex >= 0 ? fileName.substring(lastDotIndex).toLowerCase() : "";
  
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

  if (extension === ".json" || mimeType === "application/json") {
    return {
      category: "motion", // Default to motion lottie or developer json
      recommendedToolId: "lottie-preview",
      name: "JSON Record",
      extension: extension || ".json",
      slug: "/tools/lottie-preview",
    };
  }

  if ([".docx", ".txt", ".md"].includes(extension)) {
    return {
      category: "developer",
      recommendedToolId: "doc-to-md",
      name: `Document Asset (${extension.toUpperCase().replace(".", "")})`,
      extension,
      slug: "/tools/doc-to-md",
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

export async function detectFileTypeForTool(file: File): Promise<DetectedFileStats> {
  const detected = detectFileType(file.name, file.type);
  const isJsonLike = detected.extension === ".json" || file.type === "application/json";

  if (!isJsonLike) {
    return detected;
  }

  try {
    const text = await file.text();

    if (isLottieJSON(text)) {
      return {
        ...detected,
        category: "motion",
        recommendedToolId: "lottie-preview",
        name: "Lottie Animation JSON",
        slug: "/tools/lottie-preview",
      };
    }

    return {
      category: "developer",
      recommendedToolId: "json-formatter",
      name: "JSON Data File",
      extension: detected.extension || ".json",
      slug: "/tools/json-formatter",
    };
  } catch (e) {
    console.error("Failed to inspect JSON file contents:", e);
    return detected;
  }
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
