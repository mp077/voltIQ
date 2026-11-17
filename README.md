# VOLTIQ GRID — Smart Energy Consumption & Demand Management System

An industrial-grade SCADA web platform for real-time energy monitoring, machine learning anomaly detection, demand response coordination, and 7-day predictive load forecasting.

---

## ⚡ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Python Flask, Flask-JWT-Extended, Flask-CORS, Gunicorn
- **Database:** SQLite (Relational schema with foreign keys, indexes, and seeded data)
- **Machine Learning:** Scikit-Learn (Isolation Forest for Anomaly Detection, Random Forest / Gradient Boosting for Forecasting), Pandas, NumPy, Joblib
- **Deployment:** Render (Pre-configured `render.yaml` Blueprint & `Procfile`)

---

## 🚀 Quick Start (Local)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## ☁️ Deploying to Render

This repository includes a `render.yaml` Blueprint ready for deployment:

### Option 1: Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `https://github.com/mp077/voltIQ.git`.
4. Render will automatically detect `render.yaml` and configure:
   - **Backend Web Service** (`energy-scada-backend`) running Python with `gunicorn app:app`
   - **Frontend Static Site** (`energy-scada-frontend`) running Vite with automatic rewrite rules

### Option 2: Manual Deploy on Render

#### Backend Service:
- **Type:** Web Service
- **Environment:** Python
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
- **Environment Variables:**
  - `JWT_SECRET_KEY`: `your-random-secret-key-at-least-32-chars`
  - `FLASK_DEBUG`: `false`

#### Frontend Service:
- **Type:** Static Site
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL`: `https://your-backend-service.onrender.com`
- **Rewrite Rules:**
  - `/*` -> `/index.html`

---

## 🔑 Demo Login Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| **Energy Administrator** | `admin` | `Admin@123` | Full control across all buildings, users, and meters |
| **Facility Manager** | `fm1` | `FM1@pass` | Building telemetry, alerts, maintenance & DR events |
| **Consumer** | `consumer1` | `Consumer@123` | Personal meter consumption & DR participation |
| **Technician** | `tech1` | `Tech1@pass` | Assigned maintenance work orders & repair notes |

---

## 📊 Modules
1. **Dashboard:** SCADA monitoring console, floor load distribution, KPIs, consumption trends
2. **Consumers:** Consumer registry, assigned facilities, tariff plans
3. **Buildings:** Facility manager assignments, floor zoning, consumption stats
4. **Smart Meters:** IoT meter registry, telemetry pulse simulations
5. **Energy Monitoring:** Real-time load stream, voltage & power factor baselines
6. **Anomaly Detection:** Scikit-Learn Isolation Forest outlier detection
7. **Alerts:** Event log, severity levels, response latency tracking
8. **Maintenance:** Technician dispatch, status lifecycle, repair notes
9. **Demand Response:** Peak curtailment requests, load shaving verification
10. **Analytics & Forecasting:** 7-day predictive regression models, MAE metrics
11. **Reports:** Ledger reports, cost calculations, CSV telemetry export
12. **Settings:** Alarm thresholds, demand ceilings, profile management
