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
2. **Docker Desktop** installed (must be installed on your machine so containers can be managed automatically)

---

## Running Locally

You do not need to run `docker compose` manually. The backend startup script automatically manages and launches the required backing containers (`mongo`, `redis`, `elasticsearch`).

### 1. Terminal 1 — Start Backend
```bash
cd backend
npm run dev
```
> **What happens automatically:** `npm run dev` triggers `predev`, which verifies Docker is installed, auto-launches Docker Desktop on Windows if closed, starts `mongo`, `redis`, and `elasticsearch`, waits for their ports to accept connections, and then launches the Express server with `nodemon`.

### 2. Terminal 2 — Start Frontend
```bash
cd frontend
npm run dev
```

### 3. First-Run Seed & Search Reindex Commands
If running for the first time, open a terminal in `backend/` and run the seeders:
```bash
cd backend
npm run seed:admin     # Seeds superadmin user
npm run seed:vendors   # Seeds demo vendor storefronts
npm run seed:demo      # Seeds realistic catalog products and sample reviews
npm run reindex        # Indexes products into Elasticsearch (falls back to Mongo if ES is not ready)
```

### Cloud Database Mode (SKIP_DOCKER)
If your `MONGO_URI`, `REDIS_URL`, and `ES_NODE` point to hosted cloud services (e.g. MongoDB Atlas, Upstash Redis), skip local Docker entirely:
```bash
# In backend/.env:
SKIP_DOCKER=true
```
Or via shell environment variable:
```bash
SKIP_DOCKER=true npm run dev
```

---

## Step-by-Step Manual Setup (Optional)

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

---

## Phase 5: Cart, Multi-Vendor Splits & Order Lifecycle

### Features & Endpoints
- **Redis Cart:** Session key `cart:{userId}` hash (productId -> quantity) with 7-day sliding TTL. Fresh pricing and stock hydrated on every read from MongoDB.
- `GET    /api/cart`: Retrieve customer cart with dynamic validation flags (`outOfStock`, `inactive`, `qtyExceedsStock`)
- `POST   /api/cart/items`: Add or increment product in cart (validates active status, stock, max 10, vendor isolation)
- `PATCH  /api/cart/items/:productId`: Update item quantity (0 removes item)
- `DELETE /api/cart/items/:productId`: Remove item from cart
- `DELETE /api/cart`: Clear entire shopping cart
- `POST   /api/orders/checkout`: Validates cart, splits into multi-vendor sub-orders, computes platform commission and vendor payout with paise precision, creates order with `payment.status: 'pending'`
- `GET    /api/orders`: Customer lists own orders (paginated, newest first)
- `GET    /api/orders/:id`: Detailed view of single order with multi-vendor timeline steppers
- `PATCH  /api/orders/:id/cancel`: Customer cancels order while all sub-orders are still `placed` (refunds payment and restores stock)
- `GET    /api/vendor/orders`: Vendor views only sub-orders belonging to their store from paid orders
- `PATCH  /api/vendor/orders/:orderId/status`: Vendor advances strictly through `placed -> packed -> shipped -> delivered`
- `GET    /api/admin/orders`: Admin overview of all marketplace transactions with payment and payout summaries

---

## Phase 6: Payments, Sandbox Gateway & Payout Splits

Full architectural specifications, sequence diagrams, provider interfaces, and test card credentials are documented in **[docs/payments.md](docs/payments.md)**.

### Highlights
- **Provider Layer (`backend/src/services/payment/`):** Provider-neutral architecture adhering to `BasePaymentProvider` (`createOrder`, `verifyPayment`, `createTransfer`, `refund`, `verifyWebhook`).
- **Sandbox Gateway ("Test Gateway"):** Simulated gateway providing realistic card processing (Luhn format check, expiry validation, CVV check, test card outcomes) and UPI scenarios (`success@mock`, `failure@mock`, invalid VPA).
- **Asynchronous Webhooks:** Gateway sends HMAC-SHA256 signed events (`payment.captured`, `payment.failed`) to `/api/payments/webhook` mounted with raw body parsing for idempotency testing.
- **Automated Payout Splits:** Generates per-vendor payout records upon payment verification, linking vendor accounts (`acc_mock_xxx`) and tracking platform commission retention.
- **Earnings Studio:** Vendors monitor gross sales, commission paid, and net payouts in real time at `/vendor/earnings`.
- **Admin Payout Operations:** Administrators can inspect all platform payouts and retry failed transfers via `/api/admin/payouts/:id/retry`.

