"use client";

import React, { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import { UploadCloud, Settings, Download, RefreshCw, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function Compressor() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Settings
  const [quality, setQuality] = useState(0.8);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File, targetQuality: number, targetSize: number) => {
    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: file.size / (1024 * 1024), 
        maxWidthOrHeight: targetSize,
        useWebWorker: true,
        initialQuality: targetQuality,
        alwaysKeepResolution: true,
      };
      
      const compressed = await imageCompression(file, options);
      setCompressedFile(compressed);
      setCompressedUrl(URL.createObjectURL(compressed));
    } catch (error) {
      console.error("Compression error:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const processFile = async (file: File) => {
    setOriginalFile(file);
    const objUrl = URL.createObjectURL(file);
    setOriginalUrl(objUrl);
    await compressImage(file, quality, maxWidthOrHeight);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processFile(file);
      }
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
      processFile(e.target.files[0]);
    }
  };

  // Re-compress when settings change
  useEffect(() => {
    if (originalFile) {
      const timer = setTimeout(() => {
        compressImage(originalFile, quality, maxWidthOrHeight);
      }, 500); // Debounce
      return () => clearTimeout(timer);
    }
  }, [quality, maxWidthOrHeight, originalFile]);

  const reset = () => {
    setOriginalFile(null);
    setCompressedFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setOriginalUrl(null);
    setCompressedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadCompressed = () => {
    if (compressedUrl && compressedFile) {
      const link = document.createElement("a");
      link.href = compressedUrl;
      const fileName = originalFile?.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {!originalFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "relative group flex flex-col items-center justify-center w-full h-[400px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-out cursor-pointer overflow-hidden bg-card",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <p className="mb-2 text-xl font-semibold">Drop your image here</p>
              <p className="text-sm text-muted-foreground">or click to browse from your computer</p>
              <p className="text-xs text-muted-foreground mt-6 uppercase tracking-wider font-semibold">Supports JPG, PNG, WEBP</p>
            </div>
            {/* Subtle glow effect behind */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-6 w-full"
          >
            {/* Left Column: Previews */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden solid-shadow">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Original</span>
                    </div>
                    <span className="text-sm font-mono bg-background px-2 py-1 rounded-md border border-border">
                      {formatBytes(originalFile.size)}
                    </span>
                  </div>
                  <div className="relative aspect-square md:aspect-[4/3] bg-muted/10 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {originalUrl && <img src={originalUrl} alt="Original" className="object-contain w-full h-full" />}
                  </div>
                </div>

                {/* Compressed */}
                <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden solid-shadow">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2">
                      {isCompressing ? (
                        <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm font-medium">Compressed</span>
                    </div>
                    {compressedFile && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md">
                          -{Math.round((1 - compressedFile.size / originalFile.size) * 100)}%
                        </span>
                        <span className="text-sm font-mono bg-background px-2 py-1 rounded-md border border-border">
                          {formatBytes(compressedFile.size)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative aspect-square md:aspect-[4/3] bg-muted/10 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {compressedUrl && <img src={compressedUrl} alt="Compressed" className="object-contain w-full h-full" />}
                    {isCompressing && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Controls */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
              <div className="border border-border rounded-xl bg-card p-5 solid-shadow">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Compression Settings</h3>
                </div>
                
                <div className="flex flex-col gap-6">
                  {/* Quality Slider */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Quality</label>
                      <span className="text-sm font-mono">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Smaller File</span>
                      <span>Better Quality</span>
                    </div>
                  </div>

                  {/* Max Resolution Slider */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Max Resolution</label>
                      <span className="text-sm font-mono">{maxWidthOrHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="800"
                      max="3840"
                      step="100"
                      value={maxWidthOrHeight}
                      onChange={(e) => setMaxWidthOrHeight(parseInt(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-auto">
                <button
                  onClick={downloadCompressed}
                  disabled={!compressedFile || isCompressing}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors solid-shadow-hover"
                >
                  <RefreshCw className="w-5 h-5" />
                  Compress Another
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
