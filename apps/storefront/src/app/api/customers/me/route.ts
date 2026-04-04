import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';
import { customerUpdateSchema } from '@vee/shared';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        marketingConsent: true,
        consentDate: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('[Customer Profile Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const data = customerUpdateSchema.parse(body);

    const customer = await db.customer.update({
      where: { id: customerId },
      data: {
        ...data,
        ...(data.marketingConsent !== undefined && {
          consentDate: data.marketingConsent ? new Date() : null,
        }),
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('[Customer Update Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
