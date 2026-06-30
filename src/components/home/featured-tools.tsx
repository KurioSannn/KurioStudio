import React from "react";
import { TOOLS_LIST } from "@/src/lib/constants/tools";
import { useRoute } from "@/src/context/RouteContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FileText, Image, Clapperboard, Film, Code2, Layers, ArrowRight, Activity } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Image,
  Clapperboard,
  Film,
  Code2,
  Layers,
};

export function FeaturedTools() {
  const { navigate } = useRoute();

  // Highlight specific active tools on the homepage grid
  const featured = TOOLS_LIST.slice(0, 8);

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

  return (
    <section id="tool-directory" className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div className="text-center md:text-left">
          <h2 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
            Featured creator utilities
          </h2>
          <p className="text-sm text-text-secondary mt-1.5 max-w-xl">
            Fully functional client-optimized tools ready to run inside your workspace now.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate("/tools")}
          className="shrink-0 group cursor-pointer"
        >
          Browse all tools
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((tool) => {
          const CategoryIcon = getCategoryIcon(tool.category);
          
          return (
            <div
              key={tool.id}
              className="flex flex-col justify-between rounded-xl border border-brand-border bg-brand-surface p-5.5 hover:shadow-xs hover:border-brand-border duration-200"
            >
              <div>
                {/* Header status bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-bg/80 text-accent-secondary">
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <Badge variant={tool.status === "ready" ? "ready" : tool.status === "beta" ? "beta" : "comingSoon"}>
                    {tool.status === "ready" ? "ready" : tool.status === "beta" ? "beta" : "coming soon"}
                  </Badge>
                </div>

                {/* Body Content */}
                <h3 className="font-sans text-base font-bold text-text-primary">
                  {tool.name}
                </h3>
                
                <p className="text-xs text-text-secondary mt-2.5 leading-relaxed min-h-[36px]">
                  {tool.description}
                </p>

                {/* Formats specification section */}
                <div className="mt-4 pt-3.5 border-t border-brand-soft/30 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="block text-text-muted font-medium uppercase tracking-wider text-[9px]">Input mime</span>
                    <span className="font-mono text-text-secondary mt-0.5 block truncate">{tool.inputFormats.join(", ")}</span>
                  </div>
                  <div>
                    <span className="block text-text-muted font-medium uppercase tracking-wider text-[9px]">Output type</span>
                    <span className="font-mono text-text-secondary mt-0.5 block truncate">{tool.outputFormats.join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Action trigger */}
              <div className="mt-6">
                {tool.status !== "coming-soon" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-semibold cursor-pointer py-5"
                    onClick={() => navigate(tool.slug)}
                  >
                    Open tool
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-semibold py-5 opacity-60 cursor-not-allowed"
                    disabled
                  >
                    Coming soon
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
export default FeaturedTools;
