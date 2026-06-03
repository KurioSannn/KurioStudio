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

function getOfflineResponse(mode: string) {
  let result = "";
  let recommendedTools: string[] = [];
  let workflowSteps: string[] = [];
  const suggestedFileName = "export_asset.png";

  if (mode === "tool-router") {
    result = "To achieve this, you should use the PDF to PNG Converter or Image to PDF Converter depending on your source format.";
    recommendedTools = ["pdf-to-png", "image-to-pdf"];
    workflowSteps = ["Upload your source asset", "Choose conversion settings", "Export the finished file"];
  } else if (mode === "caption-helper" || mode === "captions-helper") {
    result = "Option 1: Convert assets faster with Kurio Studio.\nOption 2: Keep creative workflows clean with browser-first conversion tools.\n\nHashtags: #creators #assets #design #workflow";
  } else if (mode === "lottie-helper") {
    result = "This Lottie file appears to use standard animation metadata. Check layer count, frame rate, and external assets before export.";
  } else if (mode === "filename-helper" || mode === "naming-helper") {
    result = "exported-brand-asset.png\nbrand-workflow-export.png";
  } else {
    result = `Processed workflow option under mode: ${mode}. Configure GEMINI_API_KEY to activate live AI responses.`;
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
3. compress-image (Compress JPG, PNG, WebP)
4. resize-image (Resize, crop or use social media presets for images)
5. remove-bg (Erase image backgrounds)
6. lottie-preview (Check and validate Lottie animation JSON files)
7. json-formatter (Validate and pretty-print JSON files)

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

  return {
    systemInstruction: "You are Kurio Studio's Creative Client workflow companion. Give concise, professional suggestions. Do not use emojis.",
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
    const fallback = getOfflineResponse(String(mode));
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
      message: "Gemini server processing error",
      error: error.message,
    });
  }
}
