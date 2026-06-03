import React, { useState, useEffect } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Scissors, Image, Play, Code2, RefreshCw } from "lucide-react";

export function HeroSection() {
  const { navigate } = useRoute();

  const rotatingTexts = [
    "prepare assets faster.",
    "convert PDFs instantly.",
    "clean images faster.",
    "preview Lottie files.",
    "format JSON neatly.",
    "optimize creator assets."
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [rotatingTexts.length]);

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const tools = [
    { name: "PDF to PNG", icon: FileText },
    { name: "Remove BG", icon: Scissors },
    { name: "Compress Image", icon: Image },
    { name: "Lottie Preview", icon: Play },
    { name: "JSON Formatter", icon: Code2 },
    { name: "WebP Converter", icon: RefreshCw },
  ];

  return (
    <section 
      className="relative overflow-hidden bg-[#F8F7F3] border-b border-[#E7E2D8] flex flex-col items-center justify-center min-h-[80vh] md:min-h-[85vh] py-20 text-center"
      id="home-hero"
      style={{
        backgroundImage: "radial-gradient(rgba(160,145,135,0.18) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {/* Soft natural white/cream center radial overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 flex flex-col items-center justify-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div 
            variants={itemVariants}
            className="mb-6 px-4 py-1.5 bg-[#FFF3D6] border border-[#F59E0B]/20 rounded-full inline-flex items-center gap-2 select-none shadow-[0_1px_2px_rgba(245,158,11,0.05)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></span>
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#E07A2F]">
              The Creator Utility Suite
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="font-sans text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#171717] leading-[1.25] text-center max-w-3xl"
          >
            Create, convert, and <br />
            <span className="text-[#F59E0B] inline-block min-h-[1.2em]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentTextIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="inline-block"
                >
                  {rotatingTexts[currentTextIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-[#6B6258]"
          >
            Kurio Studio brings PDF, image, motion, video, and developer tools into one clean workspace, so you can stop jumping between random websites.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <button
              onClick={() => navigate("/tools")}
              className="w-full sm:w-auto px-8 py-3 bg-[#F59E0B] text-[#171717] rounded-2xl font-bold shadow-sm hover:shadow-md hover:bg-[#E08e00] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-sm"
            >
              Start converting
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("tool-directory");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/tools");
                }
              }}
              className="w-full sm:w-auto px-8 py-3 bg-white border border-[#E7E2D8] text-[#171717] rounded-2xl font-semibold shadow-sm hover:bg-[#F3F0EA] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-sm"
            >
              Explore tools
            </button>
          </motion.div>

          {/* Tool Chips */}
          <motion.div 
            variants={itemVariants}
            className="mt-14 max-w-3xl flex flex-wrap items-center justify-center gap-3 px-2"
          >
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.name}
                  className="px-4 py-2 bg-white border border-[#E7E2D8] hover:border-[#F59E0B] rounded-full flex items-center gap-2 shadow-xs transition-colors duration-200 select-none cursor-default group"
                >
                  <Icon className="w-3.5 h-3.5 text-[#F59E0B] group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-[12px] font-medium text-[#171717]">
                    {tool.name}
                  </span>
                </div>
              );
            })}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;

