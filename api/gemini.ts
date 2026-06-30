import { GoogleGenAI } from "@google/genai";

type VercelRequest = {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
};

type AIRateRecord = {
  dailyWindowStart: number;
  dailyCount: number;
  minuteWindowStart: number;
  minuteCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const aiRateStore = new Map<string, AIRateRecord>();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const AI_RATE_LIMIT_ENABLED = process.env.AI_RATE_LIMIT_ENABLED !== "false";
const AI_DAILY_LIMIT = toPositiveInt(process.env.AI_DAILY_LIMIT, 10);
const AI_MINUTE_LIMIT = toPositiveInt(process.env.AI_MINUTE_LIMIT, 3);
const AI_MAX_PROMPT_CHARS = toPositiveInt(process.env.AI_MAX_PROMPT_CHARS, 2000);

let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "kurio-studio-vercel",
      },
    },
  });
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function getHeader(req: VercelRequest, key: string) {
  const value = req.headers[key.toLowerCase()] || req.headers[key];
  return Array.isArray(value) ? value[0] : value;
}

function getClientIp(req: VercelRequest) {
  const forwardedFor = getHeader(req, "x-forwarded-for");
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = getHeader(req, "x-real-ip");
  return realIp || req.socket?.remoteAddress || "unknown";
}

function checkAIRateLimit(req: VercelRequest) {
  if (!AI_RATE_LIMIT_ENABLED) return null;

  const now = Date.now();
  const clientKey = getClientIp(req);
  const record = aiRateStore.get(clientKey) || {
    dailyWindowStart: now,
    dailyCount: 0,
    minuteWindowStart: now,
    minuteCount: 0,
  };

  if (now - record.dailyWindowStart >= DAY_MS) {
    record.dailyWindowStart = now;
    record.dailyCount = 0;
  }

  if (now - record.minuteWindowStart >= MINUTE_MS) {
    record.minuteWindowStart = now;
    record.minuteCount = 0;
  }

  if (record.dailyCount >= AI_DAILY_LIMIT) {
    aiRateStore.set(clientKey, record);
    return {
      scope: "daily",
      retryAfterSeconds: Math.ceil((record.dailyWindowStart + DAY_MS - now) / 1000),
      remainingDaily: 0,
      remainingMinute: Math.max(0, AI_MINUTE_LIMIT - record.minuteCount),
    };
  }

  if (record.minuteCount >= AI_MINUTE_LIMIT) {
    aiRateStore.set(clientKey, record);
    return {
      scope: "minute",
      retryAfterSeconds: Math.ceil((record.minuteWindowStart + MINUTE_MS - now) / 1000),
      remainingDaily: Math.max(0, AI_DAILY_LIMIT - record.dailyCount),
      remainingMinute: 0,
    };
  }

  record.dailyCount += 1;
  record.minuteCount += 1;
  aiRateStore.set(clientKey, record);
  return null;
}

