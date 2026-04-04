import { redirect } from 'next/navigation';
import { auth } from './auth';

export interface CustomerSession {
  customerId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Server-side helper: returns the current session or null.
 * Use in Server Components, Route Handlers, or Server Actions.
 */
export async function getSession(): Promise<CustomerSession | null> {
  const session = await auth();
  if (!session?.user?.customerId) return null;
  return {
    customerId: session.user.customerId,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}

/**
 * Server-side helper: returns the session or redirects to /login.
 * Use in protected Server Components.
 */
export async function requireAuth(): Promise<CustomerSession> {
  const session = await auth();
  if (!session?.user?.customerId) {
    redirect('/login');
  }
  return {
    customerId: session.user.customerId,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}
