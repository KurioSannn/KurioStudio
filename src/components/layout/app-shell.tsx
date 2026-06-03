import React, { useEffect, useState } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [showBetaBanner, setShowBetaBanner] = useState(false);

  useEffect(() => {
    setShowBetaBanner(localStorage.getItem("kurio_beta_banner_dismissed") !== "true");
  }, []);

  const dismissBetaBanner = () => {
    localStorage.setItem("kurio_beta_banner_dismissed", "true");
    setShowBetaBanner(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-text-primary selection:bg-accent-bg selection:text-accent-secondary">
      {showBetaBanner && (
        <div className="border-b border-amber-500/20 bg-[#FFF8E6] px-6 py-2 text-[11px] text-[#7A4A05]">
          <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              <Badge variant="beta">Beta</Badge>
              <span>Kurio Studio is in public beta. Most tools process files safely in your browser, and AI features are currently rate limited.</span>
            </div>
            <button
              type="button"
              onClick={dismissBetaBanner}
              aria-label="Hide beta message"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7A4A05] transition-colors hover:bg-amber-500/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar />

        {/* Core Screen Context */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mx-auto w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
export default AppShell;
