# MaNo Spendometer

## Overview
A private expense tracking application for a two-person household (Noble and Maria). Features AI-powered bank statement processing, multi-user ownership tracking, and comprehensive spending analytics.

## Recent Changes (January 2026)
- **Added ownership system**: Statements and transactions can belong to Noble, Maria, or Combined
- When uploading statements, user selects who the expenses belong to
- Individual transaction ownership can be changed via inline dropdown
- Dashboard filters by owner (Noble/Maria views show only their expenses, Combined shows all)
- Removed settlement status feature - focusing purely on expense tracking
- Updated to 21 expense categories with color coding (added Shopping)
- Categories are now alphabetically ordered
- Added month filtering on Dashboard and Transactions
- Added manual transaction entry with owner selection
- Added inline category and owner editing
- Added statement deletion with confirmation
- Enhanced Glassmorphism UI with Bento Grid layout
- Added transaction sorting (newest, oldest, highest/lowest amount)
- Recurring transactions now automatically create 12 future entries
- Added notes view/edit functionality in transaction menu
- Improved transactions tab performance (removed heavy animations)
- Branding updated to "MaNo" throughout the app (including PWA manifest)
- Added transaction edit dialog to modify recurring settings and splits

## Categories (21 Categories - Alphabetical)
1. Car
2. Cellular & Wifi
3. Dining
4. Entertainment
5. Fitness & Sports
6. Fuel
7. Gifts & Donation
8. Groceries
9. Health & Wellness
10. Household
11. Housing
12. Learning & Development
13. Miscellaneous
14. Parents
15. Parking (Public)
16. Self Care
17. Shopping
18. Subscriptions
19. Transportation
20. Travel
21. Utilities

## Project Architecture

### Backend (Express + TypeScript)
- `server/routes.ts` - API endpoints for statements, transactions, stats
- `server/storage.ts` - Database storage interface using Drizzle ORM
- `server/replit_integrations/` - Replit Auth & OpenAI integrations

### Frontend (React + TypeScript + Vite)
- `client/src/pages/Dashboard.tsx` - Main dashboard with stats and charts
- `client/src/pages/Transactions.tsx` - Transaction list with filters
- `client/src/pages/Statements.tsx` - Statement upload and processing
- `client/src/components/` - Reusable UI components

### Shared
- `shared/schema.ts` - Database schema and types
- `shared/routes.ts` - API route definitions with Zod validation

## Database
PostgreSQL with Drizzle ORM. Tables:
- `users` - Auth users (managed by Replit Auth)
- `statements` - Uploaded bank statements
- `transactions` - Parsed transactions with categories

## User Preferences
- Dark theme with Glassmorphism design
- Charcoal/slate palette with muted sage accent
- Bento Grid layout for dashboard cards
- Color-coded categories for visual distinction
