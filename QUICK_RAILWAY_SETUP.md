# ⚡ Quick Railway Setup - 5 Minute Deploy

## Copy-Paste Instructions

### 1. Go to Railway and Create Project

```
https://railway.app/new
→ Click "Deploy from GitHub repo"
→ Select "pairup-game"
→ Click "Deploy Now"
```

### 2. Wait for Build to Complete

Railway will automatically:
- ✅ Install dependencies
- ✅ Build the project
- ✅ Create a MySQL database
- ✅ Deploy your app

**Build time: ~3-5 minutes**

### 3. Add Environment Variables

Click **"Variables"** tab and add:

```
JWT_SECRET=change-me-to-a-random-string-12345
NODE_ENV=production
```

### 4. That's It! 🎉

Your app is now live at: `pairup-game.up.railway.app`

---

## What Railway Automatically Does

✅ Creates MySQL database
✅ Sets DATABASE_URL environment variable
✅ Builds your Node.js app
✅ Starts the server
✅ Provides HTTPS/SSL
✅ Auto-deploys on GitHub push

---

## Test Your Deployment

1. Visit your app URL
2. Play a game
3. Submit a lead
4. Check the leaderboard
5. View admin dashboard

---

## Troubleshooting

**App won't start?**
- Check Railway logs (Logs tab)
- Make sure MySQL is running (green status)
- Try clicking "Redeploy"

**Database connection error?**
- Wait 30 seconds for MySQL to initialize
- Refresh the page
- Check DATABASE_URL in Variables tab

**Build failed?**
- Check Build Logs tab
- Make sure package.json has correct scripts
- Try redeploying

---

## Next: Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., pairup.yourcompany.com)
3. Update DNS records as shown
4. Done!

---

## Costs

- Free tier: $5/month credit
- Typical usage: $5-15/month
- High traffic: $20-50/month

---

**Questions? Check Railway docs: https://docs.railway.app**
