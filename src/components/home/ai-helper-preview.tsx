import React, { useState } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { AppRoute } from "@/src/lib/types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card, CardContent } from "../ui/card";
import { Sparkles, ArrowRight, Layers, Sliders, FileImage } from "lucide-react";

export function AIHelperPreview() {
  const { navigate } = useRoute();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const mockPreconfiguredQueries = [
    "I need separate PNG images from this PDF document",
    "I want to compress a bunch of JPG files and shrink their size",
    "How do I preview a Lottie JSON file and validate it?",
  ];

  const handleQuerySubmit = async (customPrompt?: string) => {
    const queryText = customPrompt || prompt;
    if (!queryText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "tool-router",
          userInput: queryText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          result: data.result,
          recommendedTools: data.recommendedTools || [],
          workflowSteps: data.workflowSteps || [],
        });
      } else {
        setResult({
          result: "Could not classify workflow automatically. Let's check the complete toolbox.",
          recommendedTools: [],
          workflowSteps: ["Browse index of tools", "Pick individual process modules"],
        });
      }
    } catch (e) {
      setResult({
        result: `Workflow suggestion: PDF to PNG Converter. Followed by Image Resizer.`,
        recommendedTools: ["pdf-to-png", "resize-image"],
        workflowSteps: ["Upload pdf in converter", "Adjust export scale parameters", "Download finished zip"],
      });
    } finally {
      setLoading(false);
    }
  };

  const getToolRoute = (toolId: string): AppRoute => {
    if (toolId === "pdf-to-png") return "/tools/pdf-to-png";
    if (toolId === "pdf-to-jpg") return "/tools/pdf-to-jpg";
    if (toolId === "compress-image") return "/tools/compress-image";
    if (toolId === "resize-image") return "/tools/resize-image";
    if (toolId === "remove-bg") return "/tools/remove-bg";
    if (toolId === "lottie-preview") return "/tools/lottie-preview";
    if (toolId === "json-formatter") return "/tools/json-formatter";
    return "/tools";
  };

  const getToolLabel = (toolId: string): string => {
    if (toolId === "pdf-to-png") return "PDF to PNG";
    if (toolId === "pdf-to-jpg") return "PDF to JPG";
    if (toolId === "compress-image") return "Image Compressor";
    if (toolId === "resize-image") return "Image Resizer";
    if (toolId === "remove-bg") return "Remove Background";
    if (toolId === "lottie-preview") return "Lottie Inspector";
    if (toolId === "json-formatter") return "JSON Formatter";
    return "Toolbox";
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Descriptions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent-secondary">
            <Sparkles className="h-3.5 w-3.5" />
            Gemini Creative Assistant
          </div>

          <h2 className="font-sans text-3xl font-extrabold tracking-tight text-text-primary">
            Smart routing for complex asset tasks
          </h2>
          
          <p className="text-sm text-text-secondary leading-relaxed">
            Unsure which specific converter fits your workflow? Tell our Creative Assistant what 
            you intend to create in plain speech. 
          </p>

          <p className="text-xs text-text-muted leading-relaxed">
            Note: Gemini acts as your advisory architect. The heavy conversion mathematics run 
            on sandboxed web compiler nodes, avoiding server-side delays and data exposures.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <span className="text-xs font-semibold text-text-primary">Or test live prompts:</span>
            {mockPreconfiguredQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(q);
                  handleQuerySubmit(q);
                }}
                className="text-left text-xs text-text-secondary hover:text-accent-secondary hover:underline truncate bg-brand-soft/50 p-2.5 rounded-lg border border-brand-border/60"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive Assistant widget */}
        <div className="lg:col-span-7">
          <Card className="border border-brand-border shadow-xs hover:border-brand-border">
            <CardContent className="p-6 md:p-8 space-y-6">
              
              {/* Query Entry Panel */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-primary">What do you want to do with your asset?</h3>
                <Textarea
                  placeholder="e.g. I need to convert a PDF into individual slides then resize them for an Instagram post..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[110px]"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted">Calculates recommended workflow steps</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleQuerySubmit()}
                    disabled={loading || !prompt.trim()}
                    className="cursor-pointer"
                  >
                    {loading ? "Routing workflow..." : "Consult Assistant"}
                  </Button>
                </div>
              </div>

              {/* API Result Block */}
              {result && (
                <div className="pt-6 border-t border-brand-border space-y-5 animate-fade-in">
                  
                  {/* Explanation text */}
                  <div className="bg-brand-secondary p-4 rounded-xl border border-brand-border">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">Advisor report</span>
                    <p className="text-sm text-text-primary mt-1 leading-relaxed">
                      {result.result}
                    </p>
                  </div>

                  {/* Recommendation action list */}
                  {result.recommendedTools && result.recommendedTools.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Workflow module pipeline</span>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {result.recommendedTools.map((tId: string, i: number) => (
                          <React.Fragment key={tId}>
                            {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-text-muted" />}
                            <button
                              onClick={() => navigate(getToolRoute(tId))}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary text-text-primary font-semibold text-xs border border-accent-secondary/10 hover:bg-amber-400 shadow-xs"
                            >
                              {getToolLabel(tId)}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sequence actions listed */}
                  {result.workflowSteps && result.workflowSteps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted text-xs block">Execution steps</span>
                      <ol className="text-xs space-y-1.5 text-text-secondary list-decimal pl-4">
                        {result.workflowSteps.map((step: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
export default AIHelperPreview;
