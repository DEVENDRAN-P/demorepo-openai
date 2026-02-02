/**
 * Rate Limiter Utility
 * Prevents API abuse and excessive requests
 */

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Check if a request is allowed based on rate limit
   * @param {string} key - Unique identifier (user ID, IP, etc.)
   * @returns {boolean} - true if request is allowed, false if rate limited
   */
  isAllowed(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove expired requests
    const validRequests = userRequests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    // Cleanup old entries
    if (this.requests.size > 1000) {
      this.cleanupOldEntries();
    }

    return true;
  }

  /**
   * Get remaining requests for a key
   * @param {string} key - Unique identifier
   * @returns {number} - Remaining requests
   */
  getRemaining(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Get reset time for a key
   * @param {string} key - Unique identifier
   * @returns {number} - Milliseconds until rate limit resets
   */
  getResetTime(key) {
    const userRequests = this.requests.get(key) || [];
    if (userRequests.length === 0) return 0;

    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  cleanupOldEntries() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.requests.clear();
  }
}

// Create instances for different services
export const apiRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute
export const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes (prevent brute force)
export const chatRateLimiter = new RateLimiter(30, 60000); // 30 messages per minute

export default RateLimiter;
