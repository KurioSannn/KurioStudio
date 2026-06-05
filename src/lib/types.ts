export type AppRoute =
  | "/"
  | "/tools"
  | "/tools/pdf-to-png"
  | "/tools/pdf-to-jpg"
  | "/tools/image-to-pdf"
  | "/tools/pdf-merge"
  | "/tools/doc-to-md"
  | "/tools/remove-bg"
  | "/tools/compress-image"
  | "/tools/resize-image"
  | "/tools/lottie-preview"
  | "/tools/lottie-to-mp4"
  | "/tools/json-formatter"
  | "/workspace"
  | "/ai-helper"
  | "/settings";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: "pdf" | "image" | "motion" | "video" | "developer" | "creator";
  status: "ready" | "beta" | "coming-soon";
  inputFormats: string[];
  outputFormats: string[];
  slug: AppRoute;
}

export interface WorkspaceItem {
  id: string;
  toolId: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  outputType: string;
  status: "idle" | "processing" | "completed" | "error";
  errorMessage?: string;
  createdAt: string;
  resultUrl?: string; // local blob URL or base64 data for download
}

export interface GeminiAPIRequest {
  mode: "tool-router" | "caption-helper" | "error-explainer" | "filename-helper" | "lottie-helper";
  userInput: string;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  context?: Record<string, any>;
}

export interface GeminiAPIResponse {
  result: string;
  recommendedTools?: string[];
  workflowSteps?: string[];
  suggestedFileName?: string;
}

export interface ToolAPIResponse {
  success: boolean;
  message?: string;
  data?: any;
}
