import React from "react";
import { ToolDefinition } from "@/src/lib/types";
import { useRoute } from "@/src/context/RouteContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FileText, Image, Clapperboard, Film, Code2, Layers } from "lucide-react";

interface ToolCardProps {
  tool: ToolDefinition;
  key?: string;
}

export function ToolCard({ tool }: ToolCardProps) {
  const { navigate } = useRoute();
  const isComingSoon = tool.status === "coming-soon";

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "pdf": return FileText;
      case "image": return Image;
      case "motion": return Clapperboard;
      case "video": return Film;
      case "developer": return Code2;
      default: return Layers;
    }
  };

  const Icon = getCategoryIcon(tool.category);

  return (
    <div className={`flex flex-col justify-between rounded-xl border border-brand-border bg-brand-surface p-5 duration-200 ${
      isComingSoon ? "opacity-70" : "hover:shadow-xs"
    }`}>
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-bg text-accent-secondary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <Badge variant={tool.status === "ready" ? "ready" : tool.status === "beta" ? "beta" : "comingSoon"}>
            {tool.status === "ready" ? "ready" : tool.status === "beta" ? "beta" : "coming soon"}
          </Badge>
        </div>

        <h3 className="text-sm font-bold text-text-primary block">
          {tool.name}
        </h3>
        
        <p className="text-[11px] text-text-secondary mt-2 leading-relaxed min-h-[32px]">
          {isComingSoon ? "This tool is disabled during public beta while we finish reliability testing." : tool.description}
        </p>

        {/* Requirements specs panel */}
        <div className="mt-4 pt-3 border-t border-brand-soft/40 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="block text-text-muted font-medium uppercase tracking-wider text-[8px]">Inputs</span>
            <span className="font-mono text-text-secondary mt-0.5 block truncate">{tool.inputFormats.join(", ")}</span>
          </div>
          <div>
            <span className="block text-text-muted font-medium uppercase tracking-wider text-[8px]">Outputs</span>
            <span className="font-mono text-text-secondary mt-0.5 block truncate">{tool.outputFormats.join(", ")}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {!isComingSoon ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs font-semibold cursor-pointer"
            onClick={() => navigate(tool.slug)}
          >
            Launch Program
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs font-semibold opacity-60 cursor-not-allowed"
            disabled
          >
            Reserved
          </Button>
        )}
      </div>
    </div>
  );
}
export default ToolCard;
