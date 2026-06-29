import React from "react";
import { TOOL_CATEGORIES } from "@/src/lib/constants/tools";
import { useRoute } from "@/src/context/RouteContext";
import { FileText, Image, Clapperboard, Film, Code2, Layers, ArrowUpRight } from "lucide-react";

const ICON_MAP = {
  FileText: FileText,
  Image: Image,
  Clapperboard: Clapperboard,
  Film: Film,
  Code2: Code2,
  Layers: Layers,
};

export function ToolCategoryGrid() {
  const { navigate } = useRoute();

  const handleCategoryClick = (catKey: string) => {
    navigate(`/tools?category=${catKey}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 text-center md:text-left">
        <h2 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
          Engineered categories
        </h2>
        <p className="text-sm text-text-secondary mt-1.5 max-w-xl">
          Explore our isolated modular workspace suites designed to tackle your repetitive asset tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(TOOL_CATEGORIES).map(([key, value]) => {
          const Icon = ICON_MAP[value.icon as keyof typeof ICON_MAP] || Layers;
          
          return (
            <div
              key={key}
              onClick={() => handleCategoryClick(key)}
              className="group relative flex flex-col justify-between rounded-2xl border border-brand-border bg-brand-surface p-6 cursor-pointer transition-all duration-300 hover:border-accent-primary hover:shadow-xs hover:-translate-y-1"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-secondary border border-brand-soft-border text-text-primary group-hover:bg-accent-bg group-hover:text-accent-secondary transition-colors duration-300">
                  <Icon className="h-5.5 w-5.5" />
                </div>

                <h3 className="font-sans text-base font-bold text-text-primary mt-5 flex items-center gap-1.5">
                  {value.name}
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-accent-secondary" />
                </h3>
                
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  {value.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-brand-soft/40 flex items-center justify-between text-xs font-semibold text-text-muted group-hover:text-accent-secondary transition-colors">
                <span>{value.count} module{value.count !== 1 ? 's' : ''} available</span>
                <span className="underline">View modules</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ToolCategoryGrid;
