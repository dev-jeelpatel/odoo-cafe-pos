# Cafe POS — Restaurant Point of Sale & Kitchen Display System

A full-stack Restaurant POS system built with Next.js, Node.js, MongoDB, and Socket.IO.

## Tech Stack

**Frontend:** Next.js 14, TypeScript, Tailwind CSS, React Query, Socket.IO Client, Recharts  
**Backend:** Node.js, Express.js, TypeScript, MongoDB (Mongoose), JWT Auth, Socket.IO

## Features

- JWT Authentication with role-based access (Admin / Employee / Cashier)
- Auto POS session on login
- Product & Category management (with color coding throughout UI)
- Floor & Table management with real-time status updates
- Full POS Terminal: product grid, category filters, cart, discounts, notes
- Coupon codes & automated promotions (product-based / order-based)
- Payment processing: Cash, UPI QR code, Card — including split payments
- Kitchen Display System (KDS) with real-time Socket.IO updates
- Order status tracking: Draft → Confirmed → Kitchen → Ready → Completed
- Item-level kitchen completion with strikethrough
- Customer management
- Reporting & analytics dashboard (today / week / month)
- Session open/close with closing summary

## Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017

## Setup & Run

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start backend + frontend together
npm run dev
```

Or individually:

```bash
npm run dev:backend    # Express API on :5000
npm run dev:frontend   # Next.js on :3000
```

## URLs

| Service | URL |
|---------|-----|
| POS App | http://localhost:3000 |
| Kitchen Display (KDS) | http://localhost:3000/kds |
| API | http://localhost:5000/api |

## First Run

1. Go to **http://localhost:3000/signup** and create an admin account
2. You'll be redirected to the POS terminal automatically (session auto-opens)
3. Use the sidebar to configure **Categories**, **Products**, **Floors & Tables** first
4. Open **http://localhost:3000/kds** on a dedicated kitchen screen

## Project Structure

```
odoo-cafe-pos/
├── backend/src/
│   ├── models/       Mongoose schemas
│   ├── controllers/  Business logic
│   ├── routes/       REST API routes
│   ├── middleware/   JWT auth
│   └── index.ts      Express + Socket.IO server
└── frontend/src/
    ├── app/
    │   ├── (auth)/   Login, Signup
    │   ├── (pos)/    POS terminal + all admin pages
    │   └── kds/      Kitchen Display System
    ├── components/   Reusable UI (Modal, Sidebar, etc.)
    ├── contexts/     AuthContext, CartContext
    ├── lib/          Axios API client, Socket.IO
    └── types/        TypeScript interfaces
```