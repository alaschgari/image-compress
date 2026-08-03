"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { RefreshCw, Download, Plus } from "lucide-react";

import { DropZone } from "./compressor/DropZone";
import { CompareSlider } from "./compressor/CompareSlider";
import { SettingsPanel } from "./compressor/SettingsPanel";
import { BatchList, type BatchItem } from "./compressor/BatchList";
import {
  getCompressedFileName,
  MAX_FILE_SIZE_BYTES,
  MAX_BATCH_FILES,
  loadSettings,
  saveSettings,
  isAbortError,
} from "./compressor/utils";

interface QueueItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedFile: File | null;
  compressedSize: number | null;
  progress: number;
  status: "idle" | "compressing" | "completed" | "error" | "cancelled";
  errorMessage: string | null;
  originalUrl: string;
  compressedUrl: string | null;
}

export function Compressor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState(() => loadSettings().quality);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(() => loadSettings().maxWidthOrHeight);
  const [outputFormat, setOutputFormat] = useState<string>(() => loadSettings().outputFormat);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueItem[]>([]);
  // Bumped whenever settings change; in-flight compressions check this before
  // committing their result so stale (pre-settings-change) results are discarded.
  const settingsGenerationRef = useRef(0);
  const activeCompressionsRef = useRef<Set<string>>(new Set());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Persist settings whenever they change.
  useEffect(() => {
    saveSettings({ quality, maxWidthOrHeight, outputFormat });
  }, [quality, maxWidthOrHeight, outputFormat]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      });
    };
  }, []);

  // Handle files selected from DropZone or File Input
  const handleFilesSelected = (files: File[]) => {
    const currentCount = queueRef.current.length;
    const availableSlots = Math.max(0, MAX_BATCH_FILES - currentCount);

    const tooLarge = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    const withinSize = files.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
    const accepted = withinSize.slice(0, availableSlots);
    const droppedForLimit = withinSize.length - accepted.length;

    if (tooLarge.length > 0 || droppedForLimit > 0) {
      const parts: string[] = [];
      if (tooLarge.length > 0) {
        parts.push(`${tooLarge.length} file(s) exceed the 50MB limit`);
      }
      if (droppedForLimit > 0) {
        parts.push(`${droppedForLimit} file(s) skipped (max ${MAX_BATCH_FILES} per batch)`);
      }
      setRejectionNotice(parts.join(" · "));
    } else {
      setRejectionNotice(null);
    }

    if (accepted.length === 0) return;

    const newItems: QueueItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      originalSize: file.size,
      compressedFile: null,
      compressedSize: null,
      progress: 0,
      status: "idle",
      errorMessage: null,
      originalUrl: URL.createObjectURL(file),
      compressedUrl: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  // Re-trigger compression for the entire queue when settings change
  const prevSettingsRef = useRef({ quality, maxWidthOrHeight, outputFormat });
  useEffect(() => {
    const prev = prevSettingsRef.current;
    const settingsChanged =
      prev.quality !== quality ||
      prev.maxWidthOrHeight !== maxWidthOrHeight ||
      prev.outputFormat !== outputFormat;

    if (settingsChanged) {
      // Invalidate any in-flight compressions from before this change.
      settingsGenerationRef.current += 1;

      setQueue((prevQueue) =>
        prevQueue.map((item) => {
          if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
          return {
            ...item,
            status: "idle" as const,
            progress: 0,
            compressedFile: null,
            compressedSize: null,
            compressedUrl: null,
            errorMessage: null,
          };
        })
      );
    }

    prevSettingsRef.current = { quality, maxWidthOrHeight, outputFormat };
  }, [quality, maxWidthOrHeight, outputFormat]);

  // Process a single queue item
  const processItem = useCallback(
    async (item: QueueItem, generation: number) => {
      activeCompressionsRef.current.add(item.id);
      const controller = new AbortController();
      abortControllersRef.current.set(item.id, controller);

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "compressing", progress: 0 } : q))
      );

      try {
        const options = {
          maxWidthOrHeight,
          useWebWorker: true,
          initialQuality: quality,
          alwaysKeepResolution: false,
          fileType: outputFormat === "original" ? undefined : outputFormat,
          signal: controller.signal,
          onProgress: (percent: number) => {
            if (settingsGenerationRef.current !== generation) return;
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          },
        };

        const compressed = await imageCompression(item.file, options);

        // Settings changed while this was compressing — discard the stale result.
        if (settingsGenerationRef.current !== generation) return;

        const compressedUrl = URL.createObjectURL(compressed);
        setQueue((prev) =>
          prev.map((q) => {
            if (q.id === item.id) {
              if (q.compressedUrl) URL.revokeObjectURL(q.compressedUrl);
              return {
                ...q,
                status: "completed",
                compressedFile: compressed,
                compressedSize: compressed.size,
                compressedUrl,
                progress: 100,
              };
            }
            return q;
          })
        );
      } catch (error) {
        if (settingsGenerationRef.current !== generation) return;
        if (isAbortError(error)) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "cancelled", progress: 0, errorMessage: null } : q
            )
          );
          return;
        }
        console.error("Compression error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "error", errorMessage: message } : q))
        );
      } finally {
        activeCompressionsRef.current.delete(item.id);
        abortControllersRef.current.delete(item.id);
      }
    },
    [maxWidthOrHeight, quality, outputFormat]
  );

  // Cancel an in-flight compression
  const handleCancel = (id: string) => {
    abortControllersRef.current.get(id)?.abort();
  };

  // Retry a failed or cancelled item
  const handleRetry = (id: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status: "idle", progress: 0, errorMessage: null } : q
      )
    );
  };

  // Kick off compression for idle items sequentially (one at a time)
  useEffect(() => {
    if (activeCompressionsRef.current.size > 0) return;
    const nextItem = queue.find((item) => item.status === "idle");
    if (!nextItem) return;
    processItem(nextItem, settingsGenerationRef.current);
  }, [queue, processItem]);

  // Download a single item
  const handleDownload = (id: string) => {
    const item = queue.find((item) => item.id === id);
    if (item && item.compressedUrl && item.compressedFile) {
      const link = document.createElement("a");
      link.href = item.compressedUrl;
      link.download = getCompressedFileName(item.name, item.compressedFile.type);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Remove individual item from the queue
  const handleRemove = (id: string) => {
    const itemToRemove = queue.find((item) => item.id === id);
    if (itemToRemove) {
      if (itemToRemove.originalUrl) URL.revokeObjectURL(itemToRemove.originalUrl);
      if (itemToRemove.compressedUrl) URL.revokeObjectURL(itemToRemove.compressedUrl);
    }
    abortControllersRef.current.get(id)?.abort();
    abortControllersRef.current.delete(id);
    setQueue((prev) => prev.filter((item) => item.id !== id));
    activeCompressionsRef.current.delete(id);
  };

  // Clear entire queue (reset to DropZone)
  const handleClearAll = () => {
    queue.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    setQueue([]);
    activeCompressionsRef.current.clear();
    settingsGenerationRef.current += 1;
    setRejectionNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Batch Download as single ZIP file
  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      queue.forEach((item) => {
        if (item.compressedFile) {
          const name = getCompressedFileName(item.name, item.compressedFile.type);
          zip.file(name, item.compressedFile);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);

      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = "squeezed_images.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error("ZIP creation failed:", error);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Open file picker in Batch mode to add more images
  const triggerAddImages = () => {
    fileInputRef.current?.click();
  };

  const handleAddFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type.startsWith("image/")) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        handleFilesSelected(validFiles);
      }
    }
  };

  // Convert queue state to format needed by BatchList
  const batchListItems: BatchItem[] = queue.map((item) => ({
    id: item.id,
    name: item.name,
    originalSize: item.originalSize,
    compressedSize: item.compressedSize,
    progress: item.progress,
    status: item.status,
    errorMessage: item.errorMessage,
    compressedUrl: item.compressedUrl,
  }));

  const isQueueActive = queue.some((item) => item.status === "compressing" || item.status === "idle");

  return (
    <div className="w-full flex flex-col gap-6">
      {rejectionNotice && (
        <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-500">
          {rejectionNotice}
        </div>
      )}
      {queue.length === 0 ? (
        <DropZone onFilesSelected={handleFilesSelected} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Hidden input for adding more files in batch mode */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAddFileInput}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* Left Column: Workspaces (Slider or Queue List) */}
          <div className="flex-1 flex flex-col gap-4">
            {queue.length === 1 ? (
              // Single File View with visual split slider comparison
              <CompareSlider
                originalUrl={queue[0].originalUrl}
                compressedUrl={queue[0].compressedUrl || queue[0].originalUrl}
                originalSize={queue[0].originalSize}
                compressedSize={queue[0].compressedSize || queue[0].originalSize}
                isCompressing={queue[0].status === "compressing" || queue[0].status === "idle"}
                onCancel={() => handleCancel(queue[0].id)}
              />
            ) : (
              // Batch Mode View with queue list and global statistics
              <BatchList
                items={batchListItems}
                onDownload={handleDownload}
                onRemove={handleRemove}
                onDownloadAll={handleDownloadAll}
                isDownloadingAll={isDownloadingAll}
                onClearAll={handleClearAll}
                onCancel={handleCancel}
                onRetry={handleRetry}
              />
            )}
          </div>

          {/* Right Column: Settings and Action Buttons */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <SettingsPanel
              quality={quality}
              setQuality={setQuality}
              maxWidthOrHeight={maxWidthOrHeight}
              setMaxWidthOrHeight={setMaxWidthOrHeight}
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              disabled={isDownloadingAll}
            />

            {/* Global Actions */}
            <div className="flex flex-col gap-3 mt-auto">
              {queue.length === 1 ? (
                <>
                  <button
                    onClick={() => handleDownload(queue[0].id)}
                    disabled={queue[0].status !== "completed" || isQueueActive}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isQueueActive}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Compress Another
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={triggerAddImages}
                    disabled={isQueueActive || isDownloadingAll}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                  >
                    <Plus className="w-5 h-5" />
                    Add More Images
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isQueueActive || isDownloadingAll}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 text-red-500 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All & Reset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
