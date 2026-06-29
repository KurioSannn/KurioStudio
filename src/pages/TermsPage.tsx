import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { AlertCircle, FileCheck2, Scale, ShieldCheck } from "lucide-react";

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="space-y-3 border-b border-brand-border pb-5">
        <Badge variant="beta">Public beta</Badge>
        <h1 className="flex items-center gap-2 font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
          <Scale className="h-6 w-6 text-accent-secondary" />
          Terms of Use
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Kurio Studio is provided as a beta creative file toolkit. Use it only with files you own or are allowed to process.
        </p>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Acceptable use</h2>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            You are responsible for the files, prompts, and outputs you use in Kurio Studio. Do not use the service to process illegal, abusive, harmful, or unauthorized materials.
          </p>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Beta reliability</h2>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            Tools may fail on corrupt files, encrypted PDFs, very large files, or browser-specific limits. Review outputs before using them in production, publishing, or client delivery workflows.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#FFF8E6] p-6 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">No warranty</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#7A4A05]">
            Kurio Studio is provided during public beta without a guarantee that every file will convert perfectly. Keep a copy of your original files and verify all exports.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsPage;
