import React, { useState, useEffect } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { TOOLS_LIST, TOOL_CATEGORIES } from "@/src/lib/constants/tools";
import { ToolCard } from "@/src/components/tools/tool-card";
import { Input } from "@/src/components/ui/input";
import { Search, Layers } from "lucide-react";

export function ToolsDirectory() {
  const { route, navigate } = useRoute();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dynamically analyze category filters injected from homepage query params
  useEffect(() => {
    const category = new URLSearchParams(route.split("?")[1] || "").get("category");
    setSelectedCategory(category || "all");
  }, [route]);

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    navigate(category === "all" ? "/tools" : `/tools?category=${category}`);
  };

  // Filter lists based on query & selected segment
  const filteredTools = TOOLS_LIST.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      
      {/* Title & Stats */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
          Asset Creator Workbench
        </h1>
        <p className="text-sm text-text-secondary max-w-xl">
          Search, filter, or access our custom localized client processes to structure and optimize elements in seconds.
        </p>
      </div>

      {/* Control filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-4 border-t border-brand-border select-none">
        
        {/* Category Pill Filters list */}
        <div className="flex flex-wrap items-center gap-1.5 order-2 md:order-1">
          <button
            onClick={() => selectCategory("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              selectedCategory === "all"
                ? "bg-accent-secondary text-white shadow-xs"
                : "bg-brand-surface border border-brand-border text-text-secondary hover:bg-brand-bg hover:text-text-primary"
            }`}
          >
            All Utilities
          </button>
          {Object.entries(TOOL_CATEGORIES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => selectCategory(key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                selectedCategory === key
                  ? "bg-accent-secondary text-white shadow-xs"
                  : "bg-brand-surface border border-brand-border text-text-secondary hover:bg-brand-bg hover:text-text-primary"
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-80 order-1 md:order-2 shrink-0">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

      </div>

      {/* Tools cards layout grid */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-brand-border border-dashed rounded-2xl bg-brand-secondary/40 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-text-muted">
            <Layers className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">No creative utilities matched search parameters</h4>
            <p className="text-xs text-text-secondary mt-1">
              Refine your filters, typed parameters, or consult our AI creative companion to construct workflows.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
export default ToolsDirectory;
