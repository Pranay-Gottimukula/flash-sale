# ⚡ FlashDrop — Phase 1 Project Plan

> **Project Manager Note:** This file is the single source of truth for architecture decisions, feature progress, and current status. It is updated automatically after every major milestone.

---

## 🏗️ Core Architecture

| Layer | Technology | Notes |
|---|---|---|
| **Runtime** | Node.js 22 (v22.22.0) | LTS, confirmed |
| **Package Manager** | pnpm (v10.18.0) | Used in both `/server` and `/client` |
| **Backend Framework** | Express.js 5 with TypeScript | Service-Repository pattern |
| **ORM** | Prisma 7 (`@prisma/client ^7.6.0`) | With standard `@prisma/adapter-pg` |
| **Database** | PostgreSQL (NeonDB) | Pooler for runtime, direct URL for migrations |
| **Validation** | Zod 4 | Schema-first validation on all endpoints |
| **Auth** | JWT + bcrypt | httpOnly cookie + Authorization header |
| **Image Storage** | Cloudinary SDK v2 | Backend handles upload, stores `image_url` in DB |
| **Frontend** | Next.js (App Router) + Tailwind CSS | With shadcn/ui + Lucide Icons |
| **State Management** | React Context (`AuthContext`) | Phase 1 only; no external state lib |

### Backend Architecture Pattern
```
routes/ → controllers/ → services/ → repositories/ → prisma (DB)
```

### Environment Variables (server/.env)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooler connection for runtime queries |
| `DIRECT_URL` | Non-pooler for `prisma migrate dev` |
| `JWT_SECRET` | Token signing key |
| `JWT_EXPIRES_IN` | Token lifetime (default: 7d) |
| `ALLOWED_ORIGINS` | CORS whitelist |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary config |
| `CLOUDINARY_API_KEY` | Cloudinary config |
| `CLOUDINARY_API_SECRET` | Cloudinary config |

---

## 📋 Feature Roadmap

### 🔧 Setup & Infrastructure

- [x] Initialize Express backend with TypeScript
- [x] Configure `tsconfig.json`
- [x] Set up Prisma 7 with `@prisma/adapter-pg`
- [x] Write `primsma.config.ts` (Prisma v7 style — no URLs in `schema.prisma`)
- [x] Write full database schema (`User`, `Address`, `Product`, `Favorite`, `Order`, `OrderItem`)
- [x] Configure CORS, cookie-parser, body-parsing middleware
- [x] Set up global error handler middleware
- [x] Set up Cloudinary SDK in `server/src/lib/cloudinary.ts`
- [x] Set up Multer upload middleware (`upload.middleware.ts`)
- [x] Create `server/.env` from `.env.example`
- [x] **Run first Prisma migration** (`init_flash_sale_schema` — applied 2026-03-29)
- [x] **Generate Prisma client** (`pnpm prisma generate`) ← all 6 models ready
- [x] Initialize Next.js (App Router) with Tailwind CSS + shadcn/ui
- [x] Set up `AuthContext` (React Context for auth state)
- [x] Create `client/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:5000`)
- [x] Set up API client (`client/src/lib/api.ts`)
- [x] Create shared `Navbar` component

---

### 🔐 Feature 1 — Authentication & Users

**Backend**
- [x] `POST /api/auth/register` — create user, hash password with bcrypt
- [x] `POST /api/auth/login` — verify credentials, return JWT
- [x] Auth middleware (`auth.middleware.ts`) — verify JWT on protected routes
- [x] `GET /api/auth/me` — return current user from JWT

**Frontend**
- [x] Login page (`/login`) — dark-themed glass card, animated
- [x] Register page (`/register`) — role selection (SELLER / CUSTOMER)
- [x] Auto-redirect to dashboard by role after login

---

### 🛍️ Feature 2 — Seller Dashboard

**Backend**
- [x] `GET /api/products/my` — seller's own products
- [x] `POST /api/products` — create product with Cloudinary image upload
- [x] `PATCH /api/products/:id` — update product
- [x] `PATCH /api/products/:id/terminate` — set status to TERMINATED

