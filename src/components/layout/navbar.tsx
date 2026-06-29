import React, { useEffect, useState } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { AppRoute } from "@/src/lib/types";
import { trackEvent } from "@/src/lib/analytics";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const { route, navigate } = useRoute();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const feedbackUrl = "https://github.com/KurioSannn/KurioStudio/issues/new";

  const links: { label: string; to: AppRoute }[] = [
    { label: "Tools", to: "/tools" },
    { label: "Workspace", to: "/workspace" },
    { label: "AI Helper", to: "/ai-helper" },
  ];

  useEffect(() => {
    setIsMenuOpen(false);
  }, [route]);

  const goToRoute = (to: AppRoute) => {
    setIsMenuOpen(false);
    navigate(to);
  };

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
            const isActive = route === link.to || (link.to === "/tools" && route.startsWith("/tools"));
            return (
              <button
                key={link.to}
                onClick={() => goToRoute(link.to)}
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
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => goToRoute("/tools")}
            className="hidden px-4 py-2 text-sm font-semibold text-black transition-all bg-[#F59E0B] rounded-xl cursor-pointer hover:shadow-md whitespace-nowrap sm:inline-flex md:px-5"
          >
            Start converting
          </button>
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E7E2D8] text-[#171717] transition-colors hover:bg-[#FFF8E6] md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

      </div>
      {isMenuOpen && (
        <div className="border-t border-[#E7E2D8] bg-white px-6 py-4 shadow-sm md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => {
              const isActive = route === link.to || (link.to === "/tools" && route.startsWith("/tools"));
              return (
                <button
                  key={link.to}
                  onClick={() => goToRoute(link.to)}
                  className={`flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#FFF8E6] text-[#171717]"
                      : "text-[#6B6258] hover:bg-[#F8F5EF] hover:text-[#171717]"
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
              onClick={() => {
                setIsMenuOpen(false);
                trackEvent("feedback_opened", { source: "mobile_navbar" });
              }}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#6B6258] transition-colors hover:bg-[#F8F5EF] hover:text-[#171717]"
            >
              Feedback
            </a>
            <button
              onClick={() => goToRoute("/tools")}
              className="mt-2 flex min-h-11 items-center justify-center rounded-lg bg-[#F59E0B] px-4 text-sm font-bold text-black transition-all hover:shadow-md"
            >
              Start converting
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
export default Navbar;
