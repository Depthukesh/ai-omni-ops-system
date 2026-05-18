"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseNearViewportOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useNearViewport<T extends Element>(options?: UseNearViewportOptions): {
  ref: RefObject<T>;
  isNearViewport: boolean;
} {
  const ref = useRef<T | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    if (isNearViewport) {
      return;
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options?.rootMargin || "280px 0px",
        threshold: options?.threshold ?? 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isNearViewport, options?.rootMargin, options?.threshold]);

  return {
    ref: ref as RefObject<T>,
    isNearViewport,
  };
}
