import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@vee/db';
import {
  getAmazonAuthorizationUrl,
  exchangeAmazonCode,
} from '@vee/core';

/**
 * GET /api/channels/amazon
 * Returns the Amazon SP-API LWA OAuth2 authorization URL.
 * The frontend should redirect the user to this URL to authorize the app.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = crypto.randomUUID();
    const authorizationUrl = getAmazonAuthorizationUrl(state);

    return NextResponse.json({ authorizationUrl, state });
  } catch (err) {
    console.error('[GET /api/channels/amazon]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate authorization URL' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/amazon
 * Exchange the SP-API OAuth code for LWA tokens and create/update the
 * Marketplace record for this Amazon account.
 *
 * Body: {
 *   code: string;          // spapi_oauth_code from redirect
 *   sellerId: string;      // selling_partner_id from redirect
 *   marketplaceId: string; // Amazon marketplace ID, e.g. A1PA6795UKMFR9 (DE)
 *   name?: string;
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      code: string;
      sellerId: string;
      marketplaceId: string;
      name?: string;
    };

    const { code, sellerId, marketplaceId, name } = body;

    if (!code || !sellerId || !marketplaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, sellerId, marketplaceId' },
        { status: 400 },
      );
    }

    // Exchange the LWA authorization code for access + refresh tokens
    const tokens = await exchangeAmazonCode(code);

    const credentials = {
      sellerId,
      marketplaceId,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      clientId: process.env.AMAZON_CLIENT_ID ?? '',
      clientSecret: process.env.AMAZON_CLIENT_SECRET ?? '',
    };

    // Upsert the Marketplace record keyed by sellerId
    const existing = await db.marketplace.findFirst({
      where: { type: 'AMAZON' },
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
          type: 'AMAZON',
          name: name ?? `Amazon (${sellerId})`,
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
    console.error('[POST /api/channels/amazon]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to connect Amazon account' },
      { status: 500 },
    );
  }
}
