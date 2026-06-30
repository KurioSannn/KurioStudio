import { AppRoute } from "../types";

export interface RecommendedToolAction {
  id: string;
  label: string;
  description: string;
  slug: AppRoute;
}

export interface DetectedFileStats {
  category: "pdf" | "image" | "motion" | "video" | "developer" | "unsupported";
  recommendedToolId: string;
  name: string;
  extension: string;
  slug: AppRoute;
  actions: RecommendedToolAction[];
}

const PDF_ACTIONS: RecommendedToolAction[] = [
  {
    id: "pdf-compressor",
    label: "Compress PDF",
    description: "Reduce file size while preserving page dimensions.",
    slug: "/tools/pdf-compressor",
  },
  {
    id: "pdf-to-png",
    label: "Convert pages to PNG",
    description: "Export every page as a separate image.",
    slug: "/tools/pdf-to-png",
  },
  {
    id: "resize-pdf",
    label: "Resize PDF pages",
    description: "Change pages to A4, Letter, Legal, or custom sizes.",
    slug: "/tools/resize-pdf",
  },
  {
    id: "pdf-merge",
    label: "Add to merge queue",
    description: "Combine this PDF with more documents.",
    slug: "/tools/pdf-merge",
  },
];

const IMAGE_ACTIONS: RecommendedToolAction[] = [
  {
    id: "compress-image",
    label: "Compress image",
    description: "Shrink image payloads with quality and format controls.",
    slug: "/tools/compress-image",
  },
  {
    id: "resize-image",
    label: "Resize image",
    description: "Create exact pixel dimensions or social presets.",
    slug: "/tools/resize-image",
  },
  {
    id: "image-to-pdf",
    label: "Convert to PDF",
    description: "Place one or more images into a PDF document.",
    slug: "/tools/image-to-pdf",
  },
];

const DOCUMENT_ACTIONS: RecommendedToolAction[] = [
  {
    id: "doc-to-md",
    label: "Convert to Markdown",
    description: "Extract text into a clean Markdown document.",
    slug: "/tools/doc-to-md",
  },
];

const JSON_ACTIONS: RecommendedToolAction[] = [
  {
    id: "json-formatter",
    label: "Format JSON",
    description: "Validate, pretty-print, or minify JSON content.",
    slug: "/tools/json-formatter",
  },
  {
    id: "lottie-preview",
    label: "Inspect as Lottie",
    description: "Preview animation metadata and structure.",
    slug: "/tools/lottie-preview",
  },
];

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
      actions: PDF_ACTIONS,
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
      actions: IMAGE_ACTIONS,
    };
  }

  if (extension === ".json" || mimeType === "application/json") {
    return {
      category: "motion", // Default to motion lottie or developer json
      recommendedToolId: "lottie-preview",
      name: "JSON Record",
      extension: extension || ".json",
      slug: "/tools/lottie-preview",
      actions: JSON_ACTIONS,
    };
  }

  if ([".docx", ".txt", ".md"].includes(extension)) {
    return {
      category: "developer",
      recommendedToolId: "doc-to-md",
      name: `Document Asset (${extension.toUpperCase().replace(".", "")})`,
      extension,
      slug: "/tools/doc-to-md",
      actions: DOCUMENT_ACTIONS,
    };
  }

  if (extension === ".mp4" || mimeType === "video/mp4") {
    return {
      category: "video",
      recommendedToolId: "lottie-to-mp4",
      name: "MP4 Video Clip",
      extension: ".mp4",
      slug: "/tools/lottie-to-mp4",
      actions: [
        {
          id: "lottie-to-mp4",
          label: "Open video tools",
          description: "Video conversion is reserved during beta.",
          slug: "/tools/lottie-to-mp4",
        },
      ],
    };
  }

  return {
    category: "unsupported",
    recommendedToolId: "",
    name: "Unclassified Resource",
    extension: extension || "",
    slug: "/tools",
    actions: [],
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
        actions: [JSON_ACTIONS[1], JSON_ACTIONS[0]],
      };
    }

    return {
      category: "developer",
      recommendedToolId: "json-formatter",
      name: "JSON Data File",
      extension: detected.extension || ".json",
      slug: "/tools/json-formatter",
      actions: [JSON_ACTIONS[0], JSON_ACTIONS[1]],
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
