import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Credit packages
app.get('/api/credits/packages', (req, res) => {
  res.json({
    packages: [
      { name: 'starter', credits: 100, cost: 50 },
      { name: 'pro', credits: 500, cost: 200 },
      { name: 'enterprise', credits: 2000, cost: 700 }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`UUON Billing API running on port ${PORT}`);
});
