'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputClass =
  'block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm';

const inputErrorClass =
  'block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-red-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface FormErrors {
  title?: string;
  slug?: string;
  content?: string;
}

export default function ContentNewPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Auto-generate slug from title unless user has manually edited it
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(slugify(title));
    }
  }, [title, slugEdited]);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!slug.trim()) e.slug = 'Slug is required.';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim()))
      e.slug = 'Slug may only contain lowercase letters, numbers, and hyphens.';
    if (!content.trim()) e.content = 'Content is required.';
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const res = await fetch('/api/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          coverImage: coverImage.trim() || null,
          authorName: authorName.trim() || null,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          status,
          publishedAt: status === 'published' ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(data?.error ?? `Server error: ${res.status}`);
        return;
      }
      router.push('/content');
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/content" className="text-sm text-gray-500 hover:text-gray-900">
          ← Content
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">New Blog Post</h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {apiError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {apiError}
          </div>
        )}

        {/* Main content */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Post Content</h3>
          </div>
          <div className="space-y-5 px-6 py-5">
            {/* Title */}
            <Field label="Title *" error={errors.title}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Awesome Blog Post"
                className={errors.title ? inputErrorClass : inputClass}
              />
            </Field>

            {/* Slug */}
            <Field
              label="Slug *"
              error={errors.slug}
              hint="URL path for this post — auto-generated from title."
            >
              <div className="flex items-center rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="flex select-none items-center pl-3 text-gray-400 sm:text-sm">
                  /blog/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  placeholder="my-awesome-blog-post"
                  className="block flex-1 border-0 bg-transparent py-2 pr-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                />
              </div>
            </Field>

            {/* Excerpt */}
            <Field label="Excerpt" hint="Short summary shown in listing pages.">
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                placeholder="A brief description of this post…"
                className={inputClass}
              />
            </Field>

            {/* Content */}
            <Field label="Content *" error={errors.content}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                placeholder="Write your post content here. Markdown is supported."
                className={`${errors.content ? inputErrorClass : inputClass} font-mono`}
              />
              <p className="mt-1 text-xs text-gray-400">
                {content.length} character{content.length !== 1 ? 's' : ''}
              </p>
            </Field>
          </div>
        </div>

        {/* Meta */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Post Settings</h3>
          </div>
          <div className="space-y-5 px-6 py-5">
            {/* Cover image */}
            <Field label="Cover Image URL" hint="Paste a full URL to the cover image.">
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/images/cover.jpg"
                className={inputClass}
              />
              {coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="mt-2 h-32 w-full rounded-md object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}
            </Field>

            {/* Author */}
            <Field label="Author Name">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Jane Doe"
                className={inputClass}
              />
            </Field>

            {/* Tags */}
            <Field label="Tags" hint="Comma-separated list of tags.">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="handmade, personalised, gift"
                className={inputClass}
              />
              {tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}
            </Field>

            {/* Status */}
            <Field label="Status">
              <div className="flex gap-4">
                {(['draft', 'published'] as const).map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">{s}</span>
                  </label>
                ))}
              </div>
              {status === 'published' && (
                <p className="mt-1 text-xs text-amber-600">
                  Post will be published immediately with today's date.
                </p>
              )}
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/content"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting
              ? 'Saving…'
              : status === 'published'
              ? 'Publish Post'
              : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
