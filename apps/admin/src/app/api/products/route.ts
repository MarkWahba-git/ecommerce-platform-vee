import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { productService } from '@vee/core';
import { productCreateSchema } from '@vee/shared';

/** POST /api/products — Create a new product */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const product = await productService.create(parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Products POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
