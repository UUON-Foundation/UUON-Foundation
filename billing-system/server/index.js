import express from "express";

const app = express();

const PORT = process.env.PORT || 5001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "UUON Foundation Billing System"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime()
  });
});

app.get("/api/credits/packages", (req, res) => {
  res.json({
    packages: [
      { name: "starter", credits: 100, cost: 50 },
      { name: "pro", credits: 500, cost: 200 },
      { name: "enterprise", credits: 2000, cost: 700 }
    ]
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
  console.log(`UUON Billing API running on port ${PORT}`);
});
