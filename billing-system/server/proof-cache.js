import crypto from 'crypto';

/**
 * ProofCache: In-memory cache for generated proofs
 * 
 * Features:
 * - Content-hash deduplication (identical reasoning = same proof)
 * - Hit/miss tracking for analytics
 * - TTL support for cache invalidation
 * - Memory management (LRU eviction optional)
 */

export class ProofCache {
  constructor(options = {}) {
    this.cache = new Map(); // reasoningHash -> CachedProof
    this.contentHashIndex = new Map(); // contentHash -> reasoningHash (for dedup detection)
    this.maxSize = options.maxSize || 10000; // Max cached proofs
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    this.stats = {
      hits: 0,
      misses: 0,
      duplicates_detected: 0,
      evictions: 0
    };
  }

  /**
   * Hash reasoning to create a deterministic key
   */
  _hashReasoning(reasoning) {
    const reasoningStr = typeof reasoning === 'string' 
      ? reasoning 
      : JSON.stringify(reasoning);
    return crypto.createHash('sha256').update(reasoningStr).digest('hex');
  }

  /**
   * Create a content hash for deduplication detection
   */
  _hashContent(data) {
    const dataStr = typeof data === 'string' 
      ? data 
      : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataStr).digest('hex');
  }

  /**
   * Check if this exact reasoning has been cached
   * Returns: { hit: boolean, proof?: Proof, reasoning_hash: string }
   */
  checkHit(reasoning) {
    const reasoningHash = this._hashReasoning(reasoning);
    
    if (this.cache.has(reasoningHash)) {
      const cached = this.cache.get(reasoningHash);
      
      // Check TTL
      if (Date.now() - cached.created_at > this.ttl) {
        this.cache.delete(reasoningHash);
        this.contentHashIndex.delete(cached.content_hash);
        this.stats.misses++;
        return { hit: false, reasoning_hash: reasoningHash };
      }
      
      // Cache hit
      cached.hits++;
      cached.last_accessed = Date.now();
      this.stats.hits++;
      
      return {
        hit: true,
        proof: cached.proof,
        reasoning_hash: reasoningHash,
        reuse_count: cached.hits,
        age_ms: Date.now() - cached.created_at
      };
    }
    
    this.stats.misses++;
    return { hit: false, reasoning_hash: reasoningHash };
  }

  /**
   * Check if similar reasoning already exists (dedup detection)
   * Returns: { exists: boolean, existing_reasoning_hash?: string, proof?: Proof }
   */
  checkDuplicate(data) {
    const contentHash = this._hashContent(data);
    
    if (this.contentHashIndex.has(contentHash)) {
      const reasoningHash = this.contentHashIndex.get(contentHash);
      const cached = this.cache.get(reasoningHash);
      
      this.stats.duplicates_detected++;
      
      return {
        exists: true,
        existing_reasoning_hash: reasoningHash,
        proof: cached.proof,
        users_benefited: cached.users_benefited.size
      };
    }
    
    return { exists: false, content_hash: contentHash };
  }

  /**
   * Store a newly generated proof in cache
   */
  store(reasoning, proof, data = null) {
    const reasoningHash = this._hashReasoning(reasoning);
    const contentHash = data ? this._hashContent(data) : null;
    
    // Check if we're at max capacity (simple eviction: remove oldest)
    if (this.cache.size >= this.maxSize) {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [key, cached] of this.cache.entries()) {
        if (cached.last_accessed < oldestTime) {
          oldestTime = cached.last_accessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        const evicted = this.cache.get(oldestKey);
        this.cache.delete(oldestKey);
        if (evicted.content_hash) {
          this.contentHashIndex.delete(evicted.content_hash);
        }
        this.stats.evictions++;
      }
    }
    
    // Store in cache
    const cachedProof = {
      proof,
      reasoning_hash: reasoningHash,
      content_hash: contentHash,
      created_at: Date.now(),
      last_accessed: Date.now(),
      hits: 0,
      users_benefited: new Set() // Track unique users who benefited
    };
    
    this.cache.set(reasoningHash, cachedProof);
    
    // Index by content hash for dedup detection
    if (contentHash) {
      this.contentHashIndex.set(contentHash, reasoningHash);
    }
    
    return {
      reasoning_hash: reasoningHash,
      content_hash: contentHash,
      cached: true
    };
  }

  /**
   * Track that a user benefited from a cached proof
   */
  recordBenefit(reasoningHash, userId) {
    if (this.cache.has(reasoningHash)) {
      const cached = this.cache.get(reasoningHash);
      cached.users_benefited.add(userId);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? (this.stats.hits / totalRequests * 100).toFixed(2) 
      : 0;
    
    return {
      cache_size: this.cache.size,
      max_size: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hit_rate: `${hitRate}%`,
      duplicates_detected: this.stats.duplicates_detected,
      evictions: this.stats.evictions,
      memory_estimate_mb: (this.cache.size * 0.064).toFixed(2) // ~64KB per entry avg
    };
  }

  /**
   * Get detailed info about a cached proof
   */
  getProofInfo(reasoningHash) {
    if (!this.cache.has(reasoningHash)) {
      return null;
    }
    
    const cached = this.cache.get(reasoningHash);
    return {
      reasoning_hash: reasoningHash,
      content_hash: cached.content_hash,
      proof: cached.proof,
      created_at: new Date(cached.created_at).toISOString(),
      last_accessed: new Date(cached.last_accessed).toISOString(),
      reuse_count: cached.hits,
      users_benefited: cached.users_benefited.size,
      age_ms: Date.now() - cached.created_at,
      ttl_remaining_ms: this.ttl - (Date.now() - cached.created_at)
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clear() {
    this.cache.clear();
    this.contentHashIndex.clear();
    this.stats = { hits: 0, misses: 0, duplicates_detected: 0, evictions: 0 };
  }

  /**
   * Export cache state (for debugging/analysis)
   */
  export() {
    const entries = [];
    for (const [reasoningHash, cached] of this.cache.entries()) {
      entries.push({
        reasoning_hash: reasoningHash,
        content_hash: cached.content_hash,
        proof: cached.proof,
        created_at: new Date(cached.created_at).toISOString(),
        hits: cached.hits,
        users_benefited: Array.from(cached.users_benefited)
      });
    }
    
    return {
      stats: this.getStats(),
      entries
    };
  }
}

// Singleton instance
let proofCacheInstance = null;

/**
 * Get or create the global proof cache instance
 */
export function getProofCache(options = {}) {
  if (!proofCacheInstance) {
    proofCacheInstance = new ProofCache(options);
  }
  return proofCacheInstance;
}

// Export default
export default ProofCache;
