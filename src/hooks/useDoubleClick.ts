import { useCallback, useRef } from 'react';

/**
 * Hook for handling single vs double-click events
 * 
 * @param onSingleClick - Function to call on single click
 * @param onDoubleClick - Function to call on double click
 * @param delay - Delay in milliseconds to wait for potential second click (default: 300)
 */
export const useDoubleClick = (
  onSingleClick: () => void,
  onDoubleClick: () => void,
  delay: number = 300
) => {
  const clickCount = useRef(0);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(() => {
    clickCount.current++;

    if (clickCount.current === 1) {
      // Start timer for potential double-click
      timeoutId.current = setTimeout(() => {
        if (clickCount.current === 1) {
          onSingleClick();
        }
        clickCount.current = 0;
      }, delay);
    } else if (clickCount.current === 2) {
      // Double-click detected
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      clickCount.current = 0;
      onDoubleClick();
    }
  }, [onSingleClick, onDoubleClick, delay]);

  // Reset function to cancel pending clicks
  const reset = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    clickCount.current = 0;
  }, []);

  return { handleClick, reset };
};