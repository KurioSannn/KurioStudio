import React, { useState, useRef } from "react";
import { useRoute } from "@/src/context/RouteContext";
import { detectFileType } from "@/src/lib/tools/file-detector";
import { formatBytes } from "@/src/lib/utils";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { FileUp, FileText, Image, Code2, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
import { addToWorkspaceHistory } from "@/src/lib/workspace/history";
import { setPendingToolFile } from "@/src/lib/workspace/pending-file";

export function QuickDropZone() {
  const { navigate } = useRoute();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // File states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detection, setDetection] = useState<ReturnType<typeof detectFileType> | null>(null);
  const [status, setStatus] = useState<"idle" | "selected" | "error">("idle");

  const processSelectedFile = (file: File) => {
    if (!file) return;

    // Check size limit: 50MB (as specified in MAX_FILE_SIZE_MB env)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus("error");
      return;
    }

    setUploadedFile(file);
    const result = detectFileType(file.name, file.type);
    setDetection(result);
    setStatus("selected");

    // Pre-seed workspace history as a ready item. The selected file itself stays in memory only.
    addToWorkspaceHistory({
      toolId: result.recommendedToolId || "general",
      toolName: result.name,
      fileName: file.name,
      fileSize: file.size,
      outputType: result.extension,
      status: "idle",
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const resetDropZone = () => {
    setUploadedFile(null);
    setDetection(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openRecommendedTool = () => {
    if (!uploadedFile || !detection?.recommendedToolId) return;
    setPendingToolFile(uploadedFile, detection.recommendedToolId, detection.slug);
    navigate(detection.slug);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Card className="border border-brand-border bg-brand-surface shadow-xs shadow-amber-500/5 hover:border-brand-border duration-300">
        <CardContent className="p-8">
          
          {status === "idle" && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerUpload}
              className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#D8D1C7] bg-[#FAFAF7] p-8 md:p-12 text-center cursor-pointer transition-all duration-300 hover:border-[#F59E0B] hover:bg-white ${
                dragActive ? "bg-[#FFF3D6] border-[#F59E0B] scale-[1.01]" : ""
              }`}
              id="file-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <div className="w-16 h-16 bg-[#FFF3D6] rounded-2xl flex items-center justify-center text-[#F59E0B] group-hover:scale-105 transition-transform duration-300 mb-4">
                <FileUp className="h-8 w-8 text-[#F59E0B]" />
              </div>

              <div>
                <p className="text-xl font-bold text-[#171717] mb-1">Drop any file here</p>
                <p className="text-sm text-[#9A9187] max-w-md leading-relaxed mb-4">
                  Kurio will detect the file type and recommend the right tool from your local suite.
                </p>
              </div>
              
              <button 
                type="button" 
                className="mt-2 px-6 py-2.5 bg-white border border-[#E7E2D8] rounded-xl text-[#171717] font-medium hover:bg-[#F3F0EA] transition-all shadow-sm text-sm"
              >
                Browse Files
              </button>
            </div>
          )}

          {status === "selected" && uploadedFile && detection && (
            <div className="space-y-6">
              
              {/* File Info Block */}
              <div className="flex items-center gap-4 rounded-xl border border-brand-border bg-brand-secondary p-4.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-bg text-accent-secondary shrink-0">
                  {detection.category === "pdf" && <FileText className="h-5.5 w-5.5" />}
                  {detection.category === "image" && <Image className="h-5.5 w-5.5" />}
                  {detection.category !== "pdf" && detection.category !== "image" && <Code2 className="h-5.5 w-5.5" />}
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-text-primary truncate block">
                    {uploadedFile.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                    <span>{formatBytes(uploadedFile.size)}</span>
                    <span className="text-brand-border">&#8226;</span>
                    <span className="capitalize">{detection.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-brand-soft/60 px-2.5 py-1 rounded-md text-[11px] font-semibold text-text-primary">
                  <CheckCircle className="h-3.5 w-3.5 text-accent-secondary" />
                  Recognized
                </div>
              </div>

              {/* Tool Router Proposal Card */}
              <div className="rounded-xl border border-accent-primary/20 bg-accent-bg/20 p-5 space-y-4">
                <div>
                  <h5 className="text-xs font-semibold text-accent-secondary uppercase tracking-wider">
                    Recommended Action
                  </h5>
                  <p className="text-sm text-text-primary font-bold mt-1">
                    Process this {detection.extension.toUpperCase().replace(".", "")} file inside the{" "}
                    <span className="text-accent-secondary underline">{detection.name}</span> module.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {detection.recommendedToolId ? (
                    <Button
                      variant="primary"
                      onClick={openRecommendedTool}
                      className="cursor-pointer gap-2 font-bold"
                    >
                      Open recommended tool
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => navigate("/tools")}
                      className="cursor-pointer gap-2 font-bold"
                    >
                      Browse full directory
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="secondary" onClick={resetDropZone}>
                    Analyze another file
                  </Button>
                </div>
              </div>

            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-text-primary">File payload exceeds limits</h4>
                <p className="text-sm text-text-secondary mt-1">
                  The uploaded item exceeds our current max file size parameter (50 MB). Please pick a smaller file.
                </p>
              </div>
              <Button variant="secondary" onClick={resetDropZone}>
                Try again
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
export default QuickDropZone;
