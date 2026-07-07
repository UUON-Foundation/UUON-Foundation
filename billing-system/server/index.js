import express from "express";
import { initializeDatabase } from "./schema.js";
import {
  createUser,
  getUser,
  listUsers,
  listPackages,
  buyCredits,
  getBalance,
  transferCredits,
  useCredits,
  getTransactionHistory,
  getAnalytics
} from "./handlers.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// System endpoints
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "UUON Foundation Billing System",
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API v1 endpoints
app.get("/api/v1/status", (req, res) => {
  res.json({
    service: "UUON Billing API",
    version: "1.0.0",
    status: "online"
  });
});

// Credit Packages (GET only)
app.get("/api/v1/packages", listPackages);
app.get("/api/credits/packages", listPackages); // Legacy endpoint

// User Management
app.post("/api/v1/users", createUser);
app.get("/api/v1/users", listUsers);
app.get("/api/v1/users/:user_id", getUser);

// Credit Operations
app.post("/api/v1/credits/buy", buyCredits);
app.post("/api/credits/buy", buyCredits); // Legacy
app.get("/api/v1/credits/balance/:user_id", getBalance);
app.get("/api/credits/balance/:user_id", getBalance); // Legacy
app.post("/api/v1/credits/transfer", transferCredits);
app.post("/api/credits/transfer", transferCredits); // Legacy
app.post("/api/v1/credits/use", useCredits);

// Transaction History
app.get("/api/v1/transactions/:user_id", getTransactionHistory);

// Analytics (admin only in production)
app.get("/api/v1/analytics", getAnalytics);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Initialize and start
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✓ UUON Billing API running on port ${PORT}`);
      console.log(`✓ Database initialized`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
