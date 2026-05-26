"use client";

import React from "react";
import { Settings, Sliders, Minimize, Image as ImageIcon } from "lucide-react";

interface SettingsPanelProps {
  quality: number;
  setQuality: (quality: number) => void;
  maxWidthOrHeight: number;
  setMaxWidthOrHeight: (maxWidth: number) => void;
  outputFormat: string;
  setOutputFormat: (format: string) => void;
  disabled?: boolean;
}

export function SettingsPanel({
  quality,
  setQuality,
  maxWidthOrHeight,
  setMaxWidthOrHeight,
  outputFormat,
  setOutputFormat,
  disabled = false,
}: SettingsPanelProps) {
  return (
    <div className={`border border-border rounded-xl bg-card p-5 solid-shadow flex flex-col gap-6 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Settings</h3>
      </div>

      <div className="flex flex-col gap-6">
        {/* Quality Slider */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              Quality
            </label>
            <span className="text-sm font-mono font-semibold text-primary">
              {Math.round(quality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>High Compression</span>
            <span>Maximum Quality</span>
          </div>
        </div>

        {/* Max Resolution Slider */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Minimize className="w-3.5 h-3.5 text-muted-foreground" />
              Max Resolution
            </label>
            <span className="text-sm font-mono font-semibold text-primary">
              {maxWidthOrHeight}px
            </span>
          </div>
          <input
            type="range"
            min="640"
            max="3840"
            step="80"
            value={maxWidthOrHeight}
            onChange={(e) => setMaxWidthOrHeight(parseInt(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Web (640px)</span>
            <span>4K UHD (3840px)</span>
          </div>
        </div>

        {/* Output Format Selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
            Output Format
          </label>
          <div className="relative">
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <option value="original">Original Format</option>
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/png">PNG (.png)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
