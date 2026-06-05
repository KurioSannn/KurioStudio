import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.set("trust proxy", 1);

// Set up server-side parsers for uploads and payloads using env-configured limits
const fileSizeLimit = process.env.MAX_FILE_SIZE_MB ? `${process.env.MAX_FILE_SIZE_MB}mb` : "50mb";
app.use(express.json({ limit: fileSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: fileSizeLimit }));

app.post("/api/analytics", (req: Request, res: Response) => {
  const { event, payload, path: appPath, timestamp } = req.body || {};
  if (!event || typeof event !== "string") {
    res.status(400).json({ success: false, message: "event property is required" });
    return;
  }

  console.info("[analytics]", {
    event,
    path: appPath || "",
    timestamp: timestamp || new Date().toISOString(),
    payload: payload || {},
  });

  res.json({ success: true });
});

// Initialize GoogleGenAI SDK with telemetric instructions
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const AI_RATE_LIMIT_ENABLED = process.env.AI_RATE_LIMIT_ENABLED !== "false";
const AI_DAILY_LIMIT = toPositiveInt(process.env.AI_DAILY_LIMIT, 10);
const AI_MINUTE_LIMIT = toPositiveInt(process.env.AI_MINUTE_LIMIT, 3);
const AI_MAX_PROMPT_CHARS = toPositiveInt(process.env.AI_MAX_PROMPT_CHARS, 2000);
let ai: GoogleGenAI | null = null;

