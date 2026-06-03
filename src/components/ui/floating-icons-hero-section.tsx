import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { 
  FileText, Image, Scissors, Film, Clapperboard, 
  Code2, Archive, Crop, Palette, Layers 
} from "lucide-react";

interface FloatingIconCard {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  x: number; // percentage based position
  y: number;
  scale: number;
  speed: number;
}

interface FloatingCardProps {
  card: FloatingIconCard;
  idx: number;
  springX: any;
  springY: any;
  isMobile: boolean;
  key?: number;
}

function FloatingCard({ card, idx, springX, springY, isMobile }: FloatingCardProps) {
  const IconComponent = card.icon;
  const waveY = Math.sin(idx + 1) * 6;

  // Use motion's useTransform hook to calculate repulsion safely
  const translateX = useTransform(springX, (val: number) => val * -card.speed * 8);
  const translateY = useTransform(springY, (val: number) => waveY + val * -card.speed * 8);

  return (
    <motion.div
      className="absolute rounded-xl bg-brand-surface border border-brand-border/80 px-3 py-2 flex items-center gap-2 shadow-xs pointer-events-auto"
      style={{
        left: `${card.x}%`,
        top: `${card.y}%`,
        scale: card.scale,
        x: isMobile ? 0 : translateX,
        y: isMobile ? waveY : translateY,
        zIndex: 10 + idx,
      }}
      whileHover={{ 
        scale: card.scale * 1.05, 
        borderColor: "#F59E0B",
        transition: { duration: 0.15 } 
      }}
    >
      <div className="flex h-6.5 w-6.5 items-center justify-center rounded bg-accent-bg text-accent-secondary">
        <IconComponent className="h-4 w-4" />
      </div>
      
      <span className="text-[10px] font-bold tracking-tight text-text-primary pr-0.5 select-none">
        {card.label}
      </span>
    </motion.div>
  );
}

export function FloatingIconsHeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const cards: FloatingIconCard[] = [
    { icon: FileText, label: "PDF utilities", x: 12, y: 15, scale: 0.9, speed: 0.03 },
    { icon: Image, label: "WebP format", x: 80, y: 18, scale: 1.0, speed: 0.04 },
    { icon: Scissors, label: "Remove bg", x: 15, y: 65, scale: 0.95, speed: 0.02 },
    { icon: Film, label: "MP4 to GIF", x: 85, y: 70, scale: 0.85, speed: 0.05 },
    { icon: Clapperboard, label: "Lottie render", x: 70, y: 48, scale: 1.1, speed: 0.03 },
    { icon: Code2, label: "JSON Lint", x: 28, y: 40, scale: 1.0, speed: 0.02 },
    { icon: Archive, label: "Payload compression", x: 45, y: 10, scale: 0.9, speed: 0.03 },
    { icon: Crop, label: "Image Resizer", x: 50, y: 80, scale: 1.0, speed: 0.04 },
    { icon: Palette, label: "Color extraction", x: 75, y: 80, scale: 0.95, speed: 0.045 },
    { icon: Layers, label: "Creator toolkit", x: 20, y: 85, scale: 0.9, speed: 0.03 },
  ];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 90, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 90, damping: 25 });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const xVal = (e.clientX - left - width / 2) / 6;
    const yVal = (e.clientY - top - height / 2) / 6;
    mouseX.set(xVal);
    mouseY.set(yVal);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
    >
      {cards.map((card, idx) => (
        <FloatingCard
          key={idx}
          card={card}
          idx={idx}
          springX={springX}
          springY={springY}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}

export default FloatingIconsHeroSection;
