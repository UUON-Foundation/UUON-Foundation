import { query } from './db.js';

export async function initializeDatabase() {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        credits_balance BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Packages table
    await query(`
      CREATE TABLE IF NOT EXISTS packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        credits BIGINT NOT NULL,
        cost_cents INTEGER NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default packages
    await query(`
      INSERT INTO packages (name, credits, cost_cents) VALUES
      ('starter', 100, 5000),
      ('pro', 500, 20000),
      ('enterprise', 2000, 70000)
      ON CONFLICT (name) DO NOTHING
    `);

    // Transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount BIGINT NOT NULL,
        balance_before BIGINT,
        balance_after BIGINT,
        reference_id VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Transfers table
    await query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id UUID REFERENCES users(id),
        to_user_id UUID REFERENCES users(id),
        amount BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // Proofs table (Phase A: Proof caching)
    await query(`
      CREATE TABLE IF NOT EXISTS proofs (
        reasoning_hash VARCHAR(64) PRIMARY KEY,
        proof VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id),
        description TEXT,
        cached BOOLEAN DEFAULT FALSE,
        usage_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index for faster queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_proofs_user_id ON proofs(user_id)
    `);

    // Data Assets table (Phase B: Ecosystem registration)
    await query(`
      CREATE TABLE IF NOT EXISTS data_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id),
        proof_hash VARCHAR(64) UNIQUE,
        license VARCHAR(20) DEFAULT 'private',
        metadata JSONB,
        data_size_bytes BIGINT,
        usage_count INTEGER DEFAULT 0,
        users_referencing INTEGER DEFAULT 0,
        earnings_accumulated DECIMAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used TIMESTAMP
      )
    `);

    // Create indexes for data_assets
    await query(`CREATE INDEX IF NOT EXISTS idx_data_assets_owner ON data_assets(owner_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_data_assets_license ON data_assets(license)`);

    // Data Asset References (Users accessing shared assets)
    await query(`
      CREATE TABLE IF NOT EXISTS data_asset_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID REFERENCES data_assets(id),
        user_id UUID REFERENCES users(id),
        license_requested VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(asset_id, user_id)
      )
    `);

    // Data Asset Usage (Track usage for revenue sharing)
    await query(`
      CREATE TABLE IF NOT EXISTS data_asset_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID REFERENCES data_assets(id),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for usage tracking
    await query(`CREATE INDEX IF NOT EXISTS idx_asset_usage_asset ON data_asset_usage(asset_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_asset_usage_user ON data_asset_usage(user_id)`);


    console.log('✓ Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
