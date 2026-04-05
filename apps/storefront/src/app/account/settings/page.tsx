import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      marketingConsent: true,
      consentDate: true,
    },
  });

  if (!customer) redirect('/login');

  return (
    <SettingsClient
      customer={{
        id: customer.id,
        firstName: customer.firstName ?? '',
        lastName: customer.lastName ?? '',
        email: customer.email,
        phone: customer.phone ?? '',
        marketingConsent: customer.marketingConsent,
        consentDate: customer.consentDate?.toISOString() ?? null,
      }}
    />
  );
}
