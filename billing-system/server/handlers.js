import { query } from './db.js';
import { CreateUserSchema, BuyCreditSchema, TransferCreditsSchema, UseCreditsSchema, PaginationSchema } from './validation.js';

// User Management
export async function createUser(req, res) {
  try {
    const { email } = CreateUserSchema.parse(req.body);
    const result = await query(
      'INSERT INTO users (email, credits_balance) VALUES ($1, $2) RETURNING *',
      [email, 0]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getUser(req, res) {
  try {
    const { user_id } = req.params;
    const result = await query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listUsers(req, res) {
  try {
    const { limit, offset } = PaginationSchema.parse(req.query);
    const result = await query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ users: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Credit Packages
export async function listPackages(req, res) {
  try {
    const result = await query('SELECT * FROM packages WHERE active = true');
    res.json({ packages: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Credit Operations
export async function buyCredits(req, res) {
  try {
    const { user_id, package_id } = BuyCreditSchema.parse(req.body);
    
    // Get package details
    const pkgResult = await query('SELECT * FROM packages WHERE id = $1', [package_id]);
    if (pkgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    const pkg = pkgResult.rows[0];

    // Get user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    // Update user credits
    const updatedUser = await query(
      'UPDATE users SET credits_balance = credits_balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [pkg.credits, user_id]
    );

    // Log transaction
    await query(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user_id, 'purchase', pkg.credits, user.credits_balance, user.credits_balance + pkg.credits, package_id, `Purchased ${pkg.name} package`]
    );

    res.status(201).json({ user: updatedUser.rows[0], transaction: { package: pkg.name, credits_purchased: pkg.credits } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getBalance(req, res) {
  try {
    const { user_id } = req.params;
    const result = await query('SELECT id, email, credits_balance FROM users WHERE id = $1', [user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ balance: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function transferCredits(req, res) {
  try {
    const { from_user_id, to_user_id, amount } = TransferCreditsSchema.parse(req.body);

    // Verify both users exist
    const fromResult = await query('SELECT * FROM users WHERE id = $1', [from_user_id]);
    const toResult = await query('SELECT * FROM users WHERE id = $1', [to_user_id]);
    
    if (fromResult.rows.length === 0 || toResult.rows.length === 0) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    const fromUser = fromResult.rows[0];
    if (fromUser.credits_balance < amount) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    // Create transfer record
    const transfer = await query(
      'INSERT INTO transfers (from_user_id, to_user_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [from_user_id, to_user_id, amount, 'completed']
    );

    // Deduct from sender
    await query(
      'UPDATE users SET credits_balance = credits_balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, from_user_id]
    );

    // Add to recipient
    await query(
      'UPDATE users SET credits_balance = credits_balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, to_user_id]
    );

    // Log transactions
    await query(
      'INSERT INTO transactions (user_id, type, amount, balance_before, description) VALUES ($1, $2, $3, $4, $5)',
      [from_user_id, 'transfer_out', amount, fromUser.credits_balance, `Transferred to ${to_user_id}`]
    );

    res.status(201).json({ transfer: transfer.rows[0], status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function useCredits(req, res) {
  try {
    const { user_id, amount, description } = UseCreditsSchema.parse(req.body);

    const userResult = await query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.credits_balance < amount) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    const updated = await query(
      'UPDATE users SET credits_balance = credits_balance - $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [amount, user_id]
    );

    await query(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [user_id, 'usage', amount, user.credits_balance, user.credits_balance - amount, description || 'Credits used']
    );

    res.json({ user: updated.rows[0], credits_used: amount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// Transaction History
export async function getTransactionHistory(req, res) {
  try {
    const { user_id } = req.params;
    const { limit, offset } = PaginationSchema.parse(req.query);

    const result = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [user_id, limit, offset]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Admin Analytics
export async function getAnalytics(req, res) {
  try {
    const usersResult = await query('SELECT COUNT(*) as total FROM users');
    const creditsResult = await query('SELECT SUM(credits_balance) as total_credits FROM users');
    const transactionsResult = await query('SELECT COUNT(*) as total FROM transactions');

    res.json({
      analytics: {
        total_users: parseInt(usersResult.rows[0].total),
        total_credits_in_circulation: parseInt(creditsResult.rows[0].total_credits || 0),
        total_transactions: parseInt(transactionsResult.rows[0].total),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
