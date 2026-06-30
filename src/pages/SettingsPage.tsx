import React from "react";
import { Badge } from "@/src/components/ui/badge";
import { Bot, FileLock2, Info, ShieldCheck, UploadCloud } from "lucide-react";
import { useLanguage } from "@/src/context/LanguageContext";

export function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="pb-5 border-b border-brand-border space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="beta">{t.beta}</Badge>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-secondary">
            {t.publicBeta}
          </span>
        </div>
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-secondary" />
          {t.settingsTitle}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          {t.settingsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <FileLock2 className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">{t.settingsLocalTitle}</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              {t.settingsLocalP1}
            </p>
            <p>
              {t.settingsLocalP2}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">{t.settingsUploadTitle}</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              {t.settingsUploadP1} <strong className="text-text-primary">{t.settingsUploadLimit}</strong>.
            </p>
            <p>
              {t.settingsUploadP2}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">{t.settingsAITitle}</h2>
          </div>
          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
            <p>
              {t.settingsAIP1}
            </p>
            <p>
              {t.settingsAIP2}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-[#FFF8E6] p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-accent-secondary" />
            <h2 className="text-sm font-bold text-text-primary">{t.settingsRateTitle}</h2>
          </div>
          <div className="space-y-3 text-xs text-[#7A4A05] leading-relaxed">
            <p>
              {t.settingsRateP1}
            </p>
            <p>
              {t.settingsRateP2}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#EFE9DF] bg-[#FAFAF7] p-6 space-y-3">
        <h2 className="text-sm font-bold text-text-primary">{t.settingsReportTitle}</h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          {t.settingsReportDesc}
        </p>
      </section>
    </div>
  );
}

export default SettingsPage;
