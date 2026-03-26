/**
 * Web Worker: off-main-thread JSON serialization + LZString compression.
 *
 * Receives: { id, key, value }
 *   - id:    monotonic request ID so the main thread can match responses
 *   - key:   localStorage key (informational, echoed back)
 *   - value: raw JS value to encode
 *
 * Posts back: { id, key, encoded }
 *   - encoded: the compressed/serialized string ready for localStorage.setItem,
 *              or null if encoding failed (main thread falls back to sync write)
 */
import { encodeJsonForStorage } from '../utils/storageCodec';

self.onmessage = ({ data: { id, key, value } }) => {
    try {
        const encoded = encodeJsonForStorage(value);
        self.postMessage({ id, key, encoded });
    } catch (error) {
        // Signal failure so the main thread can fall back to a synchronous write.
        self.postMessage({ id, key, encoded: null, error: String(error) });
    }
};
