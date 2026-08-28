/**
 * Verified working local fallbacks in Pocono Vacations public assets:
 */
export const VERIFIED_FALLBACKS = {
  desktopLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png',
  mobileLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_300.png',
  footerLogo: '/wp-content/uploads/2026/05/PV6_no-bg-_full.png',
  heroBgImage: '/wp-content/uploads/2018/10/video-thumb.png',
  favicon: '/favicon3.png'
};

/**
 * Resolves a dynamic site asset URL safely.
 * If the input URL is empty or matches known non-existent dummy paths (e.g. /images/logo.png or 2026/08/hero-bg.jpg),
 * it returns the verified working local fallback to prevent 404 network errors in the browser.
 */
export function resolveSiteAssetUrl(url: string | null | undefined, fallbackType: keyof typeof VERIFIED_FALLBACKS): string {
  const fallback = VERIFIED_FALLBACKS[fallbackType];

  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Absolute http/https URLs are rendered as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Detect non-existent dummy paths that trigger 404s
  if (
    trimmed === '/images/logo.png' ||
    trimmed === '/images/og-image.jpg' ||
    trimmed === '/wp-content/uploads/2026/08/hero-bg.jpg' ||
    trimmed.includes('2026/08/hero-bg.jpg')
  ) {
    return fallback;
  }

  return trimmed;
}
