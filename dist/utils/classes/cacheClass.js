export class UnifiedCacheClass {
    cache = new Map();
    defaultTTL;
    constructor(config = {}) {
        this.defaultTTL = config.defaultTTL ?? 1000 * 60 * 5; // Default TTL 5 minutes if not passed
    }
    // Normalize keys: always lowercase
    normalizeKey(key) {
        return key.toLowerCase();
    }
    // get data from cache or fetch if stale/missing
    async getData(cacheKey) {
        const key = this.normalizeKey(cacheKey);
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry && entry.fetching) {
            while (entry.fetching) {
                await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 100ms
            }
            return this.getData(cacheKey);
        }
        const now = Date.now();
        if (now - entry.lastFetchedAt > entry.ttl) {
            // Data is stale
            return null;
        }
        return entry.data;
    }
    // set or update data in cache
    setData(cacheKey, data) {
        const key = this.normalizeKey(cacheKey);
        const now = Date.now();
        const entry = this.cache.get(key);
        if (entry) {
            entry.data = data;
            entry.lastFetchedAt = now;
        }
        else {
            this.cache.set(key, { data, lastFetchedAt: now, ttl: this.defaultTTL });
        }
    }
    // manually invalidate a cache key
    setFetchingStatus(cacheKey, fetching) {
        const key = this.normalizeKey(cacheKey);
        const entry = this.cache.get(key);
        if (entry) {
            entry.fetching = fetching;
        }
        else {
            this.cache.set(key, { data: null, lastFetchedAt: 0, ttl: this.defaultTTL, fetching });
        }
    }
    getAllKeys() {
        return Array.from(this.cache.keys());
    }
}
export const UnifiedCache = new UnifiedCacheClass({
    defaultTTL: 10 * 1000, // 10 Seconds
});
