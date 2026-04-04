import { NextRequest, NextResponse } from 'next/server';
import { newsletterService } from '@vee/core';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, firstName } = subscribeSchema.parse(body);

    const result = await newsletterService.subscribe(email, firstName);

    if (result.alreadySubscribed) {
      return NextResponse.json({
        message: 'Du bist bereits für unseren Newsletter angemeldet.',
      });
    }

    return NextResponse.json(
      {
        message:
          'Vielen Dank! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Anmeldung.',
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: err.errors },
        { status: 400 },
      );
    }
    console.error('[POST /api/newsletter/subscribe]', err);
    return NextResponse.json({ error: 'Anmeldung fehlgeschlagen' }, { status: 500 });
  }
}
