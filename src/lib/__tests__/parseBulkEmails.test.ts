import { describe, it, expect } from 'vitest';
import { parseBulkEmails } from '../parseBulkEmails';

describe('parseBulkEmails', () => {
  it('returns empty array for empty input', () => {
    expect(parseBulkEmails('')).toEqual([]);
    expect(parseBulkEmails('   ')).toEqual([]);
  });

  it('splits on commas', () => {
    expect(parseBulkEmails('a@x.com, b@x.com,c@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  it('splits on semicolons', () => {
    expect(parseBulkEmails('a@x.com; b@x.com;c@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
    ]);
  });

  it('splits on newlines and whitespace', () => {
    const input = 'a@x.com\nb@x.com\r\nc@x.com\td@x.com';
    expect(parseBulkEmails(input)).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
      'd@x.com',
    ]);
  });

  it('lowercases and trims', () => {
    expect(parseBulkEmails('  Alice@Example.COM ')).toEqual(['alice@example.com']);
  });

  it('deduplicates while preserving first occurrence order', () => {
    expect(parseBulkEmails('b@x.com, a@x.com, B@X.COM, a@x.com')).toEqual([
      'b@x.com',
      'a@x.com',
    ]);
  });

  it('handles mixed separators in one input', () => {
    expect(parseBulkEmails('a@x.com,b@x.com;c@x.com d@x.com\ne@x.com')).toEqual([
      'a@x.com',
      'b@x.com',
      'c@x.com',
      'd@x.com',
      'e@x.com',
    ]);
  });
});
