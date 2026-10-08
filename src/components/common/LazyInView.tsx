import React, { useState, useEffect, useRef } from 'react';

interface LazyInViewProps {
  children: React.ReactNode;
  minHeight?: number | string;
  className?: string;
  rootMargin?: string;
}

/**
 * LazyInView: mounts expensive below-the-fold components (such as Recharts graphs)
 * only when they enter or approach the viewport, keeping initial render and cold start fast.
 */
export const LazyInView: React.FC<LazyInViewProps> = ({
  children,
  minHeight = 260,
  className = '',
  rootMargin = '150px',
}) => {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={containerRef} className={className} style={!isInView ? { minHeight } : undefined}>
      {isInView ? children : null}
    </div>
  );
};
