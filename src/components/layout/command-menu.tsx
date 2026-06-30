import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRoute } from "@/src/context/RouteContext";
import { useLanguage } from "@/src/context/LanguageContext";
import { TOOLS_LIST } from "@/src/lib/constants/tools";
import { Search, Folder, Zap, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const { navigate } = useRoute();
  const { t } = useLanguage();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog 
          open={open} 
          onOpenChange={setOpen}
          label="Global Command Menu"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]"
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-[#171717]/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          
          {/* Command Palette Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="cmdk-dialog relative w-[90vw] max-w-xl overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xl"
          >
            <div className="flex items-center border-b border-brand-border px-4 py-3">
              <Search className="h-5 w-5 text-text-muted shrink-0" />
              <Command.Input 
                autoFocus 
                placeholder={t.cmdPlaceholder} 
                className="w-full bg-transparent px-3 text-[15px] font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <div className="flex items-center gap-1 shrink-0 rounded-md bg-brand-bg px-2 py-1 text-[10px] font-semibold text-text-secondary border border-brand-soft-border">
                <span>ESC</span>
              </div>
            </div>

            <Command.List className="max-h-[340px] overflow-y-auto p-2 overscroll-contain">
              <Command.Empty className="py-10 text-center text-sm font-medium text-text-secondary">
                {t.cmdEmpty}
              </Command.Empty>

              <Command.Group heading={t.cmdNavigation}>
                <Command.Item onSelect={() => runCommand(() => navigate("/"))}>
                  <Zap className="mr-2 h-4 w-4" /> {t.cmdHome}
                </Command.Item>
                <Command.Item onSelect={() => runCommand(() => navigate("/workspace"))}>
                  <Folder className="mr-2 h-4 w-4" /> {t.cmdWorkspace}
                </Command.Item>
                <Command.Item onSelect={() => runCommand(() => navigate("/ai-helper"))}>
                  <Search className="mr-2 h-4 w-4" /> {t.cmdAIHelper}
                </Command.Item>
              </Command.Group>

              <Command.Group heading={t.cmdLocalTools}>
                {TOOLS_LIST.map((tool) => (
                  <Command.Item
                    key={tool.id}
                    value={tool.name + " " + tool.description}
                    onSelect={() => runCommand(() => navigate(tool.slug))}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-text-secondary mr-3 border border-brand-soft-border">
                          {tool.icon && <tool.icon className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{tool.name}</span>
                          <span className="text-[10px] text-text-muted line-clamp-1">{tool.description}</span>
                        </div>
                      </div>
                      {tool.status === "coming-soon" && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-text-muted bg-brand-bg px-2 py-0.5 rounded-full border border-brand-soft-border">
                          {t.comingSoon}
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading={t.cmdSupport}>
                <Command.Item onSelect={() => runCommand(() => window.open("https://github.com/KurioSannn/KurioStudio/issues/new", "_blank"))}>
                  <HelpCircle className="mr-2 h-4 w-4" /> {t.cmdFeedback}
                </Command.Item>
              </Command.Group>

            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}
