import express from "express";
import { rateLimit } from "express-rate-limit";
import { body, param, validationResult } from "express-validator";
import cors from "cors";
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
import {
  generateProof,
  getCacheStats,
  getProofInfo,
  checkDuplicate,
  getProofStats
} from "./proof-handlers.js";
import {
  registerDataAsset,
  getDataAsset,
  listDataAssets,
  getUserAssetStats,
  useDataAsset
} from "./asset-handlers.js";

const app = express();
const PORT = process.env.PORT || 5001;

// ========================================================================
// MIDDLEWARE - Auth, Validation, Security
// ========================================================================

// 1. CORS Refinement (Task 4.3)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL || "https://uuon.io"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "x-user-id", "Authorization"]
}));

app.use(express.json());

// 2. Rate Limiting Middleware (Task 4.1)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per windowMs per IP
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health"
});

const creditBuyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 purchases per hour per user
  keyGenerator: (req) => req.get("x-user-id") || req.ip,
  message: "Purchase limit exceeded, try again later"
});

// 3. Auth Validation Middleware (Task 2.1)
const validateUserId = (req, res, next) => {
  const userId = req.get("x-user-id");
  
  if (!userId) {
    return res.status(400).json({
      error: "Missing x-user-id header",
      code: "AUTH_MISSING_USER_ID"
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return res.status(400).json({
      error: "Invalid x-user-id format (must be UUID)",
      code: "AUTH_INVALID_USER_ID"
    });
  }

  req.userId = userId;
  next();
};

// 4. Input Validation Middleware (Task 4.2)
const validateBuyCredits = [
  body("user_id")
    .isUUID()
    .withMessage("user_id must be a valid UUID"),
  body("package_id")
    .isUUID()
    .withMessage("package_id must be a valid UUID"),
  body("txHash")
    .optional()
    .isLength({ min: 66 })
    .withMessage("txHash must be valid blockchain hash"),
  body("chain")
    .optional()
    .isIn(["ethereum", "polygon", "arbitrum"])
    .withMessage("chain must be ethereum, polygon, or arbitrum")
];

const validateTransfer = [
  body("from_user_id").isUUID().withMessage("from_user_id must be UUID"),
  body("to_user_id").isUUID().withMessage("to_user_id must be UUID"),
  body("amount").isInt({ min: 1 }).withMessage("amount must be positive integer")
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }
  next();
};

// 5. Audit Logging Middleware (Task 4.4)
const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        user_id: req.userId || req.get("x-user-id"),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ip: req.ip,
        result: res.statusCode < 400 ? "success" : "failure"
      };
      
      // Log to console (in production, send to logging service)
      console.log(JSON.stringify(logEntry));
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Error handler middleware
app.use((err, req, res, next) => {
  console.error({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({ 
    error: "Internal server error",
    code: "INTERNAL_ERROR"
  });
});

// ========================================================================
// SYSTEM ENDPOINTS
// ========================================================================

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

app.get("/api/v1/status", (req, res) => {
  res.json({
    service: "UUON Billing API",
    version: "1.0.0",
    status: "online"
  });
});

// ========================================================================
// API ENDPOINTS WITH SECURITY MIDDLEWARE
// ========================================================================

// Credit Packages (public)
app.get("/api/v1/packages", listPackages);
app.get("/api/credits/packages", listPackages); // Legacy

// User Management
// POST /api/v1/users - public (bootstrap), optional x-user-id for admin context
app.post("/api/v1/users", 
  auditLog("user_create"),
  createUser
);

app.get("/api/v1/users", listUsers);

app.get("/api/v1/users/:user_id", 
  param("user_id").isUUID().withMessage("user_id must be UUID"),
  handleValidationErrors,
  validateUserId,
  getUser
);

// Credit Operations - Protected endpoints
app.post("/api/v1/credits/buy",
  limiter,
  creditBuyLimiter,
  validateUserId,
  validateBuyCredits,
  handleValidationErrors,
  auditLog("credits_buy"),
  buyCredits
);

app.post("/api/credits/buy",
  limiter,
  creditBuyLimiter,
  validateUserId,
  validateBuyCredits,
  handleValidationErrors,
  auditLog("credits_buy"),
  buyCredits
); // Legacy

app.get("/api/v1/credits/balance/:user_id",
  param("user_id").isUUID(),
  handleValidationErrors,
  validateUserId,
  getBalance
);

app.get("/api/credits/balance/:user_id",
  param("user_id").isUUID(),
  handleValidationErrors,
  validateUserId,
  getBalance
); // Legacy

app.post("/api/v1/credits/transfer",
  limiter,
  validateUserId,
  validateTransfer,
  handleValidationErrors,
  auditLog("credits_transfer"),
  transferCredits
);

app.post("/api/credits/transfer",
  limiter,
  validateUserId,
  validateTransfer,
  handleValidationErrors,
  auditLog("credits_transfer"),
  transferCredits
); // Legacy

app.post("/api/v1/credits/use",
  limiter,
  validateUserId,
  body("user_id").isUUID(),
  body("amount").isInt({ min: 1 }),
  handleValidationErrors,
  auditLog("credits_use"),
  useCredits
);

// Transaction History
app.get("/api/v1/transactions/:user_id",
  param("user_id").isUUID(),
  handleValidationErrors,
  validateUserId,
  getTransactionHistory
);

// Analytics (should be admin-only in production)
app.get("/api/v1/analytics",
  validateUserId, // Can extend this to check for admin role
  auditLog("analytics_view"),
  getAnalytics
);

// ========================================================================
// PROOF GENERATION & CACHING ENDPOINTS (Phase A)
// ========================================================================

// POST /api/v1/proofs/generate - Generate proof from reasoning (with caching)
app.post("/api/v1/proofs/generate",
  limiter,
  validateUserId,
  body("reasoning").notEmpty().withMessage("reasoning is required"),
  body("user_id").isUUID().withMessage("user_id must be UUID"),
  handleValidationErrors,
  auditLog("proof_generate"),
  generateProof
);

// GET /api/v1/proofs/cache/stats - Get cache statistics
app.get("/api/v1/proofs/cache/stats",
  validateUserId,
  auditLog("cache_stats_view"),
  getCacheStats
);

// GET /api/v1/proofs/:reasoning_hash/info - Get proof details
app.get("/api/v1/proofs/:reasoning_hash/info",
  validateUserId,
  param("reasoning_hash").isLength({ min: 64, max: 64 }).withMessage("invalid reasoning_hash"),
  handleValidationErrors,
  getProofInfo
);

// POST /api/v1/proofs/check-duplicate - Check if data exists
app.post("/api/v1/proofs/check-duplicate",
  limiter,
  validateUserId,
  body("data").notEmpty().withMessage("data is required"),
  handleValidationErrors,
  auditLog("duplicate_check"),
  checkDuplicate
);

// GET /api/v1/proofs/stats/global - Get global proof statistics
app.get("/api/v1/proofs/stats/global",
  validateUserId,
  auditLog("proof_stats_view"),
  getProofStats
);

// ========================================================================
// DATA ASSET ENDPOINTS (Phase B - Ecosystem Registration)
// ========================================================================

// POST /api/v1/data-assets/register - Register data in ecosystem
app.post("/api/v1/data-assets/register",
  limiter,
  validateUserId,
  body("owner_id").isUUID().withMessage("owner_id must be UUID"),
  body("data").notEmpty().withMessage("data is required"),
  body("license").optional().isIn(["public", "private", "commercial"]),
  handleValidationErrors,
  auditLog("data_asset_register"),
  registerDataAsset
);

// GET /api/v1/data-assets - List accessible assets
app.get("/api/v1/data-assets",
  validateUserId,
  auditLog("data_assets_list"),
  listDataAssets
);

// GET /api/v1/data-assets/:asset_id - Get asset details
app.get("/api/v1/data-assets/:asset_id",
  validateUserId,
  param("asset_id").isUUID().withMessage("asset_id must be UUID"),
  handleValidationErrors,
  auditLog("data_asset_get"),
  getDataAsset
);

// GET /api/v1/data-assets/stats/user - Get user's asset stats
app.get("/api/v1/data-assets/stats/user",
  validateUserId,
  auditLog("data_asset_stats"),
  getUserAssetStats
);

// POST /api/v1/data-assets/:asset_id/use - Use/access an asset
app.post("/api/v1/data-assets/:asset_id/use",
  limiter,
  validateUserId,
  param("asset_id").isUUID().withMessage("asset_id must be UUID"),
  handleValidationErrors,
  auditLog("data_asset_use"),
  useDataAsset
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    code: "NOT_FOUND"
  });
});

// ========================================================================
// STARTUP
// ========================================================================

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✓ UUON Billing API running on port ${PORT}`);
      console.log(`✓ Database initialized`);
      console.log(`✓ Security middleware: Auth, Rate Limiting, Input Validation, CORS`);
      console.log(`✓ Audit logging enabled`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
