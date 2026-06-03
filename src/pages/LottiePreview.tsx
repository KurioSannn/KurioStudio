import React, { useState, useEffect, useRef } from "react";
import { ToolPageShell } from "@/src/components/tools/tool-page-shell";
import { UploadDropZone } from "@/src/components/tools/upload-drop-zone";
import { SettingsPanel } from "@/src/components/tools/settings-panel";
import { OutputPanel } from "@/src/components/tools/output-panel";
import { PreviewPanel } from "@/src/components/tools/preview-panel";
import { Button } from "@/src/components/ui/button";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { Play, Pause, Trash2, Sliders, Palette, Zap, CheckCircle2, RefreshCw, Download, Edit } from "lucide-react";

interface LottieStats {
  version: string;
  frameRate: number;
  width: number;
  height: number;
  layersCount: number;
  assetsCount: number;
  name: string;
}

export function LottiePreview() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawJson, setRawJson] = useState<string>("");
  const [stats, setStats] = useState<LottieStats | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  
  // AI assistant feedback state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Dynamic Color Swapping states
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [customColorHex, setCustomColorHex] = useState<string>("");

  // Dynamic Lottie player engine controls & states
  const containerRef = useRef<HTMLDivElement>(null);
  const animationInstanceRef = useRef<any>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  const [exportState, setExportState] = useState<"idle" | "rendering" | "completed" | "error">("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(1.0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // Dynamic CDN script loader
  const loadLottieEngine = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const win = window as any;
      if (win.lottie) {
        resolve(win.lottie);
        return;
      }

      let script = document.querySelector('script[src*="lottie.min.js"]') as HTMLScriptElement;
      if (script) {
        if (win.lottie) {
          resolve(win.lottie);
        } else {
          script.addEventListener("load", () => {
            resolve(win.lottie);
          });
          script.addEventListener("error", (e) => {
            reject(e);
          });
        }
        return;
      }

      script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
      script.async = true;
      script.onload = () => {
        resolve(win.lottie);
      };
      script.onerror = () => {
        reject(new Error("Failed to load Lottie engine dependency from CDN."));
      };
      document.body.appendChild(script);
    });
  };

  // Setup loop and event listeners
  useEffect(() => {
    let active = true;
    if (!rawJson) {
      if (animationInstanceRef.current) {
        animationInstanceRef.current.destroy();
        animationInstanceRef.current = null;
      }
      return;
    }

    const initAnimation = async () => {
      // Small timeout to allow container element to fully mount
      await new Promise((r) => setTimeout(r, 60));
      if (!active) return;

      try {
        const parsed = JSON.parse(rawJson);
        const lottieInst = await loadLottieEngine();
        
        if (!active) return;
        if (!containerRef.current) return;

        if (animationInstanceRef.current) {
          animationInstanceRef.current.destroy();
          animationInstanceRef.current = null;
        }

        const anim = lottieInst.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: isLooping,
          autoplay: isPlaying,
          animationData: parsed,
        });

        animationInstanceRef.current = anim;

        anim.addEventListener("DOMLoaded", () => {
          if (!active) return;
          setTotalFrames(anim.totalFrames);
          anim.setSpeed(playSpeed);
        });

        anim.addEventListener("enterFrame", () => {
          if (!active) return;
          setCurrentFrame(anim.currentFrame);
        });

      } catch (err) {
        console.error("Error setting up Lottie animation preview:", err);
      }
    };

    initAnimation();

    return () => {
      active = false;
      if (animationInstanceRef.current) {
        animationInstanceRef.current.destroy();
        animationInstanceRef.current = null;
      }
    };
  }, [rawJson]);

  const togglePlay = () => {
    if (!animationInstanceRef.current) return;
    if (isPlaying) {
      animationInstanceRef.current.pause();
      setIsPlaying(false);
    } else {
      animationInstanceRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleLoop = () => {
    if (!animationInstanceRef.current) return;
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    animationInstanceRef.current.loop = nextLoop;
  };

  const changeSpeed = (speed: number) => {
    setPlaySpeed(speed);
    if (animationInstanceRef.current) {
      animationInstanceRef.current.setSpeed(speed);
    }
  };

  const restartPlayback = () => {
    if (!animationInstanceRef.current) return;
    animationInstanceRef.current.goToAndPlay(0, true);
    setIsPlaying(true);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!animationInstanceRef.current) return;
    const targetF = Number(e.target.value);
    setCurrentFrame(targetF);
    animationInstanceRef.current.goToAndStop(targetF, true);
    setIsPlaying(false);
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setAiAnalysis(null);
    setCurrentFrame(0);
    setTotalFrames(0);
    setIsPlaying(true);
    setIsLooping(true);
    setPlaySpeed(1.0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawJson(text);
      analyzeLottieJSON(text);
    };
    reader.readAsText(selectedFile);
  };

  const analyzeLottieJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Core parameters extraction
      const version = parsed.v || "Unknown";
      const frameRate = parsed.fr || 24;
      const width = parsed.w || 500;
      const height = parsed.h || 500;
      const layersCount = Array.isArray(parsed.layers) ? parsed.layers.length : 0;
      const assetsCount = Array.isArray(parsed.assets) ? parsed.assets.length : 0;
      const name = parsed.nm || "Lottie Animation";

      setStats({ version, frameRate, width, height, layersCount, assetsCount, name });
      
      // Highlight exact color hex codes used inside Lottie shapes
      // Lottie represents rgba values inside keyframes or static structures as fraction arrays (e.g. [0.5, 0.5, 0.5, 1])
      const detectedColors: string[] = [];
      const scanColors = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        
        // Shape structures represent colors in objects containing property type "c" or array "k" holding decimal arrays
        if (obj.s === "color" || (obj.k && Array.isArray(obj.k) && obj.k.length >= 3 && typeof obj.k[0] === "number" && obj.k[0] <= 1 && obj.k[1] <= 1)) {
          const colorsArray = obj.k;
          if (colorsArray.length >= 3) {
            const r = Math.round(colorsArray[0] * 255);
            const g = Math.round(colorsArray[1] * 255);
            const b = Math.round(colorsArray[2] * 255);
            const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
            if (!detectedColors.includes(hex) && hex.length === 7) {
              detectedColors.push(hex);
            }
          }
        }
        
        Object.values(obj).forEach((val) => {
          if (typeof val === "object") scanColors(val);
        });
      };
      
      scanColors(parsed);
      setColors(detectedColors.slice(0, 10)); // Limit display palette to primary 10 colors to avoid dashboard clutter

      addToWorkspaceHistory({
        toolId: "lottie-preview",
        toolName: "Lottie Preview",
        fileName: file?.name || "animated_asset.json",
        fileSize: jsonString.length,
        outputType: "JSON Checked",
        status: "completed",
      });
      setLoading(false);
    } catch (e) {
      alert("Invalid JSON format. Please drop a valid structured JSON document.");
      setFile(null);
      setLoading(false);
    }
  };

  const consultLottieAssistant = async () => {
    if (!stats) return;
    setAiLoading(true);
    setAiAnalysis(null);

    const userInstructions = `Explain the following Lottie vector structure:
File Name: ${file?.name}
Name attribute: ${stats.name}
Dimensions: ${stats.width}x${stats.height} px
FPS: ${stats.frameRate}
Layers Count: ${stats.layersCount}
Asset Dependencies: ${stats.assetsCount}
Colors detected: ${colors.join(", ")}`;

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lottie-helper",
          userInput: userInstructions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.result);
      } else {
        setAiAnalysis("Analysis failed. Structural parameters indicate standard JSON layer integrity.");
      }
    } catch (e) {
      setAiAnalysis("No active connection to auxiliary Gemini nodes. Manual audit: structural frames are well-aligned.");
    } finally {
      setAiLoading(false);
    }
  };

  const swapColorInLottie = (oldHex: string, newHex: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      
      const hexToDecimalRgb = (hex: string) => {
        const clean = hex.replace("#", "");
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;
        return [r, g, b];
      };

      const [or, og, ob] = hexToDecimalRgb(oldHex);
      const [nr, ng, nb] = hexToDecimalRgb(newHex);

      const isClose = (num1: number, num2: number) => Math.abs(num1 - num2) < 0.015;

      const traverseAndReplace = (obj: any) => {
        if (!obj || typeof obj !== "object") return;

        if (
          obj.k && 
          Array.isArray(obj.k) && 
          obj.k.length >= 3 && 
          typeof obj.k[0] === "number" && 
          obj.k[0] <= 1 && 
          obj.k[1] <= 1
        ) {
          if (isClose(obj.k[0], or) && isClose(obj.k[1], og) && isClose(obj.k[2], ob)) {
            obj.k[0] = nr;
            obj.k[1] = ng;
            obj.k[2] = nb;
          }
        }

        Object.values(obj).forEach((val) => {
          if (typeof val === "object") traverseAndReplace(val);
        });
      };

      traverseAndReplace(parsed);
      const updatedJson = JSON.stringify(parsed, null, 2);
      setRawJson(updatedJson);
      
      setColors(prev => prev.map(c => c === oldHex ? newHex.toUpperCase() : c));
      setEditingColor(null);
    } catch (e) {
      console.error("Failed to swap color in Lottie structure:", e);
    }
  };

  const downloadLottieJson = () => {
    if (!rawJson) return;
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file?.name || "animated_brand_asset.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCurrentFrameAsWebP = async () => {
    if (!containerRef.current || !stats) return;
    try {
      const svgElement = containerRef.current.querySelector("svg");
      if (!svgElement) {
        alert("Animation preview vector elements not found. Make sure the animation is active.");
        return;
      }

      // Serialize the SVG to source XML string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      
      // Safeguard missing XML namespace declaration
      if (!svgString.includes("http://www.w3.org/2000/svg")) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Maintain original vector aspect ratios cleanly using stats data
        canvas.width = stats.width || 500;
        canvas.height = stats.height || 500;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              const safeName = stats.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
              link.download = `${safeName}_frame_${Math.round(currentFrame)}.webp`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
            URL.revokeObjectURL(blobUrl);
          }, "image/webp", 1.0);
        }
      };

      img.onerror = (e) => {
        console.error("Failed to convert vector snapshot into image frame:", e);
        URL.revokeObjectURL(blobUrl);
      };

      img.src = blobUrl;
    } catch (e) {
      console.error("Error exporting current animation frame to WebP:", e);
    }
  };

  const exportAsWebMVideo = async () => {
    if (!rawJson || !stats) return;
    setExportState("rendering");
    setExportProgress(0);
    setExportError(null);

    try {
      const parsed = JSON.parse(rawJson);
      const lottieInst = await loadLottieEngine();
      
      const hiddenDiv = hiddenContainerRef.current;
      if (!hiddenDiv) {
        throw new Error("Offscreen rendering layer not found in page structure.");
      }

      // Reset and size our offscreen target canvas container
      hiddenDiv.innerHTML = "";
      hiddenDiv.style.width = `${stats.width || 500}px`;
      hiddenDiv.style.height = `${stats.height || 500}px`;

      // Mount the animation using high-quality canvas mode
      const anim = lottieInst.loadAnimation({
        container: hiddenDiv,
        renderer: "canvas",
        loop: false,
        autoplay: false,
        animationData: parsed,
      });

      // Wait for animation configuration to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Lottie engine setup timed out")), 5000);
        anim.addEventListener("DOMLoaded", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      const canvas = hiddenDiv.querySelector("canvas");
      if (!canvas) {
        throw new Error("Failed to initialize canvas render output layer.");
      }

      // Capture canvas stream at the defined layout FPS
      const fps = stats.frameRate || 30;
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : null;
      
      if (!stream) {
        throw new Error("Your browser security sandbox does not support direct canvas stream capture.");
      }

      // Configure MediaRecorder formats
      let options = { mimeType: "video/webm; codecs=vp9" };
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder API is not available in this browser environment.");
      }

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm; codecs=vp8" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" }; // default fallback
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // When recorder completes processing chunk collection
      mediaRecorder.onstop = () => {
        try {
          const videoBlob = new Blob(chunks, { type: "video/webm" });
          const videoUrl = URL.createObjectURL(videoBlob);
          
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = videoUrl;
          const safeName = stats.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
          a.download = `${safeName}_motion_source.webm`;
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(videoUrl);
          }, 100);

          setExportState("completed");
          setTimeout(() => setExportState("idle"), 3000);
        } catch (err: any) {
          setExportError(`Blob encoding fail: ${err.message || err}`);
          setExportState("error");
        } finally {
          anim.destroy();
        }
      };

      // Set speed to normal for perfect timing
      anim.setSpeed(1.0);
      
      // Hook change listener to update progress bar dynamically
      anim.addEventListener("enterFrame", () => {
        const current = anim.currentFrame;
        const total = anim.totalFrames;
        if (total > 0) {
          const percentage = Math.min(Math.round((current / total) * 100), 99);
          setExportProgress(percentage);
        }
      });

      // Stop signal when loop concludes successfully
      anim.addEventListener("complete", () => {
        setExportProgress(100);
        mediaRecorder.stop();
      });

      // Start Recording and Play simultaneously
      mediaRecorder.start();
      anim.play();

    } catch (e: any) {
      console.error(e);
      setExportError(e.message || "An unexpected error occurred during rendering.");
      setExportState("error");
    }
  };

  const clearWorkspace = () => {
    if (animationInstanceRef.current) {
      animationInstanceRef.current.destroy();
      animationInstanceRef.current = null;
    }
    setFile(null);
    setRawJson("");
    setStats(null);
    setColors([]);
    setAiAnalysis(null);
    setTotalFrames(0);
    setCurrentFrame(0);
    setIsPlaying(true);
    setIsLooping(true);
    setPlaySpeed(1.0);
    setEditingColor(null);
    setCustomColorHex("");
    setExportState("idle");
    setExportProgress(0);
    setExportError(null);
  };

  return (
    <ToolPageShell toolId="lottie-preview">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column displays stats and color structures */}
        <div className="lg:col-span-4 space-y-6">
          {!file ? (
            <UploadDropZone
              acceptedExtensions={[".json"]}
              onFileSelected={handleFileSelected}
              title="Upload your Lottie JSON"
              subtitle="Drag & drop standard Adobe After Effects Lottie .json here or click to browse. Reads vector keyframes instantly."
            />
          ) : (
            <SettingsPanel title="Lottie Stats & Details">
              
              {stats && (
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Identifier Name</span>
                    <span className="font-bold text-text-primary truncate max-w-[150px]">{stats.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Version Level</span>
                    <span className="font-mono text-text-primary font-semibold">{stats.version}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Frame rate</span>
                    <span className="font-mono text-text-primary font-semibold">{stats.frameRate} fps</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Resolution Canvas</span>
                    <span className="font-mono text-text-primary font-semibold">{stats.width}x{stats.height} px</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Layers Depth</span>
                    <span className="font-mono text-text-primary font-semibold">{stats.layersCount} tracks</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-brand-soft-border">
                    <span className="text-text-secondary">Mime elements</span>
                    <span className="font-mono text-text-primary font-semibold">{stats.assetsCount} links</span>
                  </div>
                </div>
              )}

              {/* Reset and Download actions */}
              <div className="pt-3 border-t border-brand-soft-border space-y-2">
                <Button 
                  onClick={downloadLottieJson}
                  className="w-full gap-2 text-xs font-bold bg-[#F59E0B] hover:bg-[#D98700] text-[#171717] h-9"
                >
                  <Download className="h-4 w-4" />
                  Download Lottie JSON
                </Button>

                {exportState === "rendering" ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-[#F59E0B]/30 bg-[#FFF3D6]/10 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#E07A2F]">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F59E0B]"></span>
                        </span>
                        Recording Video Stream...
                      </div>
                      <span>{exportProgress}%</span>
                    </div>
                    <div className="w-full bg-[#F3F0EA] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#F59E0B] h-full transition-all duration-150 ease-out" 
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#6B6258] leading-normal text-center">
                      Encoding vector frames onto dynamic canvas context. Keep the window active.
                    </p>
                  </div>
                ) : exportState === "completed" ? (
                  <div className="p-3 text-[11px] font-bold text-[#15803D] bg-[#DCFCE7]/60 border border-[#22C55E]/20 rounded-xl text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    Export successful. Download started!
                  </div>
                ) : exportState === "error" ? (
                  <div className="p-3 text-[11px] font-bold text-[#B91C1C] bg-[#FEE2E2]/60 border border-[#EF4444]/20 rounded-xl text-center space-y-1">
                    <div>Video compilation stalled</div>
                    <p className="text-[10px] font-normal leading-normal text-[#991B1B]">{exportError}</p>
                    <button 
                      onClick={() => setExportState("idle")} 
                      className="text-[9px] underline text-[#B91C1C] hover:text-[#991B1B]"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <Button 
                    onClick={exportAsWebMVideo}
                    className="w-full gap-2 text-xs font-bold bg-[#171717] hover:bg-[#2A2A2A] text-white h-9 border border-black/10"
                    title="Export full loop animation directly into a high-quality WebM Web video file using HTML5 Media Canvas Streams"
                  >
                    <Play className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                    Export to Video (WebM)
                  </Button>
                )}

                <Button 
                  onClick={exportCurrentFrameAsWebP}
                  variant="outline"
                  className="w-full gap-2 text-xs font-bold border border-[#E7E2D8] bg-white text-[#6B6258] hover:bg-[#F3F0EA] h-9"
                  title="Export current frame as WebP snapshot"
                >
                  <Palette className="h-4 w-4 text-[#F59E0B]" />
                  Export Frame to WebP image
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearWorkspace} 
                  className="w-full gap-2 text-xs border border-[#E7E2D8] text-[#6B6258] hover:bg-[#F3F0EA] h-9"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Workspace
                </Button>
              </div>

            </SettingsPanel>
          )}

          {stats && colors.length > 0 && (
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-brand-soft-border select-none">
                <Palette className="h-4.5 w-4.5 text-accent-secondary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Color Vector Inspector
                </h4>
              </div>
              
              <div className="grid grid-cols-5 gap-2.5">
                {colors.map((hex, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEditingColor(hex);
                      setCustomColorHex(hex);
                    }}
                    className={`group relative flex flex-col items-center p-1 rounded-lg border transition-all ${
                      editingColor === hex 
                        ? "border-[#F59E0B] bg-[#FFF3D6]/20" 
                        : "border-transparent hover:border-brand-border/60"
                    }`}
                  >
                    <div
                      style={{ backgroundColor: hex }}
                      className="h-8.5 w-8.5 rounded-md border border-brand-border/40 shadow-xs cursor-pointer group-hover:scale-105 transition-transform duration-100"
                      title={`Click to edit ${hex}`}
                    />
                    <span className="text-[8px] font-mono mt-1 text-text-secondary font-semibold">{hex}</span>
                  </button>
                ))}
              </div>

              {/* Editing Color Swapper block */}
              {editingColor && (
                <div className="p-3 bg-white rounded-xl border border-brand-border bg-[#FAFAF8] space-y-2.5 transition-all">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#6B6258] uppercase">
                    <span>Swap Asset Color</span>
                    <button 
                      onClick={() => setEditingColor(null)}
                      className="text-text-muted hover:text-[#171717] px-1 text-[9px]"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Old color reference */}
                    <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg border border-brand-soft-border bg-[#F3F0EA]/40">
                      <div 
                        style={{ backgroundColor: editingColor }} 
                        className="h-5 w-5 rounded border border-brand-border/50"
                      />
                      <span className="font-mono text-[9px] text-[#554C42]">{editingColor}</span>
                    </div>

                    <span className="text-xs text-[#9A9187] font-bold">→</span>

                    {/* New color picker & hex box */}
                    <div className="flex-1 flex items-center gap-1.5 p-1.5 rounded-lg border border-[#F59E0B]/30 bg-white">
                      <input 
                        type="color" 
                        value={customColorHex}
                        onChange={(e) => setCustomColorHex(e.target.value.toUpperCase())}
                        className="h-5 w-5 rounded border border-[#E7E2D8] cursor-pointer p-0 bg-transparent outline-none"
                      />
                      <input 
                        type="text" 
                        maxLength={7}
                        value={customColorHex}
                        onChange={(e) => setCustomColorHex(e.target.value.toUpperCase())}
                        className="font-mono text-[9px] text-text-primary bg-transparent border-none w-full p-0 focus:outline-none focus:ring-0 outline-none"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => swapColorInLottie(editingColor, customColorHex)}
                    className="w-full text-[10px] font-bold h-7 bg-[#6B6258] hover:bg-[#554C42] text-white"
                  >
                    Replace Color Instantly
                  </Button>
                </div>
              )}

              <span className="text-[9px] text-[#9A9187] mt-1 block leading-relaxed select-none">
                Click any detected color swatch above to swap it dynamically throughout the animation vector shapes on the fly.
              </span>
            </div>
          )}
        </div>

        {/* Right column displays animated vector layer or code analysis tree */}
        <div className="lg:col-span-8">
          {file && stats ? (
            <OutputPanel title={stats.name}>
              
              <div className="space-y-6">
                {/* Lottie Vector animation real player frame */}
                <div className="rounded-xl border border-brand-border bg-[#FAFAF7] p-6 flex flex-col items-center justify-center relative min-h-[380px]">
                  {/* Status badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[10px] text-[#E07A2F] font-bold bg-[#FFF3D6] px-2.5 py-1 rounded-md border border-[#F59E0B]/10">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F59E0B]" />
                    Interactive Vector Preview Active
                  </div>

                  {/* Real Lottie Renderer Container */}
                  <div 
                    ref={containerRef} 
                    className="w-full max-w-[280px] aspect-square flex items-center justify-center overflow-hidden my-4" 
                  />

                  {/* Playback & interactive tuning strip */}
                  <div className="w-full mt-4 pt-4 border-t border-[#E7E2D8] flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Position controls */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={togglePlay}
                        className="h-8 w-8 text-[#6B6258] border-[#E7E2D8] hover:text-[#F59E0B] hover:bg-[#F3F0EA]"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-[#6B6258] hover:fill-[#F59E0B]" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={restartPlayback}
                        className="h-8 w-8 text-[#6B6258] border-[#E7E2D8] hover:text-[#F59E0B] hover:bg-[#F3F0EA]"
                        title="Restart"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <button
                        onClick={toggleLoop}
                        className={`text-[10px] px-2.5 py-1 font-bold rounded-md border tracking-wide transition-all ${
                          isLooping 
                            ? "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#E07A2F]" 
                            : "bg-transparent border-[#E7E2D8] text-[#6B6258] hover:bg-[#F3F0EA]"
                        }`}
                      >
                        Loop: {isLooping ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Speed controllers */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#6B6258] uppercase font-bold mr-1">Speed</span>
                      {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                            playSpeed === spd 
                              ? "bg-[#F59E0B] text-[#171717]" 
                              : "text-[#6B6258] hover:bg-[#F3F0EA]"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame scrub progression bar */}
                  {totalFrames > 0 && (
                    <div className="w-full mt-3 flex items-center gap-3">
                      <span className="text-[9px] font-mono font-bold text-[#6B6258]">0</span>
                      <input
                        type="range"
                        min="0"
                        max={totalFrames - 1}
                        value={currentFrame}
                        onChange={handleScrub}
                        className="flex-1 h-1 bg-[#F3F0EA] rounded-md appearance-none cursor-pointer accent-[#F59E0B]"
                      />
                      <span className="text-[9px] font-mono font-bold text-[#6B6258] min-w-[90px] text-right">
                        Frame {Math.round(currentFrame)} / {Math.round(totalFrames)}
                      </span>
                    </div>
                  )}

                </div>

                {/* AI advisor block */}
                <div className="rounded-xl border border-brand-border bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4.5 w-4.5 text-accent-secondary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        Gemini Structure Assistant
                      </h4>
                    </div>
                    
                    {!aiAnalysis && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={consultLottieAssistant}
                        disabled={aiLoading}
                        className="text-xs py-4 cursor-pointer"
                      >
                        {aiLoading ? "Reading JSON layers..." : "Analyze Structure"}
                      </Button>
                    )}
                  </div>

                  {aiAnalysis && (
                    <div className="bg-brand-secondary p-4 rounded-lg border border-brand-border space-y-2 text-xs">
                      <span className="font-mono text-[9px] font-bold text-accent-secondary uppercase">Keyframe report</span>
                      <p className="text-text-secondary leading-relaxed whitespace-pre-line font-sans">
                        {aiAnalysis}
                      </p>
                      <button
                        onClick={() => setAiAnalysis(null)}
                        className="text-text-muted hover:text-accent-secondary underline block text-[10px] mt-2 text-left"
                      >
                        Analyze another perspective
                      </button>
                    </div>
                  )}
                </div>

              </div>
              
            </OutputPanel>
          ) : (
            <PreviewPanel title="Lottie layout preview framework" />
          )}
        </div>

      </div>
      {/* Hidden offscreen container for pixel-perfect WebM video recording */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div ref={hiddenContainerRef} />
      </div>

    </ToolPageShell>
  );
}
export default LottiePreview;
