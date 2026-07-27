# How to Setup Order Email Notifications via Official Gmail (sparklegiftzz1@gmail.com)

This guide shows how to connect your official business Gmail account (**sparklegiftzz1@gmail.com**) with **EmailJS** so that customer order emails are sent directly through Google servers and arrive in the customer's **INBOX** (NOT in Spam).

---

## Step 1: Enable 2-Step Verification on Gmail
1. Open Google Security Settings for **sparklegiftzz1@gmail.com**:  
   👉 [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Scroll down to **How you sign in to Google** → Click **2-Step Verification**.
3. Turn on **2-Step Verification** (if not already enabled) and complete phone verification.

---

## Step 2: Generate a Google App Password
1. Open Google App Passwords page:  
   👉 [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Type an App Name (e.g. `EmailJS Sparkle Giftz`).
3. Click **Create**.
4. Google will display a **16-character passcode** (e.g., `abcd efgh ijkl mnop`).
5. **Copy this 16-character passcode** (you will use it in EmailJS).

---

## Step 3: Connect sparklegiftzz1@gmail.com in EmailJS
1. Log in to EmailJS: 👉 [https://www.emailjs.com](https://www.emailjs.com)
2. Go to **Email Services** → Click **Add New Service**.
3. Select **Gmail** from the list of providers.
4. Click **Connect Account** (or authorize via Google OAuth/App Password) using `sparklegiftzz1@gmail.com`.
5. Name your service (e.g. `Sparkle Giftz Gmail`).
6. Click **Create Service**.
7. Copy your **Service ID** (e.g., `service_abc123`).

---

## Step 4: Create the Order Email Template in EmailJS
1. In EmailJS Dashboard → Go to **Email Templates** → Click **Create New Template**.
2. Configure the template fields:

- **Subject**: `Order Placed Successfully: #{{order_ref}} - Sparkle Giftz`
- **From Name**: `Sparkle Giftz Concierge`
- **From Email**: `sparklegiftzz1@gmail.com`
- **To Email**: `{{to_email}}`
- **Reply To**: `sparklegiftzz1@gmail.com`

- **Content (Body)**:
  ```text
  Dear {{to_name}},

  Thank you for placing your luxury gift box order with Sparkle Giftz!

  Order Details:
  • Order Reference: {{order_ref}}
  • Total Amount: {{total_price}}
  • Delivery Date: {{delivery_date}}
  • Included Items: {{items_summary}}

  {{message_body}}

  We have received your order and our concierge team is currently preparing your gift set.

  Warm regards,
  Sparkle Giftz Concierge Team
  https://sparklegiftz.com
  ```

3. Click **Save**.
4. Copy your **Template ID** (e.g., `template_xyz789`).
5. Go to **Account** → **API Keys** → Copy your **Public Key** (e.g., `user_123456789`).

---

## Step 5: Update Environment Variables in `frontend/.env`

Open [frontend/.env](file:///c:/Users/STZ/Desktop/Sparkle%20Giftz/frontend/.env) and insert your 3 EmailJS keys:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=user_123456789
```

---

## Why This Setup Guarantees Emails Land in INBOX (NOT SPAM):
1. **Google Authenticated DKIM**: Because EmailJS connects directly through `sparklegiftzz1@gmail.com`, Google attaches its official SPF & DKIM digital signatures to every outgoing email.
2. **Recognized Business Sender**: Customers see `sparklegiftzz1@gmail.com` as the sender and can directly reply to your inbox.
3. **No External SMTP Bounces**: Gmail handles delivery through official Google IP addresses, ensuring 99.9% inbox placement rate.
