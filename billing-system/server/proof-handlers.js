import { query } from './db.js';
import { getProofGenerator } from './proof-generator.js';
import { z } from 'zod';

/**
 * New endpoints for proof generation with caching
 * Supports Phase A: Proof caching + dedup detection
 */

// Schema for proof generation request
const GenerateProofSchema = z.object({
  reasoning: z.union([z.string(), z.object({})]),
  data: z.union([z.string(), z.object({})]).optional(),
  user_id: z.string().uuid(),
  description: z.string().optional()
});

/**
 * POST /api/v1/proofs/generate
 * Generate a proof from reasoning (with caching)
 * 
 * Request:
 * {
 *   "reasoning": "Summarize Q1 earnings" | { task: "...", context: ... },
 *   "data": "CSV data or object",  // optional
 *   "user_id": "uuid",
 *   "description": "Q1 earnings summary"
 * }
 * 
 * Response:
 * {
 *   "proof": "0x...",
 *   "reasoning_hash": "sha256...",
 *   "cached": true/false,
 *   "generation_time_ms": 45,
 *   "reuse_info": { "reuse_count": 3, "age_ms": 1200 },
 *   "duplicate_detected": false,
 *   "message": "..."
 * }
 */
export async function generateProof(req, res) {
  try {
    const { reasoning, data, user_id, description } = GenerateProofSchema.parse(req.body);
    const proofGen = getProofGenerator();

    // Generate or retrieve cached proof
    const result = await proofGen.generateOrRetrieveProof(reasoning, data);

    // Record user benefited from proof
    proofGen.recordProofBenefit(result.reasoning_hash, user_id);

    // Store proof metadata in database
    await query(
      `INSERT INTO proofs (reasoning_hash, proof, user_id, description, cached)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reasoning_hash) DO UPDATE SET
         usage_count = proofs.usage_count + 1,
         last_used = NOW()`,
      [result.reasoning_hash, result.proof, user_id, description, result.cached]
    );

    res.status(201).json({
      proof: result.proof,
      reasoning_hash: result.reasoning_hash,
      content_hash: result.content_hash,
      cached: result.cached,
      generation_time_ms: result.generation_time_ms,
      reuse_info: result.reuse_info,
      duplicate_detected: result.duplicate_detected,
      duplicate_info: result.duplicate_info,
      message: result.message,
      cache_stats: proofGen.getCacheStats()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/v1/proofs/cache/stats
 * Get current cache statistics
 * 
 * Response:
 * {
 *   "cache_size": 42,
 *   "max_size": 10000,
 *   "hits": 1250,
 *   "misses": 350,
 *   "hit_rate": "78.12%",
 *   "duplicates_detected": 23,
 *   "evictions": 0,
 *   "memory_estimate_mb": "2.69"
 * }
 */
export async function getCacheStats(req, res) {
  try {
    const proofGen = getProofGenerator();
    const stats = proofGen.getCacheStats();

    res.json({
      cache_stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/proofs/:reasoning_hash/info
 * Get detailed info about a cached proof
 */
export async function getProofInfo(req, res) {
  try {
    const { reasoning_hash } = req.params;
    const proofGen = getProofGenerator();

    const info = proofGen.getProofInfo(reasoning_hash);
    if (!info) {
      return res.status(404).json({ error: 'Proof not found in cache' });
    }

    res.json({ proof_info: info });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/proofs/check-duplicate
 * Check if reasoning/data already exists in cache
 * (useful before uploading large datasets)
 * 
 * Request:
 * {
 *   "data": "CSV or object content",
 *   "reasoning": "optional description"
 * }
 * 
 * Response:
 * {
 *   "exists": true,
 *   "reasoning_hash": "sha256...",
 *   "proof": "0x...",
 *   "users_benefited": 5,
 *   "message": "Identical data already cached, you can reuse it"
 * }
 */
export async function checkDuplicate(req, res) {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data field required' });
    }

    const proofGen = getProofGenerator();
    const dupCheck = proofGen.cache.checkDuplicate(data);

    if (dupCheck.exists) {
      const proofInfo = proofGen.getProofInfo(dupCheck.existing_reasoning_hash);
      return res.json({
        exists: true,
        reasoning_hash: dupCheck.existing_reasoning_hash,
        proof: dupCheck.proof,
        users_benefited: dupCheck.users_benefited,
        proof_info: proofInfo,
        message: `Identical reasoning exists. Save time: reuse proof instead of re-generating.`
      });
    }

    res.json({
      exists: false,
      message: 'No duplicate found. Ready to generate new proof.'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/v1/proofs/stats/global
 * Get global proof statistics (from database)
 * 
 * Returns:
 * - Total proofs generated
 * - Proofs from cache reuse
 * - Average reuse count
 * - Total users benefited
 */
export async function getProofStats(req, res) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_proofs,
        SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cached_reuses,
        AVG(usage_count) as avg_reuse_count,
        MAX(usage_count) as max_reuse_count,
        SUM(usage_count) as total_usage
       FROM proofs`
    );

    const stats = result.rows[0];

    res.json({
      global_stats: {
        total_proofs_in_db: parseInt(stats.total_proofs),
        proofs_from_cache_reuse: parseInt(stats.cached_reuses || 0),
        average_reuse_per_proof: parseFloat(stats.avg_reuse_count || 0).toFixed(2),
        max_reuse_count: parseInt(stats.max_reuse_count || 0),
        total_proof_uses: parseInt(stats.total_usage || 0),
        efficiency: stats.total_usage > 0
          ? `${((parseInt(stats.cached_reuses || 0) / parseInt(stats.total_usage)) * 100).toFixed(2)}% cache hit rate`
          : 'N/A'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default {
  generateProof,
  getCacheStats,
  getProofInfo,
  checkDuplicate,
  getProofStats
};
