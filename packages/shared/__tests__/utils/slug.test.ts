import { describe, it, expect } from 'vitest';
import { generateSlug } from '../../src/utils/slug';

describe('generateSlug()', () => {
  it('should generate a basic slug from a simple string', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should convert to lowercase', () => {
    expect(generateSlug('UPPER CASE')).toBe('upper-case');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(generateSlug('  padded string  ')).toBe('padded-string');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('one two three')).toBe('one-two-three');
  });

  it('should replace underscores with hyphens', () => {
    expect(generateSlug('snake_case_string')).toBe('snake-case-string');
  });

  it('should handle German umlaut ä → ae', () => {
    expect(generateSlug('Mädchen')).toBe('maedchen');
  });

  it('should handle German umlaut ö → oe', () => {
    expect(generateSlug('schön')).toBe('schoen');
  });

  it('should handle German umlaut ü → ue', () => {
    expect(generateSlug('über')).toBe('ueber');
  });

  it('should handle German sharp s ß → ss', () => {
    expect(generateSlug('Straße')).toBe('strasse');
  });

  it('should handle multiple umlauts in one string', () => {
    expect(generateSlug('Grüße aus München')).toBe('gruesse-aus-muenchen');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Hello, World!')).toBe('hello-world');
  });

  it('should remove parentheses and brackets', () => {
    expect(generateSlug('Product (Limited Edition)')).toBe('product-limited-edition');
  });

  it('should prevent duplicate dashes', () => {
    expect(generateSlug('Hello   World')).toBe('hello-world');
  });

  it('should prevent duplicate dashes from multiple special chars', () => {
    expect(generateSlug('Hello... World!!!')).toBe('hello-world');
  });

  it('should remove leading dashes', () => {
    expect(generateSlug('-leading-dash')).toBe('leading-dash');
  });

  it('should remove trailing dashes', () => {
    expect(generateSlug('trailing-dash-')).toBe('trailing-dash');
  });

  it('should handle product names with numbers', () => {
    expect(generateSlug('Model X-100')).toBe('model-x-100');
  });

  it('should handle an already-slug string unchanged', () => {
    expect(generateSlug('already-a-slug')).toBe('already-a-slug');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});
