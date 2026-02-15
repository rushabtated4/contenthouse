/**
 * Simple token-bucket rate limiter for OpenAI API.
 * Default: ~5 requests per minute.
 */
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;

  constructor(requestsPerMinute: number = 50) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.refillRate = requestsPerMinute / 60000;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until we have a token
    const waitTime = (1 - this.tokens) / this.refillRate;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }
}

// Singleton instance
let limiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiterInstance) {
    limiterInstance = new RateLimiter(50);
  }
  return limiterInstance;
}
