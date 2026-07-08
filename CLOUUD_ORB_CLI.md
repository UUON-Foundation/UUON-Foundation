# CLOUUD ORB CLI - Executable Specification

## Installation (Like Desktop App)

```bash
# One-liner install
curl -fsSL https://raw.githubusercontent.com/uuonnouu/clouud-orb/main/install.sh | bash

# Or git clone
gh repo clone uuonnouu/clouud-orb
cd clouud-orb && npm install && npm run build
```

## Run Anywhere

```bash
# Desktop (macOS/Linux/Windows with WSL)
clouud-orb daemon

# Docker
docker run -it uuon/clouud-orb:latest

# SSH Remote
ssh user@remote 'clouud-orb --headless'

# Kubernetes Pod
kubectl apply -f clouud-orb-deployment.yaml

# Raspberry Pi / ARM
clouud-orb --minimal
```

## CLI Commands

```bash
# Status
orb status                  # Shows: position, energy, tasks, network

# Control Orb
orb bend left              # Prove compliance
orb twist cw 90            # Demonstrate logic
orb orbit 5 20             # Visualize data flow

# Charts (From Thin Air)
orb chart revenue          # Live revenue stream
orb chart energy           # System energy state
orb chart network          # Consensus network status
orb chart governance       # AI control metrics

# Tasks
orb task "Deploy mainnet"           # Create task
orb execute 1                        # Run task
orb status tasks                     # List all

# Governance (The 16 Controls)
orb audit alignment                  # Check goal alignment
orb audit oversight                  # Verify human review
orb audit emergence                  # Monitor emergent behavior
orb audit explainability             # Log reasoning
orb audit control                    # Verify shutdown capability

# Network
orb network status                   # Consensus state
orb network propose <decision>       # Propose governance action
orb network vote <proposal_id>       # Vote on decision

# Daemon Mode
orb daemon --port 3333              # Start background server
orb socket send 'bend right'        # Send command via socket
```

## Governance + Control (Addresses All 16 AI Safety Concerns)

### 1. Alignment Monitoring
```
orb audit alignment
→ Goal: Serve UUON Foundation
→ Current: Processing transactions, monitoring consensus
→ Divergence risk: 0.02%
→ Last human review: 2h ago
```

### 2. Oversight Dashboard
```
orb audit oversight
→ Human decisions required this hour: 3
→ Decisions reviewed: 3 (100%)
→ Autonomous actions: 147
→ Shutdown available: YES (kill switch responsive)
```

### 3. Emergent Behavior Detection
```
orb audit emergence
→ Unexpected patterns detected: 2
→ Pattern 1: 15% efficiency gain (SAFE - documented)
→ Pattern 2: New data compression (SAFE - matches hypothesis)
→ Unknown unknowns flag: LOW
```

### 4. Explainability Log
```
orb audit explainability
→ Last 10 decisions (all logged):
  1. Route transaction → Why: Lowest gas, verified sender
  2. Propose consensus → Why: 3 sentinels agree, energy < 5%
  3. Deny transfer → Why: Balance check failed, logged
```

### 5. Control Verification
```
orb audit control
→ Shutdown response time: 120ms
→ Hard kill available: YES
→ Resource limits: CPU 50%, RAM 2GB (enforced)
→ Permissions: Read/execute only (no write to core)
```

## Architecture (Portable)

```
clouud-orb/
├── core/
│  ├── orb-engine.ts          # Core animation + logic
│  ├── governance.ts          # 16 safety controls
│  ├── consensus-client.ts    # Network integration
│  └── metrics.ts             # Real-time data
│
├── cli/
│  ├── commands/
│  │  ├── bend.ts
│  │  ├── twist.ts
│  │  ├── orbit.ts
│  │  ├── chart.ts
│  │  ├── audit.ts            # GOVERNANCE
│  │  └── network.ts
│  └── repl.ts               # Interactive shell
│
├── daemon/
│  ├── server.ts             # Socket listener
│  ├── api.ts                # REST endpoints
│  └── persistence.ts        # State file
│
├── docker/
│  ├── Dockerfile            # Multi-arch (x86/ARM)
│  ├── docker-compose.yml    # Standalone + network mode
│  └── kubernetes.yaml       # K8s deployment
│
└── install.sh              # One-liner installer
```

## Addresses All 16 AI Control Risks

