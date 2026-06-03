import React from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { RouteProvider } from "@/src/context/RouteContext";
import { motion, AnimatePresence } from "motion/react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <RouteProvider>
      <div className="flex min-h-screen flex-col bg-brand-bg text-text-primary selection:bg-accent-bg selection:text-accent-secondary">
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
    </RouteProvider>
  );
}
export default AppShell;
