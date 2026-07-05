"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Simple cooldown gate. Call `start()` after an action; `cooling` stays true
 * for `ms` milliseconds, during which callers should disable the trigger.
 * Used to stop rapid taps from stacking up AI (Gemini) requests.
 */
export function useCooldown(ms: number) {
  const [cooling, setCooling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const start = useCallback(() => {
    setCooling(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCooling(false), ms);
  }, [ms]);

  return { cooling, start };
}