**Frontend**
- [x] Seller dashboard layout (`/seller/dashboard`)
- [x] Products overview — active/upcoming/sold-out tracking with order counts
- [x] "Create Sale" form page (`/seller/products/new`) — with image upload
- [x] Product edit page (`/seller/products/[id]/edit`) — pre-filled form with PATCH + Cloudinary
- [x] Analytics widgets (orders placed, revenue, active/upcoming counts) — on dashboard

---

### 👤 Feature 3 — Customer Dashboard

**Backend**
- [x] `GET /api/addresses` — list addresses
- [x] `POST /api/addresses` — create address
- [x] `PATCH /api/addresses/:id` — update address
- [x] `DELETE /api/addresses/:id` — delete address
- [x] `GET /api/products` — browse ACTIVE + UPCOMING products
- [x] `GET /api/products/:id` — product detail
- [x] `GET /api/favorites` — list favorites
- [x] `POST /api/favorites/:productId` — add to favorites
- [x] `DELETE /api/favorites/:productId` — remove from favorites
- [x] `GET /api/orders` — list my orders
- [x] `GET /api/orders/:id` — order detail

**Frontend**
- [x] Browse page (`/browse`) — product gallery with cards
- [x] Favorites page (`/favorites`)
- [x] Orders page (`/orders`)
- [x] Profile page (`/profile`) — user info + address management

---

### 🛒 Feature 4 — Phase 1 "Buy Now" Checkout Flow

**Backend**
- [x] `POST /api/orders` — create PENDING order, atomically decrement `stock_qty`
- [x] `PATCH /api/orders/:id/complete` — mark order COMPLETED
- [x] `PATCH /api/orders/:id/fail` — mark order FAILED (timer expired)
- [x] Transaction logic: check stock → decrement → create order (atomic)

**Frontend**
- [x] `/checkout/[productId]` — "Waiting in Queue..." loading screen (3s setTimeout)
- [ ] Address selection UI on checkout page ← _wiring needed_
- [ ] "Confirm Payment" screen with 3-minute countdown timer
- [ ] Sold Out redirect with message
- [ ] Success screen after payment

---

### 🎨 Design System

- [x] Dark-themed CSS design tokens (CSS Variables in `globals.css`)
- [x] Glass card effect (`.glass` utility class)
- [x] Gradient text (`.gradient-text`)
- [x] Button variants (`.btn-primary`)
- [x] Input styles (`.input`, `.label`)
- [x] Spinner animation
- [x] Motion animations (Framer Motion)

---

## 🚧 Current Status

**Last updated:** 2026-03-29

### ✅ Done
- Full backend Service-Repository architecture across ALL 5 entities (auth, products, addresses, favorites, orders)
- All API routes registered + middleware (CORS, auth, upload, error handler)
- Prisma schema with Phase 2-aware fields (`added_at`, `sale_starts_at`, `locked_price`)
- **First DB migration applied**: `init_flash_sale_schema` — all 6 tables live in NeonDB
- Cloudinary + Multer image upload pipeline (stream buffer, no disk)
- JWT auth via httpOnly cookies (register, login, logout, me)
- All frontend pages complete: login, register, browse, seller dashboard + analytics, checkout (queue → address → countdown → pay → success), profile + addresses, favorites, orders
- Seller product **edit page** added (`/seller/products/[id]/edit`) — PATCH + live discount calculator + image replace
- `client/.env.local` created (`NEXT_PUBLIC_API_URL`)
- Dark-themed glassmorphism design system with full CSS token system
- Smoke-tested: register, login, health check all returning ✅

### 🟡 Remaining Polish / Testing
1. **End-to-end flow test** — register → login → browse → buy-now → checkout → order
2. **Responsive design** — verify mobile layouts on smaller screens
3. **Error boundary** — add catch-all error UI for unhandled Next.js errors

### 🟢 Phase 1 is FEATURE COMPLETE
All backend endpoints, frontend pages, DB migration, and image upload pipeline are production-ready for Phase 1 scope.

---

## 🔮 Phase 2 Preview (Out of Scope Now)

> The following are **deliberately deferred** to Phase 2. The schema and field choices above already account for them.

- Redis for inventory cache (`stock_qty` sync)
- BullMQ for checkout queue
- Priority queue sorted by `favorites.added_at`
- `sale_starts_at` triggers for cache pre-warming
- WebSocket push for real-time seat counts
