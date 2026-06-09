# Real Estate Builder Dashboard

This is the Next.js property developer and builder portal. It has been aligned with the architecture of your **`healthcare/ui`** and **`amplio-merchant`** codebases using the **Minimal UI Kit** structural organization.

---

## 🏛️ Minimal Kit Aligned Folder Structure

Routing pages inside `src/app` remain extremely thin, and all active UI, page sections, hooks, and integrations reside in specialized decoupled folders:
```
real-estate-builder/
├── src/
│   ├── app/              # Thin Next.js App Router (layout.tsx, page.tsx, globals.css)
│   ├── sections/         # Complex page visual layouts (projects-list-view.tsx)
│   ├── components/       # Reusable UI controls (PremiumButton)
│   ├── layouts/          # Header, Sidebar navigation templates (DashboardLayout)
│   ├── routes/           # Centralized paths directory mapping (paths.ts)
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Helper math & formatters
│   └── api/              # Axios HTTP client requests
├── package.json
└── tailwind.config.js
```

---

## ⚡ Running Locally

### Install dependencies
```bash
npm install
```

### Start Developmental Server
```bash
npm run dev
```
Port: `http://localhost:3003`
