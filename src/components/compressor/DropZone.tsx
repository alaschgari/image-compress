"use client";

import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function DropZone({ onFilesSelected }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = (fileList: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
      }
    }
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  // Clipboard paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        onFilesSelected(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [onFilesSelected]);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group flex flex-col items-center justify-center w-full h-[400px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-out cursor-pointer overflow-hidden bg-card ${
        isDragging
          ? "border-primary bg-primary/5 scale-[0.99]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/*"
        multiple
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center p-6 text-center z-10 select-none">
        <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <p className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          Drag & drop your images here
        </p>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          or click to browse from your computer. You can also paste an image directly using <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs">Cmd+V</kbd>.
        </p>
        
        <div className="flex items-center gap-4 mt-4 bg-muted/50 border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            Supports JPG, PNG, WEBP
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-border" />
          <span>Batch mode enabled</span>
        </div>
      </div>

      {/* Modern gradient ambient light behind */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}
