# Multi-Vendor E-Commerce Marketplace

A multi-vendor e-commerce marketplace platform inspired by Amazon and Meesho, engineered for seamless vendor onboarding, catalog management, high-speed faceted search, Redis-backed carts, and automated payment splits via Razorpay Route.

---

## Strict Tech Stack

- **Frontend:** React (JavaScript, ES modules), Plain CSS (No Tailwind / UI frameworks)
- **Backend:** Node.js with Express (JavaScript, ES modules)
- **Database:** MongoDB via `mongoose`
- **Search Engine:** Elasticsearch 8.x via `@elastic/elasticsearch`
- **Cache & Sessions:** Redis via `ioredis`
- **Storage:** AWS S3 via `@aws-sdk/client-s3` (presigned client-side uploads)
- **Payments:** Razorpay Route (Test Mode) via `razorpay`

---

## Monorepo Directory Structure

```
marketplace/
├── docker-compose.yml       # Local dev services (Mongo, Redis, Elasticsearch)
├── README.md                # Project documentation and setup guide
├── .gitignore               # Root git ignore rules
├── docs/                    # Project specifications and architecture docs
│   └── marketplace-project-doc.md
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/          # env.js, db.js (Mongoose), redis.js (ioredis), es.js
│   │   ├── controllers/     # Route controllers (health.controller.js)
│   │   ├── middleware/      # errorHandler.js, rateLimiter.js, helmet, cors
│   │   ├── models/          # Mongoose models (.gitkeep)
│   │   ├── routes/          # Express route definitions (health.routes.js)
│   │   ├── services/        # Business logic services (health.service.js)
│   │   ├── utils/           # Helper utilities (.gitkeep)
│   │   ├── app.js           # Express app definition & middleware pipeline
│   │   └── server.js        # Server listener and graceful shutdown
│   ├── scripts/             # seed.js, reindex.js (.gitkeep)
│   ├── tests/               # Unit and integration tests (.gitkeep)
│   ├── .env.example         # Environment variable template (Section 7.4)
│   ├── .env                 # Local environment variables
│   └── package.json
└── frontend/                # React SPA (Vite + React Router + Axios)
    ├── src/
    │   ├── api/             # Axios instance (axios.js)
    │   ├── components/      # Navbar, Footer, Layout
    │   ├── hooks/           # Custom React hooks (.gitkeep)
    │   ├── pages/           # HomePage, NotFoundPage
    │   ├── routes/          # AppRoutes.jsx
    │   ├── store/           # Global state management (.gitkeep)
    │   ├── App.jsx          # Root application with router
    │   ├── index.css        # Plain CSS design system & responsive layout
    │   └── main.jsx         # React DOM root render
    ├── index.html           # HTML template
    ├── vite.config.js       # Vite build configuration
    ├── .env.example         # Frontend environment variable template
    ├── .env                 # Frontend local environment variables
    └── package.json
```

---

## Prerequisites

Before running the application, make sure you have the following installed:
1. **Node.js** (v18.x or v20.x or v22.x) and **npm** (v9+ or v10+)
2. **Docker** and **Docker Compose** (via Docker Desktop or Docker Engine)

---

## Step-by-Step Local Setup

### 1. Start Infrastructure Services (Docker Compose)

From the root directory, start MongoDB, Redis, and Elasticsearch in the background:

```bash
docker compose up -d
```

Verify that the containers are healthy and running:

```bash
docker compose ps
```

Services started:
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200` (single-node, security disabled for dev, 512MB heap)

---

### 2. Backend Setup & Run

1. Open a new terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure `.env` is created (copy from `.env.example` if not already present):
   ```bash
   cp .env.example .env
   ```

4. Start the backend development server (with nodemon):
   ```bash
   npm run dev
   ```

The backend server starts on `http://localhost:5000`.

---

### 3. Frontend Setup & Run

1. Open another terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure `.env` is created (copy from `.env.example` if not already present):
   ```bash
   cp .env.example .env
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

The frontend application will be accessible at `http://localhost:5173`.

