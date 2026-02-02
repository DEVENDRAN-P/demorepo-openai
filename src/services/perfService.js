/**
 * Performance Monitoring Service
 * Tracks timing of all authentication operations
 * Helps identify bottlenecks in the auth flow
 */

class PerfService {
  constructor() {
    this.marks = {};
    this.measures = {};
  }

  /**
   * Start a performance timer
   * @param {string} name - Name of the operation
   */
  start(name) {
    this.marks[name] = performance.now();
    console.log(`⏱️ [PERF] Starting: ${name}`);
  }

  /**
   * End a performance timer and log the duration
   * @param {string} name - Name of the operation
   * @returns {number} Duration in milliseconds
   */
  end(name) {
    if (!this.marks[name]) {
      console.warn(`⚠️ [PERF] No start mark for: ${name}`);
      return 0;
    }

    const duration = performance.now() - this.marks[name];
    this.measures[name] = duration;

    const emoji = this.getEmoji(duration);
    console.log(`${emoji} [PERF] ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Get emoji based on performance
   * @param {number} duration - Duration in milliseconds
   * @returns {string} Emoji indicator
   */
  getEmoji(duration) {
    if (duration < 100) return "🚀"; // Excellent
    if (duration < 300) return "⚡"; // Good
    if (duration < 800) return "⏳"; // Acceptable
    if (duration < 1500) return "🐢"; // Slow
    return "🐌"; // Very slow
  }

  /**
   * Get all measurements
   * @returns {object} All recorded measurements
   */
  getAll() {
    return this.measures;
  }

  /**
   * Get total time
   * @param {array} names - Array of operation names to sum
   * @returns {number} Total duration
   */
  getTotal(names) {
    return names.reduce((sum, name) => sum + (this.measures[name] || 0), 0);
  }

  /**
   * Clear all marks and measures
   */
  clear() {
    this.marks = {};
    this.measures = {};
  }

  /**
   * Log a performance summary
   * @param {string} title - Title for the summary
   * @param {array} operations - Array of operation names
   */
  summary(title, operations) {
    console.group(`📊 ${title}`);
    operations.forEach((op) => {
      const duration = this.measures[op];
      if (duration !== undefined) {
        const emoji = this.getEmoji(duration);
        console.log(`  ${emoji} ${op}: ${duration.toFixed(2)}ms`);
      }
    });
    const total = this.getTotal(operations);
    console.log(`  📈 Total: ${total.toFixed(2)}ms`);
    console.groupEnd();
  }
}

export const perf = new PerfService();
