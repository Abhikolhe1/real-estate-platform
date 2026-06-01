# Real Estate Multi-Tenant SaaS Platform Backend

This is the production-grade NestJS multi-tenant API gateway backend. It has been aligned with the architecture of your **`Amplio-Backend`** project to support comfortable manual coding and task management.

---

## 🏛️ LoopBack-Aligned Structure

Files are grouped globally by technical role (rather than features modules) just like LoopBack 4:
```
real-estate-backend/
├── src/
│   ├── controllers/      # REST API Controllers (auth.controller.ts, projects.controller.ts)
│   ├── services/         # Core business logic (auth.service.ts, projects.service.ts)
│   ├── entities/         # TypeORM database models (user.entity.ts, builder.entity.ts, project.entity.ts)
│   ├── dtos/             # Input parameter validations (auth.dto.ts, project.dto.ts)
│   ├── interceptors/     # Context interceptors (tenant.interceptor.ts, tenant.decorator.ts)
│   ├── app.module.ts     # Global central module registry mapping services & controllers
│   └── main.ts           # Server bootstrap configuration
├── package.json
└── tsconfig.json
```

---

## 🔒 Multi-Tenant Context Parsing
- **`TenantInterceptor`**: Resolves custom header mappings (`x-tenant-id` / `x-builder-id`) or subdomain slugs and injects it into the request stream.
- **`@TenantId()`**: Dynamic controller decorator to inject the current isolated builder tenant identity with zero boilerplates.

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
Port: `http://localhost:3001`
