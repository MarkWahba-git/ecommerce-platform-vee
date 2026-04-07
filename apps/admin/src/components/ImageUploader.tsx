'use client';

import { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface PendingFile {
  /** Stable key for React reconciliation */
  key: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'confirming' | 'done' | 'error';
  error: string | null;
  /** Progress 0-100 (approximate; we use indeterminate until confirmed) */
  progress: number;
}

interface ImageUploaderProps {
  productId: string;
  initialImages?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedType(type: string): type is (typeof ALLOWED_TYPES)[number] {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageUploader({ productId, initialImages = [], onImagesChange }: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateImages(next: UploadedImage[]) {
    setImages(next);
    onImagesChange?.(next);
  }

  function updatePending(key: string, patch: Partial<PendingFile>) {
    setPending((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  // ── upload pipeline ──────────────────────────────────────────────────────

  async function uploadFile(entry: PendingFile) {
    const { file, key } = entry;

    try {
      // 1. Request presigned URL
      updatePending(key, { status: 'uploading', progress: 10 });
      const presignRes = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to request upload URL');
      }

      const { uploadUrl, fileKey } = (await presignRes.json()) as {
        uploadUrl: string;
        fileKey: string;
        expiresIn: number;
      };

      // 2. PUT the file directly to S3
      updatePending(key, { progress: 40 });
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error(`S3 upload failed (${s3Res.status})`);
      }

      // 3. Confirm upload → create DB record
      updatePending(key, { status: 'confirming', progress: 80 });
      const confirmRes = await fetch(`/api/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to confirm upload');
      }

      const newImage = (await confirmRes.json()) as UploadedImage;

      updatePending(key, { status: 'done', progress: 100 });

      // Add to images list and clean up preview
      updateImages([...images, newImage]);

      // Remove this entry from pending after a short delay so the user can see "done"
      setTimeout(() => {
        setPending((prev) => {
          const entry = prev.find((p) => p.key === key);
          if (entry) URL.revokeObjectURL(entry.previewUrl);
          return prev.filter((p) => p.key !== key);
        });
      }, 800);
    } catch (err) {
      updatePending(key, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  // ── file selection ───────────────────────────────────────────────────────

  function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const newEntries: PendingFile[] = [];

    for (const file of fileArray) {
      if (!isAllowedType(file.type)) {
        // Still add to pending to show the error
        const key = `${file.name}-${Date.now()}-${Math.random()}`;
        newEntries.push({
          key,
          file,
          previewUrl: '',
          status: 'error',
          error: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP or GIF.`,
          progress: 0,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        const key = `${file.name}-${Date.now()}-${Math.random()}`;
        newEntries.push({
          key,
          file,
          previewUrl: '',
          status: 'error',
          error: `File exceeds 10 MB limit (${formatBytes(file.size)}).`,
          progress: 0,
        });
        continue;
      }

      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      newEntries.push({
        key,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
        error: null,
        progress: 0,
      });
    }

    setPending((prev) => [...prev, ...newEntries]);

    // Kick off uploads for valid entries
    for (const entry of newEntries) {
      if (entry.status === 'idle') {
        uploadFile(entry);
      }
    }
  }

  // ── drag & drop ──────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productId, images],
  );

  // ── image actions ─────────────────────────────────────────────────────────

  async function handleSetPrimary(imageId: string) {
    // Optimistic update
    updateImages(images.map((img) => ({ ...img, isPrimary: img.id === imageId })));

    try {
      const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) throw new Error('Failed to set primary image');
    } catch {
      // Revert on error
      updateImages(images);
    }
  }

  async function handleDelete(imageId: string) {
    // Optimistic update
    const prev = images;
    updateImages(images.filter((img) => img.id !== imageId));

    try {
      const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete image');
    } catch {
      // Revert on error
      updateImages(prev);
    }
  }

  // ── reorder (simple swap via drag) not implemented — handled by parent ────

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Existing images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((img) => (
              <div
                key={img.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText ?? ''}
                  className="h-full w-full object-cover"
                />

                {img.isPrimary && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Primary
                  </span>
                )}

                {img.altText && !img.isPrimary && (
                  <span className="absolute left-1.5 top-1.5 max-w-[80%] truncate rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {img.altText}
                  </span>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {!img.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img.id)}
                      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Pending uploads */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((entry) => (
            <div
              key={entry.key}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2"
            >
              {entry.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.previewUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-gray-200" />
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs font-medium text-gray-800">{entry.file.name}</p>
                <p className="text-[10px] text-gray-500">{formatBytes(entry.file.size)}</p>

                {entry.status === 'error' ? (
                  <p className="text-[10px] text-red-600">{entry.error}</p>
                ) : entry.status === 'done' ? (
                  <p className="text-[10px] text-green-600">Uploaded</p>
                ) : (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {(entry.status === 'error' || entry.status === 'done') && (
                <button
                  type="button"
                  onClick={() => {
                    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
                    setPending((prev) => prev.filter((p) => p.key !== entry.key));
                  }}
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                  aria-label="Dismiss"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
        }`}
      >
        <svg
          className="mx-auto h-8 w-8 text-gray-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
        </p>
        <p className="mt-0.5 text-xs text-gray-400">JPEG, PNG, WebP, GIF — max 10 MB each</p>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              // Reset input so the same file can be re-selected
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}
