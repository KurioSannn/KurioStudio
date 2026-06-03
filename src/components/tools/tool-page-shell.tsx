import React from "react";
import { AppRoute, ToolDefinition } from "@/src/lib/types";
import { useRoute } from "@/src/context/RouteContext";
import { TOOLS_LIST } from "@/src/lib/constants/tools";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ArrowLeft, Sparkles, HelpCircle } from "lucide-react";

interface ToolPageShellProps {
  toolId: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode; // Optional extra contextual action panel
}

export function ToolPageShell({ toolId, children, sidebar }: ToolPageShellProps) {
  const { navigate } = useRoute();
  
  // Find current tool definition
  const tool = TOOLS_LIST.find((t) => t.id === toolId);
  
  if (!tool) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-bold text-text-primary">Tool specification not found</h2>
        <Button variant="primary" onClick={() => navigate("/tools")} className="mt-4">
          All tools directory
        </Button>
      </div>
    );
  }

  // Find related tools within the same category to prompt at layout bottom
  const relatedTools = TOOLS_LIST.filter(
    (t) => t.category === tool.category && t.id !== tool.id
  ).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      
      {/* Navigation & Header Info */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/tools")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all tools
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
                {tool.name}
              </h1>
              <Badge variant={tool.status === "ready" ? "ready" : "beta"}>
                {tool.status}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              {tool.description}
            </p>
          </div>

          {/* Quick Specifications list */}
          <div className="flex flex-wrap gap-4 text-xs bg-brand-surface border border-brand-border rounded-xl p-4.5 shrink-0 select-none">
            <div>
              <span className="block text-text-muted text-[10px] uppercase font-bold tracking-wider">Accepted format</span>
              <span className="font-mono text-text-primary mt-0.5 block">{tool.inputFormats.join(", ")}</span>
            </div>
            <div className="border-l border-brand-border pl-4">
              <span className="block text-text-muted text-[10px] uppercase font-bold tracking-wider">Export format</span>
              <span className="font-mono text-text-primary mt-0.5 block">{tool.outputFormats.join(", ")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Pane Workplace Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-12 space-y-8">
          {children}
        </div>
      </div>

      {/* Related Suite Navigation Footer Area */}
      {relatedTools.length > 0 && (
        <div className="pt-10 border-t border-brand-border space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-accent-secondary" />
            <h3 className="text-sm font-bold text-text-primary">Related suite utilities</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {relatedTools.map((rTool) => (
              <div
                key={rTool.id}
                onClick={() => navigate(rTool.slug)}
                className="group flex items-center justify-between p-4 bg-brand-surface border border-brand-border hover:border-accent-primary rounded-xl cursor-pointer transition-all duration-200"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-text-primary group-hover:text-accent-secondary transition-colors truncate">
                    {rTool.name}
                  </h4>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">
                    {rTool.description}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="group-hover:text-accent-secondary shrink-0">
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
export default ToolPageShell;
