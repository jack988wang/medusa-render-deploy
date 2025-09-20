"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
class CacheService {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_TTL = 60 * 1000;
    }
    set(key, value, ttl = this.DEFAULT_TTL) {
        const expireAt = Date.now() + ttl;
        this.cache.set(key, { data: value, expireAt });
        setTimeout(() => {
            this.delete(key);
        }, ttl);
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }
        if (Date.now() > item.expireAt) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    async getOrSet(key, fetchFn, ttl = this.DEFAULT_TTL) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
    }
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        const keysToDelete = [];
        this.cache.forEach((_, key) => {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.delete(key));
    }
    getStats() {
        const keys = Array.from(this.cache.keys());
        const size = this.cache.size;
        let totalBytes = 0;
        this.cache.forEach((value) => {
            totalBytes += JSON.stringify(value).length;
        });
        return {
            size,
            keys,
            memoryUsage: `${(totalBytes / 1024).toFixed(2)} KB`
        };
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
