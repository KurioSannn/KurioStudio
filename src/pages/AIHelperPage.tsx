import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  Wand2,
  Tag,
  MessageSquare,
  ArrowRight,
  Bot,
  User,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssistantMode = "router" | "naming" | "captions";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

// ─── i18n — Auto-detect browser language ──────────────────────────────────────

type Lang = "en" | "id";

function detectLang(): Lang {
  const lang = (navigator.language || "en").toLowerCase();
  return lang.startsWith("id") ? "id" : "en";
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  en: {
    title: "AI Helper",
    subtitle: "Your AI assistant for tool recommendations, file naming, and caption writing.",
    betaLabel: "Beta",
    onlineStatus: "Kurio AI",
    clearChat: "Clear chat",
    examplesHeading: "Example Prompts",
    typeSomething: "Type your prompt below or pick an example from the left to get started.",
    aiLabel: "Kurio AI",
    footerNote: "AI Helper is powered by Gemini · Rate-limited during beta · Files are never sent to the server",
    copiedToast: "Copied to clipboard",
    clearToast: "Chat cleared",
    errorNetwork: "Could not reach the AI Helper. Check your internet and try again.",
    errorGeneric: "Kurio AI couldn't complete that request. Try a shorter prompt.",
  },
  id: {
    title: "AI Helper",
    subtitle: "Asisten AI untuk rekomendasi tool, penamaan file, dan penulisan caption.",
    betaLabel: "Beta",
    onlineStatus: "Kurio AI",
    clearChat: "Hapus chat",
    examplesHeading: "Contoh Pertanyaan",
    typeSomething: "Ketik pertanyaanmu di bawah atau pilih contoh di sebelah kiri untuk mulai.",
    aiLabel: "Kurio AI",
    footerNote: "AI Helper menggunakan Gemini · Dibatasi penggunaan selama beta · File tidak dikirim ke server",
    copiedToast: "Disalin ke clipboard",
    clearToast: "Chat dihapus",
    errorNetwork: "Koneksi ke AI Helper gagal. Periksa koneksi internetmu dan coba lagi.",
    errorGeneric: "Kurio AI tidak bisa menjawab saat ini. Coba dengan pertanyaan yang lebih singkat.",
  },
};

// ─── Mode definitions (bilingual) ─────────────────────────────────────────────

const MODES_CONTENT: Record<Lang, {
  id: AssistantMode;
  label: string;
  tagline: string;
  description: string;
  placeholder: string;
  examples: string[];
}[]> = {
  en: [
    {
      id: "router",
      label: "Recommend a Tool",
      tagline: "Describe your task — AI picks the right Kurio tool for you.",
      description:
        "Have a file or creative task but not sure where to start? Describe what you need and the AI will recommend the most suitable Kurio tools along with a step-by-step workflow.",
      placeholder: "e.g. I have a bunch of high-res JPEGs I need to compress for a website...",
      examples: [
        "I want to merge multiple PDF files into one",
        "I have high-resolution photos but the file size is too large",
        "Need to convert a PDF to images for a presentation",
      ],
    },
    {
      id: "naming",
      label: "Name My File",
      tagline: "Describe your asset — AI generates a clean, professional filename.",
      description:
        "Not sure what to call your file? Describe the content or purpose and the AI will generate structured, concise, and professional filenames — perfect for teams or portfolios.",
      placeholder: "e.g. Company logo in blue for the dark-mode version of our website...",
      examples: [
        "Product photo of sneakers for a summer online catalog",
        "App icon in PNG format with a transparent background",
        "Holiday promotion banner for Instagram Story",
      ],
    },
    {
      id: "captions",
      label: "Write a Caption",
      tagline: "Share your concept — AI crafts an engaging caption, ready to post.",
      description:
        "Got a design or content piece but stuck on the words? Describe the concept and the AI will write engaging captions for social media, ads, or product descriptions.",
      placeholder: "e.g. A flat-lay photo of healthy food in green and white tones for a lifestyle brand...",
      examples: [
        "Coffee shop photo with warm tones for an Instagram post",
        "Mobile app mockup for a product launch on Twitter",
        "Indie music event poster for a WhatsApp Story",
      ],
    },
  ],
  id: [
    {
      id: "router",
      label: "Rekomendasikan Tool",
      tagline: "Ceritakan kebutuhanmu, AI kasih tahu tool yang tepat.",
      description:
        "Punya file atau task kreatif tapi bingung mulai dari mana? Ceritakan ke AI, dan dia akan merekomendasikan tool Kurio yang paling cocok beserta urutan langkahnya.",
      placeholder: "Contoh: Saya punya banyak foto JPG kualitas tinggi yang mau dicompres untuk website...",
      examples: [
        "Saya mau gabungkan beberapa PDF jadi satu file",
        "Saya punya foto resolusi tinggi tapi filenya terlalu besar",
        "Perlu konversi PDF ke gambar untuk presentasi",
      ],
    },
    {
      id: "naming",
      label: "Buat Nama File",
      tagline: "Biarkan AI bikinkan nama file yang rapi dan konsisten.",
      description:
        "Bingung kasih nama file? Describe isi atau tujuan file-mu, AI akan buatkan nama yang terstruktur, singkat, dan profesional — cocok untuk tim atau portofolio.",
      placeholder: "Contoh: Logo perusahaan dalam warna biru untuk kebutuhan website versi gelap...",
      examples: [
        "Foto produk sepatu untuk katalog online musim panas",
        "Icon aplikasi dalam format PNG dengan latar transparan",
        "Banner promosi hari raya untuk Instagram Story",
      ],
    },
    {
      id: "captions",
      label: "Tulis Caption",
      tagline: "Bagikan konsepmu, AI tulis caption yang siap posting.",
      description:
        "Punya desain atau konten tapi tidak tahu harus nulis apa? Ceritakan konsepnya, AI akan buatkan caption yang engaging untuk media sosial, iklan, atau deskripsi produk.",
      placeholder: "Contoh: Foto flat-lay makanan sehat dengan warna hijau dan putih untuk konten lifestyle...",
      examples: [
        "Foto kopi di cafe dengan nuansa warm untuk Instagram",
        "Mockup aplikasi mobile untuk promosi di Twitter",
        "Poster event musik indie untuk story WhatsApp",
      ],
    },
  ],
};

