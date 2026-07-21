# BUILD_PLAN.md — Sparkle Giftz Gift Box Store

> Antigravity: build ONE phase at a time. At the start of each phase, read
> `PROJECT_SPEC.md` and this file, propose a plan for that phase only, wait for my
> approval, then implement. After each phase, tick the boxes and stop for review.
> Do not skip ahead. Do not proceed on anything that doesn't run.

Stack recap: React (Vite/TS) + Tailwind on **Netlify** · Spring Boot 3 on **Render** ·
**Supabase Postgres** (DB) + **Supabase Storage** (images) · PayHere + COD.

---

## Phase 0 — Foundations
- [x] Confirm `PROJECT_SPEC.md` is present and read.
- [x] Create empty git repo with `/frontend` and `/backend` folders + root `README.md`.
- [x] Add `.gitignore` for Node + Java/Maven + env files.

## Phase 1 — Scaffolding (must run before proceeding)
- [x] `/frontend`: Vite + React + TypeScript + Tailwind + React Router + React Query + axios.
- [x] Tailwind theme wired to the Sparkle Giftz color tokens + Playfair Display / Inter fonts.
- [x] `/backend`: Spring Boot 3, Java 21, Maven — Web, JPA, Security, Flyway, PostgreSQL driver, Lombok.
- [x] `application.yml` reads `DATABASE_URL` (Supabase) with SSL; app boots against Supabase.
- [x] Verify: `npm run dev` runs the frontend; `mvn spring-boot:run` connects to Supabase and starts.

## Phase 2 — Frontend on mock data (the demo build)
Build with a local `src/data/mockProducts.ts`; no backend calls yet.
- [ ] Global layout: announcement bar, sticky header (with live cart count), footer, floating WhatsApp button.
- [ ] `CartContext` for in-memory cart (add/remove/update qty, live header total).
- [ ] Home: hero + feature strip, New Arrivals grid, Shop by Occasion tiles, Signature Collection, Reviews carousel + Google-style cards, CTA.
- [ ] Shop: filter sidebar (category, occasion, price slider, color) + product grid + sort + out-of-stock overlay.
- [ ] Product detail: gallery, info, quantity, add-ons (gift message, wrapping), tabs.
- [ ] Cart page + empty state.
- [ ] Checkout page (UI only): customer form, payment selector, order summary.
- [ ] Reviews gallery page.
- [ ] Contact page: info cards + form + map placeholder.
- [ ] Policy pages: Terms, Privacy, Refund & Returns.
- [ ] Review each page against the Sparkle Giftz mockup; matches on desktop + mobile.

## Phase 3 — Backend API + database
- [ ] Flyway migrations for all tables in SPEC §5 (`orders` not `order`).
- [ ] Seed migration: ~15 sample gift-box products across occasions.
- [ ] JPA entities, repositories, DTOs, global exception handler.
- [ ] `GET /api/products` with filters/sort/pagination.
- [ ] `GET /api/products/{slug}`, `GET /api/categories`.
- [ ] `POST /api/orders` enforcing ALL server rules in SPEC §6 (server-side pricing, stock check, transactional decrement, order_number, COD vs PAYHERE branch).
- [ ] `POST /api/contact`.
- [ ] CORS allows the Netlify `FRONTEND_URL`.
- [ ] Verify each endpoint with sample requests.

## Phase 4 — Wire frontend to the API
- [ ] axios instance using `VITE_API_BASE_URL`.
- [ ] React Query hooks: `useProducts(filters)`, `useProduct(slug)`, `useCategories()`, `useCreateOrder()`.
- [ ] Replace mock data with live data everywhere; Shop filters drive query params.
- [ ] Gold-shimmer loading skeletons + error states.
- [ ] Checkout calls `useCreateOrder`; COD path returns thank-you page end-to-end.

## Phase 5 — Payments
- [ ] COD: full order → CONFIRMED → thank-you (verify end-to-end).
- [ ] PayHere: server-side hash generation (verified against official PayHere docs — do NOT guess).
- [ ] Frontend redirect to PayHere sandbox checkout with server payload.
- [ ] `POST /api/payhere/notify` webhook: re-verify signature, then mark PAID + CONFIRMED.
- [ ] Return/thank-you page after redirect; payment state confirmed ONLY by webhook.
- [ ] Place a full test order through PayHere **sandbox** successfully.

## Phase 6 — Admin panel
- [ ] `admin_user` + `POST /api/admin/auth/login` → JWT; secure all `/api/admin/**`.
- [ ] Product CRUD UI (name, price, old price, category, occasion, color, stock, images, is_variable).
- [ ] Image upload to Supabase Storage bucket `product-images` → store public URLs.
- [ ] Orders list + status update (PENDING→CONFIRMED→PACKED→SHIPPED→DELIVERED).
- [ ] Reuse Sparkle Giftz styling; no default admin password.

## Phase 7 — Deploy
- [ ] Backend `Dockerfile` + `docker-compose.yml` (app + local postgres for dev).
- [ ] Deploy backend to **Render**; set all backend env vars from SPEC §8; confirm it reaches Supabase.
- [ ] Create Supabase Storage bucket `product-images` (public).
- [ ] Build frontend and deploy to **Netlify**; set `VITE_API_BASE_URL` to the Render URL.
- [ ] Set `PAYHERE_NOTIFY_URL` to the public Render webhook URL; confirm HTTPS.
- [ ] Point domain (.lk / .com) at Netlify.

## Phase 8 — Go-live checklist
- [ ] Prices/totals server-computed; stock decrements transactionally.
- [ ] PayHere confirmed only via verified webhook; switch sandbox → live keys.
- [ ] COD path tested on production.
- [ ] Policy pages live (required for PayHere approval).
- [ ] WhatsApp button uses the real number; socials correct.
- [ ] Mobile layout clean on a real phone.
- [ ] Admin login hardened; HTTPS everywhere.
- [ ] One real end-to-end order placed before announcing launch.

---

### Session opener to paste each time
> Read PROJECT_SPEC.md and BUILD_PLAN.md. We are working on **Phase [N] only**.
> Propose a plan for this phase, wait for my approval, then implement. Tick the
> checklist items as you complete them and stop for my review at the end of the phase.