type AIRateRecord = {
  dailyWindowStart: number;
  dailyCount: number;
  minuteWindowStart: number;
  minuteCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const aiRateStore = new Map<string, AIRateRecord>();

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function checkAIRateLimit(req: Request) {
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

if (GEMINI_API_KEY && GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Registered server-side Gemini GoogleGenAI client.");
  } catch (error) {
    console.error("Failed to construct GoogleGenAI client:", error);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined or is placeholder. AI assistance features will run under offline mock mode.");
}

// REST Api Routes go here FIRST

// 1. Creative Gemini assistant endpoints
app.post("/api/gemini", async (req: Request, res: Response): Promise<void> => {
  const { mode, userInput, fileInfo, context } = req.body;
  
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

  // If AI client is uninitialized, fallback to mock responses to provide a seamless offline experience
  if (!ai) {
    console.warn("Returning default offline responder - No Gemini API key provided.");
    let mockResult = "";
    let mockTools: string[] = [];
    let mockSteps: string[] = [];
    let mockName = "export_asset.png";

    if (mode === "tool-router") {
      const normalizedInput = String(userInput).toLowerCase();
      if ((normalizedInput.includes("merge") || normalizedInput.includes("combine") || normalizedInput.includes("gabung")) && normalizedInput.includes("pdf")) {
        mockResult = "Use Merge PDF Docs to combine multiple PDFs into one ordered document. Upload every PDF, arrange the queue, then download the merged file.";
        mockTools = ["pdf-merge"];
        mockSteps = ["Upload multiple PDFs in Merge PDF Docs", "Arrange the queue order", "Merge and download the final PDF"];
      } else {
        mockResult = "To achieve this, you should use the PDF to PNG Converter. This allows you to split PDF pages into individual PNG images, which you can then customize or resize for your channels.";
        mockTools = ["pdf-to-png", "resize-image"];
        mockSteps = ["Upload PDF in PDF to PNG", "Select Scale factor", "Convert and download zip archive"];
      }
    } else if (mode === "caption-helper" || mode === "captions-helper") {
      mockResult = `✨ Here are your generated copy options:\n\nOption 1: Elevate your brand assets with Kurio Studio. Clean, converted, and fast. 🚀\nOption 2: Creator workflow simplified. From PDF to Lottie previews inside one focused workspace. 🎨\n\nHashtags: #creators #assets #design #kurio #workflow`;
    } else if (mode === "lottie-helper") {
      mockResult = "This Lottie animation file matches standard Web Player specifications. No critical syntax errors found. It carries key performance metadata ready for render.";
    } else if (mode === "filename-helper" || mode === "naming-helper") {
      mockResult = "exported-brand-asset.png\nbrand-workflow-export.png";
    } else {
      mockResult = `Processed workflow option under mode: ${mode}. Set GEMINI_API_KEY under settings to activate live intelligence parameters.`;
    }

    res.json({
      success: true,
      result: mockResult,
      recommendedTools: mockTools,
      workflowSteps: mockSteps,
      suggestedFileName: mockName
    });
    return;
  }

  try {
    let systemInstruction = "";
    let promptText = "";
    
    if (mode === "tool-router") {
      systemInstruction = `You are Kurio Studio's Intelligent Tool Router. 
You analyze the user's creative task and recommend the correct tools from Kurio Studio's list:
1. pdf-to-png (Convert PDF to separate PNG images)
2. image-to-pdf (Combine images into one PDF)
3. pdf-merge (Combine multiple PDFs into one ordered PDF)
4. compress-image (Compress JPG, PNG, WebP)
5. resize-image (Resize, crop or use social media presets for images)
6. remove-bg (Erase image backgrounds)
7. lottie-preview (Check and validate Lottie animation JSON files)
8. json-formatter (Validate and pretty-print JSON files)

You MUST return a JSON structure matching:
{
  "result": "A helpful 2-sentence conversational explanation suggesting which tool to use",
  "recommendedTools": ["tool-id-1", "tool-id-2"],
  "workflowSteps": ["Step 1 explanation", "Step 2 explanation"]
}`;
      promptText = `User says: "${userInput}"`;
    } else if (mode === "caption-helper" || mode === "captions-helper") {
      systemInstruction = `You are Kurio Studio's Creator Caption and Copy Helper.
Help the user generate engaging, highly customized creator copy, captions, product descriptions, or SEO alt-texts based on their exported assets.
Return a structured markdown list containing:
1. Two variations of highly engaging social media captions (for Instagram/TikTok/LinkedIn)
2. One clean product description
3. Relevant and highly focused creator hashtags (without generic low-quality jargon)

Do not use emojis in the actual output copy. Keep formatting clean, stylish, and highly professional.`;
      promptText = `Generate creator copy for asset task: "${userInput}". Info: ${JSON.stringify(fileInfo || {})}`;
    } else if (mode === "lottie-helper") {
      systemInstruction = `You are Kurio Studio's Lottie JSON Analyst.
Suggest explanations, structural feedback or troubleshooting recommendations for the user's Lottie animation structure.
Review performance parameters (e.g. frame rate, layer depth, missing assets) and explain it in clear, developer-friendly human language.
Keep responses concise, listing 3 bullet points maximum. Do not use emojis.`;
      promptText = `Analyze Lottie information: ${userInput}`;
    } else if (mode === "filename-helper" || mode === "naming-helper") {
      systemInstruction = `You are Kurio Studio's Smart File Naming assistant.
Generate a list of 2 extremely clean, descriptive, lowercase, kebab-case file names suitable for final exports based on user inputs.`;
      promptText = `File info: name is "${userInput}" or metadata is ${JSON.stringify(fileInfo || {})}`;
    } else {
      systemInstruction = `You are Kurio Studio's Creative Client workflow companion. Give human-centric, highly professional developer-minded suggestions. Do do not use emojis.`;
      promptText = userInput;
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: mode === "tool-router" ? "application/json" : "text/plain"
      }
    });

    const textOutput = response.text || "";
    
    if (mode === "tool-router") {
      try {
        const jsonResult = JSON.parse(textOutput);
        res.json({
          success: true,
          result: jsonResult.result,
          recommendedTools: jsonResult.recommendedTools,
          workflowSteps: jsonResult.workflowSteps
        });
      } catch (e) {
        // Fallback if model returned json format with text wrapper
        res.json({
          success: true,
          result: textOutput,
          recommendedTools: ["compress-image"],
          workflowSteps: ["Upload your image", "Apply default quality parameters", "Export clean output"]
        });
      }
    } else {
      res.json({
        success: true,
        result: textOutput
      });
    }
  } catch (error: any) {
    console.error("Gemini route failure:", error);
    res.status(500).json({ success: false, message: "Gemini server processing error", error: error.message });
  }
});

// 2. Developer format endpoints
app.post("/api/tools/json-format", (req: Request, res: Response) => {
  const { jsonString, indentSpaces } = req.body;
  if (!jsonString) {
    res.status(400).json({ success: false, message: "No JSON payload specified" });
    return;
  }

  try {
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, Number(indentSpaces) || 2);
    res.json({
      success: true,
      formatted,
      stats: {
        keys: Object.keys(parsed).length,
        depth: 1, // simplified
        size: formatted.length,
      },
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message || "Invalid JSON syntax detected.",
    });
  }
});

// Vite middleware serving or static files setup
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite developer client middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving consolidated static files from production: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  console.log(`Kurio Server running on ${appUrl}`);
});
}

initializeServer().catch((err) => {
  console.error("Express initialization failed:", err);
});
