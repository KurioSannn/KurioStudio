import React from "react";
import { DownloadCloud, LayoutGrid, CheckCircle } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: DownloadCloud,
      title: "Drop or choose asset",
      description: "Select your image, PDF, or JSON vector animations. File headers will be analyzed in real-time.",
    },
    {
      step: "02",
      icon: LayoutGrid,
      title: "Configure settings",
      description: "Set compressor scaling factors, quality coefficients, or run code formatters locally.",
    },
    {
      step: "03",
      icon: CheckCircle,
      title: "Consolidated exports",
      description: "Verify inputs in a split preview container, and download individual assets or single ZIP archives.",
    },
  ];

  return (
    <section className="bg-brand-secondary border-y border-brand-soft-border py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
            Streamlined processing flow
          </h2>
          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
            Upload your creator assets, choose your tuning parameters, and export a polished result safely inside one unified workbench.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Subtle joining connector lines (desktop only) */}
          <div className="hidden md:block absolute top-[52px] left-[15%] right-[15%] h-0.5 border-t border-dashed border-brand-border -z-0" />

          {steps.map((item, index) => {
            const StepIcon = item.icon;
            
            return (
              <div
                key={index}
                className="relative z-10 flex flex-col items-center text-center bg-brand-surface border border-brand-border rounded-2xl p-7.5 shadow-xs"
              >
                {/* Step Amber indicator */}
                <span className="absolute top-4.5 right-5.5 font-mono text-xs font-bold text-accent-secondary bg-accent-bg py-0.5 px-2 rounded-md">
                  {item.step}
                </span>

                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#FFF3D6] text-accent-secondary border border-accent-primary/15 shadow-xs mb-5">
                  <StepIcon className="h-6 w-6 text-accent-secondary" />
                </div>

                <h3 className="font-sans text-base font-bold text-text-primary">
                  {item.title}
                </h3>
                
                <p className="text-xs text-text-secondary mt-3 leading-relaxed max-w-xs">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export default HowItWorks;
