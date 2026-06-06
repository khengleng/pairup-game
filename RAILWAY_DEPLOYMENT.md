# 🚀 PairUp Game - Railway Deployment Guide

This guide will help you deploy the PairUp memory matching game to Railway.com in just a few minutes.

## Prerequisites

- Railway.com account (free tier available)
- GitHub account with the pairup-game repository
- 5 minutes of your time

## Step-by-Step Deployment

### Step 1: Create a New Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select the **`pairup-game`** repository
6. Click **"Deploy Now"**

Railway will automatically detect it's a Node.js project and start building.

### Step 2: Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"MySQL"**
3. Railway will create a MySQL instance automatically
4. The `DATABASE_URL` will be automatically added to your environment variables

### Step 3: Configure Environment Variables

1. Go to your Railway project dashboard
2. Click on the **"Variables"** tab
3. Add the following environment variables:

```
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
PORT=3000
```

**Optional (for analytics):**
```
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### Step 4: Verify Deployment

1. Once the build completes, Railway will show your app URL (e.g., `pairup-game.up.railway.app`)
2. Click the URL to visit your live game
3. Test the game:
   - Play a game round
   - Submit a lead
   - Check the leaderboard
   - Try admin access (if you set up user roles)

### Step 5: Add Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your custom domain (e.g., `pairup.yourcompany.com`)
4. Update your DNS records as instructed by Railway

### Step 6: Enable Auto-Deploy from GitHub

1. Go to **Project Settings** → **GitHub**
2. Enable **"Auto Deploy"**
3. Now every push to `main` branch will automatically deploy

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Railway might not have installed dependencies correctly
- Go to **Build Logs** tab to see the full error
- Try manually triggering a rebuild by clicking **"Redeploy"**

**Error: "Database connection failed"**
- Wait 30 seconds for MySQL to fully initialize
- Check that `DATABASE_URL` is set in Variables
- Manually trigger a redeploy

### App Won't Start

**Error: "Port 3000 already in use"**
- This shouldn't happen on Railway, but if it does:
- Go to Variables and set `PORT=3000` (it should already be set)

**Error: "Cannot connect to database"**
- Check the MySQL service is running (green status in Railway dashboard)
- Verify `DATABASE_URL` is set correctly
- Try restarting the app by clicking **"Redeploy"**

## Features That Work Out of the Box

✅ Memory matching game with all themes and difficulties
✅ Move counter and timer
✅ Lead capture form
✅ Social sharing buttons
✅ Leaderboard page
✅ Admin dashboard (for lead management)
✅ Database persistence
✅ Responsive design

## Database Migrations

The app automatically creates tables on first run. If you need to manually run migrations:

1. Go to Railway dashboard
2. Click on the **MySQL** service
3. Click **"Connect"** → **"MySQL Shell"**
4. The tables will be created automatically when the app starts

## Monitoring & Logs

### View Logs

1. Go to your Railway project
2. Click on the **"Logs"** tab
3. You'll see real-time logs of your app

### Monitor Performance

1. Go to **"Metrics"** tab
2. View CPU, memory, and network usage
3. Set up alerts if needed (paid feature)

## Updating Your App

To deploy updates:

1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update PairUp game"
   git push origin main
   ```
3. Railway will automatically rebuild and deploy

## Cost Estimate

- **Free Tier**: Up to $5/month credit (includes 500 hours of compute)
- **Typical Usage**: $5-15/month for a small game
- **High Traffic**: $20-50/month

## Next Steps

1. **Customize the game**: Update card pairs in `shared/gameConfig.ts`
2. **Add your branding**: Update colors and logo
3. **Set up email notifications**: Configure SMTP for lead alerts
4. **Add authentication**: Implement user accounts if needed

## Support

- Railway Docs: https://docs.railway.app
- PairUp GitHub: https://github.com/khengleng/pairup-game
- Issues? Check the Railway dashboard logs for error messages

---

**That's it! Your PairUp game is now live on Railway! 🎉**
