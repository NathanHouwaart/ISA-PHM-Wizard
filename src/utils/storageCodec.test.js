import { describe, expect, it } from 'vitest';
import { decodeJsonFromStorage, encodeJsonForStorage, isQuotaExceededError } from './storageCodec';

describe('storageCodec', () => {
    it('round-trips compressed payloads', () => {
        const value = Array.from({ length: 2000 }).map((_, index) => ({
            id: index,
            text: `payload-${index}`
        }));
        const encoded = encodeJsonForStorage(value, { forceCompression: true });
        const decoded = decodeJsonFromStorage(encoded);
        expect(decoded.exists).toBe(true);
        expect(decoded.value).toEqual(value);
    });

    it('returns undefined value for invalid json', () => {
        const decoded = decodeJsonFromStorage('this is not json');
        expect(decoded.exists).toBe(true);
        expect(decoded.value).toBeUndefined();
    });

    it('detects quota exceeded errors', () => {
        const error = { name: 'QuotaExceededError', message: 'Setting the value exceeded the quota.' };
        expect(isQuotaExceededError(error)).toBe(true);
    });
});
