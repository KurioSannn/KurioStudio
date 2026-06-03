import React, { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent } from "@/src/components/ui/card";
import { Sparkles, Router, FileSignature, Edit3, Send, RefreshCw, Layers, Trash2 } from "lucide-react";

type AssistantMode = "router" | "naming" | "captions";

interface ChatMessage {
  id: string;
  sender: "user" | "gemini";
  text: string;
  timestamp: Date;
  meta?: any;
}

export function AIHelperPage() {
  const [activeMode, setActiveMode] = useState<AssistantMode>("router");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  // Extra helper inputs based on active segments
  const [prefixName, setPrefixName] = useState("logo");
  const [captionTone, setCaptionTone] = useState("minimal");

  const executeAssistantCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
    setInputText("");
    setLoading(true);

    // Push local message
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date(),
    };
    setChatLog((prev) => [...prev, newMessage]);

    try {
      let gModeStr = "tool-router";
      let payloadPrompt = userText;

      if (activeMode === "naming") {
        gModeStr = "filename-helper";
        payloadPrompt = `Prefix tag: ${prefixName}. Design contextual intention: ${userText}`;
      } else if (activeMode === "captions") {
        gModeStr = "caption-helper";
        payloadPrompt = `Tone specification: ${captionTone}. Concept to elaborate: ${userText}`;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: gModeStr,
          userInput: payloadPrompt,
        }),
      });

      const data = await response.json();
      
      const botResponseText = data.success 
        ? data.result 
        : "The service node returned an error during analysis. Please try again or examine characters.";

      setChatLog((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "gemini",
          text: botResponseText,
          timestamp: new Date(),
          meta: data,
        },
      ]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "gemini",
          text: "No active server-side communication could be made to Gemini APIs. Ensure matching environmental secret keys are set.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetPrompt = (text: string) => {
    setInputText(text);
  };

  const clearDialogue = () => {
    setChatLog([]);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      
      {/* Title */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3.5xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent-secondary" />
            AI Creative Workspace Helper
          </h1>
          <p className="text-xs text-text-secondary">
            Use Gemini models to structure filenames, write asset copy, or dynamically chart creator workflow recommendations.
          </p>
        </div>
      </div>

      {/* Segment controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 select-none">
        {[
          { id: "router", label: "Workflow Router Advisor", icon: Router, desc: "Map complex project tasks to tools" },
          { id: "naming", label: "Smart File Namer", icon: FileSignature, desc: "Standardize multi-format asset lists" },
          { id: "captions", label: "Ad Captions Writer", icon: Edit3, desc: "Author captions for designs" },
        ].map((mode) => {
          const ModeIcon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id as AssistantMode);
                setInputText("");
              }}
              style={{ contentVisibility: "auto" }}
              className={`flex flex-col items-start p-4 border rounded-xl text-left transition-all cursor-pointer shadow-xs ${
                activeMode === mode.id
                  ? "bg-brand-surface border-accent-secondary text-text-primary ring-2 ring-accent-primary/20"
                  : "bg-brand-surface border-brand-border text-text-secondary hover:bg-[#FAFAF7]"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-bg text-accent-secondary mb-3">
                <ModeIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-text-primary block">{mode.label}</span>
              <span className="text-[10px] text-text-secondary mt-0.5 block leading-normal">{mode.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Workspace panel split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Helper configurations depending on segment modes */}
        <div className="lg:col-span-4 space-y-5">
          {activeMode === "naming" && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider block">Namer Properties</span>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-text-secondary">Prefix tag nomenclature</label>
                <Input
                  placeholder="e.g. kurio_v1"
                  value={prefixName}
                  onChange={(e) => setPrefixName(e.target.value)}
                />
              </div>
              <span className="text-[9px] text-text-muted mt-1 block leading-normal">
                Generates robust snake_case catalogs of file strings like curves, backgrounds, and titles.
              </span>
            </div>
          )}

          {activeMode === "captions" && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider block">Copywriter Settings</span>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-semibold text-text-secondary">Caption tone voice</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["minimal", "expert", "bento", "academic"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setCaptionTone(t)}
                      className={`py-1.5 text-xs font-bold rounded-lg capitalize transition-all border ${
                        captionTone === t
                          ? "bg-[#FFF3D6] border-accent-secondary text-accent-secondary"
                          : "bg-brand-surface border-brand-border text-text-secondary hover:bg-brand-bg"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick presets helper */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3.5 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider block">Quick templates</span>
            
            <div className="flex flex-col gap-2">
              {activeMode === "router" && (
                <>
                  <button
                    onClick={() => handlePresetPrompt("I want to convert vectors into slides and clean bad structures")}
                    className="text-left text-xs bg-[#FAFAF7] hover:bg-brand-soft border border-brand-hard-border/30 p-2.5 rounded-lg text-text-secondary leading-normal truncate"
                  >
                    &ldquo;Convert vectors to transparent slides...&rdquo;
                  </button>
                  <button
                    onClick={() => handlePresetPrompt("Compress some JPEG pictures for a mobile layout app")}
                    className="text-left text-xs bg-[#FAFAF7] hover:bg-brand-soft border border-brand-hard-border/30 p-2.5 rounded-lg text-text-secondary leading-normal truncate"
                  >
                    &ldquo;Compress static mobile JPEGs...&rdquo;
                  </button>
                </>
              )}
              {activeMode === "naming" && (
                <>
                  <button
                    onClick={() => handlePresetPrompt("Brand asset logo for our marketing slide deck")}
                    className="text-left text-xs bg-[#FAFAF7] hover:bg-brand-soft border border-brand-hard-border/30 p-2.5 rounded-lg text-text-secondary leading-normal truncate"
                  >
                    &ldquo;Slide deck logos...&rdquo;
                  </button>
                  <button
                    onClick={() => handlePresetPrompt("Background texture element and landscape graphic")}
                    className="text-left text-xs bg-[#FAFAF7] hover:bg-brand-soft border border-brand-hard-border/30 p-2.5 rounded-lg text-text-secondary leading-normal truncate"
                  >
                    &ldquo;Background textures...&rdquo;
                  </button>
                </>
              )}
              {activeMode === "captions" && (
                <>
                  <button
                    onClick={() => handlePresetPrompt("Minimalist web-app conversion tool focusing on creator speed")}
                    className="text-left text-xs bg-[#FAFAF7] hover:bg-brand-soft border border-brand-hard-border/30 p-2.5 rounded-lg text-text-secondary leading-normal truncate"
                  >
                    &ldquo;Creator fast workspace tool...&rdquo;
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column Chat feed interface */}
        <div className="lg:col-span-8 flex flex-col justify-between border border-brand-border bg-brand-surface rounded-2xl min-h-[500px] shadow-xs overflow-hidden">
          
          {/* Messages track */}
          <div className="p-6 space-y-4 flex-1 max-h-[400px] overflow-y-auto">
            {chatLog.length > 0 ? (
              chatLog.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-accent-secondary text-white font-semibold"
                      : "bg-brand-secondary border border-brand-border text-text-primary"
                  }`}>
                    {msg.sender === "gemini" && (
                      <span className="block text-[8px] font-bold text-accent-secondary tracking-widest uppercase mb-1 font-mono">
                        Advisor
                      </span>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted space-y-2">
                <Sparkles className="h-7 w-7 text-[#D8D1C7] animate-pulse" />
                <h4 className="text-sm font-bold text-text-primary">Dialogue history is empty</h4>
                <p className="text-xs text-text-secondary max-w-xs">
                  Type a prompt below or load templates to activate real-time Gemini guidance.
                </p>
              </div>
            )}
          </div>

          {/* Form write input */}
          <form onSubmit={executeAssistantCall} className="border-t border-brand-border p-4 bg-brand-secondary/60 flex gap-2.5 items-center select-none">
            <Input
              placeholder={activeMode === "router" ? "What do you want to accomplish?" : "Detail your asset intentions..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="bg-white"
            />
            
            <Button
              variant="primary"
              size="icon"
              type="submit"
              disabled={loading || !inputText.trim()}
              className="shrink-0 h-10 w-10 text-white flex items-center justify-center rounded-xl cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-text-primary" />
              ) : (
                <Send className="h-4 w-4 text-text-primary" />
              )}
            </Button>
            
            {chatLog.length > 0 && (
              <Button
                variant="secondary"
                size="icon"
                onClick={clearDialogue}
                type="button"
                className="shrink-0 h-10 w-10 text-text-secondary border border-brand-border cursor-pointer bg-white"
                title="Wipe screen Dialogue history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </form>

        </div>

      </div>
    </div>
  );
}
export default AIHelperPage;
