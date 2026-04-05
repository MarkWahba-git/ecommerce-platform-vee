import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@vee/db';
import {
  generatePkce,
  getAuthorizationUrl,
  exchangeCode,
} from '@vee/core';

/**
 * GET /api/channels/etsy
 * Returns the Etsy OAuth2 authorization URL (PKCE).
 * The frontend should store the returned codeVerifier in sessionStorage before redirecting.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { codeVerifier, codeChallenge } = generatePkce();
    const state = crypto.randomUUID();

    const authorizationUrl = getAuthorizationUrl(state, codeChallenge);

    return NextResponse.json({ authorizationUrl, codeVerifier, state });
  } catch (err) {
    console.error('[GET /api/channels/etsy]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate authorization URL' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/etsy
 * Exchange the OAuth2 code for tokens and create/update the Marketplace record.
 *
 * Body: { code: string; codeVerifier: string; shopId: string; name?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      code: string;
      codeVerifier: string;
      shopId: string;
      name?: string;
    };

    const { code, codeVerifier, shopId, name } = body;

    if (!code || !codeVerifier || !shopId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, codeVerifier, shopId' },
        { status: 400 },
      );
    }

    // Exchange the code for tokens
    const tokens = await exchangeCode(code, codeVerifier);

    const credentials = {
      shop_id: shopId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    };

    // Upsert the Marketplace record (keyed by shopId stored in credentials)
    const existing = await db.marketplace.findFirst({
      where: { type: 'ETSY' },
    });

    let marketplace;

    if (existing) {
      marketplace = await db.marketplace.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          credentials: credentials as Record<string, unknown>,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      marketplace = await db.marketplace.create({
        data: {
          type: 'ETSY',
          name: name ?? `Etsy Shop (${shopId})`,
          credentials: credentials as Record<string, unknown>,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      id: marketplace.id,
      name: marketplace.name,
      type: marketplace.type,
      isActive: marketplace.isActive,
    });
  } catch (err) {
    console.error('[POST /api/channels/etsy]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to connect Etsy account' },
      { status: 500 },
    );
  }
}
