import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Bot, FileLock2, Info, ShieldCheck, UploadCloud } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="pb-5 border-b border-brand-border space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="beta">Beta</Badge>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-secondary">
            Public testing
          </span>
        </div>
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-secondary" />
          Privacy & Beta Info
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          Kurio Studio is currently in public beta. This page explains how file processing, AI helper requests, and beta limits work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <FileLock2 className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Local file tools</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              Most Kurio Studio file tools run directly in your browser. This includes core tools such as PDF conversion, image compression, resizing, JSON formatting, and Lottie preview.
            </p>
            <p>
              For local tools, uploaded files are processed in the browser tab and are not stored on the Kurio Studio server.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Upload limits</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              During beta, a single uploaded file can be up to <strong className="text-text-primary">50 MB</strong>.
            </p>
            <p>
              Large files can still depend on your browser memory and device performance, especially PDFs with many pages or high-resolution images.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">AI Helper usage</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              The AI Helper uses a backend proxy to contact Gemini. The browser does not receive the Gemini API key.
            </p>
            <p>
              AI requests send the prompt text and related text metadata needed for the assistant response. Local file binaries are not sent to Gemini by the current core tool flows.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#FFF8E6] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Beta rate limits</h2>
          </div>
          <div className="space-y-3 text-xs text-[#7A4A05] leading-relaxed">
            <p>
              AI usage is rate limited during beta so the public test stays stable and fair for everyone.
            </p>
            <p>
              If an AI request is temporarily blocked, wait for the quota window to reset and continue using the local file tools.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#EFE9DF] bg-[#FAFAF7] p-6 space-y-3">
        <h2 className="text-sm font-bold text-text-primary">What to report during beta</h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          Please report broken files, confusing output, failed conversions, browser-specific issues, or AI helper responses that do not match the selected tool.
        </p>
      </section>
    </div>
  );
}

export default SettingsPage;
