import express from "express";

const app = express();

const PORT = process.env.PORT || 5001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "UUON Foundation Billing System",
    endpoints: [
      "/health",
      "/api/v1/status"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime()
  });
});

app.get("/api/v1/status", (req, res) => {
  res.json({
    service: "UUON Billing API",
    version: "1.0.0",
    status: "online"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
