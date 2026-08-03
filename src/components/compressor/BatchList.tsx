"use client";

import React from "react";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ArrowDownToLine,
  Zap,
  XCircle,
  RotateCcw,
  Ban,
} from "lucide-react";
import { formatBytes } from "./utils";

export interface BatchItem {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number | null;
  progress: number;
  status: "idle" | "compressing" | "completed" | "error" | "cancelled";
  errorMessage?: string | null;
  compressedUrl: string | null;
}

interface BatchListProps {
  items: BatchItem[];
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onDownloadAll: () => void;
  isDownloadingAll: boolean;
  onClearAll: () => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export function BatchList({
  items,
  onDownload,
  onRemove,
  onDownloadAll,
  isDownloadingAll,
  onClearAll,
  onCancel,
  onRetry,
}: BatchListProps) {
  // Statistics calculations
  const totalOriginal = items.reduce((sum, item) => sum + item.originalSize, 0);
  const totalCompressed = items.reduce((sum, item) => sum + (item.compressedSize || item.originalSize), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const totalSavingsPct = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  const completedCount = items.filter(item => item.status === "completed").length;
  const isAllCompleted = completedCount === items.length && items.length > 0;
  const isAnyProcessing = items.some(item => item.status === "compressing");

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Overview Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border p-4 rounded-xl solid-shadow">
        <div className="flex flex-col p-2">
          <span className="text-xs text-muted-foreground">Total Files</span>
          <span className="text-xl font-bold font-mono mt-1 text-foreground">
            {completedCount} / {items.length}
          </span>
        </div>
        <div className="flex flex-col p-2">
          <span className="text-xs text-muted-foreground">Original Total</span>
          <span className="text-xl font-bold font-mono mt-1 text-foreground">
            {formatBytes(totalOriginal)}
          </span>
        </div>
        <div className="flex flex-col p-2">
          <span className="text-xs text-muted-foreground">Compressed Total</span>
          <span className="text-xl font-bold font-mono mt-1 text-primary">
            {formatBytes(totalCompressed)}
          </span>
        </div>
        <div className="flex flex-col p-2">
          <span className="text-xs text-muted-foreground">Total Savings</span>
          <span className="text-xl font-bold font-mono mt-1 text-green-500 flex items-center gap-1">
            <Zap className="w-4 h-4 text-green-500 fill-green-500/20" />
            {totalSavingsPct}%
          </span>
        </div>
      </div>

      {/* Action Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Compression Queue
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            disabled={isAnyProcessing || items.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground text-xs font-semibold rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Queue
          </button>
          <button
            onClick={onDownloadAll}
            disabled={!isAllCompleted || isDownloadingAll}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors solid-shadow-hover"
          >
            {isDownloadingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowDownToLine className="w-3.5 h-3.5" />
            )}
            Download All (ZIP)
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border max-h-[380px] overflow-y-auto custom-scrollbar solid-shadow">
        {items.map((item) => {
          const savingsPct = item.compressedSize && item.originalSize > 0
            ? Math.round((1 - item.compressedSize / item.originalSize) * 100)
            : 0;

          return (
            <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card hover:bg-muted/10 transition-colors">
              {/* Left Side: Name and Progress Info */}
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate" title={item.name}>
                  {item.name}
                </span>

                {/* Progress bar or stats */}
                <div className="mt-2 flex items-center gap-3">
                  {item.status === "compressing" ? (
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                        {item.progress}%
                      </span>
                    </div>
                  ) : item.status === "completed" && item.compressedSize ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{formatBytes(item.originalSize)}</span>
                      <span>→</span>
                      <span className="text-foreground font-semibold">{formatBytes(item.compressedSize)}</span>
                      <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-bold">
                        -{savingsPct}%
                      </span>
                    </div>
                  ) : item.status === "error" ? (
                    <span
                      className="text-xs text-red-500 flex items-center gap-1"
                      title={item.errorMessage || "Compression failed"}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.errorMessage || "Compression failed"}
                    </span>
                  ) : item.status === "cancelled" ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" />
                      Cancelled
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Queued</span>
                  )}
                </div>
              </div>

              {/* Right Side: Status and Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {item.status === "completed" && (
                    <span className="text-green-500 flex items-center gap-1 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      Done
                    </span>
                  )}
                  {item.status === "compressing" && (
                    <span className="text-primary flex items-center gap-1 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Squeezing...
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {item.status === "compressing" && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      title="Cancel compression"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(item.status === "error" || item.status === "cancelled") && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      title="Retry compression"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDownload(item.id)}
                    disabled={item.status !== "completed"}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Download individual file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    disabled={item.status === "compressing"}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Remove from queue"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
