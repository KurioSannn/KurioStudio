import React from "react";
import { useRoute } from "@/src/context/RouteContext";
import { AppRoute } from "@/src/lib/types";

export function Footer() {
  const { navigate } = useRoute();

  return (
    <footer className="bg-white text-[#6B6258] border-t border-[#E7E2D8] py-12 px-6 md:px-10" id="global-footer">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.29 7 12 12 20.71 7" />
                  <line x1="12" y1="22" x2="12" y2="12" />
                </svg>
              </div>
              <span className="font-sans text-lg font-bold tracking-tight text-[#171717]">
                Kurio <span className="text-[#F59E0B]">Studio</span>
              </span>
            </div>
            <p className="text-xs text-[#6B6258] leading-relaxed max-w-md">
              Create, convert, and prepare assets faster. Kurio Studio delivers high-performance 
              client-side formats and AI-assisted workflows in one streamlined sandbox. Built for creators, designers, and developers.
            </p>
          </div>
 
          {/* Quick Nav */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] mb-3">Workspace</h4>
            <ul className="text-xs space-y-2">
              <li>
                <button onClick={() => navigate("/tools")} className="hover:text-[#F59E0B] transition-colors text-left text-[#6B6258] cursor-pointer">
                  Asset Converters
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/workspace")} className="hover:text-[#F59E0B] transition-colors text-left text-[#6B6258] cursor-pointer">
                  My History
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/ai-helper")} className="hover:text-[#F59E0B] transition-colors text-left text-[#6B6258] cursor-pointer">
                  Creative Assistant
                </button>
              </li>
            </ul>
          </div>
 
          {/* Legal Guard */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] mb-3">Compliance</h4>
            <p className="text-[10px] text-[#9A9187] leading-relaxed">
              We process only user-uploaded assets. We do not support copyrighted media downloads 
              or DRM bypassing. Files remain local inside browser sandboxes for client tasks.
            </p>
          </div>
 
        </div>
 
        <div className="mt-8 pt-6 border-t border-[#E7E2D8] flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[#9A9187]">
          <span>&copy; {new Date().getFullYear()} Kurio Studio. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
