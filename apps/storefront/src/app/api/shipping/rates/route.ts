import { NextRequest, NextResponse } from 'next/server';
import { shippingService } from '@vee/core';

/**
 * POST /api/shipping/rates
 * Public endpoint — estimate DHL shipping rates at checkout.
 * Accepts a cart weight and delivery destination.
 *
 * Body: {
 *   weight: number;                  // total cart weight in kg
 *   destination: {
 *     postalCode: string;
 *     country: string;               // ISO 3166-1 alpha-2, e.g. "DE"
 *   };
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      weight: number;
      destination: { postalCode: string; country: string };
    };

    const { weight, destination } = body;

    if (typeof weight !== 'number' || weight <= 0) {
      return NextResponse.json(
        { error: 'weight must be a positive number (kg)' },
        { status: 400 },
      );
    }

    if (!destination?.country) {
      return NextResponse.json(
        { error: 'destination.country is required' },
        { status: 400 },
      );
    }

    const rates = await shippingService.getShippingRates(weight, destination);

    return NextResponse.json({ rates });
  } catch (err) {
    console.error('[POST /api/shipping/rates]', err);
    return NextResponse.json(
      { error: 'Failed to calculate shipping rates' },
      { status: 500 },
    );
  }
}