### Endpoints
- `POST /api/payments/create-order`: Create provider order session (amount strictly read from MongoDB in paise)
- `POST /api/payments/verify`: Timing-safe HMAC verification, atomic stock decrement, cart clearing, and payout creation
- `POST /api/payments/webhook`: Public webhook receiver for gateway events (HMAC verified)
- `POST /api/mock-gateway/pay`: Customer processes payment through Test Gateway sandbox
- `GET  /api/vendor/earnings`: Logged-in vendor retrieves gross sales, commission, and net payout history
- `GET  /api/admin/payouts`: Admin lists all platform payouts with status & vendor filters
- `POST /api/admin/payouts/:id/retry`: Admin retries failed payout transfer

---

## Phase 7: Extras (Reviews, Coupons, Invoices & Admin Analytics)

### Proportional Discount Distribution & Financial Rules
- **Vendor-Funded Discounts:** Discounts reduce each sub-order subtotal first. Platform commission and vendor payout amounts (and payout rows created by `createPayouts`) are computed strictly on each **discounted sub-order subtotal**.
- **Largest Remainder Method:** When a multi-vendor cart applies a percentage or flat coupon, the discount is distributed proportionally across sub-orders in integer paise:
  $$\text{subDiscountPaise}_i = \left\lfloor \frac{\text{subtotalPaise}_i}{\text{grandSubtotalPaise}} \times \text{totalDiscountPaise} \right\rfloor$$
  Any remainder paise are distributed to the sub-orders with the largest fractional remainders, guaranteeing that sub-order discounts sum exactly to `order.discount` without penny rounding discrepancies.
- **Atomic Coupon Usage:** Coupon usage count is incremented atomically inside `markOrderPaid` guarded by `usageLimit` and per-user limits (`perUserLimit`). When a paid order is refunded or cancelled, coupon usage is restored.
- **Verified Purchase Reviews:** Customers can only review a product if they received it in a paid order with `subOrder.status === 'delivered'`. Exactly one review per customer per product is allowed (409 on duplicate). Vendors cannot review their own products (403). After create/update/delete, product `ratingAvg` (1 decimal) and `ratingCount` are recomputed via MongoDB aggregation and synchronized to Elasticsearch via `searchService.updateRating`.
- **PDF Invoice (`pdfkit`):** Streamed at `GET /api/orders/:id/invoice` for order owners and admins on paid orders. Displays invoice number, customer delivery details, vendor-grouped line items, discount, grand total, payment method, and provider payment ID.
- **Admin Analytics:** Aggregates net revenue (paid orders minus refunds), platform commission (payouts excluding reversed), zero-filled daily timeseries, sub-order fulfillment status breakdown, top 5 vendors and products, and low stock inventory (stock ≤ 5 units); responses are cached in Redis for 5 minutes (`analytics:${range}`).

### Phase 7 Endpoints
- `POST   /api/products/:id/reviews`: Customer leaves verified review (requires delivered sub-order)
- `GET    /api/products/:id/reviews`: Public paginated reviews with star breakdown summary (counts for 1–5 stars)
- `GET    /api/products/:id/reviews/eligibility`: Checks if logged-in customer is eligible to review
- `PUT    /api/reviews/:id`: Review owner edits their rating and comment
- `DELETE /api/reviews/:id`: Review owner or admin deletes review
- `POST   /api/coupons/validate`: Customer validates promo code against current cart subtotal
- `POST   /api/admin/coupons`: Admin creates coupon (percent or flat, min order, expiry, usage limits)
- `GET    /api/admin/coupons`: Admin lists all coupons with active/inactive filtering
- `PATCH  /api/admin/coupons/:id`: Admin updates or soft-deactivates coupon
- `GET    /api/orders/:id/invoice`: Streams official PDF invoice for paid order
- `GET    /api/admin/analytics?range=7d|30d|90d`: Admin retrieves platform KPIs and timeseries (Redis cached 5m)



