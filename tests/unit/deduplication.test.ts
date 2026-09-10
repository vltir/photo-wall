// src/tests/unit/deduplication.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DeduplicationPolicy } from '@core/domain/deduplication';
import type { IStorageAdapter } from '@core/ports/output';

describe('DeduplicationPolicy', () => {
  it('detects previously recorded hashes', async () => {
    const mockStorage: Partial<IStorageAdapter> = {
      hasUploadedHash: vi.fn().mockImplementation(async (_room, hash) => hash === 'abc123hash'),
      recordUploadedHash: vi.fn().mockResolvedValue(undefined),
    };

    const policy = new DeduplicationPolicy(mockStorage as IStorageAdapter);

    const isDup = await policy.isDuplicate('test-room', 'abc123hash');
    const isNew = await policy.isDuplicate('test-room', 'different_hash');

    expect(isDup).toBe(true);
    expect(isNew).toBe(false);
  });

  it('normalizes hashes to lowercase before checking', async () => {
    const hasHashMock = vi.fn().mockResolvedValue(true);
    const mockStorage: Partial<IStorageAdapter> = {
      hasUploadedHash: hasHashMock,
    };

    const policy = new DeduplicationPolicy(mockStorage as IStorageAdapter);
    await policy.isDuplicate('room1', 'ABCDEF');

    expect(hasHashMock).toHaveBeenCalledWith('room1', 'abcdef');
  });
});