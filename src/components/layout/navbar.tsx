import React from "react";
import { useRoute } from "@/src/context/RouteContext";
import { AppRoute } from "@/src/lib/types";
import { trackEvent } from "@/src/lib/analytics";

export function Navbar() {
  const { route, navigate } = useRoute();
  const feedbackUrl = "https://github.com/KurioSannn/KurioStudio/issues/new";

  const links: { label: string; to: AppRoute }[] = [
    { label: "Tools", to: "/tools" },
    { label: "Workspace", to: "/workspace" },
    { label: "AI Helper", to: "/ai-helper" },
  ];

  return (
    <header className="sticky top-0 z-55 w-full border-b border-[#E7E2D8] bg-white">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 md:px-10">
        
        {/* Left Brand Area */}
        <div 
          onClick={() => navigate("/")} 
          className="flex cursor-pointer items-center gap-2 transition-transform duration-150 active:scale-98"
          id="nav-logo"
        >
          <img src="/BrandingKurio.png" alt="Kurio Studio Logo" className="h-10 w-auto object-contain" />
        </div>

        {/* Center Links */}
        <nav className="hidden md:flex items-center justify-center gap-8 lg:gap-10">
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
          <a
            href={feedbackUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("feedback_opened", { source: "navbar" })}
            className="border-b-2 border-transparent py-1 text-sm font-medium text-[#6B6258] transition-colors duration-150 hover:text-[#171717]"
          >
            Feedback
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center justify-end">
          <button 
            onClick={() => navigate("/tools")}
            className="px-4 py-2 md:px-5 bg-[#F59E0B] text-black font-semibold rounded-xl hover:shadow-md transition-all cursor-pointer text-sm whitespace-nowrap"
          >
            Start converting
          </button>
        </div>

      </div>
    </header>
  );
}
export default Navbar;
