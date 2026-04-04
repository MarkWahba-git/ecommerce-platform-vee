import { NextRequest, NextResponse } from 'next/server';
import { newsletterService } from '@vee/core';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.json({ error: 'E-Mail und Token erforderlich' }, { status: 400 });
    }

    const success = await newsletterService.unsubscribe(email, token);

    if (!success) {
      return NextResponse.json(
        { error: 'Ungültiger Token oder E-Mail-Adresse nicht gefunden' },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: 'Du wurdest erfolgreich abgemeldet.' });
  } catch (err) {
    console.error('[GET /api/newsletter/unsubscribe]', err);
    return NextResponse.json({ error: 'Abmeldung fehlgeschlagen' }, { status: 500 });
  }
}
