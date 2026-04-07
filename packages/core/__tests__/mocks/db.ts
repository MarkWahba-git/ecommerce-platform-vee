import { vi } from 'vitest';

// Mock methods shared across all models
const modelMethods = () => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  upsert: vi.fn(),
  fields: {},
});

export const mockDb = {
  product: modelMethods(),
  productVariant: modelMethods(),
  inventory: modelMethods(),
  cart: modelMethods(),
  cartItem: modelMethods(),
  order: modelMethods(),
  orderItem: modelMethods(),
  coupon: modelMethods(),
  address: modelMethods(),
  customer: modelMethods(),
  downloadAccess: modelMethods(),
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
};

vi.mock('@vee/db', () => ({
  db: mockDb,
}));
