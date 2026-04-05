import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';
import { AddressesClient } from './AddressesClient';

export const metadata: Metadata = { title: 'Adressen' };

export default async function AddressesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const addresses = await db.address.findMany({
    where: { customerId: session.customerId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const serialized = addresses.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <AddressesClient initialAddresses={serialized} />;
}
