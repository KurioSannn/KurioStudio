import React, { useState } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { Trash2, Brackets, CheckCircle2, AlertCircle, Copy, FileCode, Check } from "lucide-react";

export function JSONFormatter() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [tabSpacing, setTabSpacing] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validation feedback indicators
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleFileSelected = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      validateAndFormat(text, tabSpacing);
    };
    reader.readAsText(selectedFile);
  };

  const validateAndFormat = (text: string, spacingValue: number) => {
    setIsValid(null);
    setErrorFeedback(null);
    
    if (!text.trim()) {
      setOutputText("");
      return;
    }

    try {
      const parsed = JSON.parse(text);
      setIsValid(true);
      
      // format spaced structure
      const formatted = JSON.stringify(parsed, null, spacingValue);
      setOutputText(formatted);

      // Track usage history
      addToWorkspaceHistory({
        toolId: "json-formatter",
        toolName: "JSON Formatter",
        fileName: "formatted_payload.json",
        fileSize: text.length,
        outputType: "JSON Cleaned",
        status: "completed",
      });
    } catch (e: any) {
      setIsValid(false);
      setErrorFeedback(e.message || "Failed to parse JSON text.");
      setOutputText("");
    }
  };

  const triggerMinify = () => {
    setIsValid(null);
    setErrorFeedback(null);
    
    if (!inputText.trim()) return;

    try {
      const parsed = JSON.parse(inputText);
      setIsValid(true);
      const minified = JSON.stringify(parsed);
      setOutputText(minified);
    } catch (e: any) {
      setIsValid(false);
      setErrorFeedback(e.message || "Failed to minify JSON text.");
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    validateAndFormat(text, tabSpacing);
  };

  const handleSpacingChange = (space: number) => {
    setTabSpacing(space);
    validateAndFormat(inputText, space);
  };

  const fixWithGemini = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setIsValid(null);
    setErrorFeedback(null);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "json-helper",
          userInput: inputText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setInputText(data.result);
        validateAndFormat(data.result, tabSpacing);
      } else {
        setErrorFeedback("Gemini JSON repair failed. Please correct bracket structures manually.");
      }
    } catch (err) {
      setErrorFeedback("Gemini AI nodes are temporarily disconnected. Please inspect text syntax locally.");
    } finally {
      setLoading(false);
    }
  };

  const copyResults = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanWorkspace = () => {
    setInputText("");
    setOutputText("");
    setIsValid(null);
    setErrorFeedback(null);
  };

  return (
    <ToolPageShell toolId="json-formatter">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column configuration */}
        <div className="lg:col-span-5 space-y-6">
          <SettingsPanel title="Parsing Options">
            
            {/* Tab spacing segments */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-text-secondary block">Tab indent representation</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { space: 2, label: "2 Spaces" },
                  { space: 4, label: "4 Spaces" },
                ].map((item) => (
                  <button
                    key={item.space}
                    type="button"
                    onClick={() => handleSpacingChange(item.space)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all duration-150 cursor-pointer ${
                      tabSpacing === item.space
                        ? "bg-accent-secondary text-white border-accent-secondary"
                        : "bg-brand-surface border-brand-border text-text-secondary hover:bg-brand-bg select-none"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={triggerMinify}
                  className="py-2 text-xs font-bold rounded-lg border border-brand-border bg-brand-surface text-text-secondary hover:bg-brand-bg hover:border-accent-primary cursor-pointer transition-colors"
                >
                  Minify rows
                </button>
              </div>
            </div>

            {/* Direct manual entry */}
            <div className="space-y-1.5 pt-2 border-t border-brand-soft-border">
              <label className="text-[10px] uppercase font-bold text-text-secondary block">Paste your JSON data</label>
              <Textarea
                placeholder='e.g. {"name": "Kurio", "type": "Studio", "active": true}'
                value={inputText}
                onChange={handleTextInputChange}
                className="font-mono text-xs min-h-[300px] leading-relaxed block"
              />
            </div>

            {/* Reset / upload wrappers */}
            <div className="flex gap-2.5 pt-4 border-t border-brand-soft-border">
              <Button variant="ghost" size="sm" onClick={cleanWorkspace} className="w-1/2 gap-2 text-xs border border-brand-border h-10">
                <Trash2 className="h-3.5 w-3.5" />
                Flush text
              </Button>
              <div className="w-1/2">
                <UploadDropZone
                  acceptedExtensions={[".json"]}
                  onFileSelected={handleFileSelected}
                  title="Choose file"
                  subtitle=".json payload"
                />
              </div>
            </div>

          </SettingsPanel>

          {/* Verification reports and AI correctors */}
          {isValid === false && (
            <div className="rounded-2xl border border-red-200 bg-red-50/20 p-5 space-y-3.5 animate-fade-in select-none">
              <div className="flex items-start gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-bold text-xs block">Payload contains syntax errors</span>
                  <span className="font-mono text-[10px] text-red-600 leading-relaxed block mt-1 break-keep">{errorFeedback}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-red-100">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={fixWithGemini}
                  disabled={loading}
                  className="w-full gap-1.5 font-bold text-xs py-4 cursor-pointer"
                >
                  {loading ? "Repairing text structures..." : "Fix JSON via Gemini API"}
                </Button>
              </div>
            </div>
          )}

          {isValid === true && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 text-xs flex items-center gap-3 animate-fade-in select-none">
              <CheckCircle2 className="h-5 w-5 text-accent-secondary" />
              <div>
                <span className="font-bold text-text-primary block">JSON document is valid</span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">Format compiled and validated successfully.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column displays output results */}
        <div className="lg:col-span-7">
          {outputText ? (
            <OutputPanel title="Formatted JSON Structure">
              <div className="relative">
                <button
                  type="button"
                  onClick={copyResults}
                  className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-white text-text-secondary hover:text-accent-secondary shadow-xs hover:border-accent-primary transition-all duration-150 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent-secondary" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-xs bg-brand-secondary p-5.5 rounded-2xl border border-brand-border max-h-[500px] overflow-auto">
                  <pre className="font-mono text-text-primary leading-normal whitespace-pre-wrap">{outputText}</pre>
                </div>
              </div>
            </OutputPanel>
          ) : (
            <PreviewPanel title="Formatted schema viewport" />
          )}
        </div>

      </div>
    </ToolPageShell>
  );
}
export default JSONFormatter;
