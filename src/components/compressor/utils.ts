export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getCompressedFileName(originalName: string, mimeType: string) {
  const ext = mimeType.split("/")[1] || "jpg";
  return originalName.replace(/\.[^/.]+$/, "") + `_compressed.${ext}`;
}

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_BATCH_FILES = 50;

export interface CompressorSettings {
  quality: number;
  maxWidthOrHeight: number;
  outputFormat: string;
}

const DEFAULT_SETTINGS: CompressorSettings = {
  quality: 0.8,
  maxWidthOrHeight: 1920,
  outputFormat: "original",
};

const SETTINGS_STORAGE_KEY = "image-compress:settings";

export function loadSettings(): CompressorSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      quality: typeof parsed.quality === "number" ? parsed.quality : DEFAULT_SETTINGS.quality,
      maxWidthOrHeight:
        typeof parsed.maxWidthOrHeight === "number"
          ? parsed.maxWidthOrHeight
          : DEFAULT_SETTINGS.maxWidthOrHeight,
      outputFormat:
        typeof parsed.outputFormat === "string" ? parsed.outputFormat : DEFAULT_SETTINGS.outputFormat,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: CompressorSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (e.g. private browsing) — settings just won't persist.
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
