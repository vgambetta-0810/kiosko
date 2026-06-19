# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (monorepo)
```bash
npm install          # installs nothing at root (just concurrently)
npm run install:all  # installs both backend and frontend deps
npm run dev          # runs backend + frontend concurrently
```

### Backend
```bash
cd backend
npm run dev          # nodemon, watches src/
npm start            # production
npm run seed:admin   # creates default admin from .env credentials
npm test             # runs all tests (Node built-in test runner)
node --test test/waste.service.test.js   # run a single test file
```

### Frontend
```bash
cd frontend
npm run dev          # Vite dev server (default: http://localhost:5173)
npm run build        # outputs to dist/
npm run preview      # preview production build
```

## Architecture

### Database
The README says MongoDB/Mongoose but the actual runtime uses **SQLite + Sequelize**. `mongoose` remains in `package.json` but is unused. The SQLite file is `backend/data.sqlite` (configurable via `SQLITE_PATH` env var; tests set it to `:memory:`).

All models are defined in a single file: `backend/src/models/index.js`. Schema migrations happen inline inside `connectDB` via `ensureSchema()` in `backend/src/config/db.js` — there are no separate migration files.

### Backend layers
```
routes → controllers → services → models
```
- **routes/** — Express routers, wired in `routes/index.js`, mounted at `/api/v1`
- **controllers/** — thin: extract req params, call service, send response
- **services/** — business logic; all database writes that span multiple tables use `sequelize.transaction()`
- **models/index.js** — single file exporting all Sequelize models and associations
- **middlewares/** — `auth.js` (JWT decode + role guard), `validate.js` (Joi), `errorHandler.js`
- **validators/schemas.js** — all Joi schemas in one file

### Key services
- `stock.service.js` — `adjustStock()` is the single entry point for all stock changes. Writes a `StockMovement` ledger row, checks threshold, emits low-stock `Notification` to all admins. Call via `stock.service.withTransaction()` when composing with other writes.
- `waste.service.js` — creates a `Waste` record and calls `adjustStock` with type `WASTE` inside a transaction.
- `account.service.js` — creates `Account` on demand; `DEBT` increases balance, `PAYMENT`/`RECHARGE` decrease it.
- `reservation.service.js` — fully paid → `OUT` stock movement; partial → `RESERVED`. Hourly job returns expired stock after `RESERVATION_GRACE_DAYS`.

### Frontend
React 18 + Vite + Tailwind CSS v4 (PostCSS plugin, no config file needed). State is component-local or lifted; no Redux/Zustand. Auth state lives in `src/context/AuthContext`.

Route guards are handled by the `<Guard roles={[...]}>` wrapper in `App.jsx`. Role-based redirects on `/`:
- `ADMIN` → `AnalyticsDashboard`
- `SELLER` → `/ventas`
- `CLIENT`/`PARENT` → `/client`

Frontend pages and their roles:
| Path | Roles |
|------|-------|
| `/inventario` | ADMIN |
| `/movimientos` | ADMIN |
| `/proveedores` | ADMIN |
| `/compras` | ADMIN |
| `/merma` | ADMIN |
| `/ventas`, `/ventas/historial` | ADMIN, SELLER |
| `/clientes` | ADMIN, SELLER |
| `/client` | CLIENT, PARENT |

### Environment variables
Copy `backend/.env.example`. Key vars:
- `SQLITE_PATH` — path to SQLite file (omit to use `backend/data.sqlite`)
- `JWT_SECRET` — must be changed in production
- `LOW_STOCK_THRESHOLD` — default `10`
- `RESERVATION_GRACE_DAYS` — default `7`
- `FRONTEND_URL` — used for CORS

### Tests
Use Node's built-in test runner (`node:test`). Tests set `process.env.SQLITE_PATH = ':memory:'` and call `sequelize.sync({ force: true })` in `beforeEach` to reset state. No external test database needed.
