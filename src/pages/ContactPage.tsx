import React, { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { trackEvent } from "@/src/lib/analytics";
import { Check, Copy, Github, Mail, MessageSquare, Send } from "lucide-react";

const CONTACT_EMAIL = "ferdychoruz08@gmail.com";
const FEEDBACK_SUBJECT = "Kurio Studio beta feedback";
const FEEDBACK_BODY = [
  "Tool name:",
  "Browser:",
  "File type:",
  "File size:",
  "What happened:",
].join("\n");

export function ContactPage() {
  const [copied, setCopied] = useState(false);
  const [emailHint, setEmailHint] = useState(false);

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(FEEDBACK_BODY)}`;

  const copyEmail = async () => {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent("feedback_opened", { source: "contact_copy_email" });
  };

  const openEmailApp = () => {
    setEmailHint(true);
    trackEvent("feedback_opened", { source: "contact_mailto" });
    window.location.href = mailtoHref;
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="space-y-3 border-b border-brand-border pb-5">
        <Badge variant="beta">Feedback welcome</Badge>
        <h1 className="flex items-center gap-2 font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
          <MessageSquare className="h-6 w-6 text-accent-secondary" />
          Contact & Feedback
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Send bug reports, broken file cases, confusing output notes, or public beta feedback. Include the tool name, browser, and file type when reporting conversion issues.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <button
          type="button"
          onClick={copyEmail}
          className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs transition-colors hover:bg-brand-bg"
        >
          <Mail className="mb-4 h-5 w-5 text-accent-secondary" />
          <h2 className="text-left text-sm font-bold text-text-primary">Email</h2>
          <p className="mt-1 text-left text-xs leading-relaxed text-text-secondary">Copy the contact email for direct questions, domain inquiries, and private beta reports.</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-secondary px-2.5 py-1 text-[10px] font-semibold text-text-primary">
            {copied ? <Check className="h-3 w-3 text-accent-secondary" /> : <Copy className="h-3 w-3 text-accent-secondary" />}
            {copied ? "Email copied" : CONTACT_EMAIL}
          </span>
        </button>

        <a
          href="https://github.com/KurioSannn/KurioStudio/issues/new"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs transition-colors hover:bg-brand-bg"
        >
          <Github className="mb-4 h-5 w-5 text-accent-secondary" />
          <h2 className="text-sm font-bold text-text-primary">GitHub issue</h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">Best for reproducible bugs, failed conversions, and feature requests.</p>
        </a>

        <div className="rounded-2xl border border-amber-500/20 bg-[#FFF8E6] p-6 shadow-xs">
          <Send className="mb-4 h-5 w-5 text-accent-secondary" />
          <h2 className="text-sm font-bold text-text-primary">Report format</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#7A4A05]">Tool name, browser, file type, file size, and what went wrong.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-xs">
        <h2 className="text-sm font-bold text-text-primary">Fast beta report</h2>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          If a conversion fails, try another browser once before reporting. Keep sensitive files private; a description of the file type and failure message is enough for the first report.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" className="text-xs" onClick={openEmailApp}>
            <Mail className="h-3.5 w-3.5" />
            Open email app
          </Button>
          <Button type="button" variant="secondary" className="text-xs" onClick={copyEmail}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy email"}
          </Button>
        </div>
        {emailHint && (
          <p className="mt-3 rounded-xl border border-amber-500/20 bg-[#FFF8E6] p-3 text-[11px] leading-relaxed text-[#7A4A05]">
            If nothing opened, your browser may not have a default email app. Use Copy email and send the report manually to {CONTACT_EMAIL}.
          </p>
        )}
      </div>
    </div>
  );
}

export default ContactPage;
