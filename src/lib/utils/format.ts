/**
 * Formats a number for display (e.g., 1200000 -> "1.2M")
 */
export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined) return "0";

  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Formats a date string for display
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Estimates API cost based on image count and quality
 */
export function estimateCost(
  imageCount: number,
  quality: string = "medium"
): number {
  // gpt-image-1 pricing (approximate per image)
  const pricePerImage: Record<string, number> = {
    low: 0.011,
    medium: 0.042,
    high: 0.167,
  };
  return imageCount * (pricePerImage[quality] || pricePerImage.medium);
}
