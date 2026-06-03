import React from "react";
import { useRoute } from "@/src/context/RouteContext";
import { Button } from "@/src/components/ui/button";
import { Hammer, ArrowLeft } from "lucide-react";

interface ComingSoonProps {
  toolName?: string;
}

export function ComingSoon({ toolName = "Creator module" }: ComingSoonProps) {
  const { navigate } = useRoute();

  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center space-y-6">
      
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-bg border border-accent-primary/20 text-accent-secondary animate-pulse shadow-xs">
        <Hammer className="h-6 w-6 text-accent-secondary" />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-accent-secondary bg-accent-bg rounded py-1 px-2.5">
          Workspace pipeline
        </span>
        <h2 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary mt-2">
          {toolName} is disabled in public beta
        </h2>
        
        <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed pt-1.5">
          This module is not available yet. We are keeping unfinished tools disabled so beta testers only use flows we can inspect and support.
        </p>
      </div>

      <div className="pt-4">
        <Button
          variant="secondary"
          onClick={() => navigate("/tools")}
          className="gap-2 text-xs py-4.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all tools directory
        </Button>
      </div>

    </div>
  );
}
export default ComingSoon;
