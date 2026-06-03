import React, { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { ShieldAlert, Settings, HardDrive, CheckCircle2 } from "lucide-react";

export function SettingsPage() {
  const [success, setSuccess] = useState(false);

  const saveSettingsMock = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      
      {/* Title */}
      <div className="pb-4 border-b border-brand-border">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3.5xl flex items-center gap-2">
          <Settings className="h-6 w-6 text-accent-secondary" />
          Kurio Studio Settings
        </h1>
        <p className="text-xs text-text-secondary">
          Configure client-side specifications and inspect workspace parameters.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Memory Thresholds Block */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-accent-secondary" />
            <h3 className="text-sm font-bold text-text-primary">System resources & limits</h3>
          </div>
          
          <div className="text-xs space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-brand-soft-border">
              <span className="text-text-secondary">Maximum single upload size limit</span>
              <span className="font-mono text-text-primary font-bold bg-brand-secondary border border-brand-soft-border px-2 py-0.5 rounded">
                50 MB
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-brand-soft-border">
              <span className="text-text-secondary">Offline operations cache execution</span>
              <Badge variant="ready">NATIVE CLIENT-SIDE</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">Assigned telemetry cluster</span>
              <span className="font-mono text-text-muted">NONE (Private sandbox model)</span>
            </div>
          </div>
        </div>

        {/* Client Privacy Assertion Block */}
        <div className="rounded-2xl border border-[#EFE9DF] bg-[#FAFAF7] p-6 space-y-4">
          <div className="flex items-center gap-2 text-text-primary">
            <ShieldAlert className="h-5 w-5 text-accent-secondary" />
            <h3 className="text-sm font-bold">Privacy ledger & data statements</h3>
          </div>
          
          <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
            <p>
              Kurio Studio runs creative assets (PDF documents, image tracks, JSON matrices) directly in the local browser tab context. No raw asset files are cataloged or relayed to cloud hosting repositories.
            </p>
            <p>
              When consulting our AI Assistant companion, solely the plaintext user instructions metadata is piped with standard security variables across our secure server-side Express proxy node to Gemini APIs. No file paths or raw binary parameters are ever exposed.
            </p>
          </div>
        </div>

        {/* Global Save Trigger action */}
        <div className="flex items-center justify-between pt-4 border-t border-brand-border">
          <span className="text-xs font-semibold text-text-muted">Workspace specifications aligned</span>
          <div className="flex items-center gap-3">
            {success && (
              <span className="text-xs text-accent-secondary font-bold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="h-4.5 w-4.5" />
                Settings saved!
              </span>
            )}
            <Button variant="primary" onClick={saveSettingsMock} className="text-xs py-4.5 font-bold cursor-pointer">
              Save configuration
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
}
export default SettingsPage;
