import { useState, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';

/**
 * useFuseSearch
 * A small reusable hook that encapsulates Fuse.js search over an array of items.
 * Returns { query, setQuery, results, setResults }.
 * Options: { threshold, limit, debounce }
 */
export default function useFuseSearch(items = [], keys = [], options = {}) {
  const { threshold = 0.3, limit = 10, debounce = 150 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(items);

  // Recreate Fuse instance when items/keys/threshold change
  const fuse = useMemo(() => {
    try {
      return new Fuse(items || [], { keys, threshold });
    } catch (e) {
      // If Fuse can't be created (bad keys), fall back gracefully
      // eslint-disable-next-line no-console
      console.warn('useFuseSearch: failed to create Fuse instance', e);
      return null;
    }
  }, [items, keys, threshold]);

  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any outstanding timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query) {
      // No query => return full list (debounced to avoid too many renders)
      timerRef.current = setTimeout(() => setResults(items), debounce);
      return () => clearTimeout(timerRef.current);
    }

    // Debounced search
    timerRef.current = setTimeout(() => {
      if (!fuse) {
        setResults(items);
        return;
      }
      const found = fuse.search(query, { limit }).map(r => r.item);
      setResults(found);
    }, debounce);

    return () => clearTimeout(timerRef.current);
  }, [query, fuse, items, debounce, limit]);

  // Keep results in sync if items change and there's no query
  useEffect(() => {
    if (!query) setResults(items);
  }, [items, query]);

  return { query, setQuery, results, setResults };
}
