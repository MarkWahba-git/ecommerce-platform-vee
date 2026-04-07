import { vi } from 'vitest';

export const mockResendEmails = {
  send: vi.fn().mockResolvedValue({ id: 'email-id-123' }),
};

export const mockResend = {
  emails: mockResendEmails,
};

vi.mock('../../src/lib/email', () => ({
  resend: mockResend,
  EMAIL_FROM: 'hallo@vee-handmade.de',
}));
