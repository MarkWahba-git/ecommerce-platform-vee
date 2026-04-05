import { NextRequest, NextResponse } from 'next/server';
import { newsletterService } from '@vee/core';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token fehlt' }, { status: 400 });
    }

    const success = await newsletterService.confirmSubscription(token);

    if (!success) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Token' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: 'Deine Newsletter-Anmeldung wurde erfolgreich bestätigt!',
    });
  } catch (err) {
    console.error('[GET /api/newsletter/confirm]', err);
    return NextResponse.json({ error: 'Bestätigung fehlgeschlagen' }, { status: 500 });
  }
}
