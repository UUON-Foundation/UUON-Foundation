import crypto from 'crypto';
import { getProofCache } from './proof-cache.js';

/**
 * ProofGenerator: Simulates lattice encoding with caching
 * 
 * In production, this would call the actual Clouud lattice encoder.
 * For now, it generates deterministic proofs based on reasoning content.
 */

export class ProofGenerator {
  constructor() {
    this.cache = getProofCache();
  }

  /**
   * Check cache before generating
   * Returns: { cached: boolean, proof: string, reasoning_hash: string, reuse_info?: object }
   */
  async generateOrRetrieveProof(reasoning, data = null) {
    // Step 1: Check exact cache hit
    const cacheHit = this.cache.checkHit(reasoning);
    if (cacheHit.hit) {
      return {
        cached: true,
        proof: cacheHit.proof,
        reasoning_hash: cacheHit.reasoning_hash,
        reuse_info: {
          reuse_count: cacheHit.reuse_count,
          age_ms: cacheHit.age_ms
        }
      };
    }

    // Step 2: Check for duplicate data (dedup detection)
    let dupInfo = null;
    if (data) {
      const dupCheck = this.cache.checkDuplicate(data);
      if (dupCheck.exists) {
        dupInfo = {
          existing_reasoning_hash: dupCheck.existing_reasoning_hash,
          proof: dupCheck.proof,
          users_already_benefited: dupCheck.users_benefited
        };
      }
    }

    // Step 3: Generate new proof
    const startTime = Date.now();
    const proof = await this._latticeEncode(reasoning);
    const generationTime = Date.now() - startTime;

    // Step 4: Cache the proof
    const storeResult = this.cache.store(reasoning, proof, data);

    return {
      cached: false,
      proof,
      reasoning_hash: storeResult.reasoning_hash,
      content_hash: storeResult.content_hash,
      generation_time_ms: generationTime,
      duplicate_detected: dupInfo ? true : false,
      duplicate_info: dupInfo,
      message: dupInfo 
        ? `Identical reasoning exists. Cache hit avoided re-computation.`
        : 'New proof generated and cached'
    };
  }

  /**
   * Simulate lattice encoding (deterministic, fast)
   * In production: call actual Clouud lattice encoder
   * 
   * Proof format: 0x<64-hex-chars> (256 bits)
   */
  async _latticeEncode(reasoning) {
    // Simulate computation time (10-100ms in dev)
    const delay = Math.random() * 90 + 10;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create deterministic proof from reasoning
    const reasoningStr = typeof reasoning === 'string'
      ? reasoning
      : JSON.stringify(reasoning);

    // Hash reasoning through multiple rounds (simulates lattice encoding)
    let hash = reasoningStr;
    for (let i = 0; i < 3; i++) {
      hash = crypto
        .createHash('sha256')
        .update(hash)
        .digest('hex');
    }

    // Return as proof (64-char hex = 256 bits)
    return '0x' + hash;
  }

  /**
   * Verify a proof matches reasoning (for testing)
   */
  async verifyProof(reasoning, proof) {
    const recomputed = await this._latticeEncode(reasoning);
    return proof === recomputed;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get proof info from cache
   */
  getProofInfo(reasoningHash) {
    return this.cache.getProofInfo(reasoningHash);
  }

  /**
   * Record a user benefited from a cached proof
   */
  recordProofBenefit(reasoningHash, userId) {
    this.cache.recordBenefit(reasoningHash, userId);
  }
}

// Singleton instance
let proofGeneratorInstance = null;

/**
 * Get or create the global proof generator instance
 */
export function getProofGenerator() {
  if (!proofGeneratorInstance) {
    proofGeneratorInstance = new ProofGenerator();
  }
  return proofGeneratorInstance;
}

export default ProofGenerator;
