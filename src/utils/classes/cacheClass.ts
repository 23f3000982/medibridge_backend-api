
type CacheEntry = {
    data: any;
    lastFetchedAt: number;
    ttl: number;
    fetching?: boolean;  // Track if the key is being fetche
};

interface CacheConfig {
    defaultTTL?: number; // Default TTL in ms
}

export class UnifiedCacheClass {
    private cache: Map<string, CacheEntry> = new Map();
    private defaultTTL: number;

    constructor(config: CacheConfig = {}) {
        this.defaultTTL = config.defaultTTL ?? 1000 * 60 * 5; // Default TTL 5 minutes if not passed
    }

    // Normalize keys: always lowercase
    normalizeKey(key: string): string {
        return key.toLowerCase();
    }


    // get data from cache or fetch if stale/missing
    async getData(cacheKey: string): Promise<any | null> {
        const key = this.normalizeKey(cacheKey);
        const entry = this.cache.get(key);
        if (!entry) return null;

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
    setData(cacheKey: string, data: any) {
        const key = this.normalizeKey(cacheKey);
        const now = Date.now();
        const entry = this.cache.get(key);
        if (entry) {
            entry.data = data;
            entry.lastFetchedAt = now;
        } else {
            this.cache.set(key, { data, lastFetchedAt: now, ttl: this.defaultTTL });
        }
    }

    // manually invalidate a cache key
    setFetchingStatus(cacheKey: string, fetching: boolean) {
        const key = this.normalizeKey(cacheKey);
        const entry = this.cache.get(key);
        if (entry) {
            entry.fetching = fetching;
        } else {
            this.cache.set(key, { data: null, lastFetchedAt: 0, ttl: this.defaultTTL, fetching });
        }
    }




    getAllKeys(): string[] {
        return Array.from(this.cache.keys());
    }


}

export const UnifiedCache = new UnifiedCacheClass({
    defaultTTL: 10 * 1000, // 10 Seconds
});
