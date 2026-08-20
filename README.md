# RBank

A full-stack online banking system with customer dashboard, admin panel, merchant payment gateway, and fixed-term deposit management.

Built with [Next.js](https://nextjs.org/) (App Router), [Prisma](https://prisma.io/), [PostgreSQL](https://neon.tech/), [Stack Auth](https://stack-auth.com/), and [Tailwind CSS](https://tailwindcss.com/).

## Features

### Customer
- Dashboard with balance overview and transaction history
- Peer-to-peer money transfers between customers
- **AirCoin** — internal cryptocurrency balance
- **Festgeld** — fixed-term deposit accounts with automated interest
- Donation boxes — create and manage public donation pages
- PIN-based transaction authorization with rate limiting and lockout protection
- QR code payment scanner
- PWA support (offline mode, installable)
- **Family Card / Apple Wallet** — personalized digital bank card as an Apple Wallet pass with live balance updates, signed deep links and push updates

### Admin
- Full customer management (create, list, transactions)
- Manual deposits and withdrawals
- Festgeld account management and early payout
- Merchant management (CRUD, API credentials, webhook config)
- Payment session monitoring and refunds
- AirCoin balance management

### Merchant Payment Gateway (rbank-pay)
- Create payment sessions via API
- Checkout flow with confirmation page
- Embedded self-checkout flow for `*.sdtoll.de` subdomains
- Webhook notifications (AES-256-GCM encrypted)
- Refund support
- QR-code-based payments

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma |
| Auth | Stack Auth |
| Rate Limiting | Upstash Redis |
| Styling | Tailwind CSS |
| PWAs | next-pwa |

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm
- PostgreSQL database (Neon or local)
- Stack Auth account (free tier available)
- Upstash Redis instance (free tier available)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/SupiDupiToll/rbank.git
   cd rbank
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file (see `.env.example` for required variables):

   ```env
   DATABASE_URL="postgresql://..."
   STACK_SECRET_SERVER_KEY="ssk_..."
   RBANK_EMBED_CHECKOUT_KEY="shared-secret-for-embedded-checkout"
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="pck_..."
   NEXT_PUBLIC_STACK_PROJECT_ID="..."
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="..."
   STACK_ADMIN_EMAILS="admin@example.com"
   ```

The embedded checkout is available at `/embed/pay/:token?key=...` and only allows framing from `https://*.sdtoll.de` via CSP.

4. Run database migrations and seed:

   ```bash
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

## Family Card / Apple Wallet

Every customer can add a personalized digital **Family Card** to Apple Wallet. The pass shows the customer's name, masked card number, Girokonto balance, AirCoin balance and the card status. All values are rendered from the database on demand — the backend stays the single source of truth and pass data is never used to authorize money movement.

### API

| Endpoint | Description |
|---|---|
| `POST /api/wallet/apple/create` | Creates (or refreshes) the Apple Wallet pass for the authenticated customer and returns the signed `.pkpass` file |
| `POST /api/wallet/apple/update` | Recomputes the pass data and triggers push updates for all registered devices |
| `POST /api/wallet/apple/revoke` | Revokes the pass. Devices receive a push and remove the pass (webservice returns `404` afterwards) |
| `GET /api/wallet/apple/status` | Returns the pass status (`ACTIVE` / `LOCKED` / `REVOKED` / `NONE`) and pass metadata |

### Apple Wallet webservice

The pass's `webServiceURL` points to `${APP_URL}/api/wallet/apple/webservice/`. Apple calls:

| Endpoint | Purpose |
|---|---|
| `POST /api/wallet/apple/webservice/v1/devices/:id/registrations/:passType/:serial` | Register device for updates |
| `DELETE .../registrations/:passType/:serial` | Unregister device |
| `GET /api/wallet/apple/webservice/v1/devices/:id/registrations/:passType` | Return updated serial numbers |
| `GET /api/wallet/apple/webservice/v1/passes/:passType/:serial` | Serve the latest signed pass |
| `POST /api/wallet/apple/webservice/v1/log` | Log client messages |

Calls are authenticated via the per-pass `authenticationToken` (only its SHA-256 hash is stored in the database) and the device library identifier, exactly as specified by Apple.

### Balance changes

Whenever a user's balance changes (P2P transfer, checkout/donation, admin booking, loan repayment, overdraft interest, Festgeld), the wallet pass is refreshed:

- The pass content hash is compared with the stored hash; if nothing changed, no push is sent.
- If changed, a push notification (APNs) is sent to all registered devices. The devices then fetch the latest pass from the webservice.
- If APNs is not configured, the pass still updates on demand when the device asks for it.

### Configuration

See [`.env.example`](./.env.example) for the complete list. The important pieces:

| Variable | Required | Purpose |
|---|---|---|
| `APPLE_WALLET_LINK_SECRET` | yes (feature) | HMAC secret for signed deep links |
| `APPLE_WALLET_CARD_SECRET` | yes (feature) | Secret to derive the masked card number and pass auth token |
| `APPLE_WALLET_PASS_TYPE_IDENTIFIER` | no | Pass type ID, default `pass.com.rbank.familycard` |
| `APPLE_WALLET_TEAM_IDENTIFIER` | production | Apple Developer team ID |
| `APPLE_WALLET_PASS_CERT_PATH` | production | Pass signing certificate (PEM) |
| `APPLE_WALLET_PASS_KEY_PATH` | production | Pass signing private key (PEM) |
| `APPLE_WALLET_PASS_CERT_PASSWORD` | production | Password of the private key (if encrypted) |
| `APPLE_WALLET_WWDR_CERT_PATH` | production | Apple Worldwide Developer Relations certificate |
| `APPLE_APNS_*` | optional | APNs push updates (HTTP/2 + token auth) |

**Important:** Without the pass signing certificates, passes are generated **unsigned** (development mode). They can be downloaded but **cannot** be added to Apple Wallet. Configure the certificates for production use.

**Links inside the pass:** Back fields are text-only. On iOS 27+ Wallet supports *featured actions* (tappable links); enable them with `APPLE_WALLET_FEATURED_ACTIONS=1` if your target OS supports it. The signed deep links (`/wallet/entry/:token`) authenticate the current user via HMAC and redirect into the matching dashboard section.

### Security

- Wallet balances are display-only; the backend is the single source of truth.
- No full account numbers, passwords or secrets are stored inside the pass.
- Each pass maps to exactly one user/account; passes can be revoked server-side.
- If a customer is blocked (admin → Kunden → Sperren), the pass shows **Gesperrt**.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:seed` | Seed sample data |
| `pnpm db:regen` | Reset database and re-seed |

## License

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/legalcode.en)
