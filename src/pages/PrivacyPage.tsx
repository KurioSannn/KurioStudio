import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Bot, Database, FileLock2, ShieldCheck } from "lucide-react";

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="space-y-3 border-b border-brand-border pb-5">
        <Badge variant="beta">Public beta</Badge>
        <h1 className="flex items-center gap-2 font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
          <ShieldCheck className="h-6 w-6 text-accent-secondary" />
          Privacy Policy
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Kurio Studio is designed around browser-based file processing. This page explains what stays local, what is sent to the server, and what is logged during beta testing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <FileLock2 className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Local file tools</h2>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            Core tools such as image compression, image resizing, PDF conversion, JSON formatting, and Lottie preview run inside your browser whenever possible. The selected file remains on your device for these local workflows.
          </p>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">AI helper requests</h2>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            AI Helper prompts are sent to a server-side Gemini proxy. API keys are not exposed to the browser. Current AI flows send prompt text and related metadata, not local file binaries.
          </p>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Local history</h2>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            Workspace history is stored in your browser localStorage so you can review recent activity. Clearing browser data or using the workspace clear action removes this local record.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#FFF8E6] p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Beta analytics</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#7A4A05]">
            Kurio records lightweight product events such as tool opens, conversion success, conversion failure, and feedback clicks. These events help identify broken tools and do not intentionally include file contents.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPage;
