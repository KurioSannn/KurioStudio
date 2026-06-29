import { ToolDefinition } from "../types";

const TOOL_CATEGORY_DETAILS = {
  pdf: {
    name: "PDF Tools",
    description: "Convert, split, merge and optimize PDF documents.",
    icon: "FileText",
  },
  image: {
    name: "Image Tools",
    description: "Compress, resize, translate and polish vector/raster pictures.",
    icon: "Image",
  },
  motion: {
    name: "Motion Tools",
    description: "Lottie validation, animation inspections, and custom player frames.",
    icon: "Clapperboard",
  },
  video: {
    name: "Video Tools",
    description: "GIF encoders, frame extractors, and high compression filters.",
    icon: "Film",
  },
  developer: {
    name: "Developer Tools",
    description: "Utility tools for syntax checking, color matching and SVG exports.",
    icon: "Code2",
  },
  creator: {
    name: "Creator Tools",
    description: "Format social posts, write copy with AI guidance, and generate tag sets.",
    icon: "Layers",
  },
} as const;

export const TOOLS_LIST: ToolDefinition[] = [
  {
    id: "pdf-to-png",
    name: "PDF to PNG Converter",
    description: "Extract high-quality separate PNG images from your PDF pages.",
    category: "pdf",
    status: "ready",
    inputFormats: [".pdf"],
    outputFormats: [".png", ".zip"],
    slug: "/tools/pdf-to-png",
  },
  {
    id: "image-to-pdf",
    name: "Image to PDF Converter",
    description: "Combine PNG, JPG, JPEG, or WebP images into a single PDF document.",
    category: "pdf",
    status: "ready",
    inputFormats: [".png", ".jpg", ".jpeg", ".webp"],
    outputFormats: [".pdf"],
    slug: "/tools/image-to-pdf",
  },
  {
    id: "pdf-merge",
    name: "Merge PDF Docs",
    description: "Combine multiple PDF documents into one ordered consolidated file.",
    category: "pdf",
    status: "ready",
    inputFormats: [".pdf"],
    outputFormats: [".pdf"],
    slug: "/tools/pdf-merge",
  },
  {
    id: "resize-pdf",
    name: "Resize PDF",
    description: "Resize PDF pages to A4, Letter, Legal, or custom dimensions.",
    category: "pdf",
    status: "ready",
    inputFormats: [".pdf"],
    outputFormats: [".pdf"],
    slug: "/tools/resize-pdf",
  },
  {
    id: "pdf-compressor",
    name: "PDF Compressor",
    description: "Reduce PDF file size while keeping the document readable.",
    category: "pdf",
    status: "ready",
    inputFormats: [".pdf"],
    outputFormats: [".pdf"],
    slug: "/tools/pdf-compressor",
  },
  {
    id: "doc-to-md",
    name: "Document to Markdown",
    description: "Extract text-based PDF, DOCX, TXT, or Markdown files into clean Markdown.",
    category: "developer",
    status: "ready",
    inputFormats: [".pdf", ".docx", ".txt", ".md"],
    outputFormats: [".md"],
    slug: "/tools/doc-to-md",
  },
  {
    id: "compress-image",
    name: "Image Compressor",
    description: "Reduce image payloads up to 80% with adaptive web-quality sliders.",
    category: "image",
    status: "ready",
    inputFormats: [".png", ".jpg", ".jpeg", ".webp"],
    outputFormats: [".png", ".jpg", ".jpeg", ".webp"],
    slug: "/tools/compress-image",
  },
  {
    id: "resize-image",
    name: "Image Resizer",
    description: "Resize dimensions with aspect ratios, padding, or social canvas standards.",
    category: "image",
    status: "ready",
    inputFormats: [".png", ".jpg", ".jpeg", ".webp"],
    outputFormats: [".png", ".jpg", ".jpeg", ".webp"],
    slug: "/tools/resize-image",
  },
  {
    id: "remove-bg",
    name: "Remove Background",
    description: "Erase image backgrounds cleanly using rapid raster transparency masking.",
    category: "image",
    status: "coming-soon",
    inputFormats: [".png", ".jpg", ".jpeg"],
    outputFormats: [".png"],
    slug: "/tools/remove-bg",
  },
  {
    id: "lottie-preview",
    name: "Lottie Animation Inspector & Player",
    description: "Import, render, validate, and check colour palettes for JSON animations.",
    category: "motion",
    status: "ready",
    inputFormats: [".json"],
    outputFormats: [".json", ".webm", ".webp"],
    slug: "/tools/lottie-preview",
  },
  {
    id: "lottie-to-mp4",
    name: "Lottie to MP4 Export",
    description: "Render complex vector animations directly into web-optimized video clips.",
    category: "motion",
    status: "coming-soon",
    inputFormats: [".json"],
    outputFormats: [".mp4"],
    slug: "/tools/lottie-to-mp4",
  },
  {
    id: "json-formatter",
    name: "JSON Synthesizer & Formatter",
    description: "Validate structure, repair schemas and pretty-print JSON files instantly.",
    category: "developer",
    status: "ready",
    inputFormats: [".json", ".txt"],
    outputFormats: [".json"],
    slug: "/tools/json-formatter",
  },
];

type ToolCategoryKey = keyof typeof TOOL_CATEGORY_DETAILS;

export const TOOL_CATEGORIES = Object.fromEntries(
  Object.entries(TOOL_CATEGORY_DETAILS).map(([key, value]) => {
    const category = key as ToolCategoryKey;
    return [
      category,
      {
        ...value,
        count: TOOLS_LIST.filter((tool) => tool.category === category).length,
      },
    ];
  })
) as {
  [Key in ToolCategoryKey]: (typeof TOOL_CATEGORY_DETAILS)[Key] & { count: number };
};
