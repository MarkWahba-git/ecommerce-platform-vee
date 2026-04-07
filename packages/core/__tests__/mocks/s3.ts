import { vi } from 'vitest';

export const mockGetUploadUrl = vi.fn().mockResolvedValue('https://s3.example.com/upload-signed-url');
export const mockGetDownloadUrl = vi.fn().mockResolvedValue('https://s3.example.com/download-signed-url');

vi.mock('../../src/lib/s3', () => ({
  getUploadUrl: mockGetUploadUrl,
  getDownloadUrl: mockGetDownloadUrl,
}));
