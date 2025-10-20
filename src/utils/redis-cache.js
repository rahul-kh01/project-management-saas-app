/**
 * Redis Caching System (Optional Enhancement)
 * 
 * This module provides Redis-based caching for even better performance.
 * Install redis package: npm install redis
 * 
 * Usage: Set REDIS_URL environment variable to enable Redis caching
 */

import { createClient } from 'redis';

class RedisCacheManager {
  constructor() {
    this.client = null;
    this.connected = false;
    this.fallbackCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  async connect() {
    if (!process.env.REDIS_URL) {
      console.log('[Redis] REDIS_URL not set, using in-memory fallback');
      return false;
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.client.on('error', (err) => {
        console.error('[Redis] Client error:', err);
        this.connected = false;
        this.stats.errors++;
      });

      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        console.log('[Redis] Disconnected');
        this.connected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('[Redis] Connection failed:', error);
      this.connected = false;
      return false;
    }
  }

  async set(key, value, ttl = 300) { // TTL in seconds
    this.stats.sets++;
    
    try {
      if (this.connected && this.client) {
        const serialized = JSON.stringify({
          value,
          timestamp: Date.now(),
          ttl: ttl * 1000
        });
        await this.client.setEx(key, ttl, serialized);
        return true;
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set(key, {
          value,
          timestamp: Date.now(),
          ttl: ttl * 1000
        });
        return true;
      }
    } catch (error) {
      console.error('[Redis] Set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async get(key) {
    try {
      if (this.connected && this.client) {
        const serialized = await this.client.get(key);
        if (!serialized) {
          this.stats.misses++;
          return null;
        }

        const data = JSON.parse(serialized);
        
        // Check if expired
        const now = Date.now();
        if (now - data.timestamp > data.ttl) {
          await this.delete(key);
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        return data.value;
      } else {
        // Fallback to in-memory cache
        const item = this.fallbackCache.get(key);
        if (!item) {
          this.stats.misses++;
          return null;
        }

        // Check if expired
        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
          this.fallbackCache.delete(key);
          this.stats.misses++;
          return null;
        }

        this.stats.hits++;
        return item.value;
      }
    } catch (error) {
      console.error('[Redis] Get error:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  async delete(key) {
    this.stats.deletes++;
    
    try {
      if (this.connected && this.client) {
        await this.client.del(key);
      } else {
        this.fallbackCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('[Redis] Delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async has(key) {
    const value = await this.get(key);
    return value !== null;
  }

  async clear() {
    try {
      if (this.connected && this.client) {
        await this.client.flushAll();
      } else {
        this.fallbackCache.clear();
      }
      return true;
    } catch (error) {
      console.error('[Redis] Clear error:', error);
      this.stats.errors++;
      return false;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      connected: this.connected,
      fallbackMode: !this.connected
    };
  }

  async disconnect() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

// Create singleton instances
export const redisUserCache = new RedisCacheManager();
export const redisMembershipCache = new RedisCacheManager();
export const redisProjectCache = new RedisCacheManager();

// Initialize Redis connections
Promise.all([
  redisUserCache.connect(),
  redisMembershipCache.connect(),
  redisProjectCache.connect()
]).then((results) => {
  const connectedCount = results.filter(Boolean).length;
  console.log(`[Redis] ${connectedCount}/3 cache instances connected`);
}).catch(error => {
  console.error('[Redis] Initialization failed:', error);
});

export default RedisCacheManager;
