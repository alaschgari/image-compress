"use client";

import React, { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { RefreshCw, Download, Plus } from "lucide-react";

import { DropZone } from "./compressor/DropZone";
import { CompareSlider } from "./compressor/CompareSlider";
import { SettingsPanel } from "./compressor/SettingsPanel";
import { BatchList, type BatchItem } from "./compressor/BatchList";

interface QueueItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedFile: File | null;
  compressedSize: number | null;
  progress: number;
  status: "idle" | "compressing" | "completed" | "error";
  originalUrl: string;
  compressedUrl: string | null;
}

export function Compressor() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [maxWidthOrHeight, setMaxWidthOrHeight] = useState(1920);
  const [outputFormat, setOutputFormat] = useState<string>("original");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const compressingIdRef = useRef<string | null>(null);
  const prevSettingsRef = useRef({ quality, maxWidthOrHeight, outputFormat });
  const queueRef = useRef<QueueItem[]>([]);

  // Update queueRef inside useEffect to satisfy ESLint
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
    const newItems: QueueItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      compressedFile: null,
      compressedSize: null,
      progress: 0,
      status: "idle",
      originalUrl: URL.createObjectURL(file),
      compressedUrl: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  // Re-trigger compression for the entire queue when settings change
  useEffect(() => {
    const prev = prevSettingsRef.current;
    const settingsChanged =
      prev.quality !== quality ||
      prev.maxWidthOrHeight !== maxWidthOrHeight ||
      prev.outputFormat !== outputFormat;

    if (settingsChanged && queue.length > 0) {
      setQueue((prevQueue) =>
        prevQueue.map((item) => {
          if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
          return {
            ...item,
            status: "idle",
            progress: 0,
            compressedFile: null,
            compressedSize: null,
            compressedUrl: null,
          };
        })
      );
      // Reset our active compression lock
      compressingIdRef.current = null;
    }

    prevSettingsRef.current = { quality, maxWidthOrHeight, outputFormat };
  }, [quality, maxWidthOrHeight, outputFormat, queue.length]);

  // Queue Processing Loop (runs sequentially)
  useEffect(() => {
    const processQueue = async () => {
      // Find the next idle item
      const nextItem = queue.find((item) => item.status === "idle");
      if (!nextItem || compressingIdRef.current === nextItem.id) return;

      // Lock current processing
      compressingIdRef.current = nextItem.id;

      // Mark as compressing
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: "compressing", progress: 0 }
            : item
        )
      );

      try {
        const options = {
          maxSizeMB: nextItem.file.size / (1024 * 1024),
          maxWidthOrHeight,
          useWebWorker: true,
          initialQuality: quality,
          alwaysKeepResolution: false, // Allows resolution scaling!
          fileType: outputFormat === "original" ? undefined : outputFormat,
          onProgress: (percent: number) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === nextItem.id ? { ...item, progress: percent } : item
              )
            );
          },
        };

        const compressed = await imageCompression(nextItem.file, options);
        const compressedUrl = URL.createObjectURL(compressed);

        setQueue((prev) =>
          prev.map((item) => {
            if (item.id === nextItem.id) {
              if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
              return {
                ...item,
                status: "completed",
                compressedFile: compressed,
                compressedSize: compressed.size,
                compressedUrl,
                progress: 100,
              };
            }
            return item;
          })
        );
      } catch (error) {
        console.error("Compression error:", error);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id ? { ...item, status: "error" } : item
          )
        );
      } finally {
        compressingIdRef.current = null;
      }
    };

    processQueue();
  }, [queue, quality, maxWidthOrHeight, outputFormat]);

  // Download a single item
  const handleDownload = (id: string) => {
    const item = queue.find((item) => item.id === id);
    if (item && item.compressedUrl && item.compressedFile) {
      const link = document.createElement("a");
      link.href = item.compressedUrl;
      const ext = item.compressedFile.type.split("/")[1] || "jpg";
      const fileName = item.name.replace(/\.[^/.]+$/, "") + `_compressed.${ext}`;
      link.download = fileName;
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
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (compressingIdRef.current === id) {
      compressingIdRef.current = null;
    }
  };

  // Clear entire queue (reset to DropZone)
  const handleClearAll = () => {
    queue.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    setQueue([]);
    compressingIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Batch Download as single ZIP file
  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      queue.forEach((item) => {
        if (item.compressedFile) {
          const ext = item.compressedFile.type.split("/")[1] || "jpg";
          const name = item.name.replace(/\.[^/.]+$/, "") + `_compressed.${ext}`;
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
    compressedUrl: item.compressedUrl,
  }));

  const isCompressingAny = queue.some((item) => item.status === "compressing" || item.status === "idle");

  return (
    <div className="w-full flex flex-col gap-6">
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
                    disabled={queue[0].status !== "completed" || isCompressingAny}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isCompressingAny}
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
                    disabled={isCompressingAny || isDownloadingAll}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed solid-shadow-hover"
                  >
                    <Plus className="w-5 h-5" />
                    Add More Images
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isCompressingAny || isDownloadingAll}
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