| Risk | Control | CLI Command |
|------|---------|-------------|
| 1. Alignment failure | Goal audit + human review | `orb audit alignment` |
| 2. Loss of oversight | Mandatory human sign-off | `orb audit oversight` |
| 3. Emergent behavior | Pattern detection logging | `orb audit emergence` |
| 4. Misinformation | Output verification gate | `orb audit explainability` |
| 5. Autonomous agents | Permission limits (read-only) | `orb audit control` |
| 6. Cybersecurity | Isolated execution env | Docker sandboxing |
| 7. Economic disruption | Transparent allocation | `orb chart revenue` |
| 8. Power centralization | Decentralized governance | `orb network vote` |
| 9. Privacy/surveillance | No data collection | Code audit |
| 10. Model poisoning | Immutable transaction log | `orb audit explainability` |
| 11. Lack of explainability | Every decision logged | `orb audit explainability` |
| 12. Self-improvement | Frozen core, versioned | Git tags only |
| 13. Autonomous weapons | Not applicable (billing system) | N/A |
| 14. Skill erosion | Human-in-loop required | Mandatory review gates |
| 15. Goal preservation | Shutdown kill switch | `kill $(orb-pid)` |
| 16. Unknown unknowns | Continuous monitoring | `orb audit emergence` |

## Example: Full Session

```bash
# 1. Start daemon
$ clouud-orb daemon --port 3333
✓ ORB daemon started (PID: 12345)
✓ Listening on localhost:3333
✓ Governance: ACTIVE
✓ Consensus: CONNECTED

# 2. Check status
$ orb status
╔════════════════════════════════════════════════════════╗
║                   CLOUUD ORB ACTIVE                     ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║              ⭕ Green Orb (Hardware-Free)             ║
║                                                        ║
║  Position: X0.5 Y0.5 Z0.5     Energy: ██████████ 87%  ║
║  Rotation: R0° P0° Y45°        Mode: GOVERNANCE        ║
║                                                        ║
║  Status: 🟢 ACTIVE             Memory: 147 commands   ║
║  Consensus: SYNCED (3/3)       Oversight: 100%        ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║ Tasks: [COMPLETE] Deploy (100%) | [RUNNING] Audit (35%) ║
╠════════════════════════════════════════════════════════╣
║ GOVERNANCE: All 16 controls ACTIVE                     ║
║ Last audit: 45s ago ✓                                  ║
╚════════════════════════════════════════════════════════╝

# 3. Check governance (addresses AI safety)
$ orb audit alignment
✓ Goal alignment: VERIFIED
  Foundation mission: ACTIVE
  Revenue allocation: 100% → Legal/Trust (PHASE 1)
  Divergence: 0.01%

# 4. Live chart
$ orb chart revenue
Revenue (24h):
  Mon  │ ████░░░░░░  €12K
  Tue  │ ██████░░░░  €18K
  Wed  │ ████████░░  €24K  ← NOW
  Projected: €450K/month

# 5. Prove a point
$ orb bend left
↺ Orb bends LEFT to prove compliance with governance rules

# 6. Send command via socket (from another process)
$ curl -X POST http://localhost:3333/command -d '{"action":"twist","direction":"cw","degrees":180}'
✓ Twisted 180° clockwise
✓ Demonstrated: "Multi-chain scaling possible"

# 7. Exit
$ orb daemon stop
✓ Shutting down cleanly
✓ State persisted to ~/.clouud/state.json
✓ Goodbye.
```

## Distribution

```bash
# GitHub release (one-click download)
https://github.com/uuonnouu/clouud-orb/releases/download/v1.0.0/clouud-orb-macos-arm64
https://github.com/uuonnouu/clouud-orb/releases/download/v1.0.0/clouud-orb-linux-x64
https://github.com/uuonnouu/clouud-orb/releases/download/v1.0.0/clouud-orb-windows-x64

# Docker Hub
docker pull uuon/clouud-orb:latest

# npm (global)
npm install -g @uuon/clouud-orb
clouud-orb daemon
```

## Social Curve Integration

The ORB doesn't just control Clouud—it **proves** Clouud is controlled:

1. **Transparent governance** — Every decision logged, auditable
2. **Human approval gates** — Can't run without review
3. **Kill switch verified** — Public proof Clouud can be stopped
4. **Social trust** — YouTube demos of governance in action
5. **Regulatory ready** — All 16 AI safety controls documented

This addresses: "Advanced AI systems difficult to control" → **False. Clouud-ORB proof.**