---

## Verifying Services Health

To verify that MongoDB, Redis, and Elasticsearch connections are active and operational:

### Option A: Via cURL / HTTP
```bash
curl http://localhost:5000/api/health
```

Expected JSON response when all services are connected:
```json
{
  "status": "ok",
  "timestamp": "2026-10-22T07:15:00.000Z",
  "uptimeSeconds": 42,
  "services": {
    "mongodb": {
      "status": "connected",
      "latencyMs": 2
    },
    "redis": {
      "status": "connected",
      "latencyMs": 1
    },
    "elasticsearch": {
      "status": "connected",
      "clusterStatus": "green",
      "numberOfNodes": 1
    }
  }
}
```

### Option B: Via Web Browser / Frontend UI
Open `http://localhost:5173` in your browser. The Home page includes an integrated live **System Service Diagnostics** dashboard that queries `/api/health` and displays the real-time status and latency of MongoDB, Redis, and Elasticsearch.

---

## Available NPM Scripts

### Backend (`backend/`)
- `npm run dev`: Starts the server with `nodemon` for auto-reloading during development
- `npm start`: Runs the server in production mode using `node src/server.js`
- `npm test`: Runs the Jest + Supertest test suite (`node --experimental-vm-modules ...`)
- `npm run seed:admin`: Seeds or verifies the initial Administrator account (`scripts/seedAdmin.js`)
- `npm run seed:vendors`: Seeds 2 approved vendors and 12 products (`scripts/seedVendors.js`)

### Frontend (`frontend/`)
- `npm run dev`: Starts the Vite development server on port 5173
- `npm run build`: Compiles production assets into `dist/`
- `npm run preview`: Previews the production build locally

---

## Phase 2: Authentication & RBAC

### Endpoints
- `POST /api/auth/register`: Register new customer account (rate-limited, min 8 char password)
- `POST /api/auth/login`: Authenticate and receive 15-min JWT + 7-day httpOnly refresh cookie
- `POST /api/auth/refresh`: Rotate refresh token (deletes old token in Redis, issues new token pair)
- `POST /api/auth/logout`: Revoke active refresh token from Redis and clear cookie
- `GET  /api/auth/me`: Fetch authenticated user profile

### Role-Based Access Control (RBAC) Verification Routes
- `GET /api/test/customer`: Accessible only by users with role `customer`
- `GET /api/test/vendor`: Accessible only by users with role `vendor`
- `GET /api/test/admin`: Accessible only by users with role `admin`

---

## Phase 3: Vendor Storefronts, Products & S3/MinIO Uploads

### Endpoints
- `POST  /api/vendors/apply`: Customer applies to become a vendor
- `GET   /api/vendors/me`: Fetch current vendor profile & review status
- `PUT   /api/vendors/me`: Update vendor storefront name, description, and logo
- `GET   /api/admin/vendors?status=`: Admin lists vendor applications (filter by `pending`, `approved`, `rejected`)
- `PATCH /api/admin/vendors/:id/approve`: Admin approves store & upgrades user role to `vendor`
- `PATCH /api/admin/vendors/:id/reject`: Admin rejects store with optional reason
- `PATCH /api/admin/vendors/:id/commission`: Admin sets vendor commission percentage (0-50%)
- `POST  /api/products`: Approved vendor creates a new product
- `PUT   /api/products/:id`: Owning vendor updates product details (other vendors rejected with 403)
- `DELETE /api/products/:id`: Owning vendor soft-deletes product (`isActive: false`, 403 on other vendors)
- `GET   /api/products`: Public paginated active product catalog (`?page=1&limit=12`)
- `GET   /api/products/:id`: Public single active product detail
- `GET   /api/vendor/products`: Logged-in vendor's own catalog (active & inactive)
- `POST  /api/uploads/presign`: Approved vendor requests presigned PUT URL for direct browser-to-S3/MinIO upload


