
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set debouncedValue to value (latest value) after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Return a cleanup function that will be called every time ...
    // ... useEffect is re-called (after initial render, and after any of the dependencies change)
    // ... or when the component unmounts.
    // This ensures that if the value changes rapidly, the previous timer is cleared
    // and a new one is set, preventing unnecessary updates.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-call effect if value or delay changes

  return debouncedValue;
}
