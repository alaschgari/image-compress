"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoveHorizontal, Sparkles } from "lucide-react";
import { formatBytes } from "./utils"; // we will create a utility file or just define it here. Let's define it inside compare slider too, or import.

interface CompareSliderProps {
  originalUrl: string;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
  isCompressing: boolean;
}

export function CompareSlider({
  originalUrl,
  compressedUrl,
  originalSize,
  compressedSize,
  isCompressing,
}: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [isDragging, setIsDragging] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  const [compressedDimensions, setCompressedDimensions] = useState<{ w: number; h: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load dimensions
  useEffect(() => {
    if (originalUrl) {
      const img = new Image();
      img.onload = () => setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = originalUrl;
    }
  }, [originalUrl]);

  useEffect(() => {
    if (compressedUrl) {
      const img = new Image();
      img.onload = () => setCompressedDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = compressedUrl;
    }
  }, [compressedUrl]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const savings = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Slider Viewport Container */}
      <div 
        ref={containerRef}
        className="relative aspect-video w-full rounded-xl border border-border bg-muted/20 overflow-hidden select-none cursor-ew-resize group"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
          }
        }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Underlay: Compressed Image (Right side) */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={compressedUrl} 
            alt="Compressed" 
            className="w-full h-full object-contain pointer-events-none" 
            draggable={false}
          />
        </div>

        {/* Overlay: Original Image (Left side, clipped) */}
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={originalUrl} 
            alt="Original" 
            className="w-full h-full object-contain pointer-events-none" 
            draggable={false}
          />
        </div>

        {/* Labels overlay */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-xs font-semibold text-white pointer-events-none transition-opacity group-hover:opacity-100 opacity-80">
          Original {originalDimensions && `(${originalDimensions.w}×${originalDimensions.h})`}
        </div>
        <div className="absolute top-3 right-3 bg-primary/80 backdrop-blur-md border border-primary/20 px-2.5 py-1 rounded text-xs font-semibold text-white pointer-events-none transition-opacity group-hover:opacity-100 opacity-80 flex items-center gap-1">
          Compressed {compressedDimensions && `(${compressedDimensions.w}×${compressedDimensions.h})`}
          {savings > 0 && <span className="bg-green-500 text-white text-[10px] px-1 rounded ml-1">-{savings}%</span>}
        </div>

        {/* Slider Divider Line */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-primary cursor-ew-resize flex items-center justify-center z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute w-8 h-8 rounded-full bg-primary border-2 border-white/20 shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all">
            <MoveHorizontal className="w-4 h-4" />
          </div>
        </div>

        {/* Compress Spinner Overlay */}
        {isCompressing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">Compressing image...</p>
          </div>
        )}
      </div>

      {/* Info Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-sm">
        <div className="bg-card border border-border p-3 rounded-lg flex flex-col">
          <span className="text-xs text-muted-foreground">Original File Size</span>
          <span className="font-mono font-semibold mt-1">{formatBytes(originalSize)}</span>
        </div>
        <div className="bg-card border border-border p-3 rounded-lg flex flex-col">
          <span className="text-xs text-muted-foreground">Compressed File Size</span>
          <span className="font-mono font-semibold mt-1 text-primary">
            {isCompressing ? "Calculating..." : formatBytes(compressedSize)}
          </span>
        </div>
        <div className="bg-card border border-border p-3 rounded-lg flex flex-col col-span-2 md:col-span-1 justify-center">
          <span className="text-xs text-muted-foreground">Disk Space Saved</span>
          <span className="font-semibold mt-1 text-green-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            {isCompressing ? "..." : `${savings}% smaller`}
          </span>
        </div>
      </div>
    </div>
  );
}