function getOfflineResponse(mode: string, userInput = "") {
  let result = "";
  let recommendedTools: string[] = [];
  let workflowSteps: string[] = [];
  const suggestedFileName = "export_asset.png";

  if (mode === "tool-router") {
    const normalizedInput = String(userInput).toLowerCase();
    if ((normalizedInput.includes("compress") || normalizedInput.includes("reduce") || normalizedInput.includes("smaller") || normalizedInput.includes("file size")) && normalizedInput.includes("pdf")) {
      result = "Use PDF Compressor to reduce PDF file size without changing the physical page dimensions. Choose Light, Recommended, or Strong Compression, then download the browser-generated PDF.";
      recommendedTools = ["pdf-compressor"];
      workflowSteps = ["Upload one PDF in PDF Compressor", "Choose a compression mode", "Compress and download the new PDF"];
    } else if ((normalizedInput.includes("resize") || normalizedInput.includes("page size")) && normalizedInput.includes("pdf")) {
      result = "Use Resize PDF to change PDF pages to A4, Letter, Legal, A3, A5, or a custom page size. Upload one PDF, choose sizing and scaling settings, then download the browser-generated PDF.";
      recommendedTools = ["resize-pdf"];
      workflowSteps = ["Upload one PDF in Resize PDF", "Choose page size, orientation, scaling, and margins", "Resize and download the new PDF"];
    } else if ((normalizedInput.includes("merge") || normalizedInput.includes("combine") || normalizedInput.includes("gabung")) && normalizedInput.includes("pdf")) {
      result = "Use Merge PDF Docs to combine multiple PDFs into one ordered document. Upload every PDF, arrange the queue, then download the merged file.";
      recommendedTools = ["pdf-merge"];
      workflowSteps = ["Upload multiple PDFs in Merge PDF Docs", "Arrange the queue order", "Merge and download the final PDF"];
    } else {
      result = "To achieve this, you should use the PDF to PNG Converter. This allows you to split PDF pages into individual PNG images, which you can then customize or resize for your channels.";
      recommendedTools = ["pdf-to-png", "resize-image"];
      workflowSteps = ["Upload PDF in PDF to PNG", "Select Scale factor", "Convert and download zip archive"];
    }
  } else if (mode === "caption-helper" || mode === "captions-helper") {
    result = `✨ Here are your generated copy options:\n\nOption 1: Elevate your brand assets with Kurio Studio. Clean, converted, and fast. 🚀\nOption 2: Creator workflow simplified. From PDF to Lottie previews inside one focused workspace. 🎨\n\nHashtags: #creators #assets #design #kurio #workflow`;
  } else if (mode === "lottie-helper") {
    result = "This Lottie animation file matches standard Web Player specifications. No critical syntax errors found. It carries key performance metadata ready for render.";
  } else if (mode === "filename-helper" || mode === "naming-helper") {
    result = "exported-brand-asset.png\nbrand-workflow-export.png";
  } else if (mode === "json-helper") {
    result = userInput;
  } else {
    result = `Processed request under mode: ${mode}. Configure GEMINI_API_KEY to enable live AI responses.`;
  }

  return { result, recommendedTools, workflowSteps, suggestedFileName };
}

