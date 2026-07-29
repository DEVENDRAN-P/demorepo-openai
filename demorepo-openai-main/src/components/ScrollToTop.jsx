import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll instantly to the top-left on navigation change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Instant snap is required by enterprise specifications
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
