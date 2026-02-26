# Moro Coffee Shop Manager — Claude Code Instructions

## Project Overview
Full-stack Next.js 14+ app (App Router) for managing a coffee shop chain with 2 locations:
- **MAGNOLIA (MG)** — main location
- **ORIZONT (O)** — second location

Replaces manual Excel tracking of daily income, incoming invoices (INTRARE FACTURI), 
outgoing invoices (IESIRE FACTURI), and generates P&L, Cash Flow, and COGS dashboards.

## Tech Stack
- **Framework**: Next.js 14+ (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM (schema in prisma/schema.prisma)
- **Styling**: Tailwind CSS + Radix UI primitives
- **Charts**: Recharts
- **Validation**: Zod
- **State**: TanStack Query for server state
- **Currency**: RON (Romanian Leu), no decimals on display unless under 100
- **Date format**: DD/MM/YYYY (European)
- **Language**: UI in Romanian, code in English

## Database
- Schema is in prisma/schema.prisma — 16 models already pushed
- Run `npx prisma db push` after schema changes
- Run `npx prisma generate` after schema changes
- Use `src/lib/prisma.ts` singleton for all DB access

## INPUT PAGES (data entry):
1. **Daily Income** (/income) — from "Income" Excel sheet
   - One row per day per location
   - Fields: date, location, totalSales, tva, salesExVat, receiptCount, barSales, 
     barProductCount, kitchenSales, kitchenProductCount, cash, card, virament, 
     cont, livrator, tipsFiscal, tipsTotal
2. **Incoming Invoices** (/incoming) — from "INTRARE FACTURI" Excel sheet
   - Fields: location, year, month, plCategory (COGS/COSTFIX/OPEX/TAXE), 
     category, subcategory, invoiceNumber, supplier, issueDate, dueDate,
     amountExVat, vatAmount, totalAmount, paidAmount, paymentYear, paymentMonth, 
     paymentDay, remainingAmount, notes
3. **Outgoing Invoices** (/outgoing) — from "IESIRE FACTURI" Excel sheet
   - Fields: year, month, invoiceNumber, customer, issueDate, dueDate,
     amountExVat, totalAmount, paidAmount, paymentYear, paymentMonth, 
     paymentDay, unpaidAmount

## DASHBOARD PAGES (computed from input data):
1. **P&L Dashboard** (/dashboard/pnl) — mirrors MG P&L / O P&L sheets
2. **Cash Flow Dashboard** (/dashboard/cashflow) — mirrors Cash Flow sheets  
3. **COGS Dashboard** (/dashboard/cogs) — mirrors COGS sheets
4. **Overview Dashboard** (/) — summary of all KPIs

## Style Guide
- Coffee-themed palette: Primary #6F4E37, Secondary #C4A882, Accent #D4A574, 
  Background #FFF8F0, Success #4CAF50, Warning #FF9800, Danger #F44336
- Rounded corners (12px on cards), subtle shadows
- Responsive: mobile-first for income entry, desktop for dashboards
- Font: Inter

## Key Commands
- `npm run dev` — Dev server
- `npx prisma studio` — Visual DB browser
- `npx prisma db push` — Sync schema
- `npm run build` — Production build