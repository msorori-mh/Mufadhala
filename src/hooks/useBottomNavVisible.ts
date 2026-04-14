import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativePlatform } from "@/lib/capacitor";

const PUBLIC_PATHS = ["/", "/login", "/register"];

/**
 * Returns true when the MobileBottomNav is rendered.
 * Mirrors the exact same visibility logic used in MobileBottomNav.
 */
export function useBottomNavVisible(): boolean {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isNative = isNativePlatform();

  if (!isMobile && !isNative) return false;
  if (PUBLIC_PATHS.includes(location.pathname)) return false;

  return true;
}