const MODE_META: { id: AssistantMode; icon: React.FC<any>; color: string; bg: string }[] = [
  { id: "router",   icon: Wand2,          color: "#7C3AED", bg: "#F5F3FF" },
  { id: "naming",   icon: Tag,            color: "#0EA5E9", bg: "#F0F9FF" },
  { id: "captions", icon: MessageSquare,  color: "#D97706", bg: "#FFFBEB" },
];

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-auto shrink-0 p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-brand-bg transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 bg-brand-secondary border border-brand-border rounded-xl px-4 py-3">
        <Bot className="h-3.5 w-3.5 text-accent-secondary shrink-0" />
        <div className="flex gap-1">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent-secondary"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIHelperPage() {
  const [lang] = useState<Lang>(() => detectLang());
  const t = T[lang];
  const modes = MODES_CONTENT[lang];

  const [activeMode, setActiveMode] = useState<AssistantMode>("router");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentModeMeta = MODE_META.find((m) => m.id === activeMode)!;
  const currentMode = modes.find((m) => m.id === activeMode)!;

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, loading]);

  const switchMode = (mode: AssistantMode) => {
    setActiveMode(mode);
    setInputText("");
    setChatLog([]);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText("");
    setLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setChatLog((prev) => [...prev, userMsg]);

    try {
      let gModeStr = "tool-router";
      let payloadPrompt = text;

      if (activeMode === "naming") {
        gModeStr = "filename-helper";
        payloadPrompt = lang === "id"
          ? `Buatkan nama file profesional untuk: ${text}`
          : `Generate a professional filename for: ${text}`;
      } else if (activeMode === "captions") {
        gModeStr = "caption-helper";
        payloadPrompt = lang === "id"
          ? `Buatkan caption media sosial yang engaging untuk: ${text}`
          : `Write an engaging social media caption for: ${text}`;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: gModeStr, userInput: payloadPrompt, stream: true }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || t.errorGeneric);
      }

      if (!response.body) throw new Error("No response body");

      const aiMsgId = crypto.randomUUID();
      setChatLog((prev) => [
        ...prev,
        { id: aiMsgId, sender: "ai", text: "", timestamp: new Date() },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data.trim() === "[DONE]") {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.success) {
                  fullText += parsed.text;
                  setChatLog((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                    )
                  );
                } else if (parsed.message && fullText === "") {
                  setChatLog((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId ? { ...msg, text: parsed.message } : msg
                    )
                  );
                }
              } catch (e) {
                // ignore parsing error for partial chunks
              }
            }
          }
        }
        if (readerDone) done = true;
      }
    } catch (error: any) {
      setChatLog((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: "ai", text: error.message || t.errorNetwork, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatLog([]);
    toast.success(t.clearToast);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF3D6] text-[#F59E0B]">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary">
            {t.title}
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B] bg-[#FFF3D6] px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
            {t.betaLabel}
          </span>
        </div>
        <p className="text-sm text-text-secondary max-w-lg pl-10">{t.subtitle}</p>
      </div>

      {/* ── Mode selector ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const meta = MODE_META.find((m) => m.id === mode.id)!;
          const Icon = meta.icon;
          const isActive = activeMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => switchMode(mode.id)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                isActive
                  ? "bg-brand-surface shadow-md"
                  : "border-brand-border bg-brand-surface hover:bg-brand-bg"
              }`}
              style={isActive ? { boxShadow: `0 0 0 2px ${meta.color}50` } : {}}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: meta.bg }}
              >
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
              </div>
              <div>
                <span className="text-sm font-bold text-text-primary block">{mode.label}</span>
                <span className="text-[11px] text-text-secondary leading-snug block mt-0.5">
                  {mode.tagline}
                </span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="mode-dot"
                  className="absolute top-3 right-3 h-2 w-2 rounded-full"
                  style={{ background: meta.color }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode + "-desc"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3 shadow-xs"
            >
              <div className="flex items-center gap-2">
                {React.createElement(currentModeMeta.icon, {
                  className: "h-4 w-4",
                  style: { color: currentModeMeta.color },
                })}
                <span className="text-xs font-bold text-text-primary">{currentMode.label}</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {currentMode.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode + "-examples"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3 shadow-xs"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {t.examplesHeading}
              </span>
              <div className="flex flex-col gap-2">
                {currentMode.examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(ex)}
                    className="group flex items-start gap-2 text-left text-xs bg-brand-bg hover:bg-brand-soft border border-brand-border p-2.5 rounded-lg text-text-secondary leading-relaxed transition-colors"
                  >
                    <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-text-muted group-hover:text-accent-secondary transition-colors" />
                    <span className="line-clamp-2">{ex}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-8 flex flex-col border border-brand-border bg-brand-surface rounded-2xl shadow-xs overflow-hidden min-h-[480px]">

          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border bg-brand-secondary/40">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-text-secondary">
                {t.onlineStatus} · {currentMode.label}
              </span>
            </div>
            {chatLog.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.clearChat}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[380px]">
            {chatLog.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3"
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: currentModeMeta.bg }}
                >
                  {React.createElement(currentModeMeta.icon, {
                    className: "h-7 w-7",
                    style: { color: currentModeMeta.color },
                  })}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{currentMode.tagline}</p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
                    {t.typeSomething}
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {chatLog.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.sender === "ai" && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-[#FFF3D6] flex items-center justify-center mt-0.5">
                          <Bot className="h-3.5 w-3.5 text-[#F59E0B]" />
                        </div>
                      )}
                      <div
                        className={`group max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-[#F59E0B] text-[#171717] font-semibold rounded-tr-sm"
                            : "bg-brand-secondary border border-brand-border text-text-primary rounded-tl-sm"
                        }`}
                      >
                        {msg.sender === "ai" && (
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-accent-secondary tracking-widest uppercase">
                              {t.aiLabel}
                            </span>
                            <CopyButton text={msg.text} label={t.copiedToast} />
                          </div>
                        )}
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                      {msg.sender === "user" && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-brand-soft border border-brand-border flex items-center justify-center mt-0.5">
                          <User className="h-3.5 w-3.5 text-text-secondary" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="border-t border-brand-border p-4 bg-brand-secondary/40 flex gap-2 items-center"
          >
            <Input
              placeholder={currentMode.placeholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="bg-white text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              variant="primary"
              size="icon"
              type="submit"
              disabled={loading || !inputText.trim()}
              className="shrink-0 h-10 w-10 rounded-xl cursor-pointer"
            >
              {loading
                ? <RefreshCw className="h-4 w-4 animate-spin text-text-primary" />
                : <Send className="h-4 w-4 text-text-primary" />
              }
            </Button>
          </form>

          <p className="text-center text-[10px] text-text-muted px-4 pb-3">
            {t.footerNote}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIHelperPage;
