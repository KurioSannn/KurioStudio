import React from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../ui/badge";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-text-primary selection:bg-accent-bg selection:text-accent-secondary">
      <div className="border-b border-amber-500/20 bg-[#FFF8E6] px-6 py-2 text-center text-[11px] text-[#7A4A05]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2">
          <Badge variant="beta">Beta</Badge>
          <span>Kurio Studio is in public beta. Most tools process files safely in your browser, and AI features are currently rate limited.</span>
        </div>
      </div>

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
