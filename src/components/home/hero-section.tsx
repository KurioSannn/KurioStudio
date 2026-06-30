import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants, type Easing } from "motion/react";
import { ArrowRight, Bot, Code2, FileImage, FileText, Layers, Minimize2, Maximize2, ShieldCheck, Sparkles } from "lucide-react";
import { useRoute } from "@/src/context/RouteContext";
import { useLanguage } from "@/src/context/LanguageContext";

/* ─────────────────────────────────────────────
   FLOATING ICON CONFIG
   All positions / durations defined as constants
   so values never change between renders.
───────────────────────────────────────────── */

interface FloatingIconDef {
  id: string;
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  // Percent-based position relative to hero container
  x: string;
  y: string;
  // Framer motion float animation
  floatY: number;       // px to float up/down
  floatDuration: number; // seconds per cycle
  floatDelay: number;    // seconds
  // Only shown on md+?
  desktopOnly?: boolean;
}

const FLOATING_ICONS: FloatingIconDef[] = [
  {
    id: "pdf",
    label: "PDF → PNG",
    Icon: FileText,
    color: "#D97706",
    bg: "#FFF7E0",
    x: "5%",
    y: "18%",
    floatY: 10,
    floatDuration: 4.4,
    floatDelay: 0,
  },
  {
    id: "image",
    label: "Image Tools",
    Icon: FileImage,
    color: "#059669",
    bg: "#ECFDF5",
    x: "8%",
    y: "62%",
    floatY: 8,
    floatDuration: 5.1,
    floatDelay: 0.8,
  },
  {
    id: "compress",
    label: "Compress",
    Icon: Minimize2,
    color: "#7C3AED",
    bg: "#F5F3FF",
    x: "82%",
    y: "15%",
    floatY: 12,
    floatDuration: 4.8,
    floatDelay: 0.3,
  },
  {
    id: "resize",
    label: "Resize",
    Icon: Maximize2,
    color: "#0EA5E9",
    bg: "#F0F9FF",
    x: "86%",
    y: "58%",
    floatY: 9,
    floatDuration: 5.6,
    floatDelay: 1.2,
  },
  {
    id: "json",
    label: "JSON",
    Icon: Code2,
    color: "#B45309",
    bg: "#FFFBEB",
    x: "3%",
    y: "40%",
    floatY: 7,
    floatDuration: 4.2,
    floatDelay: 0.6,
    desktopOnly: true,
  },
  {
    id: "lottie",
    label: "Lottie",
    Icon: Layers,
    color: "#DB2777",
    bg: "#FDF2F8",
    x: "88%",
    y: "38%",
    floatY: 11,
    floatDuration: 5.3,
    floatDelay: 0.4,
    desktopOnly: true,
  },
  {
    id: "ai",
    label: "AI Helper",
    Icon: Bot,
    color: "#F59E0B",
    bg: "#FFF3D6",
    x: "14%",
    y: "83%",
    floatY: 9,
    floatDuration: 4.7,
    floatDelay: 1.5,
    desktopOnly: true,
  },
  {
    id: "workspace",
    label: "Workspace",
    Icon: Sparkles,
    color: "#475569",
    bg: "#F8FAFC",
    x: "76%",
    y: "82%",
    floatY: 8,
    floatDuration: 5.0,
    floatDelay: 0.9,
    desktopOnly: true,
  },
];

/* ─────────────────────────────────────────────
   FLOATING ICON TILE
───────────────────────────────────────────── */

interface FloatingIconTileProps {
  def: FloatingIconDef;
  mouseX: number;
  mouseY: number;
  containerRef: React.RefObject<HTMLElement | null>;
  reducedMotion: boolean;
}

