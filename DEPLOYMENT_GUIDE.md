# DEPLOYMENT TO PRODUCTION - QUICK GUIDE

## From Your MacBook Terminal → Live on the Internet

You have everything built locally. Here's how to make it available worldwide in 5 minutes.

---

## **OPTION 1: Railway (Recommended - Easiest)**

### **Step 1: Go to Railway**
```
https://railway.app
```
- Click "Sign up" → Use GitHub (one button)
- Authorize → Done

### **Step 2: Create New Project**
- Dashboard → "New Project" → "Deploy from GitHub"
- Search: `UUON-Foundation`
- Click "UUON-Foundation/UUON-Foundation"
- Click "Deploy"

Railway now:
- Reads your Dockerfile.billing
- Builds your Docker image
- Runs your app
- Gives you a live URL

### **Step 3: Add Environment Variables**
Go to Railway Dashboard → Your Project → Settings → Variables

Add these (copy from .env.railway.example):
```
DATABASE_URL = postgresql://...
NODE_ENV = production
REPLIT_CLIENT_ID = your_id
REPLIT_CLIENT_SECRET = your_secret
```

### **Step 4: Get Your Live URL**
- Go to "Deployments" tab
- Copy the URL (looks like: https://uuon-abc123.railway.app)
- **That's your live API!**

### **Step 5: Test It Works**
```bash
curl https://uuon-abc123.railway.app/health
```

---

## **OPTION 2: Docker Hub → Your Own Server**

### **If you have your own Linux server:**

**Step 1: Push to Docker Hub**
```bash
# Create account at https://hub.docker.com
docker login

docker build -f Dockerfile.billing -t your-username/uuon-billing .
docker push your-username/uuon-billing
```

**Step 2: On your server (Ubuntu/CentOS):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Run your app
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e NODE_ENV=production \
  your-username/uuon-billing
```

**Step 3: Get your URL**
- Server IP: your-server-ip:8080
- Or use a domain: your-domain.com (point DNS to server)

---

## **OPTION 3: Heroku (Deprecated - Not Recommended)**

Heroku is sunsetting (March 2025). Don't use this.

---

## **WHAT HAPPENS AFTER DEPLOYMENT**

### **Your API is Live:**
```
POST https://your-app.railway.app/api/v1/credits/buy
GET https://your-app.railway.app/api/v1/credits/balance/:user_id
... all 20 endpoints work globally
```

### **Users Can:**
- Log in with Replit OAuth
- Buy credits
- Upload data assets
- Earn referral rewards
- See their proof cache working

### **You Can:**
- Monitor logs (Railway dashboard)
- View metrics (CPU, memory, requests)
- Redeploy with `git push origin main`
- Scale up (add more resources)

---

## **COMMON ISSUES**

| Issue | Fix |
|-------|-----|
| "Database not found" | Railway auto-adds postgres. Check DATABASE_URL in Variables |
| "OAuth fails" | Update REPLIT_REDIRECT_URI to your new URL |
| "Port 8080 in use" | Change PORT in environment variables |
| "502 Bad Gateway" | Check logs in Railway → Logs tab |
| App crashes after deploy | View error in Railway Logs, fix, `git push` again |

---

## **MONITORING YOUR LIVE APP**

### **Railway Dashboard**
- https://railway.app/dashboard
- Logs: See what your app is doing
- Metrics: CPU, memory, response times
- Deployments: History of what was deployed

### **CLI Monitoring** (if you prefer terminal)
```bash
railway logs -f          # Follow logs in real-time
railway status           # Check current status
railway down             # Stop the app
railway up --logs        # Start with logs
```

---

## **AUTOMATIC UPDATES**

Every time you do this:
```bash
cd ~/UUON-Foundation
git push origin main
```

Railway automatically:
1. Detects change
2. Rebuilds Docker image
3. Runs tests (from CI/CD)
4. Deploys new version
5. Runs health checks
6. **Your live API updates** (zero downtime)

---

## **NEXT: AUTOMATIC CI/CD**

Your GitHub Actions pipeline (.github/workflows/complete-ci-cd.yml) includes:
- ✅ Linting
- ✅ Unit tests
- ✅ Security scan
- ✅ Docker build
- ✅ Deploy to staging
- ✅ Deploy to production
- ✅ Health checks

Every push runs all 10 stages automatically!

---

## **YOU'RE DONE!**

Your UUON system is now:
- ✅ Live on the internet
- ✅ Running 24/7
- ✅ Auto-updating from GitHub
- ✅ Monitored and logged
- ✅ Scalable and production-ready

Get your live URL from Railway dashboard and share it with anyone!
