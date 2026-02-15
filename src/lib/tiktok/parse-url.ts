/**
 * Extracts video ID from various TikTok URL formats:
 * - https://www.tiktok.com/@user/video/1234567890
 * - https://www.tiktok.com/@user/photo/1234567890
 * - https://vm.tiktok.com/ABCDEF/
 * - https://www.tiktok.com/t/ABCDEF/
 */
export function parseTikTokUrl(url: string): {
  videoId: string | null;
  isShortUrl: boolean;
  cleanUrl: string;
} {
  try {
    const parsed = new URL(url);

    // Full URL: /video/ or /photo/ pattern
    const fullMatch = parsed.pathname.match(
      /\/(video|photo)\/(\d+)/
    );
    if (fullMatch) {
      return {
        videoId: fullMatch[2],
        isShortUrl: false,
        cleanUrl: url,
      };
    }

    // Short URL: vm.tiktok.com or tiktok.com/t/
    if (
      parsed.hostname === "vm.tiktok.com" ||
      parsed.pathname.startsWith("/t/")
    ) {
      return {
        videoId: null,
        isShortUrl: true,
        cleanUrl: url,
      };
    }

    return { videoId: null, isShortUrl: false, cleanUrl: url };
  } catch {
    return { videoId: null, isShortUrl: false, cleanUrl: url };
  }
}

export function isValidTikTokUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("tiktok.com") ||
      parsed.hostname === "vm.tiktok.com"
    );
  } catch {
    return false;
  }
}
