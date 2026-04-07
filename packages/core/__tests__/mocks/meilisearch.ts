import { vi } from 'vitest';

export const mockMeiliIndex = {
  addDocuments: vi.fn().mockResolvedValue({ taskUid: 1 }),
  deleteDocument: vi.fn().mockResolvedValue({ taskUid: 2 }),
  search: vi.fn().mockResolvedValue({ hits: [] }),
};

export const mockMeili = {
  index: vi.fn().mockReturnValue(mockMeiliIndex),
};

vi.mock('../../src/lib/meilisearch', () => ({
  meili: mockMeili,
  PRODUCT_INDEX: 'products',
}));
