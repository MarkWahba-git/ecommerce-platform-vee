'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CustomOrderActionsProps {
  id: string;
  currentStatus: string;
  transitions: string[];
  quotedPrice: number | null;
  quotedDays: number | null;
  adminNotes: string;
  proofFileKey: string | null;
  orderId: string | null;
}

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

export function CustomOrderActions({
  id,
  currentStatus,
  transitions,
  quotedPrice: initialQuotedPrice,
  quotedDays: initialQuotedDays,
  adminNotes: initialAdminNotes,
  proofFileKey,
  orderId,
}: CustomOrderActionsProps) {
  const router = useRouter();

  // Quote / notes form state
  const [quotedPrice, setQuotedPrice] = useState(initialQuotedPrice?.toString() ?? '');
  const [quotedDays, setQuotedDays] = useState(initialQuotedDays?.toString() ?? '');
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState(false);

  // Proof upload state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofSuccess, setProofSuccess] = useState(false);

  // Status transition state
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState('');

  // Convert-to-order state
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  // ---------------------------------------------------------------------------
  // Status transition
  // ---------------------------------------------------------------------------
  async function handleTransition(newStatus: string) {
    setTransitioning(newStatus);
    setTransitionError('');
    try {
      const res = await fetch(`/api/custom-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setTransitionError(data.error ?? 'Failed to update status');
        return;
      }
      router.refresh();
    } catch {
      setTransitionError('Network error. Please try again.');
    } finally {
      setTransitioning(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Save quote + notes
  // ---------------------------------------------------------------------------
  async function handleSaveQuote(e: React.FormEvent) {
    e.preventDefault();
    setSavingQuote(true);
    setQuoteError('');
    setQuoteSuccess(false);

    // Use the current status to avoid transitioning when just saving quote
    try {
      const body: Record<string, unknown> = { status: currentStatus };
      if (quotedPrice) body.quotedPrice = parseFloat(quotedPrice);
      if (quotedDays) body.quotedDays = parseInt(quotedDays, 10);
      if (adminNotes !== undefined) body.adminNotes = adminNotes;

      const res = await fetch(`/api/custom-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setQuoteError(data.error ?? 'Failed to save');
        return;
      }
      setQuoteSuccess(true);
      router.refresh();
    } catch {
      setQuoteError('Network error. Please try again.');
    } finally {
      setSavingQuote(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Proof upload (two-step: get presigned URL, upload, confirm)
  // ---------------------------------------------------------------------------
  async function handleProofUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!proofFile) return;

    setUploadingProof(true);
    setProofError('');
    setProofSuccess(false);

    try {
      // Step 1: get presigned URL
      const initRes = await fetch(`/api/custom-orders/${id}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: proofFile.name,
          contentType: proofFile.type || 'application/octet-stream',
        }),
      });

      if (!initRes.ok) {
        const data = (await initRes.json()) as { error?: string };
        setProofError(data.error ?? 'Failed to get upload URL');
        return;
      }

      const { uploadUrl, fileKey } = (await initRes.json()) as {
        uploadUrl: string;
        fileKey: string;
      };

      // Step 2: upload to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        body: proofFile,
        headers: { 'Content-Type': proofFile.type || 'application/octet-stream' },
      });

      if (!s3Res.ok) {
        setProofError('Failed to upload file to storage');
        return;
      }

      // Step 3: confirm and transition to PROOF_SENT
      const confirmRes = await fetch(`/api/custom-orders/${id}/proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey }),
      });

      if (!confirmRes.ok) {
        const data = (await confirmRes.json()) as { error?: string };
        setProofError(data.error ?? 'Failed to register proof');
        return;
      }

      setProofSuccess(true);
      setProofFile(null);
      router.refresh();
    } catch {
      setProofError('Network error. Please try again.');
    } finally {
      setUploadingProof(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Convert to order
  // ---------------------------------------------------------------------------
  async function handleConvertToOrder() {
    setConverting(true);
    setConvertError('');
    try {
      const res = await fetch(`/api/custom-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert-to-order' }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setConvertError(data.error ?? 'Failed to convert');
        return;
      }

      router.refresh();
    } catch {
      setConvertError('Network error. Please try again.');
    } finally {
      setConverting(false);
    }
  }

  const isTerminal = currentStatus === 'COMPLETED' || currentStatus === 'DECLINED' || currentStatus === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* Status transitions                                                   */}
      {/* ------------------------------------------------------------------ */}
      {transitions.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Status Actions</h3>
          </div>
          <div className="flex flex-wrap gap-2 px-6 py-4">
            {transitions.map((next) => {
              const isDanger = next === 'DECLINED' || next === 'CANCELLED';
              return (
                <button
                  key={next}
                  type="button"
                  disabled={transitioning !== null}
                  onClick={() => handleTransition(next)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-inset transition disabled:opacity-60 ${
                    isDanger
                      ? 'bg-red-50 text-red-700 ring-red-300 hover:bg-red-100'
                      : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {transitioning === next ? 'Updating…' : `→ ${next.replace(/_/g, ' ')}`}
                </button>
              );
            })}
          </div>
          {transitionError && (
            <p className="px-6 pb-4 text-xs text-red-600">{transitionError}</p>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Quote + notes form                                                   */}
      {/* ------------------------------------------------------------------ */}
      {!isTerminal && (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Quote &amp; Notes</h3>
          </div>
          <form onSubmit={handleSaveQuote} className="space-y-4 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="quotedPrice" className={labelClass}>
                  Quoted Price (EUR)
                </label>
                <input
                  id="quotedPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                  placeholder="e.g. 49.90"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="quotedDays" className={labelClass}>
                  Lead Time (days)
                </label>
                <input
                  id="quotedDays"
                  type="number"
                  min="1"
                  step="1"
                  value={quotedDays}
                  onChange={(e) => setQuotedDays(e.target.value)}
                  placeholder="e.g. 7"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="adminNotes" className={labelClass}>
                Admin Notes (visible to customer)
              </label>
              <textarea
                id="adminNotes"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Any notes or instructions for the customer…"
                className={inputClass}
              />
            </div>

            {quoteError && <p className="text-xs text-red-600">{quoteError}</p>}
            {quoteSuccess && <p className="text-xs text-green-600">Saved successfully.</p>}

            <button
              type="submit"
              disabled={savingQuote}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {savingQuote ? 'Saving…' : 'Save Quote & Notes'}
            </button>
          </form>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Proof upload                                                         */}
      {/* ------------------------------------------------------------------ */}
      {(currentStatus === 'IN_PRODUCTION' || currentStatus === 'PROOF_SENT') && (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Upload Proof</h3>
          </div>
          <form onSubmit={handleProofUpload} className="space-y-4 px-6 py-4">
            {proofFileKey && (
              <p className="text-xs text-gray-500">
                Current proof: <span className="font-mono">{proofFileKey.split('/').pop()}</span>
              </p>
            )}
            <div>
              <label htmlFor="proofFile" className={labelClass}>
                Proof File (image or PDF)
              </label>
              <input
                id="proofFile"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-700"
              />
            </div>

            {proofError && <p className="text-xs text-red-600">{proofError}</p>}
            {proofSuccess && (
              <p className="text-xs text-green-600">
                Proof uploaded. Status changed to PROOF_SENT.
              </p>
            )}

            <button
              type="submit"
              disabled={!proofFile || uploadingProof}
              className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {uploadingProof ? 'Uploading…' : 'Upload Proof & Notify Customer'}
            </button>
          </form>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Convert to order                                                     */}
      {/* ------------------------------------------------------------------ */}
      {currentStatus === 'APPROVED' && !orderId && (
        <section className="rounded-lg border border-teal-200 bg-teal-50 shadow-sm">
          <div className="border-b border-teal-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-teal-900">Convert to Order</h3>
          </div>
          <div className="px-6 py-4">
            <p className="mb-4 text-sm text-teal-800">
              The customer has approved the proof. Create a formal order from this request using the
              quoted price.
            </p>
            {convertError && <p className="mb-3 text-xs text-red-600">{convertError}</p>}
            <button
              type="button"
              onClick={handleConvertToOrder}
              disabled={converting}
              className="rounded-md bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-60"
            >
              {converting ? 'Creating Order…' : 'Convert to Order'}
            </button>
          </div>
        </section>
      )}

      {orderId && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-4">
          <p className="text-sm text-green-800">
            Order created.{' '}
            <a href={`/orders/${orderId}`} className="font-semibold underline">
              View order →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
