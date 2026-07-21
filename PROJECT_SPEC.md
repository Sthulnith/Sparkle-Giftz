# PROJECT_SPEC.md — Sparkle Giftz Gift Box Store

> Source of truth for this project. Antigravity: read this file in full before writing
> any code. Do not invent requirements that contradict this document. If something is
> ambiguous, ask before implementing.

---

## 1. Business overview

A luxury gift-box e-commerce store based in **Sri Lanka**. Customers browse curated
gift boxes by occasion, add them to a cart, optionally add a personal message and
premium wrapping, and check out via **PayHere** (online card/bank) or **Cash on
Delivery (COD)**. Guest checkout only — no customer accounts in v1.

- **Brand name:** Sparkle Giftz
- **Tagline:** Gifts Worth Remembering
- **Currency:** LKR, always formatted as `Rs.4,990.00`
- **Phone / WhatsApp:** +94 77 123 4567
- **Email:** concierge@sparklegiftz.com
- **Address:** 123 Galle Road, Colombo, Sri Lanka
- **Socials:** Facebook [https://facebook.com/sparklegiftz], Instagram [https://instagram.com/sparklegiftz], TikTok [https://tiktok.com/@sparklegiftz]
- **Selling points:** Free island-wide delivery, Cash on Delivery, premium handcrafted boxes.

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, React Router, React Query, axios |
| Backend | Spring Boot 3, Java 21, Maven, Spring Web, Spring Data JPA, Spring Security (JWT), Flyway, Lombok |
| Database | **Supabase Postgres** (used as a managed Postgres DB — backend connects via the Supabase connection string) |
| Image storage | **Supabase Storage** (public bucket `product-images`); DB stores image URLs only |
| Payments | PayHere (redirect + server-verified webhook) + Cash on Delivery |
| Frontend hosting | **Netlify** |
| Backend hosting | **Render** (Dockerized Spring Boot) |

Note: Supabase is used here as the **database and file store only**. The application API
is the Spring Boot service on Render. We are NOT using Supabase's auto-generated REST API
or Supabase Auth.

---

## 3. Design system — "Sparkle Giftz" (luxury black & gold)

Overall mood: elegant, high-end, minimal, expensive. Designer boutique, not a discount store.

### Color tokens (expose as CSS variables + Tailwind theme)
| Token | Hex | Use |
|---|---|---|
| `--color-black` | `#0d0d0d` | Page background |
| `--color-charcoal` | `#1a1a1a` | Cards, alternating dark sections |
| `--color-ivory` | `#f5f0e6` | Light sections, primary text on dark |
| `--color-gold` | `#c9a227` | Accent: lines, borders, icons, prices, hover |
| `--color-gold-light` | `#d4af37` | Gradient top / hover fill |
| `--color-gold-dark` | `#b8860b` | Gradient bottom |
| `--color-text-dark` | `#1a1a1a` | Text on ivory sections |
| `--color-muted` | `#8a8a8a` | Struck-through prices, secondary text |

**Gold discipline:** gold is for *accents only* — thin lines, borders, small text, icons,
hover states, button outlines. Never large solid gold fills.

### Typography
- Headings: elegant serif — **Playfair Display** (or Cormorant Garamond).
- Body: clean sans-serif — **Inter** (or Montserrat).
- Uppercase labels get generous letter-spacing.

### Components
- **Section titles:** centered serif, thin gold horizontal line + small gold diamond/dot beneath.
- **Buttons:** primary = charcoal fill, thin gold border, gold text; hover = gold fill, black text, soft gold glow. Small radius (not pill-shaped).
- **Product cards:** charcoal card, image on neutral/ivory tile, thin gold hairline border that brightens + lifts with a soft gold glow on hover. Category label = small gold uppercase. Title = off-white serif. Old price struck-through in muted grey; sale price in gold.
- **Discount badge:** minimal — thin gold-outlined circle or slim gold ribbon reading `-13%`. Subtle, not loud.
- Generous negative space, thin gold dividers between sections, smooth fade/slide-in on scroll.
- Loading states: gold shimmer skeletons on charcoal.

### Responsiveness
Mobile-first. Product grids: 4 per row desktop, 2 tablet, 1 mobile. No layout breaks on real phones.

---

## 4. Pages

1. **Home** — announcement bar; sticky header; cinematic hero + 4-item feature strip; New Arrivals grid; Shop by Occasion tiles; Signature Collection grid (ivory section); Reviews carousel + 3 Google-style review cards; "Share Your Experience" CTA; footer; floating WhatsApp button.
2. **Shop Collection** — breadcrumb; result count + sort dropdown; left filter sidebar (Categories with counts, Occasion, Price slider, Color swatches); product grid (3/row desktop); "OUT OF STOCK" overlay; "SELECT OPTIONS" vs "ADD TO CART".
3. **Product Detail** — image gallery; title/price/description; quantity; Add to Cart; wishlist; category; share; tabs (Description, Additional Info, Reviews); gift add-ons ("Add a personal message" text field, "Choose premium wrapping" option).
4. **Cart** — items table (image, name, price, qty, subtotal, remove); totals box; "Proceed to Checkout"; elegant empty-cart state.
5. **Checkout** — customer details (name, phone, email, address, city), gift options carried from product, payment method selector (PayHere / COD), order summary, place-order button.
6. **Reviews** — gallery grid of customer review cards.
7. **Contact** — "Get in Touch"; 3 info cards (Phone, Email, Address); map placeholder; "Send a Message" form.
8. **Policy pages** — Terms & Conditions, Privacy Policy, Refund & Returns (required for PayHere approval).
9. **Admin** (`/admin`) — JWT-protected: product CRUD + order management.

Occasion categories: Birthday, Anniversary, Newborn & Baby, Corporate Gifts, Romance, Get Well, Congratulations, Bespoke / Build Your Own Box.

---

## 5. Data model (Postgres, via Flyway migrations)

**category** — `id`, `name`, `slug`

**product** — `id`, `name`, `slug` (unique), `description`, `price` (numeric), `old_price` (numeric, nullable), `category_id` (FK), `occasion` (text), `color` (text), `stock` (int), `is_variable` (bool), `created_at`

**product_image** — `id`, `product_id` (FK), `url`, `sort_order`

**product_variant** — `id`, `product_id` (FK), `name`, `price_delta` (numeric), `stock` (int) — only when `is_variable = true`

**order** (table name `orders` — `order` is a reserved word) — `id`, `order_number` (unique), `customer_name`, `phone`, `email`, `address`, `city`, `subtotal`, `delivery_fee`, `total`, `payment_method` (`COD` | `PAYHERE`), `payment_status` (`PENDING` | `PAID` | `FAILED`), `order_status` (`PENDING` | `CONFIRMED` | `PACKED` | `SHIPPED` | `DELIVERED` | `CANCELLED`), `gift_message` (nullable), `wrapping` (nullable), `created_at`

**order_item** — `id`, `order_id` (FK), `product_id` (FK), `product_name` (snapshot), `variant_name` (nullable), `unit_price` (snapshot), `qty`

**admin_user** — `id`, `email` (unique), `password_hash`

Seed ~15 sample luxury gift-box products across the occasion categories via a migration.

---

## 6. Public API contract

Base path `/api`. Return DTOs, never entities. Global exception handler with clean JSON errors.

- `GET /products` — query params: `category`, `occasion`, `color`, `minPrice`, `maxPrice`, `sort` (`newest` | `price_asc` | `price_desc`), `page`, `size`. Returns paged product summaries + total count.
- `GET /products/{slug}` — full product with images + variants.
- `GET /categories` — categories with product counts.
- `POST /orders` — body: customer details, items (`productId`, `variantId?`, `qty`), `giftMessage?`, `wrapping?`, `paymentMethod`. Server behavior below.
- `POST /payhere/notify` — PayHere server-to-server webhook (see §7).
- `POST /contact` — name, email, phone, message (store and/or email to shop).

### `POST /orders` — mandatory server rules
1. **Recompute every price and total on the server from the DB.** Never trust client-sent prices.
2. Validate stock for each item/variant; reject if insufficient.
3. Compute `subtotal`, apply `delivery_fee` (free island-wide = 0 for v1, but keep the field), compute `total`.
4. Create the order inside a **transaction** and **decrement stock** in the same transaction.
5. Generate a unique `order_number` (e.g. `AN-YYYYMMDD-XXXX`).
6. If `paymentMethod = COD`: set `payment_status = PENDING`, `order_status = CONFIRMED`; return order.
7. If `paymentMethod = PAYHERE`: set `payment_status = PENDING`, `order_status = PENDING`; return order **plus a PayHere payload** (merchant_id, order_id, amount, currency, and the server-generated `hash`). The merchant secret is used server-side only and never returned to the client.

### Admin API (JWT-protected, `/api/admin`)
- `POST /auth/login` — email + password → JWT.
- Product CRUD: `GET/POST/PUT/DELETE /products`.
- Orders: `GET /orders`, `PUT /orders/{id}/status`.
- Image upload: upload to Supabase Storage bucket `product-images`, return public URL.

---

## 7. Payments

### Cash on Delivery
`POST /orders` with `paymentMethod=COD` → order created as CONFIRMED → show thank-you page. Done.

### PayHere (redirect + verified webhook)
1. On PayHere order creation, backend generates the **hash** from merchant ID + merchant secret + order_number + amount + currency, server-side only.
2. Frontend redirects the customer to PayHere checkout with the returned payload.
3. After payment, PayHere calls `POST /api/payhere/notify` **server-to-server**. Backend re-verifies the hash/signature and only then sets `payment_status = PAID` and `order_status = CONFIRMED`.
4. **The webhook is the source of truth for payment — never confirm payment from the browser redirect.**
5. PayHere redirects the customer to the frontend thank-you page.

> IMPORTANT: The exact PayHere hash formula, field names, and header/signature details
> MUST be verified against PayHere's current official documentation at implementation time.
> Do NOT guess the signature format. Use PayHere **sandbox** credentials for all testing
> before switching to live keys. PayHere merchant approval requires the policy pages
> (Terms, Privacy, Refund & Returns) to be live.

---

## 8. Environment variables

### Backend (Render)
- `DATABASE_URL` — Supabase Postgres connection string (use the connection-pooler URL; require SSL)
- `JWT_SECRET`
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`
- `PAYHERE_MODE` — `sandbox` | `live`
- `PAYHERE_NOTIFY_URL` — public Render URL + `/api/payhere/notify`
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — for Storage uploads
- `FRONTEND_URL` — Netlify URL (for CORS + PayHere return URL)

### Frontend (Netlify)
- `VITE_API_BASE_URL` — public Render backend URL + `/api`
- `VITE_WHATSAPP_NUMBER`

---

## 9. Non-negotiable quality bar
- Prices/totals computed server-side; stock decrements transactionally.
- PayHere confirmed only via verified webhook.
- DTOs everywhere; no entity leakage.
- Mobile-first, no layout breaks; accessible buttons/links.
- Admin never ships with a default password; HTTPS everywhere.
- The result must feel expensive, calm, and confident — a luxury brand, not a busy marketplace.
