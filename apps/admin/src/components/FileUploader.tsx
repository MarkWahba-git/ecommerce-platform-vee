'use client';

import { useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPreview: boolean;
  version: number;
  createdAt: string;
}

interface PendingFile {
  key: string;
  file: File;
  status: 'idle' | 'uploading' | 'confirming' | 'done' | 'error';
  error: string | null;
  progress: number;
}

interface FileUploaderProps {
  productId: string;
  initialFiles?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUploader({ productId, initialFiles = [], onFilesChange }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateFiles(next: UploadedFile[]) {
    setFiles(next);
    onFilesChange?.(next);
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
      const presignRes = await fetch(`/api/products/${productId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to request upload URL');
      }

      const { uploadUrl, fileKey } = (await presignRes.json()) as {
        uploadUrl: string;
        fileKey: string;
      };

      // 2. PUT the file directly to S3
      updatePending(key, { progress: 40 });
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error(`S3 upload failed (${s3Res.status})`);
      }

      // 3. Confirm upload → create DB record
      updatePending(key, { status: 'confirming', progress: 80 });
      const confirmRes = await fetch(`/api/products/${productId}/files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to confirm upload');
      }

      const newFile = (await confirmRes.json()) as UploadedFile;

      updatePending(key, { status: 'done', progress: 100 });
      updateFiles([...files, newFile]);

      // Remove from pending after a short delay
      setTimeout(() => {
        setPending((prev) => prev.filter((p) => p.key !== key));
      }, 800);
    } catch (err) {
      updatePending(key, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  // ── file selection ───────────────────────────────────────────────────────

  function handleFiles(fileList: FileList | File[]) {
    const fileArray = Array.from(fileList);
    const newEntries: PendingFile[] = [];

    for (const file of fileArray) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;

      if (file.size > MAX_FILE_SIZE) {
        newEntries.push({
          key,
          file,
          status: 'error',
          error: `File exceeds 100 MB limit (${formatBytes(file.size)}).`,
          progress: 0,
        });
        continue;
      }

      newEntries.push({ key, file, status: 'idle', error: null, progress: 0 });
    }

    setPending((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      if (entry.status === 'idle') {
        uploadFile(entry);
      }
    }
  }

  // ── file actions ──────────────────────────────────────────────────────────

  async function handleDelete(fileId: string) {
    const prev = files;
    updateFiles(files.filter((f) => f.id !== fileId));

    try {
      const res = await fetch(`/api/products/${productId}/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete file');
    } catch {
      updateFiles(prev);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3">
              {/* File icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{file.fileName}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">{formatBytes(file.fileSize)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{file.mimeType}</span>
                  {file.version > 1 && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-500">v{file.version}</span>
                    </>
                  )}
                  {file.isPreview && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Preview
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPreview((prev) => (prev === file.id ? null : file.id))
                  }
                  className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Toggle preview"
                >
                  {expandedPreview === file.id ? 'Hide' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file.id)}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

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
                  onClick={() => setPending((prev) => prev.filter((p) => p.key !== entry.key))}
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

      {/* Upload button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload File
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </button>

      <p className="text-xs text-gray-400">Max 100 MB per file. Any file type accepted.</p>
    </div>
  );
}
