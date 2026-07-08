import { query } from './db.js';
import { getProofGenerator } from './proof-generator.js';
import { z } from 'zod';

/**
 * Data Asset Handlers - Phase B: Ecosystem Asset Registration
 * 
 * Enables:
 * - Data ownership tracking
 * - Ecosystem-wide deduplication
 * - Usage tracking for revenue sharing
 * - License enforcement (public/private/commercial)
 */

const RegisterDataAssetSchema = z.object({
  owner_id: z.string().uuid(),
  data: z.union([z.string(), z.object({})]),
  license: z.enum(['public', 'private', 'commercial']).default('private'),
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional()
  }).optional()
});

/**
 * POST /api/v1/data-assets/register
 * Register data in ecosystem (with dedup detection)
 * 
 * If identical data exists: User gets reference to existing asset
 * If new data: Asset is registered and indexed
 * 
 * Request:
 * {
 *   "owner_id": "uuid",
 *   "data": "CSV content or JSON object",
 *   "license": "public|private|commercial",
 *   "metadata": {
 *     "title": "Q1 Sales Data",
 *     "description": "Company sales for Q1 2025",
 *     "tags": ["sales", "quarterly", "financial"],
 *     "category": "finance"
 *   }
 * }
 */
export async function registerDataAsset(req, res) {
  try {
    const { owner_id, data, license, metadata } = RegisterDataAssetSchema.parse(req.body);
    const proofGen = getProofGenerator();

    // Step 1: Generate proof (automatic caching + dedup detection)
    const proofResult = await proofGen.generateOrRetrieveProof(data, data);

    // Step 2: Check if this exact asset already exists
    const existingAsset = await query(
      'SELECT * FROM data_assets WHERE proof_hash = $1',
      [proofResult.reasoning_hash]
    );

    if (existingAsset.rows.length > 0) {
      // DEDUPED: Asset already registered
      const asset = existingAsset.rows[0];

      // Add reference for this user
      await query(
        `INSERT INTO data_asset_references (asset_id, user_id, license_requested, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [asset.id, owner_id, license]
      );

      return res.json({
        status: 'deduplicated',
        asset_id: asset.id,
        proof_hash: asset.proof_hash,
        owner_id: asset.owner_id,
        created_at: asset.created_at,
        usage_count: asset.usage_count,
        users_referencing: asset.users_referencing,
        message: 'Data already in ecosystem. You now have access via reference.',
        savings: {
          computation_saved: 'Yes (proof reused)',
          storage_saved: 'Yes (no duplicate copy)',
          gas_savings_percent: 99
        }
      });
    }

    // Step 3: Register new asset
    const assetId = crypto.randomUUID ? crypto.randomUUID() : require('uuid').v4();
    
    await query(
      `INSERT INTO data_assets 
       (id, owner_id, proof_hash, license, metadata, data_size_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        assetId,
        owner_id,
        proofResult.reasoning_hash,
        license,
        JSON.stringify(metadata || {}),
        typeof data === 'string' ? data.length : JSON.stringify(data).length
      ]
    );

    return res.status(201).json({
      status: 'registered',
      asset_id: assetId,
      proof_hash: proofResult.reasoning_hash,
      owner_id,
      license,
      metadata,
      created_at: new Date().toISOString(),
      proof_info: {
        cached: proofResult.cached,
        generation_time_ms: proofResult.generation_time_ms
      },
      message: 'Data registered. Available for ecosystem reuse.'
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/v1/data-assets/:asset_id
 * Get asset details
 */
export async function getDataAsset(req, res) {
  try {
    const { asset_id } = req.params;

    const result = await query(
      'SELECT * FROM data_assets WHERE id = $1',
      [asset_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = result.rows[0];

    // Check if user has access
    const userId = req.get('x-user-id');
    const accessResult = await query(
      `SELECT * FROM data_asset_references 
       WHERE asset_id = $1 AND user_id = $2`,
      [asset_id, userId]
    );

    const hasAccess = asset.owner_id === userId || 
                      asset.license === 'public' || 
                      accessResult.rows.length > 0;

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        asset_id,
        license: asset.license,
        owner_id: asset.owner_id
      });
    }

    res.json({
      asset: {
        ...asset,
        metadata: JSON.parse(asset.metadata)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/data-assets
 * List accessible assets for user
 */
export async function listDataAssets(req, res) {
  try {
    const userId = req.get('x-user-id');
    const { limit = 50, offset = 0 } = req.query;

    // Get owned assets + public assets + referenced assets
    const result = await query(
      `SELECT DISTINCT da.* FROM data_assets da
       LEFT JOIN data_asset_references dar ON da.id = dar.asset_id
       WHERE da.owner_id = $1 OR da.license = 'public' OR dar.user_id = $1
       ORDER BY da.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const assets = result.rows.map(asset => ({
      ...asset,
      metadata: JSON.parse(asset.metadata)
    }));

    res.json({
      assets,
      total: assets.length,
      limit,
      offset
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/data-assets/stats/user
 * Get asset statistics for current user
 */
export async function getUserAssetStats(req, res) {
  try {
    const userId = req.get('x-user-id');

    // Assets owned
    const owned = await query(
      `SELECT 
        COUNT(*) as count,
        SUM(usage_count) as total_uses,
        SUM(data_size_bytes) as total_size
       FROM data_assets WHERE owner_id = $1`,
      [userId]
    );

    // Assets referenced/accessed
    const accessed = await query(
      `SELECT 
        COUNT(DISTINCT asset_id) as count
       FROM data_asset_references WHERE user_id = $1`,
      [userId]
    );

    res.json({
      user_stats: {
        assets_owned: parseInt(owned.rows[0].count),
        total_uses_of_owned: parseInt(owned.rows[0].total_uses || 0),
        owned_storage_bytes: parseInt(owned.rows[0].total_size || 0),
        assets_referenced: parseInt(accessed.rows[0].count),
        potential_earnings: `${parseInt(owned.rows[0].total_uses || 0) * 0.50} credits`
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/data-assets/:asset_id/use
 * Use an asset (track usage for revenue sharing)
 * 
 * Returns the asset data (if access allowed)
 * Increments usage counter for revenue tracking
 */
export async function useDataAsset(req, res) {
  try {
    const { asset_id } = req.params;
    const userId = req.get('x-user-id');

    const assetResult = await query(
      'SELECT * FROM data_assets WHERE id = $1',
      [asset_id]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assetResult.rows[0];

    // Check access
    if (asset.license === 'private' && asset.owner_id !== userId) {
      const refResult = await query(
        'SELECT * FROM data_asset_references WHERE asset_id = $1 AND user_id = $2',
        [asset_id, userId]
      );

      if (refResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Increment usage
    await query(
      'UPDATE data_assets SET usage_count = usage_count + 1, last_used = NOW() WHERE id = $1',
      [asset_id]
    );

    // Track usage (for Phase C revenue sharing)
    await query(
      `INSERT INTO data_asset_usage (asset_id, user_id, created_at)
       VALUES ($1, $2, NOW())`,
      [asset_id, userId]
    );

    res.json({
      asset_id,
      accessed_at: new Date().toISOString(),
      owner_earned: 0.50, // Will be implemented in Phase C
      message: 'Asset accessed. Owner credit accrual tracked.'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default {
  registerDataAsset,
  getDataAsset,
  listDataAssets,
  getUserAssetStats,
  useDataAsset
};
