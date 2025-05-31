/**
 * Simple in-memory cache utility for SharePoint Explorer
 * Provides caching with TTL (Time To Live) support
 */

class SharePointCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    /**
     * Generate a cache key for SharePoint API calls
     * @param {string} type - Type of data (libraries, folders, files, statuses)
     * @param {string} driveId - Drive ID (optional)
     * @param {string} parentId - Parent folder ID (optional)
     * @returns {string} Cache key
     */
    generateKey(type, driveId = null, parentId = null) {
        const parts = [type];
        if (driveId) parts.push(`drive:${driveId}`);
        if (parentId) parts.push(`parent:${parentId}`);
        return parts.join('|');
    }

    /**
     * Set data in cache with TTL
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, data, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, {
            data,
            expiresAt,
            createdAt: Date.now()
        });
        console.log(`[Cache] Set key: ${key}, expires in ${ttl}ms`);
    }

    /**
     * Get data from cache if not expired
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if not found/expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            console.log(`[Cache] Miss: ${key}`);
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            console.log(`[Cache] Expired: ${key}`);
            this.cache.delete(key);
            return null;
        }

        console.log(`[Cache] Hit: ${key}`);
        return entry.data;
    }

    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and is valid
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Remove a specific key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        console.log(`[Cache] Delete: ${key}`);
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        console.log('[Cache] Clearing all entries');
        this.cache.clear();
    }

    /**
     * Remove expired entries from cache
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`[Cache] Cleaned up ${removedCount} expired entries`);
        }
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
        };
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match keys (simple string contains)
     */
    invalidateByPattern(pattern) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`[Cache] Invalidated ${keysToDelete.length} entries matching pattern: ${pattern}`);
    }
}

// Create a singleton instance
const sharePointCache = new SharePointCache();

// Set up periodic cleanup (every 10 minutes)
setInterval(() => {
    sharePointCache.cleanup();
}, 10 * 60 * 1000);

export default sharePointCache;

/**
 * Higher-order function to wrap API calls with caching
 * @param {Function} apiFunction - The API function to wrap
 * @param {Function} keyGenerator - Function to generate cache key
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Function} Wrapped function with caching
 */
export const withCache = (apiFunction, keyGenerator, ttl) => {
    return async (...args) => {
        const cacheKey = keyGenerator(...args);
        
        // Try to get from cache first
        const cachedData = sharePointCache.get(cacheKey);
        if (cachedData !== null) {
            return cachedData;
        }

        // If not in cache, call the API
        try {
            const data = await apiFunction(...args);
            sharePointCache.set(cacheKey, data, ttl);
            return data;
        } catch (error) {
            // Don't cache errors, just throw them
            throw error;
        }
    };
};