import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ensures pages start at the top when navigating.
 * Works for both desktop and mobile (prevents the "stuck mid-page" feeling).
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Use rAF to ensure it runs after layout paint of the new route.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [pathname, search]);

  return null;
}
