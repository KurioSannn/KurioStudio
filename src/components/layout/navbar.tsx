import React, { useState } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { AppRoute } from "@/src/lib/types";
import { Button } from "@/src/components/ui/button";
import { Search, Sliders, Play, Palette, Zap } from "lucide-react";

export function Navbar() {
  const { route, navigate } = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);

  const links: { label: string; to: AppRoute }[] = [
    { label: "Tools", to: "/tools" },
    { label: "Workspace", to: "/workspace" },
    { label: "AI Helper", to: "/ai-helper" },
    { label: "Settings", to: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-55 w-full border-b border-[#E7E2D8] bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        
        {/* Left Brand Area */}
        <div 
          onClick={() => navigate("/")} 
          className="flex cursor-pointer items-center gap-2 transition-transform duration-150 active:scale-98"
          id="nav-logo"
        >
          <img src="/BrandingKurio.png" alt="Kurio Studio Logo" className="h-10 w-auto object-contain" />
        </div>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => {
            const isActive = route === link.to || (link.to === "/tools" && route.startsWith("/tools/"));
            return (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className={`text-sm font-medium transition-colors duration-150 py-1 border-b-2 ${
                  isActive
                    ? "text-[#171717] border-[#F59E0B] font-semibold"
                    : "text-[#6B6258] border-transparent hover:text-[#171717]"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/ai-helper")}
            className="p-2 text-[#6B6258] hover:bg-[#F3F0EA] rounded-full transition-colors cursor-pointer"
            title="Creative Workflows"
            id="nav-helper-btn"
          >
            <Zap className="h-5 w-5" />
          </button>

          <button 
            onClick={() => navigate("/tools")}
            className="px-5 py-2 bg-[#F59E0B] text-black font-semibold rounded-xl hover:shadow-md transition-all cursor-pointer text-sm"
          >
            Start converting
          </button>
        </div>

      </div>
    </header>
  );
}
export default Navbar;
