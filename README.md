# AI-Powered Real Estate Virtual Experience Platform
## Unified Project Directory: `real-estate-platform`

Welcome! This folder serves as the central container for the **AI-Powered Real Estate Virtual Experience Platform**. 

Instead of a nested monorepo structure, this workspace houses **four standalone, fully decoupled project codebases** aligned with the frameworks, folder layouts, and coding standards of your existing active applications:
* **`healthcare/ui` & `amplio-merchant`** (for frontend portals using MUI & Minimal UI Kit v5)
* **`Amplio-Backend`** (for NestJS backend globally structured by technical role)

---

## 📂 Project Structure Overview

```
real-estate-platform/
├── Complete_Real_Estate_Platform_PRD.md # Complete Product Requirements Document
├── README.md                            # This root guide
├── real-estate-backend/                 # Standalone NestJS multi-tenant API (LoopBack folder structure)
├── real-estate-admin/                   # Standalone Next.js Super Admin portal (Minimal UI Kit structure)
├── real-estate-builder/                 # Standalone Next.js Builder dashboard portal (Minimal UI Kit structure)
└── real-estate-web/                     # Standalone Next.js client website engine (Minimal UI Kit structure)
```

---

## 🏛️ Codebase Architectures & Mappings

### 1. NestJS Backend: `real-estate-backend`
Aligned with **`Amplio-Backend`** (LoopBack 4), grouping elements globally by technical role:
* `/src/controllers` (REST Endpoints)
* `/src/services` (Business logic)
* `/src/entities` (TypeORM Postgres models)
* `/src/dtos` (Validation filters)
* `/src/interceptors` (Multi-tenant resolvers & `@TenantId()` decorators)

### 2. Next.js Frontends: `real-estate-admin`, `real-estate-builder`, `real-estate-web`
Aligned with **`healthcare/ui`** (Minimal UI Kit), separating logic cleanly away from Next.js thin pages:
* `/src/app` (Thin routing paths & globals.css)
* `/src/sections` (Page layout visualizers with GSAP entry loaders)
* `/src/components` (Reusable UI buttons and inputs)
* `/src/layouts` (Dashboard sidebars and navigation headers)
* `/src/routes` (Center paths map)

---

## ⚡ Running Each Project Locally

You can open the main folder `real-estate-platform` or open each standalone project directly in your editor as an active workspace.

### Step 1: Install Dependencies
For any project you wish to run, enter its directory and run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Inside `real-estate-backend`, create your local environment:
```bash
cp .env.example .env
```

### Step 3: Run the Server
Runs the development hot-reloading environment:
```bash
npm run dev
```

* **`real-estate-web` (Consumer Engine)**: `http://localhost:3000`
* **`real-estate-backend` (NestJS REST API)**: `http://localhost:3001`
* **`real-estate-admin` (Super Admin)**: `http://localhost:3002`
* **`real-estate-builder` (Builder Portal)**: `http://localhost:3003`

Each project includes a standalone **`Dockerfile`** for Docker environments, detailed logs, and setup directions inside its own directory.
