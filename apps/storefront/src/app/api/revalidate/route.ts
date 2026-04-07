import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

interface RevalidateBody {
  paths: string[];
  secret: string;
}

/**
 * POST /api/revalidate
 *
 * On-demand ISR revalidation. Requires a matching REVALIDATION_SECRET.
 *
 * Body: { paths: string[], secret: string }
 *
 * Example:
 *   curl -X POST https://vee-handmade.de/api/revalidate \
 *     -H 'Content-Type: application/json' \
 *     -d '{"secret":"<secret>","paths":["/product/my-ring","/shop"]}'
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RevalidateBody;

  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { paths, secret } = body;

  // Validate secret
  const expectedSecret = process.env.REVALIDATION_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'REVALIDATION_SECRET is not configured on the server' },
      { status: 500 },
    );
  }
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid revalidation secret' }, { status: 401 });
  }

  // Validate paths
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json(
      { error: '`paths` must be a non-empty array of strings' },
      { status: 400 },
    );
  }

  const revalidated: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  for (const path of paths) {
    if (typeof path !== 'string' || !path.startsWith('/')) {
      errors.push({ path: String(path), error: 'Path must be a string starting with /' });
      continue;
    }

    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch (err) {
      errors.push({
        path,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json(
    {
      revalidated,
      errors,
      timestamp: new Date().toISOString(),
    },
    { status: errors.length > 0 && revalidated.length === 0 ? 500 : 200 },
  );
}
