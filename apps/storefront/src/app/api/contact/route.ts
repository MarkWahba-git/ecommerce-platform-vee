import { NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    // TODO: Send email via Resend
    // For now, log the contact form submission
    console.log('[Contact Form]', {
      name: data.name,
      email: data.email,
      subject: data.subject,
      messageLength: data.message.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: error.errors },
        { status: 400 },
      );
    }
    console.error('[Contact Form Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
