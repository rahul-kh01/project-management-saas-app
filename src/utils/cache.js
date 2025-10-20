/**
 * Enhanced Caching System
 * 
 * This module provides a robust caching system with TTL support,
 * automatic cleanup, and fallback mechanisms for chat performance optimization.
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Set a value in the cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 300000) { // Default 5 minutes
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
      this.stats.evictions++;
    }, ttl);

    this.timers.set(key, timer);
    this.stats.sets++;

    return true;
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if deleted, false if not found
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if exists and not expired
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      activeTimers: this.timers.size
    };
  }

  /**
   * Clean up expired entries (manual cleanup)
   * @returns {number} - Number of entries cleaned up
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all cache keys
   * @returns {string[]} - Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   * @returns {number} - Number of entries in cache
   */
  size() {
    return this.cache.size;
  }
}

// Create singleton instances for different cache types
export const userCache = new CacheManager();
export const membershipCache = new CacheManager();
export const projectCache = new CacheManager();

// Global cache cleanup every 5 minutes
setInterval(() => {
  const userCleaned = userCache.cleanup();
  const membershipCleaned = membershipCache.cleanup();
  const projectCleaned = projectCache.cleanup();
  
  if (userCleaned > 0 || membershipCleaned > 0 || projectCleaned > 0) {
    console.log(`[Cache] Cleaned up: ${userCleaned} users, ${membershipCleaned} memberships, ${projectCleaned} projects`);
  }
}, 5 * 60 * 1000);

// Log cache statistics every 10 minutes
setInterval(() => {
  const userStats = userCache.getStats();
  const membershipStats = membershipCache.getStats();
  const projectStats = projectCache.getStats();
  
  console.log('[Cache Stats]', {
    users: userStats,
    memberships: membershipStats,
    projects: projectStats
  });
}, 10 * 60 * 1000);

export default CacheManager;