function buildPrompt(mode: string, userInput: string, fileInfo: unknown) {
  if (mode === "tool-router") {
    return {
      systemInstruction: `You are Kurio Studio's Intelligent Tool Router.
You analyze the user's creative task and recommend the correct tools from Kurio Studio's list:
1. pdf-to-png (Convert PDF to separate PNG images)
2. image-to-pdf (Combine images into one PDF)
3. pdf-merge (Combine multiple PDFs into one ordered PDF)
4. resize-pdf (Resize PDF pages to standard or custom page sizes)
5. pdf-compressor (Reduce PDF file size without changing page dimensions)
6. compress-image (Compress JPG, PNG, WebP)
7. resize-image (Resize, crop or use social media presets for images)
8. remove-bg (Erase image backgrounds)
9. lottie-preview (Check and validate Lottie animation JSON files)
10. json-formatter (Validate and pretty-print JSON files)
11. doc-to-md (Convert text-based PDF, DOCX, TXT, or Markdown into Markdown without AI)

You MUST return a JSON structure matching:
{
  "result": "A helpful 2-sentence conversational explanation suggesting which tool to use",
  "recommendedTools": ["tool-id-1", "tool-id-2"],
  "workflowSteps": ["Step 1 explanation", "Step 2 explanation"]
}`,
      promptText: `User says: "${userInput}"`,
    };
  }

  if (mode === "caption-helper" || mode === "captions-helper") {
    return {
      systemInstruction: `You are Kurio Studio's Creator Caption and Copy Helper.
Help the user generate engaging, highly customized creator copy, captions, product descriptions, or SEO alt-texts based on their exported assets.
Return a structured markdown list containing:
1. Two variations of highly engaging social media captions
2. One clean product description
3. Relevant and highly focused creator hashtags

Do not use emojis in the actual output copy. Keep formatting clean, stylish, and highly professional.`,
      promptText: `Generate creator copy for asset task: "${userInput}". Info: ${JSON.stringify(fileInfo || {})}`,
    };
  }

  if (mode === "lottie-helper") {
    return {
      systemInstruction: `You are Kurio Studio's Lottie JSON Analyst.
Suggest explanations, structural feedback or troubleshooting recommendations for the user's Lottie animation structure.
Keep responses concise, listing 3 bullet points maximum. Do not use emojis.`,
      promptText: `Analyze Lottie information: ${userInput}`,
    };
  }

  if (mode === "filename-helper" || mode === "naming-helper") {
    return {
      systemInstruction: "You are Kurio Studio's Smart File Naming assistant. Generate 2 clean, descriptive, lowercase, kebab-case file names suitable for final exports.",
      promptText: `File info: name is "${userInput}" or metadata is ${JSON.stringify(fileInfo || {})}`,
    };
  }

  if (mode === "json-helper") {
    return {
      systemInstruction: "You are Kurio Studio's JSON repair assistant. Return only valid JSON. Do not include markdown, commentary, explanations, or code fences.",
      promptText: `Repair this JSON so it parses correctly:\n${userInput}`,
    };
  }

  return {
    systemInstruction: "You are Kurio Studio's creative workflow helper. Give concise, practical suggestions. Do not use emojis.",
    promptText: userInput,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(204).json({});
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { mode = "", userInput, fileInfo } = parseBody(req);

  if (!userInput) {
    res.status(400).json({ success: false, message: "userInput property is required" });
    return;
  }

  if (String(userInput).length > AI_MAX_PROMPT_CHARS) {
    res.status(413).json({
      success: false,
      message: `Prompt is too long. Keep AI requests under ${AI_MAX_PROMPT_CHARS} characters.`,
    });
    return;
  }

  const rateLimit = checkAIRateLimit(req);
  if (rateLimit) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({
      success: false,
      message:
        rateLimit.scope === "daily"
          ? "Daily AI quota reached. Try again after the quota window resets."
          : "Too many AI requests in a short time. Please wait before trying again.",
      quota: {
        scope: rateLimit.scope,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        dailyLimit: AI_DAILY_LIMIT,
        minuteLimit: AI_MINUTE_LIMIT,
        remainingDaily: rateLimit.remainingDaily,
        remainingMinute: rateLimit.remainingMinute,
      },
    });
    return;
  }

  console.info("[analytics]", {
    event: "ai_request_used",
    timestamp: new Date().toISOString(),
    payload: { mode, promptLength: String(userInput).length },
  });

  if (!ai) {
    const fallback = getOfflineResponse(String(mode), String(userInput));
    res.status(200).json({
      success: true,
      result: fallback.result,
      recommendedTools: fallback.recommendedTools,
      workflowSteps: fallback.workflowSteps,
      suggestedFileName: fallback.suggestedFileName,
    });
    return;
  }

  try {
    const { systemInstruction, promptText } = buildPrompt(String(mode), String(userInput), fileInfo);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: mode === "tool-router" ? "application/json" : "text/plain",
      },
    });

    const textOutput = response.text || "";

    if (mode === "tool-router") {
      try {
        const jsonResult = JSON.parse(textOutput);
        res.status(200).json({
          success: true,
          result: jsonResult.result,
          recommendedTools: jsonResult.recommendedTools,
          workflowSteps: jsonResult.workflowSteps,
        });
        return;
      } catch {
        res.status(200).json({
          success: true,
          result: textOutput,
          recommendedTools: ["compress-image"],
          workflowSteps: ["Upload your image", "Apply default quality parameters", "Export clean output"],
        });
        return;
      }
    }

    res.status(200).json({ success: true, result: textOutput });
  } catch (error: any) {
    console.error("Gemini function failure:", error);
    res.status(500).json({
      success: false,
      message: "Gemini server processing error. Please try again later.",
    });
  }
}
