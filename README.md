# Moro Coffee Manager

Internal financial management tool for Moro coffee shop chain (MAGNOLIA & ORIZONT locations).

## Features

- Daily income tracking from POS data
- Incoming/outgoing invoice management with Excel import
- P&L dashboard with category breakdown (COGS, People, OPEX, Fixed Costs, Taxes)
- Cash flow analysis (cash-basis, 12-month rolling)
- Aging reports for payables/receivables
- Supplier analytics and top-supplier rankings
- Multi-location support with per-location filtering

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL (Supabase)
- NextAuth v5 (Google OAuth)
- Tailwind CSS + Radix UI
- React Query for client-side data fetching
- Deployed on Vercel

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in values
2. `npm install`
3. `npx prisma db push`
4. `npm run db:seed`
5. `npm run dev`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to database |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

- Push to `main` branch triggers Vercel deployment
- Run `npx prisma db push` after schema changes
- CI pipeline runs type-check, lint, format, test, and build on every push