function FloatingIconTile({
  def,
  mouseX,
  mouseY,
  containerRef,
  reducedMotion,
}: FloatingIconTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [repel, setRepel] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || !containerRef.current || !tileRef.current) return;

    const container = containerRef.current;
    const tile = tileRef.current;
    const cRect = container.getBoundingClientRect();
    const tRect = tile.getBoundingClientRect();

    const tileCX = tRect.left + tRect.width / 2 - cRect.left;
    const tileCY = tRect.top + tRect.height / 2 - cRect.top;

    const dx = mouseX - tileCX;
    const dy = mouseY - tileCY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const REPEL_RADIUS = 140;
    const MAX_PUSH = 28;

    if (dist < REPEL_RADIUS && dist > 0) {
      const strength = (1 - dist / REPEL_RADIUS) * MAX_PUSH;
      setRepel({ x: (-dx / dist) * strength, y: (-dy / dist) * strength });
    } else {
      setRepel({ x: 0, y: 0 });
    }
  }, [mouseX, mouseY, containerRef, reducedMotion]);

  const FLOAT_EASE: Easing = "easeInOut";

  const floatVariants: Variants = {
    float: {
      y: [0, -def.floatY, 0],
      transition: {
        repeat: Infinity,
        repeatType: "loop",
        duration: def.floatDuration,
        delay: def.floatDelay,
        ease: FLOAT_EASE,
      },
    },
  };

  return (
    <motion.div
      ref={tileRef}
      variants={floatVariants}
      animate={reducedMotion ? undefined : "float"}
      style={{
        position: "absolute",
        left: def.x,
        top: def.y,
        x: repel.x,
        y: repel.y,
        backgroundColor: def.bg,
      }}
      className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/60 shadow-[0_2px_14px_rgba(0,0,0,0.07)] backdrop-blur-sm select-none pointer-events-none ${def.desktopOnly ? "lg:flex" : ""}`}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: def.bg }}
      >
        <def.Icon style={{ width: 14, height: 14, color: def.color }} />
      </div>
      <span className="text-[11px] font-semibold text-[#3F3933] whitespace-nowrap pr-0.5">
        {def.label}
      </span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   HERO SECTION
───────────────────────────────────────────── */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.52, ease: "easeOut" } },
};

export function HeroSection() {
  const { navigate } = useRoute();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion() ?? false;
  const heroRef = useRef<HTMLElement | null>(null);
  const [mouse, setMouse] = useState({ x: -999, y: -999 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (reducedMotion) return;
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [reducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: -999, y: -999 });
  }, []);

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      id="home-hero"
      className="relative overflow-hidden bg-[#F8F7F3] border-b border-[#E7E2D8] flex flex-col items-center justify-center min-h-[calc(100svh-64px)] py-14 text-center"
      style={{
        backgroundImage:
          "radial-gradient(rgba(160,145,135,0.16) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* Soft radial glow center overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.82),transparent_68%)]" />

      {/* Soft amber top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_70%)] pointer-events-none" />

      {/* Floating icon tiles */}
      {FLOATING_ICONS.map((def) => (
        <FloatingIconTile
          key={def.id}
          def={def}
          mouseX={mouse.x}
          mouseY={mouse.y}
          containerRef={heroRef}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="mb-7 px-4 py-1.5 bg-[#FFF3D6] border border-[#F59E0B]/25 rounded-full inline-flex items-center gap-2 shadow-[0_1px_4px_rgba(245,158,11,0.08)]"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#E07A2F]" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-[#E07A2F]">
              {t.publicBeta}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-sans text-4xl sm:text-5xl md:text-[3.6rem] font-extrabold tracking-tight text-[#171717] leading-[1.18] max-w-3xl"
          >
            {t.heroHeadline}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-7 max-w-2xl text-base md:text-lg leading-relaxed text-[#6B6258]"
          >
            {t.heroSubtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto"
          >
            <button
              id="hero-cta-primary"
              onClick={() => navigate("/tools")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#F59E0B] text-[#171717] rounded-2xl font-bold shadow-sm hover:shadow-md hover:bg-[#E08e00] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-sm"
            >
              {t.heroCTAPrimary}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              id="hero-cta-secondary"
              onClick={() => navigate("/ai-helper")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border border-[#E7E2D8] text-[#3F3933] rounded-2xl font-semibold shadow-sm hover:bg-[#F3F0EA] hover:border-[#F59E0B]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-sm"
            >
              <Bot className="h-4 w-4 text-[#F59E0B]" />
              {t.heroCTASecondary}
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-[12px] text-[#6B6258] tracking-wide"
          >
            {t.heroTrustLine}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
