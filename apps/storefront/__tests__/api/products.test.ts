import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the @vee/core module before importing the route handler
vi.mock('@vee/core', () => ({
  productService: {
    list: vi.fn(),
    getBySlug: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class {
    nextUrl: URL;
    constructor(url: string) {
      this.nextUrl = new URL(url);
    }
  },
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

import { productService } from '@vee/core';
import { NextRequest, NextResponse } from 'next/server';

// Dynamically import the route handler after mocks are in place
async function importGET() {
  const mod = await import('../../src/app/api/products/route');
  return mod.GET;
}

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Handmade Mug',
    slug: 'handmade-mug',
    status: 'ACTIVE',
    basePrice: '29.99',
    type: 'PHYSICAL',
    images: [],
    categories: [],
    _count: { variants: 0, reviews: 0 },
  },
  {
    id: 'prod-2',
    name: 'Digital Art',
    slug: 'digital-art',
    status: 'ACTIVE',
    basePrice: '9.99',
    type: 'DIGITAL',
    images: [],
    categories: [],
    _count: { variants: 0, reviews: 0 },
  },
];

const mockListResult = {
  items: mockProducts,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(NextResponse.json).mockImplementation((data: unknown, init?: { status?: number }) => ({
    data,
    status: init?.status ?? 200,
    json: async () => data,
  }) as unknown as ReturnType<typeof NextResponse.json>);
});

describe('GET /api/products', () => {
  it('should return products list with default filters', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products');
    await GET(req);

    expect(productService.list).toHaveBeenCalledTimes(1);
    // Storefront always defaults to ACTIVE
    expect(productService.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
    expect(NextResponse.json).toHaveBeenCalledWith(mockListResult);
  });

  it('should pass page and limit query parameters', async () => {
    vi.mocked(productService.list).mockResolvedValue({ ...mockListResult, page: 2, limit: 10 });

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products?page=2&limit=10');
    await GET(req);

    expect(productService.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
    );
  });

  it('should pass type filter when provided', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products?type=DIGITAL');
    await GET(req);

    expect(productService.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DIGITAL' }),
    );
  });

  it('should pass search query when provided', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products?search=handmade');
    await GET(req);

    expect(productService.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'handmade' }),
    );
  });

  it('should pass categoryId filter when provided', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products?categoryId=cat-1');
    await GET(req);

    expect(productService.list).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' }),
    );
  });

  it('should return 400 for invalid query parameters', async () => {
    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products?page=invalid');
    await GET(req);

    // The route parses page as Number('invalid') = NaN, which fails zod validation
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid query parameters' }),
      expect.objectContaining({ status: 400 }),
    );
  });

  it('should return 500 when product service throws an error', async () => {
    vi.mocked(productService.list).mockRejectedValue(new Error('Database connection failed'));

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products');
    await GET(req);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to fetch products' }),
      expect.objectContaining({ status: 500 }),
    );
  });

  it('should always default to ACTIVE status on storefront', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    // Even without specifying status, storefront forces ACTIVE
    const req = new NextRequest('http://localhost:3000/api/products');
    await GET(req);

    const callArg = vi.mocked(productService.list).mock.calls[0][0];
    expect(callArg.status).toBe('ACTIVE');
  });

  it('should return products in the correct paginated format', async () => {
    vi.mocked(productService.list).mockResolvedValue(mockListResult);

    const GET = await importGET();
    const req = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(req);

    // The response should contain our pagination envelope
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
  });
});
