import React, { useState, useRef } from "react";
import { Button } from "../ui/button";
import { FolderUp, HelpCircle, FileCheck2, AlertCircle } from "lucide-react";
import { formatBytes } from "@/src/lib/utils";

interface UploadDropZoneProps {
  acceptedExtensions: string[];
  maxSizeMB?: number;
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  title: string;
  subtitle: string;
  multiple?: boolean;
}

export function UploadDropZone({
  acceptedExtensions,
  maxSizeMB = 50,
  onFileSelected,
  onFilesSelected,
  title,
  subtitle,
  multiple = false,
}: UploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateFile = (file: File) => {
    setErrorMessage(null);

    // 1. Verify Extension
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isAccepted = acceptedExtensions.some((ext) => {
      // support matching e.g. .jpg to .jpeg or .json
      if (ext === ".jpg" && fileExt === ".jpeg") return true;
      if (ext === ".jpeg" && fileExt === ".jpg") return true;
      return ext.toLowerCase() === fileExt;
    });

    if (!isAccepted) {
      setErrorMessage(`Invalid file format. Supported types: ${acceptedExtensions.join(", ")}`);
      return false;
    }

    // 2. Verify Size
    const maxByteSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxByteSize) {
      setErrorMessage(`File exceeds the ${maxSizeMB}MB maximum limit.`);
      return false;
    }

    return true;
  };

  const validateAndProcessFiles = (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    if (!multiple) {
      if (validateFile(selectedFiles[0])) onFileSelected(selectedFiles[0]);
      return;
    }

    const validFiles = selectedFiles.filter(validateFile);
    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles);
      if (!onFilesSelected) onFileSelected(validFiles[0]);
    }
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
      e.currentTarget.value = "";
    }
  };

  const triggerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerClick}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? "border-accent-primary bg-accent-bg/10"
            : errorMessage
            ? "border-red-400 bg-red-50/20"
            : "border-brand-border bg-brand-secondary hover:bg-brand-soft/40 hover:border-accent-primary"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedExtensions.join(",")}
          multiple={multiple}
          onChange={handleFileChange}
        />

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-bg text-accent-secondary mb-4 group-hover:scale-105 transition-transform duration-300 shadow-xs">
          <FolderUp className="h-5.5 w-5.5" />
        </div>

        <h4 className="text-sm font-bold text-text-primary mb-1">
          {title}
        </h4>
        <p className="text-xs text-text-secondary leading-relaxed max-w-sm mb-3.5">
          {subtitle}
        </p>

        <Button variant="secondary" size="sm" type="button" className="pointer-events-none text-xs h-9">
          Choose file
        </Button>
      </div>

      {/* Validation Warning Callout */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
          <div className="min-w-0">
            <span className="font-semibold block">Incompatible asset parameters</span>
            <span className="text-[11px] leading-relaxed block mt-0.5">{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
export default UploadDropZone;
