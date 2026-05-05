# School Kiosk Management System

Production-ready full stack system for a school kiosk.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + Google OAuth2

## Monorepo Structure
```text
kiosko/
  backend/
    src/
      app.js
      server.js
      config/
      constants/
      controllers/
      middlewares/
      models/
      routes/
      services/
      utils/
      validators/
      scripts/
    .env.example
    package.json
  frontend/
    src/
      context/
      pages/
      services/
      styles/
      App.jsx
      main.jsx
    .env.example
    package.json
  deploy/
    docker-compose.yml
    nginx.conf
  README.md
```

## Core Modules Implemented
- Authentication: email/password, Google OAuth, JWT, role guards (`ADMIN`, `SELLER`, `CLIENT`, `PARENT`)
- Users: parent-child relationship support for minors under 12
- Products: CRUD with low stock notifications for admins
- Suppliers: CRUD
- Purchases: purchase registration, stock increase, cost history
- Sales POS: multi-item sales, optional discount, payment methods (`CASH`, `TRANSFER`, `CARD`, `MP`), stock decrease, ticket payload
- Stock Ledger: movement types (`IN`, `OUT`, `RESERVED`, `RETURN`) with history
- Current Accounts: account balance + movements (`DEBT`, `PAYMENT`, `RECHARGE`) for clients/suppliers
- Reservations: stock reservation/discount logic, expiration notification, auto-return after grace period
- Notifications: low stock + reservation expiry notices

## Security and Architecture
- Clean layered backend (`routes -> controllers -> services -> models`)
- Request validation via Joi
- Centralized error middleware
- Role-protected routes with JWT middleware
- Environment-driven configuration
- Parent/client account visibility restrictions (production access control)

## Backend Run
```bash
cd backend
npm install
npm run dev
```

## Frontend Run
```bash
cd frontend
npm install
npm run dev
```

## Key API Endpoints (Examples)
### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`

### Users
- `GET /api/v1/users/me`
- `GET /api/v1/users` (ADMIN)

### Products
- `GET /api/v1/products`
- `POST /api/v1/products` (ADMIN)
- `PATCH /api/v1/products/:id` (ADMIN)
- `DELETE /api/v1/products/:id` (ADMIN)

### Suppliers
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `PATCH /api/v1/suppliers/:id`
- `DELETE /api/v1/suppliers/:id`

### Purchases
- `POST /api/v1/purchases` (ADMIN/SELLER)
- `GET /api/v1/purchases` (ADMIN/SELLER)

### Sales
- `POST /api/v1/sales` (ADMIN/SELLER)
- `GET /api/v1/sales` (ADMIN/SELLER)

### Stock
- `GET /api/v1/stock` (ADMIN/SELLER)

### Accounts
- `POST /api/v1/accounts/movements` (ADMIN/SELLER)
- `GET /api/v1/accounts/:ownerType/:ownerId/movements`

### Reservations
- `POST /api/v1/reservations`
- `GET /api/v1/reservations`

### Notifications
- `GET /api/v1/notifications`

## Key Business Logic
### Stock engine
- Implemented in `backend/src/services/stock.service.js`
- Uses Mongo transactions, writes movement ledger, prevents negative stock, emits low-stock admin notifications.

### Reservation lifecycle
- Implemented in `backend/src/services/reservation.service.js`
- Fully paid reservations produce `OUT`; partial payments produce `RESERVED`.
- Hourly expiration process notifies clients and returns stock after `RESERVATION_GRACE_DAYS`.

### Current account engine
- Implemented in `backend/src/services/account.service.js`
- Creates account on demand and updates `balance` from movement type (`DEBT` increases, `PAYMENT/RECHARGE` decrease).

## VPS Deployment (Ubuntu)
1. Install Docker and Docker Compose.
2. Set production `.env` files (`backend/.env`, `frontend/.env.production`).
3. Update `deploy/nginx.conf` domain and TLS paths.
4. Run:
```bash
cd deploy
docker compose up -d --build
```

## Notes
- Run DB backups and log rotation in production.
- Add CI, integration tests, and observability (Sentry/Prometheus) before go-live.
