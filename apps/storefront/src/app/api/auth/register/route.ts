import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@vee/db';
import { customerRegisterSchema } from '@vee/shared';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = customerRegisterSchema.parse(body);

    // Check if email already registered
    const existing = await db.customer.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Diese E-Mail-Adresse ist bereits registriert.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const customer = await db.customer.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        marketingConsent: input.marketingConsent,
        consentDate: input.marketingConsent ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten.', details: err.errors },
        { status: 400 }
      );
    }
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json(
      { error: 'Registrierung fehlgeschlagen. Bitte versuche es erneut.' },
      { status: 500 }
    );
  }
}
