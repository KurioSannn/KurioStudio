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
          {/* Elegant Amber Mark */}
          <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
          </div>
          <span className="font-sans text-xl font-bold tracking-tight text-[#171717]">
            Kurio <span className="text-[#F59E0B]">Studio</span>
          </span>
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
