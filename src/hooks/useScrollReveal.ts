import { useEffect, useRef } from "react";

/**
 * Adds a CSS class when the element scrolls into view.
 * Uses IntersectionObserver for performance.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Start hidden
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        }
      },
      { threshold: options?.threshold ?? 0.15, rootMargin: options?.rootMargin ?? "0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Reveals children with staggered delays.
 * Attach to a parent; children with [data-reveal] get animated.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(
  staggerMs = 120,
  options?: { threshold?: number }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const parent = ref.current;
    if (!parent) return;

    const children = parent.querySelectorAll<HTMLElement>("[data-reveal]");
    children.forEach((child) => {
      child.style.opacity = "0";
      child.style.transform = "translateY(20px)";
      child.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((child, i) => {
            child.style.transitionDelay = `${i * staggerMs}ms`;
            child.style.opacity = "1";
            child.style.transform = "translateY(0)";
          });
          observer.unobserve(parent);
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(parent);
    return () => observer.disconnect();
  }, [staggerMs]);

  return ref;
}
