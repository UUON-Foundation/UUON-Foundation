import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 7070;

app.use(express.json());

const nodeUrls = (process.env.CLOUUD_NODES || '').split(',');
const threshold = parseInt(process.env.CONSENSUS_THRESHOLD || '3');
const timeout = parseInt(process.env.CONSENSUS_TIMEOUT_MS || '5000');

// Store votes
const votes = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Consensus Manager' });
});

// Collect verification votes from sentinels
app.post('/vote', async (req, res) => {
  const { proof_hash, valid, node_id } = req.body;
  
  if (!votes.has(proof_hash)) {
    votes.set(proof_hash, []);
  }
  
  votes.get(proof_hash).push({ node_id, valid, timestamp: Date.now() });
  
  // Check if consensus reached
  const allVotes = votes.get(proof_hash);
  const validVotes = allVotes.filter(v => v.valid).length;
  
  if (validVotes >= threshold) {
    return res.json({
      consensus: true,
      votes: validVotes,
      threshold,
      signers: allVotes.map(v => v.node_id)
    });
  }
  
  res.json({ consensus: false, votes: validVotes, threshold });
});

// Get consensus status
app.get('/consensus/:proof_hash', (req, res) => {
  const allVotes = votes.get(req.params.proof_hash) || [];
  const validVotes = allVotes.filter(v => v.valid).length;
  
  res.json({
    proof_hash: req.params.proof_hash,
    total_votes: allVotes.length,
    valid_votes: validVotes,
    consensus_reached: validVotes >= threshold,
    signers: allVotes.filter(v => v.valid).map(v => v.node_id)
  });
});

app.listen(PORT, () => {
  console.log(`✓ Consensus Manager running on port ${PORT}`);
  console.log(`✓ Threshold: ${threshold}/${nodeUrls.length}`);
});
