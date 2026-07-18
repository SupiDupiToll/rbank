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
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="pck_..."
   NEXT_PUBLIC_STACK_PROJECT_ID="..."
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="..."
   STACK_ADMIN_EMAILS="admin@example.com"
   ```

4. Run database migrations and seed:

   ```bash
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

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

[MIT](LICENSE)
