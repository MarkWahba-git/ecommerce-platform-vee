import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock uuid so the cart route (which imports it for session ID generation) can load
const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';
vi.mock('uuid', () => ({
  v4: vi.fn(() => MOCK_UUID),
}));

// Mock @vee/core before any imports
vi.mock('@vee/core', () => ({
  cartService: {
    getOrCreate: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
  },
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class {
    nextUrl: URL;
    private _body: unknown;
    constructor(url: string, init?: { body?: string }) {
      this.nextUrl = new URL(url);
      this._body = init?.body ? JSON.parse(init.body) : {};
    }
    async json() {
      return this._body ?? {};
    }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
      cookies: { set: vi.fn() },
      json: async () => data,
    })),
  },
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

import { cartService } from '@vee/core';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function importRouteHandlers() {
  const mod = await import('../../src/app/api/cart/route');
  return { GET: mod.GET, POST: mod.POST };
}

const baseCart = {
  id: 'cart-1',
  customerId: null,
  sessionId: 'sess-abc',
  couponCode: null,
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Import uuid mock ref so we can restore its implementation after resetAllMocks
import { v4 as uuidv4 } from 'uuid';

beforeEach(() => {
  vi.resetAllMocks();
  // Restore uuid mock after resetAllMocks clears implementations
  vi.mocked(uuidv4).mockReturnValue(MOCK_UUID as unknown as ReturnType<typeof uuidv4>);
  vi.mocked(NextResponse.json).mockImplementation((data: unknown, init?: { status?: number }) => ({
    data,
    status: init?.status ?? 200,
    cookies: { set: vi.fn() },
    json: async () => data,
  }) as unknown as ReturnType<typeof NextResponse.json>);
});

describe('GET /api/cart', () => {
  it('should return null when no session or customer cookie exists', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const { GET } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart');
    await GET(req);

    expect(cartService.getOrCreate).not.toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(null);
  });

  it('should return cart when session cookie exists', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'vee_session') return { value: 'sess-abc' };
        return undefined;
      }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockResolvedValue(baseCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { GET } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart');
    await GET(req);

    expect(cartService.getOrCreate).toHaveBeenCalledWith(undefined, 'sess-abc');
    expect(NextResponse.json).toHaveBeenCalledWith(baseCart);
  });

  it('should return cart when customerId cookie exists', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'customerId') return { value: 'cust-1' };
        return undefined;
      }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const customerCart = { ...baseCart, customerId: 'cust-1', sessionId: null };
    vi.mocked(cartService.getOrCreate).mockResolvedValue(customerCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { GET } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart');
    await GET(req);

    expect(cartService.getOrCreate).toHaveBeenCalledWith('cust-1', undefined);
  });

  it('should return 500 when cart service throws an error', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'vee_session') return { value: 'sess-abc' };
        return undefined;
      }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockRejectedValue(new Error('DB error'));

    const { GET } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart');
    await GET(req);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to fetch cart' }),
      expect.objectContaining({ status: 500 }),
    );
  });
});

describe('POST /api/cart', () => {
  it('should create a new cart with customerId from body', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const customerCart = { ...baseCart, customerId: 'cust-1', sessionId: null };
    vi.mocked(cartService.getOrCreate).mockResolvedValue(customerCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { POST } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart', {
      body: JSON.stringify({ customerId: 'cust-1' }),
    });
    await POST(req);

    expect(cartService.getOrCreate).toHaveBeenCalledWith('cust-1', undefined);
    expect(NextResponse.json).toHaveBeenCalledWith(customerCart, { status: 201 });
  });

  it('should create a session-based cart when no identity provided', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockResolvedValue(baseCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { POST } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart', {
      body: JSON.stringify({}),
    });
    await POST(req);

    // Should have called getOrCreate with undefined customerId and the mocked UUID as sessionId
    expect(cartService.getOrCreate).toHaveBeenCalledWith(
      undefined,
      MOCK_UUID,
    );
  });

  it('should return 201 status on cart creation', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockResolvedValue(baseCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { POST } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart', {
      body: JSON.stringify({ customerId: 'cust-1' }),
    });
    await POST(req);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 201 }),
    );
  });

  it('should return 500 when cart service throws an error', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockRejectedValue(new Error('DB error'));

    const { POST } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart', {
      body: JSON.stringify({}),
    });
    await POST(req);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to create cart' }),
      expect.objectContaining({ status: 500 }),
    );
  });

  it('should use existing session cookie when present', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'vee_session') return { value: 'existing-session-id' };
        return undefined;
      }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(cartService.getOrCreate).mockResolvedValue(baseCart as unknown as ReturnType<typeof cartService.getOrCreate> extends Promise<infer T> ? T : never);

    const { POST } = await importRouteHandlers();
    const req = new NextRequest('http://localhost:3000/api/cart', {
      body: JSON.stringify({}),
    });
    await POST(req);

    expect(cartService.getOrCreate).toHaveBeenCalledWith(undefined, 'existing-session-id');
  });
});
