import { useEffect, useState } from 'react';

/**
 * Width-based layout classes from the front-end Decision:
 * compact (< 600) phone or Slide Over; medium (600-899) iPad portrait or Split View;
 * expanded (>= 900) iPad landscape.
 */
export type Layout = 'compact' | 'medium' | 'expanded';

export function layoutFor(width: number): Layout {
  if (width >= 900) return 'expanded';
  if (width >= 600) return 'medium';
  return 'compact';
}

export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(() => layoutFor(window.innerWidth));
  useEffect(() => {
    const onResize = () => setLayout(layoutFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}
