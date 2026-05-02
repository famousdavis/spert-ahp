import { describe, it, expect } from 'vitest';
import { parseBulkEmails, mapInvitationError } from '../SharingSection';

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

describe('mapInvitationError', () => {
  it('maps resource-exhausted to the per-day cap message', () => {
    expect(mapInvitationError({ code: 'functions/resource-exhausted' })).toBe(
      "You've reached today's invitation limit (25). Try again tomorrow.",
    );
  });

  it('maps permission-denied to the owner-only message', () => {
    expect(mapInvitationError({ code: 'functions/permission-denied' })).toBe(
      'Only the model owner can send invitations.',
    );
  });

  it('maps unauthenticated to a re-sign-in prompt', () => {
    expect(mapInvitationError({ code: 'functions/unauthenticated' })).toMatch(
      /sign in/i,
    );
  });

  it('maps not-found to a reload hint', () => {
    expect(mapInvitationError({ code: 'functions/not-found' })).toMatch(/reloading/i);
  });

  it('uses the original message for invalid-argument when present', () => {
    expect(
      mapInvitationError({
        code: 'functions/invalid-argument',
        message: 'isVoting must be a boolean.',
      }),
    ).toBe('isVoting must be a boolean.');
  });

  it('falls back to the raw message for unmapped codes', () => {
    expect(mapInvitationError({ code: 'functions/unknown', message: 'oh no' })).toBe(
      'oh no',
    );
  });

  it('falls back to a generic message when neither code nor message is present', () => {
    expect(mapInvitationError({})).toMatch(/something went wrong/i);
  });
});
