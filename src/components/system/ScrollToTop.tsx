import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Route changes should start at the top; drawers and hash links should not. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}
