# FoodLens AI - Deployment & Architecture Guide

FoodLens AI is an Indian food detection and nutrition tracking system powered by YOLO11 and FastAPI, featuring a modern responsive web frontend.

---

## 🏛 Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             Vercel (Frontend)          │
                      │  - Static HTML5, CSS3, Vanilla JS      │
                      │  - Multi-page app (Dashboard, Scanner, │
                      │    Today's Meals, History, Insights)   │
                      │  - Configured via js/config.js         │
                      └───────────────────┬────────────────────┘
                                          │
                                HTTPS API Requests
                                (CORS configured)
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │              Render (Backend)          │
                      │  - FastAPI Web Service (Python 3.11)   │
                      │  - YOLO11s Object Detection Model      │
                      │  - CPU-optimized PyTorch stack         │
                      │  - SQLite Database (foodlens.db)       │
                      │  - Nutrition Estimation Engine         │
                      └────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
FoodLens_AI/
├── backend/                        # FastAPI application & Database layer
│   ├── database.py                 # SQLite connection, queries, and migrations
│   ├── main.py                     # FastAPI REST API endpoints & YOLO inference
│   └── requirements.txt            # Python dependencies (scoped to backend)
│
├── frontend/                       # Web frontend (Vercel target)
│   ├── css/                        # Modular CSS stylesheets
│   │   ├── dashboard.css
│   │   ├── global.css
│   │   ├── history.css
│   │   ├── insights.css
│   │   ├── meals.css
│   │   ├── profile.css
│   │   └── scanner.css
│   ├── js/                         # Modular JavaScript scripts
│   │   ├── config.js               # Central API URL configuration (Render target)
│   │   ├── api.js                  # FoodLens API client
│   │   ├── dashboard.js            # Dashboard logic
│   │   ├── food.js                 # Food detail modal
│   │   ├── global.js               # Common utilities and notifications
│   │   ├── history.js              # Meal history viewer
│   │   ├── insights.js             # Nutrition insights and recommendations
│   │   ├── profile.js              # Profile and goals view
│   │   ├── scanner.js              # Scanner launcher
│   │   └── today.js                # Today's meals timeline
│   ├── about.html                  # About FoodLens AI page
│   ├── food.html                   # Food details page
│   ├── history.html                # Meal history page
│   ├── index.html                  # Main dashboard
│   ├── insights.html               # Nutrition insights page
│   ├── profile.html                # Goals & preferences page
│   ├── scan.html                   # AI food scanner page
│   ├── today.html                  # Today's meals page
│   ├── script.js                   # Scanner camera and detection handling
│   ├── style.css                   # Global theme and animations
│   └── vercel.json                 # Vercel settings if Root Directory = frontend
│
├── models/
│   └── foodlens_yolo11s_best.pt    # Trained YOLO11s weights (tracked in Git)
│
├── nutrition/                      # Nutrition knowledge base
│   ├── goals.py                    # Daily reference goals
│   ├── nutrition_data.py           # Food item nutrition database
│   └── recommendations.py          # Dynamic recommendation generator
│
├── uploads/                        # Temporary upload directory for inference
│   └── .gitkeep
│
├── .env.example                    # Environment variable template
├── render.yaml                     # Render Blueprint (Infrastructure as Code)
├── requirements.txt                # Root Python dependencies for Render
└── vercel.json                     # Root Vercel config (serves /frontend)
```

---

## 🚀 1. Deploy Backend to Render

### Option A: 1-Click via Render Blueprint (Recommended)
1. Push your repository to GitHub.
2. Log in to [Render](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect your `FoodLens_AI` repository.
5. Render reads `render.yaml` automatically and configures:
   - **Environment**: Python
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check**: `/health`
6. Click **Apply**. Render will build and deploy your service.
7. Once deployed, copy your service URL (e.g., `https://foodlens-ai-backend.onrender.com`).

### Option B: Manual Web Service Setup on Render
1. Go to [Render Dashboard](https://dashboard.render.com) &rarr; **New +** &rarr; **Web Service**.
2. Connect your `FoodLens_AI` repository.
3. Configure settings:
   - **Name**: `foodlens-ai-backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Free or Starter
4. Add **Environment Variables** in the Render settings:
   - `PYTHON_VERSION`: `3.11.9`
   - `ALLOWED_ORIGIN_REGEX`: `^https://.*\.vercel\.app$`
5. Click **Create Web Service**.

> **Note on Render Free Tier:**
> Free tier instances spin down after 15 minutes of inactivity. When a new request arrives, it may take 30–50 seconds to wake up (cold start).

---

## 🌐 2. Deploy Frontend to Vercel

### Steps to Deploy:
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Import your GitHub repository (`FoodLens_AI`).
4. Configure Project:
   - **Framework Preset**: `Other`
   - **Root Directory**: Select `frontend` (or leave as `./` since root `vercel.json` automatically routes to `frontend`).
5. Click **Deploy**. Vercel will deploy the site in a few seconds!

---

## 🔗 3. Connecting Frontend to Backend

1. In [frontend/js/config.js](file:///d:/FoodLens_AI/frontend/js/config.js), update `RENDER_BACKEND_URL` with your Render URL:
   ```javascript
   const RENDER_BACKEND_URL = "https://foodlens-ai-dnwx.onrender.com";
   ```
2. Commit and push:
   ```bash
   git add frontend/js/config.js
   git commit -m "Configure Render backend URL"
   git push origin main
   ```
3. Vercel will automatically redeploy with the updated URL.

> **Tip:** You can also dynamically override the backend URL directly in the browser without redeploying:
> Open DevTools console & run:
> ```javascript
> window.FOODLENS_CONFIG.setApiUrl("https://foodlens-ai-dnwx.onrender.com");
> ```

---

## 💻 Local Development

1. **Start Backend**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
2. **Start Frontend**:
   Serve the `frontend/` directory using any HTTP server:
   ```bash
   # Option 1: Python
   python -m http.server 5500 --directory frontend

   # Option 2: Node.js (npx serve)
   npx serve frontend
   ```
3. Open `http://localhost:5500` in your browser. The frontend will automatically detect localhost and connect to `http://127.0.0.1:8000`.
